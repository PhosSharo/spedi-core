import 'dotenv/config';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import configRoutes from './routes/config';
import deviceRoutes from './routes/devices';
import authPlugin from './plugins/auth.plugin';

import { createClient } from '@supabase/supabase-js';

const fastify = Fastify({
    logger: true
});

// CORS — allow all origins (reflects requester) for Flutter Web and development
fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    strictPreflight: false,
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
import { cameraService } from './services/camera.service';
import { logService } from './services/log.service';
import realtimeRoutes from './routes/realtime';
import controlRoutes from './routes/control';
import sessionRoutes from './routes/session';
import routeRoutes from './routes/routes';
import telemetryRoutes from './routes/telemetry';
import debugRoutes from './routes/debug';
import userRoutes from './routes/users';
import { routeService } from './services/route.service';

// Replace default JSON parser to tolerate empty bodies
fastify.removeContentTypeParser('application/json');
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body: string, done) {
    try {
        if (!body || body.trim() === '') {
            done(null, {});
            return;
        }
        done(null, JSON.parse(body));
    } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
    }
});

// Register plugins
fastify.register(authPlugin);
fastify.register(websocket);

// Register OpenAPI spec
import swagger from '@fastify/swagger';
fastify.register(swagger, {
    openapi: {
        info: {
            title: 'SPEDI Platform API //',
            description: `
IoT Orchestration Backend for the SPEDI autonomous vehicle system.

### Architecture Overview
SPEDI mediates between physical ESP32 devices, a Flutter mobile controller, and a Next.js admin dashboard.
- **REST API**: Resource management (Devices, Users, Routes).
- **SSC Stream**: Unidirectional live telemetry and system events (GET /events).
- **WebSocket**: Bidirectional joystick hot-path (GET /control).

### Authentication & RBAC
- **Superuser**: Full administrative control. Account provisioning is restricted to direct DB/Seed.
- **Standard User**: Restricted to Documentation access only.
- **Service Role**: Required for administrative User Management operations.

### Data Model
The system follows the **Device Shadow** pattern (Desired vs reported state).
- **Desired**: Commands sent from the platform to the device.
- **Reported**: Real-time state ingested from the device via MQTT.
`,
            version: '1.0.4',
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
            { name: 'Auth', description: 'Supabase-integrated authentication. Handles JWT issuance and logout.' },
            { name: 'Devices', description: 'Device registry and Shadow State (Desired/Reported) management.' },
            { name: 'Telemetry', description: 'Historical telemetry logs and live stream ingestion details. Note: Use /events for live updates.' },
            { name: 'Users', description: 'CRUD for standard accounts. Security Policy: Superusers cannot be created/promoted via API.' },
            { name: 'Sessions', description: 'Device control mutex. Only one user can claim ownership of a device at a time.' },
            { name: 'Routes', description: 'Autonomous mission planning. Requires multiple waypoints and device availability.' },
            { name: 'Config', description: 'Runtime parameters. Updates trigger immediate MQTT re-connection and system hot-reload.' },
            { name: 'Realtime', description: 'SSE (Server-Sent Events) and WebSocket endpoints. Require ?token=JWT query parameters.' },
            { name: 'Debug', description: 'Developer tools. Includes the Telemetry Mock Injector for platform simulation.' },
            { name: 'System', description: 'Platform health and diagnostics.' },
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
fastify.register(debugRoutes);
fastify.register(userRoutes);

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

        // Wire SSE and Logger to MQTT device connection events
        mqttService.on('device_online', (deviceId) => {
            logService.info('arduino', 'connection', 'Device (Arduino) reconnected to MQTT broker');
            sseService.broadcast({
                type: 'device_online',
                deviceId,
                payload: { status: 'online', timestamp: new Date().toISOString() }
            });
        });

        mqttService.on('device_offline', (deviceId) => {
            logService.warn('arduino', 'connection', 'Device (Arduino) disconnected from MQTT broker');
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
        mqttService.onMessage((topic, payload) => {
            if (topic === mqttService.topicCamera) {
                cameraService.ingest(topic, payload);
            } else {
                telemetryService.ingest(topic, payload);
            }
        });
        mqttService.connect().catch(e => fastify.log.warn('MQTT connection failed on startup, will retry.'));
        fastify.log.info('MQTT broker connection initiated.');

        // 7. HTTP server starts accepting
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

