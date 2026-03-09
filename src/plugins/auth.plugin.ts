import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { authService, AuthenticatedUser } from '../services/auth.service';

declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthenticatedUser;
    }

    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
    fastify.decorateRequest('user', undefined);

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Missing or invalid token' });
        }

        const token = authHeader.split(' ')[1];
        const user = await authService.verifyToken(token);

        if (!user) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
        }

        request.user = user;
    });
});
