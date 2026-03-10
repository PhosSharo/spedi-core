require('ts-node').register({ transpileOnly: true });
const fastify = require('fastify')({
    ajv: { customOptions: { strict: false } }
});
const swagger = require('@fastify/swagger');

process.env.SUPABASE_URL = 'http://test';
process.env.SUPABASE_ANON_KEY = 'test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';

fastify.register(swagger, {
    openapi: {
        info: { title: 'Test', version: '1' },
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    }
});

fastify.decorate('authenticate', async () => {});

fastify.register(require('./src/routes/users').default);

fastify.ready().then(() => {
    const spec = fastify.swagger();
    console.log(JSON.stringify(spec.paths, null, 2));
}).catch(console.error);
