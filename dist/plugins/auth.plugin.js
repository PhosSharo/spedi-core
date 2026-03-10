"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const auth_service_1 = require("../services/auth.service");
exports.default = (0, fastify_plugin_1.default)(async function authPlugin(fastify) {
    fastify.decorateRequest('user', undefined);
    fastify.decorate('authenticate', async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Missing or invalid token' });
        }
        const token = authHeader.split(' ')[1];
        const user = await auth_service_1.authService.verifyToken(token);
        if (!user) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
        }
        request.user = user;
    });
});
