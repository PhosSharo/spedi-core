import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
    id: string;
    email: string;
    is_superuser: boolean;
}

export class AuthService {
    private supabase: SupabaseClient;
    private jwtSecret: string | undefined;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
        this.jwtSecret = process.env.SUPABASE_JWT_SECRET;

        if (!this.jwtSecret) {
            console.error('FATAL: SUPABASE_JWT_SECRET is missing. Required for local JWT verification.');
            process.exit(1);
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async login(email: string, password: string) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    }

    async logout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
    }

    /**
     * Verifies a JWT locally, without any network call.
     */
    async verifyToken(token: string): Promise<AuthenticatedUser | null> {
        try {
            const decoded = jwt.verify(token, this.jwtSecret!) as any;
            return {
                id: decoded.sub,
                email: decoded.email,
                is_superuser: decoded.app_metadata?.is_superuser === true,
            };
        } catch (err) {
            console.warn('Local JWT verification failed:', err);
            return null;
        }
    }
}

export const authService = new AuthService();
