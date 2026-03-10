import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { configService } from '../services/config.service';
import { mqttService } from '../services/mqtt.service';

const ErrorResponse = {
    type: 'object',
    properties: {
        error: { type: 'string' },
    },
};

const ConfigEntry = {
    type: 'object',
    properties: {
        id: { type: 'number' },
        key: { type: 'string' },
        value: { type: 'string' },
        description: { type: 'string', nullable: true },
        updated_at: { type: 'string', format: 'date-time' },
        updated_by: { type: 'string', format: 'uuid', nullable: true },
    },
};

export default async function configRoutes(fastify: FastifyInstance) {
    /**
     * GET /config
     */
    fastify.get('/config', {
        onRequest: [fastify.authenticate],
        schema: {
            tags: ['Config'],
            summary: 'Get all configuration entries',
            description: 'Returns all system configuration key-value pairs. Superuser only.',
            security: [{ BearerAuth: [] }],
            response: {
                200: {
                    type: 'array',
                    items: ConfigEntry,
                },
                403: ErrorResponse,
            },
        },
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;
        if (!user || !user.is_superuser) {
            return reply.status(403).send({ error: 'Forbidden: Superuser access required' });
        }
        return configService.getAll();
    });

    /**
     * PUT /config
     */
    fastify.put('/config', {
        onRequest: [fastify.authenticate],
        schema: {
            tags: ['Config'],
            summary: 'Update configuration entries',
            description: 'Batch-updates configuration key-value pairs. Superuser only.',
            security: [{ BearerAuth: [] }],
            body: {
                type: 'object',
                required: ['updates'],
                properties: {
                    updates: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['key', 'value'],
                            properties: {
                                original_key: { type: 'string' },
                                key: { type: 'string' },
                                value: { type: 'string' },
                            },
                        },
                    },
                },
                example: {
                    updates: [
                        { key: "telemetry_interval_ms", value: "1000" }
                    ]
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        reloaded: { type: 'boolean' },
                    },
                },
                400: ErrorResponse,
                403: ErrorResponse,
                500: ErrorResponse,
            },
        },
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;
        if (!user || !user.is_superuser) {
            return reply.status(403).send({ error: 'Forbidden: Superuser access required' });
        }

        const { updates } = request.body as { updates: { original_key?: string; key: string; value: string }[] };

        if (!updates || !Array.isArray(updates)) {
            return reply.status(400).send({ error: 'Invalid payload: updates must be an array' });
        }

        try {
            const result = await configService.update(updates, user.id);
            if (result.mqttNeedsReload) {
                mqttService.reload().catch(err => request.log.error(err, 'Failed to reload MQTT service'));
            }
            return { success: true, reloaded: true };
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Failed to update configuration' });
        }
    });
}
