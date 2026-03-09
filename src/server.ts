import 'dotenv/config';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
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
import { deviceService } from './services/device.service';
import { sessionService } from './services/session.service';
import { telemetryService } from './services/telemetry.service';
import { sseService } from './services/sse.service';
import realtimeRoutes from './routes/realtime';
import controlRoutes from './routes/control';
import sessionRoutes from './routes/session';
import routeRoutes from './routes/routes';
import telemetryRoutes from './routes/telemetry';
import { routeService } from './services/route.service';

// Register plugins
fastify.register(authPlugin);
fastify.register(websocket);

// Register OpenAPI spec
import swagger from '@fastify/swagger';
fastify.register(swagger, {
    openapi: {
        info: {
            title: 'SPEDI Platform API',
            description: 'Backend API for the SPEDI autonomous boat orchestration platform.',
            version: '1.0.0',
        },
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Supabase JWT obtained via POST /auth/login',
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Devices', description: 'Device management and shadow state' },
            { name: 'Sessions', description: 'Control session mutex' },
            { name: 'Routes', description: 'Autonomous route management' },
            { name: 'Config', description: 'System configuration (superuser)' },
            { name: 'Realtime', description: 'SSE and WebSocket streams' },
            { name: 'System', description: 'Health and diagnostics' },
        ],
    },
});

// Expose spec at GET /openapi.json
fastify.get('/openapi.json', { schema: { hide: true } }, async () => {
    return fastify.swagger();
});

// Register routes
fastify.register(healthRoutes);
fastify.register(authRoutes);
fastify.register(configRoutes);
fastify.register(deviceRoutes);
fastify.register(realtimeRoutes);
fastify.register(controlRoutes);
fastify.register(sessionRoutes);
fastify.register(routeRoutes);
fastify.register(telemetryRoutes);

const start = async () => {
    try {
        // 1. ConfigService loads from DB
        fastify.log.info('Validating Supabase connection...');
        await configService.load();
        fastify.log.info('Supabase connection verified and config loaded.');

        // 2. Inject MqttService into DeviceService (avoids circular imports)
        deviceService.init(mqttService);

        // 3. Inject MQTT stop publisher into SessionService
        sessionService.init(() => {
            mqttService.publishJoystick({ throttle: 0, steering: 0 });
        });

        // 4. Close orphaned sessions from previous run
        await sessionService.closeOrphaned();

        // Wire SSE to Telemetry ingestion
        telemetryService.onSSE((deviceId, payload) => {
            sseService.broadcast({
                type: 'telemetry',
                deviceId,
                payload
            });
        });

        // Wire RouteService completion detection to telemetry pipeline
        telemetryService.onRoute((deviceId, reported) => {
            routeService.onTelemetry(deviceId, reported);
        });

        // Wire SSE to MQTT device connection events
        mqttService.on('device_online', (deviceId) => {
            sseService.broadcast({
                type: 'device_online',
                deviceId,
                payload: { status: 'online', timestamp: new Date().toISOString() }
            });
        });

        mqttService.on('device_offline', (deviceId) => {
            sseService.broadcast({
                type: 'device_offline',
                deviceId,
                payload: { status: 'offline', timestamp: new Date().toISOString() }
            });
        });

        // 5. Wire SSE to Session change events
        sessionService.on('session_change', (deviceId, session) => {
            sseService.broadcast({
                type: 'session_change',
                deviceId,
                payload: session // session is ActiveSession | null
            });
        });

        // 6. MQTTClient connects (after config is available)
        fastify.log.info('Connecting to MQTT broker...');
        mqttService.onMessage((topic, payload) => telemetryService.ingest(topic, payload));
        await mqttService.connect();
        fastify.log.info('MQTT broker connected.');

        // 6. HTTP server starts accepting
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

