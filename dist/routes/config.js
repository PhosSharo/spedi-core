"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = configRoutes;
const config_service_1 = require("../services/config.service");
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
async function configRoutes(fastify) {
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
    }, async (request, reply) => {
        const user = request.user;
        if (!user || !user.is_superuser) {
            return reply.status(403).send({ error: 'Forbidden: Superuser access required' });
        }
        return config_service_1.configService.getAll();
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
                                key: { type: 'string' },
                                value: { type: 'string' },
                            },
                        },
                    },
                },
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
    }, async (request, reply) => {
        const user = request.user;
        if (!user || !user.is_superuser) {
            return reply.status(403).send({ error: 'Forbidden: Superuser access required' });
        }
        const { updates } = request.body;
        if (!updates || !Array.isArray(updates)) {
            return reply.status(400).send({ error: 'Invalid payload: updates must be an array' });
        }
        try {
            await config_service_1.configService.update(updates, user.id);
            return { success: true, reloaded: true };
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Failed to update configuration' });
        }
    });
}
