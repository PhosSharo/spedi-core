import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { sseService } from '../services/sse.service';
import { deviceService } from '../services/device.service';

const realtimeRoutes: FastifyPluginAsync = async (fastify) => {
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
        const connectionId = randomUUID();

        sseService.addClient(connectionId, reply);

        try {
            const devices = await deviceService.listDevices();

            for (const device of devices) {
                const state = deviceService.getState(device.id);

                if (Object.keys(state.reported).length > 0) {
                    sseService.sendToClient(connectionId, {
                        type: 'telemetry',
                        deviceId: device.id,
                        payload: state.reported
                    });
                }
            }
        } catch (err: any) {
            request.log.error(err, 'Failed to flush initial state for new SSE client');
        }

        return reply;
    });
};

export default realtimeRoutes;
