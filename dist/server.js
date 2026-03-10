"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const cors_1 = __importDefault(require("@fastify/cors"));
const health_1 = __importDefault(require("./routes/health"));
const auth_1 = __importDefault(require("./routes/auth"));
const config_1 = __importDefault(require("./routes/config"));
const devices_1 = __importDefault(require("./routes/devices"));
const auth_plugin_1 = __importDefault(require("./plugins/auth.plugin"));
const supabase_js_1 = require("@supabase/supabase-js");
const fastify = (0, fastify_1.default)({
    logger: true
});
// CORS — allow the Vercel frontend and local dev
fastify.register(cors_1.default, {
    origin: [
        'http://localhost:3000',
        'https://spedi-core.vercel.app',
    ],
    credentials: true,
});
// Configure Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    fastify.log.error('FATAL: SUPABASE_URL and SUPABASE_ANON_KEY must be provided');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const config_service_1 = require("./services/config.service");
const mqtt_service_1 = require("./services/mqtt.service");
const device_service_1 = require("./services/device.service");
const session_service_1 = require("./services/session.service");
const telemetry_service_1 = require("./services/telemetry.service");
const sse_service_1 = require("./services/sse.service");
const realtime_1 = __importDefault(require("./routes/realtime"));
const control_1 = __importDefault(require("./routes/control"));
const session_1 = __importDefault(require("./routes/session"));
const routes_1 = __importDefault(require("./routes/routes"));
const telemetry_1 = __importDefault(require("./routes/telemetry"));
const route_service_1 = require("./services/route.service");
// Register plugins
fastify.register(auth_plugin_1.default);
fastify.register(websocket_1.default);
// Register OpenAPI spec
const swagger_1 = __importDefault(require("@fastify/swagger"));
fastify.register(swagger_1.default, {
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
fastify.register(health_1.default);
fastify.register(auth_1.default);
fastify.register(config_1.default);
fastify.register(devices_1.default);
fastify.register(realtime_1.default);
fastify.register(control_1.default);
fastify.register(session_1.default);
fastify.register(routes_1.default);
fastify.register(telemetry_1.default);
const start = async () => {
    try {
        // 1. ConfigService loads from DB
        fastify.log.info('Validating Supabase connection...');
        await config_service_1.configService.load();
        fastify.log.info('Supabase connection verified and config loaded.');
        // 2. Inject MqttService into DeviceService (avoids circular imports)
        device_service_1.deviceService.init(mqtt_service_1.mqttService);
        // 3. Inject MQTT stop publisher into SessionService
        session_service_1.sessionService.init(() => {
            mqtt_service_1.mqttService.publishJoystick({ throttle: 0, steering: 0 });
        });
        // 4. Close orphaned sessions from previous run
        await session_service_1.sessionService.closeOrphaned();
        // Wire SSE to Telemetry ingestion
        telemetry_service_1.telemetryService.onSSE((deviceId, payload) => {
            sse_service_1.sseService.broadcast({
                type: 'telemetry',
                deviceId,
                payload
            });
        });
        // Wire RouteService completion detection to telemetry pipeline
        telemetry_service_1.telemetryService.onRoute((deviceId, reported) => {
            route_service_1.routeService.onTelemetry(deviceId, reported);
        });
        // Wire SSE to MQTT device connection events
        mqtt_service_1.mqttService.on('device_online', (deviceId) => {
            sse_service_1.sseService.broadcast({
                type: 'device_online',
                deviceId,
                payload: { status: 'online', timestamp: new Date().toISOString() }
            });
        });
        mqtt_service_1.mqttService.on('device_offline', (deviceId) => {
            sse_service_1.sseService.broadcast({
                type: 'device_offline',
                deviceId,
                payload: { status: 'offline', timestamp: new Date().toISOString() }
            });
        });
        // 5. Wire SSE to Session change events
        session_service_1.sessionService.on('session_change', (deviceId, session) => {
            sse_service_1.sseService.broadcast({
                type: 'session_change',
                deviceId,
                payload: session // session is ActiveSession | null
            });
        });
        // 6. MQTTClient connects (after config is available)
        fastify.log.info('Connecting to MQTT broker...');
        mqtt_service_1.mqttService.onMessage((topic, payload) => telemetry_service_1.telemetryService.ingest(topic, payload));
        await mqtt_service_1.mqttService.connect();
        fastify.log.info('MQTT broker connected.');
        // 6. HTTP server starts accepting
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await mqtt_service_1.mqttService.disconnect();
    await fastify.close();
    process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
start();
