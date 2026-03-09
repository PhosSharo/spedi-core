'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/auth-store';
import { RiRobot2Line, RiLoader4Line, RiErrorWarningLine } from '@remixicon/react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // In-memory token storage constraint
            setToken(data.session.access_token);
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-50 flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.1),transparent)]" />

            <div className="w-full max-w-sm relative z-10 border border-zinc-800 bg-zinc-950 p-8 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex bg-indigo-500/10 text-indigo-400 p-2 rounded-lg">
                        <RiRobot2Line size={24} />
                    </div>
                    <h1 className="text-xl font-medium tracking-tight">SPEDI Console</h1>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-400">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-400">Security Key</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                            required
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2.5 rounded-lg mt-2">
                            <RiErrorWarningLine size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <RiLoader4Line className="animate-spin" size={16} /> : "Authenticate"}
                    </button>
                </form>
            </div>

            <p className="mt-8 text-xs text-zinc-500 z-10">Unauthorized access is strictly prohibited.</p>
        </div>
    );
}
