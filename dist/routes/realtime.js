"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const sse_service_1 = require("../services/sse.service");
const device_service_1 = require("../services/device.service");
const realtimeRoutes = async (fastify) => {
    /**
     * GET /events
     * SSE stream for live telemetry, device status, and session changes.
     */
    fastify.get('/events', {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ['Realtime'],
            summary: 'SSE event stream',
            description: 'Establishes a persistent Server-Sent Events connection. Streams telemetry, device_online/offline, and session_change events. On connection, flushes current shadow state for all registered devices.',
            security: [{ BearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'JWT token (alternative to Authorization header for EventSource compatibility)' },
                },
            },
            response: {
                200: {
                    type: 'string',
                    description: 'text/event-stream',
                },
            },
        },
    }, async (request, reply) => {
        const connectionId = (0, crypto_1.randomUUID)();
        sse_service_1.sseService.addClient(connectionId, reply);
        try {
            const devices = await device_service_1.deviceService.listDevices();
            for (const device of devices) {
                const state = device_service_1.deviceService.getState(device.id);
                if (Object.keys(state.reported).length > 0) {
                    sse_service_1.sseService.sendToClient(connectionId, {
                        type: 'telemetry',
                        deviceId: device.id,
                        payload: state.reported
                    });
                }
            }
        }
        catch (err) {
            request.log.error(err, 'Failed to flush initial state for new SSE client');
        }
        return reply;
    });
};
exports.default = realtimeRoutes;
