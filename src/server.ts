import 'dotenv/config';
import Fastify from 'fastify';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import configRoutes from './routes/config';
import deviceRoutes from './routes/devices';
import authPlugin from './plugins/auth.plugin';

import { createClient } from '@supabase/supabase-js';

const fastify = Fastify({
    logger: true
});

// Configure Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    fastify.log.error('FATAL: SUPABASE_URL and SUPABASE_ANON_KEY must be provided');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

import { configService } from './services/config.service';
import { mqttService } from './services/mqtt.service';
import { telemetryService } from './services/telemetry.service';

// Register plugins
fastify.register(authPlugin);

// Register routes
fastify.register(healthRoutes);
fastify.register(authRoutes);
fastify.register(configRoutes);
fastify.register(deviceRoutes);

const start = async () => {
    try {
        // 1. ConfigService loads from DB
        fastify.log.info('Validating Supabase connection...');
        await configService.load();
        fastify.log.info('Supabase connection verified and config loaded.');

        // 2. MQTTClient connects (after config is available)
        fastify.log.info('Connecting to MQTT broker...');
        mqttService.onMessage((topic, payload) => telemetryService.ingest(topic, payload));
        await mqttService.connect();
        fastify.log.info('MQTT broker connected.');

        // 3. HTTP server starts accepting
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await mqttService.disconnect();
    await fastify.close();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();

