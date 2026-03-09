import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { sseService } from '../services/sse.service';
import { deviceService } from '../services/device.service';

const realtimeRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * GET /events
     * Establishes a persistent Server-Sent Events (SSE) stream.
     * Requires valid authentication.
     * 
     * On connection: Immediately flushes the current shadow state 
     * for all registered devices so the dashboard has the latest context.
     */
    fastify.get('/events', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const connectionId = randomUUID();

        // Register the client connection
        sseService.addClient(connectionId, reply);

        // Fetch all devices to flush their current shadow state
        try {
            const devices = await deviceService.listDevices();

            for (const device of devices) {
                const state = deviceService.getState(device.id);

                // Flush current reported state as an initial telemetry event
                if (Object.keys(state.reported).length > 0) {
                    sseService.sendToClient(connectionId, {
                        type: 'telemetry',
                        deviceId: device.id,
                        payload: state.reported
                    });
                }

                // Note: Session flushing will be added here when SessionService is implemented
            }
        } catch (err: any) {
            request.log.error(err, 'Failed to flush initial state for new SSE client');
        }

        // Return a promise that never resolves, keeping the connection open
        return reply;
    });
};

export default realtimeRoutes;
