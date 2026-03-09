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

// Register plugins
fastify.register(authPlugin);

// Register routes
fastify.register(healthRoutes);
fastify.register(authRoutes);
fastify.register(configRoutes);
fastify.register(deviceRoutes);

const start = async () => {
    try {
        // Fail-fast database check
        fastify.log.info('Validating Supabase connection...');
        await configService.load();
        fastify.log.info('Supabase connection verified and config loaded.');

        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
