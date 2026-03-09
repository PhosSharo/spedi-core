import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { deviceService } from '../services/device.service';

export default async function deviceRoutes(fastify: FastifyInstance) {
    /**
     * GET /devices
     * Lists all devices.
     */
    fastify.get('/devices', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const devices = await deviceService.listDevices();
        return devices;
    });

    /**
     * GET /devices/:id
     * Returns full device record.
     */
    fastify.get('/devices/:id', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const device = await deviceService.getDeviceById(id);

        if (!device) {
            return reply.status(404).send({ error: 'Device not found' });
        }

        return device;
    });

    /**
     * POST /devices
     * Registers a new device.
     * Body: { name: string, mqtt_client_id: string }
     * Restricted to superusers.
     */
    fastify.post('/devices', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;
        if (!user || !user.is_superuser) {
            return reply.status(403).send({ error: 'Forbidden: Superuser access required' });
        }

        const { name, mqtt_client_id } = request.body as { name: string; mqtt_client_id: string };

        if (!name || !mqtt_client_id) {
            return reply.status(400).send({ error: 'Missing required fields: name, mqtt_client_id' });
        }

        try {
            const device = await deviceService.registerDevice(name, mqtt_client_id, user.id);
            return reply.status(201).send(device);
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Failed to register device' });
        }
    });

    /**
     * GET /devices/:id/state
     * Returns the shadow state (currently a stub).
     */
    fastify.get('/devices/:id/state', {
        onRequest: [fastify.authenticate],
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };

        // Verify device exists
        const device = await deviceService.getDeviceById(id);
        if (!device) {
            return reply.status(404).send({ error: 'Device not found' });
        }

        return deviceService.getStateStub(id);
    });
}
