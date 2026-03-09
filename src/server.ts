import Fastify from 'fastify';
import healthRoutes from './routes/health';

const fastify = Fastify({
    logger: true
});

// Register routes
fastify.register(healthRoutes);

const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
