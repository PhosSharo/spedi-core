'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getToken, setToken, logoutDirect, getCurrentUser } from '@/lib/auth-store';
import { getApiUrl } from '@/lib/api';
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
            try {
                const userData = await getCurrentUser();
                if (!userData) throw new Error('Not authenticated');
                setUser(userData);
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
            <div className="min-h-screen bg-background flex flex-col gap-4 items-center justify-center text-muted-foreground">
                <RiLoader4Line className="animate-spin" size={24} />
                <p className="text-[10px] uppercase font-mono tracking-widest">SYS_INIT :: VERIFY_CREDENTIALS</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-foreground selection:text-background font-mono">
            <Navbar user={user} onLogout={handleLogout} />

            <main className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
                <div className="border-b border-border pb-4 flex items-end justify-between">
                    <div>
                        <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">API_Documentation //</h1>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Interactive reference generated from the OpenAPI spec.</p>
                    </div>
                </div>

                <div className="rounded-sm border border-border overflow-hidden bg-background flex-1 flex flex-col">
                    <ApiReferenceReact
                        configuration={{
                            url: `${getApiUrl()}/openapi.json`,
                            theme: 'kepler',
                            layout: 'classic',
                            hideModels: false,
                            hideDownloadButton: false,
                            darkMode: true,
                            searchHotKey: 'k',
                            authentication: {
                                preferredSecurityScheme: 'BearerAuth',
                            },
                        }}
                    />
                </div>
            </main>
        </div>
    );
}
