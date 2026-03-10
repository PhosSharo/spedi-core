'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getToken, setToken, logoutDirect } from '@/lib/auth-store';
import { RiLoader4Line } from "@remixicon/react";
import { Navbar } from '../components/navbar';

// Scalar styles
import '@scalar/api-reference-react/style.css';

export default function DocsPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ email: string; is_superuser: boolean } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const token = getToken();
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    throw new Error('Invalid token');
                }

                const data = await res.json();
                setUser(data);
            } catch (err) {
                console.error('Auth verification failed:', err);
                setToken(null);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    const handleLogout = async () => {
        try {
            const token = getToken();
            if (token) {
                fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => { });
            }
            await logoutDirect();
        } catch (err) {
            console.error('Logout failed:', err);
            setToken(null);
        } finally {
            router.push('/login');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col gap-4 items-center justify-center text-zinc-500">
                <RiLoader4Line className="animate-spin" size={32} />
                <p className="text-sm font-medium tracking-tight">Verifying credentials...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-zinc-50 selection:bg-indigo-500/30 flex flex-col">
            <Navbar user={user} onLogout={handleLogout} />

            <main className="flex-1 overflow-hidden">
                <ApiReferenceReact
                    configuration={{
                        url: '/api/openapi.json',
                        theme: 'none', // We'll let the dark mode prevail or customize via CSS
                        darkMode: true,
                        hideDownloadButton: true,
                    }}
                />
            </main>

            <style jsx global>{`
        /* Scalar Customizations to match SPEDI aesthetic */
        .scalar-app {
          --scalar-font-header: inherit;
          --scalar-font: inherit;
          --scalar-color-1: #ffffff;
          --scalar-color-2: #a1a1aa;
          --scalar-color-3: #71717a;
          --scalar-color-accent: #6366f1;
          --scalar-background-1: #0d0d0d;
          --scalar-background-2: #18181b;
          --scalar-background-3: #27272a;
          --scalar-background-accent: rgba(99, 102, 241, 0.1);
          --scalar-border-color: #27272a;
          --scalar-radius: 0.75rem;
          --scalar-radius-lg: 1rem;
          --scalar-shadow-1: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          height: calc(100vh - 65px) !important;
        }
        
        /* Hide default Scalar sidebar search if redundant or weirdly styled */
        .scalar-sidebar-search {
          border-radius: 0.5rem !important;
          background: #18181b !important;
        }
      `}</style>
        </div>
    );
}
