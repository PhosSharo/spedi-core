import 'dotenv/config';
import Fastify from 'fastify';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import authPlugin from './plugins/auth.plugin';

import { createClient } from '@supabase/supabase-js';

const fastify = Fastify({
    logger: true
});

// Configure Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    fastify.log.error('FATAL: SUPABASE_URL and SUPABASE_ANON_KEY must be provided');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Register plugins
fastify.register(authPlugin);

// Register routes
fastify.register(healthRoutes);
fastify.register(authRoutes);

const start = async () => {
    try {
        // Fail-fast database check
        fastify.log.info('Validating Supabase connection...');
        const { error } = await supabase.from('config').select('id').limit(1);

        if (error) {
            fastify.log.error({ err: error, message: error.message }, 'FATAL: Failed to connect to Supabase or execute simple query');
            process.exit(1);
        }
        fastify.log.info('Supabase connection verified successfully.');

        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
