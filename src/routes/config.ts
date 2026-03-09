import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { configService } from '../services/config.service';

export default async function configRoutes(fastify: FastifyInstance) {
    /**
     * GET /config
     * Returns all configuration rows.
     * Restricted to superusers.
     */
    fastify.get('/config', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;
        if (!user || !user.is_superuser) {
            return reply.status(403).send({ error: 'Forbidden: Superuser access required' });
        }
        return configService.getAll();
    });

    /**
     * PUT /config
     * Updates multiple configuration entries.
     * Body: { updates: [{ key: string, value: string }] }
     * Restricted to superusers.
     */
    fastify.put('/config', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;
        if (!user || !user.is_superuser) {
            return reply.status(403).send({ error: 'Forbidden: Superuser access required' });
        }

        const { updates } = request.body as { updates: { key: string; value: string }[] };

        if (!updates || !Array.isArray(updates)) {
            return reply.status(400).send({ error: 'Invalid payload: updates must be an array' });
        }

        try {
            await configService.update(updates, user.id);
            return { success: true, reloaded: true };
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Failed to update configuration' });
        }
    });
}
