import { FastifyPluginAsync } from 'fastify';
import { sessionService } from '../services/session.service';

/**
 * Session REST routes — open, get, close control sessions.
 *
 * POST /session — opens a session for a device. 409 if claimed.
 * GET  /session — returns the current active session for the requesting user.
 * DELETE /session — closes the active session.
 *
 * All routes require authentication.
 */

const sessionRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * POST /session
     * Body: { device_id: string }
     * Opens a control session. Sets desired.mode = manual.
     */
    fastify.post('/session', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { device_id } = request.body as { device_id: string };

        if (!device_id) {
            return reply.code(400).send({ error: 'Bad Request', message: 'device_id is required' });
        }

        try {
            const session = await sessionService.open(request.user!.id, device_id);
            return reply.code(200).send(session);
        } catch (err: any) {
            if (err.statusCode === 409) {
                return reply.code(409).send({ error: 'Conflict', message: err.message });
            }
            request.log.error(err, 'Failed to open session');
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    /**
     * GET /session
     * Returns the active session for the requesting user, or null.
     */
    fastify.get('/session', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const deviceId = sessionService.getDeviceForUser(request.user!.id);
        if (!deviceId) {
            return reply.code(200).send(null);
        }

        const session = sessionService.getActive(deviceId);
        return reply.code(200).send(session);
    });

    /**
     * DELETE /session
     * Closes the active session for the requesting user.
     * Resets desired to idle and publishes stop.
     */
    fastify.delete('/session', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const deviceId = sessionService.getDeviceForUser(request.user!.id);
        if (!deviceId) {
            return reply.code(404).send({ error: 'Not Found', message: 'No active session' });
        }

        sessionService.close(request.user!.id, 'user_disconnect');
        return reply.code(200).send({ message: 'Session closed' });
    });
};

export default sessionRoutes;
