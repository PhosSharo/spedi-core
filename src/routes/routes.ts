import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { routeService } from '../services/route.service';

/**
 * Route REST endpoints.
 *
 * GET    /routes            — List routes (query: device_id, status)
 * POST   /routes            — Create draft route
 * GET    /routes/:id        — Get route by ID
 * DELETE /routes/:id        — Delete draft route
 * POST   /routes/:id/start  — Dispatch route (validate + publish)
 * POST   /routes/:id/stop   — Abort active route
 */

const routeRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * GET /routes
     * Query: device_id, status
     */
    fastify.get('/routes', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { device_id, status } = request.query as { device_id?: string; status?: string };
        const routes = await routeService.list({ device_id, status });
        return routes;
    });

    /**
     * POST /routes
     * Body: { device_id, name, waypoints: [{lat, lng}, ...] }
     * Creates a draft route. Validates ≥2 waypoints.
     */
    fastify.post('/routes', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { device_id, name, waypoints } = request.body as {
            device_id: string;
            name: string;
            waypoints: Array<{ lat: number; lng: number }>;
        };

        if (!device_id || !name) {
            return reply.code(400).send({ error: 'Bad Request', message: 'device_id and name are required' });
        }

        if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
            return reply.code(400).send({ error: 'Bad Request', message: 'At least 2 waypoints are required' });
        }

        // Validate coordinate structure
        for (const wp of waypoints) {
            if (typeof wp.lat !== 'number' || typeof wp.lng !== 'number') {
                return reply.code(400).send({ error: 'Bad Request', message: 'Each waypoint must have numeric lat and lng' });
            }
        }

        try {
            const route = await routeService.create(device_id, request.user!.id, name, waypoints);
            return reply.code(201).send(route);
        } catch (err: any) {
            request.log.error(err, 'Failed to create route');
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    /**
     * GET /routes/:id
     */
    fastify.get('/routes/:id', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const route = await routeService.getById(id);
        if (!route) {
            return reply.code(404).send({ error: 'Not Found' });
        }
        return route;
    });

    /**
     * DELETE /routes/:id
     * Only draft routes can be deleted.
     */
    fastify.delete('/routes/:id', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        try {
            await routeService.deleteDraft(id, request.user!.id);
            return reply.code(200).send({ message: 'Route deleted' });
        } catch (err: any) {
            if (err.statusCode) {
                return reply.code(err.statusCode).send({ error: err.message });
            }
            request.log.error(err, 'Failed to delete route');
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    /**
     * POST /routes/:id/start
     * Dispatches the route. Validates preconditions, publishes to MQTT.
     */
    fastify.post('/routes/:id/start', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        try {
            const route = await routeService.dispatch(id, request.user!.id);
            return reply.code(200).send(route);
        } catch (err: any) {
            if (err.statusCode) {
                return reply.code(err.statusCode).send({ error: err.message });
            }
            request.log.error(err, 'Failed to dispatch route');
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    /**
     * POST /routes/:id/stop
     * Aborts the active route.
     */
    fastify.post('/routes/:id/stop', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        try {
            await routeService.abort(id, request.user!.id);
            return reply.code(200).send({ message: 'Route aborted' });
        } catch (err: any) {
            if (err.statusCode) {
                return reply.code(err.statusCode).send({ error: err.message });
            }
            request.log.error(err, 'Failed to abort route');
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });
};

export default routeRoutes;
