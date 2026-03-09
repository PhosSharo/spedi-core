"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = healthRoutes;
async function healthRoutes(fastify) {
    fastify.get('/health', async () => {
        return { status: 'ok' };
    });
}
