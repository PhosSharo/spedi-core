import { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service';
import { sessionService } from '../services/session.service';

export default async function authRoutes(fastify: FastifyInstance) {
    // POST /auth/login
    fastify.post('/auth/login', async (request, reply) => {
        const { email, password } = request.body as any;

        if (!email || !password) {
            return reply.code(400).send({ error: 'Bad Request', message: 'Email and password are required' });
        }

        try {
            const data = await authService.login(email, password);
            return {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    is_superuser: data.user.app_metadata?.is_superuser === true
                },
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_in: data.session.expires_in
                }
            };
        } catch (err: any) {
            return reply.code(401).send({ error: 'Unauthorized', message: err.message });
        }
    });

    // POST /auth/logout
    fastify.post('/auth/logout', { preHandler: [(fastify as any).authenticate] }, async (request, reply) => {
        try {
            // Close any active control session before logging out
            if (request.user) {
                sessionService.close(request.user.id, 'user_disconnect');
            }

            await authService.logout();
            return { message: 'Logged out successfully' };
        } catch (err: any) {
            return reply.code(500).send({ error: 'Internal Server Error', message: err.message });
        }
    });

    // GET /auth/me
    fastify.get('/auth/me', { preHandler: [(fastify as any).authenticate] }, async (request) => {
        return request.user;
    });
}
