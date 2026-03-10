import { getToken } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

/**
 * Centralised fetch helper that:
 *  1. Prepends the correct backend URL (Railway in prod, localhost in dev).
 *  2. Attaches the in-memory JWT as a Bearer token.
 *
 * Usage:  const res = await apiFetch('/devices');
 */
export async function apiFetch(
    path: string,
    options: RequestInit = {},
): Promise<Response> {
    const token = getToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${API_URL}${path}`, { ...options, headers });
}

/** The raw backend base URL — used for SSE/WebSocket where apiFetch can't be used. */
export function getApiUrl(): string {
    return API_URL;
}

/**
 * Returns a WebSocket-compatible base URL derived from the API URL.
 * http://... → ws://...
 * https://... → wss://...
 */
export function getWsUrl(): string {
    return API_URL.replace(/^http/, 'ws');
}
