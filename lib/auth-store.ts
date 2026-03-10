import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

let memoryToken: string | null = null;

export const setToken = (t: string | null) => {
    memoryToken = t;
};

export const getToken = () => memoryToken;

/**
 * Login directly via Supabase Auth — no backend round-trip needed.
 * The JWT returned here is the same Supabase JWT that the backend
 * auth plugin verifies, so all existing getToken() consumers work unchanged.
 */
export async function loginDirect(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    memoryToken = data.session.access_token;
    return {
        user: {
            id: data.user.id,
            email: data.user.email!,
            is_superuser: data.user.app_metadata?.is_superuser === true,
        },
        session: data.session,
    };
}

/**
 * Logout — clears local Supabase session and wipes in-memory token.
 * Caller should also call DELETE /api/session or POST /api/auth/logout
 * separately to clean up any active control session on the backend.
 */
export async function logoutDirect() {
    await supabase.auth.signOut();
    memoryToken = null;
}
