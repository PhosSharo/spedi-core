'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiRobot2Line, RiSettings4Line, RiLoader4Line, RiLogoutBoxRLine, RiSave3Line, RiCloseLine, RiEdit2Line } from "@remixicon/react";
import { getToken, setToken, logoutDirect } from '@/lib/auth-store';

interface ConfigRow {
    id: number;
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
    updated_by: string | null;
}

export default function ConfigManager() {
    const [loading, setLoading] = useState(true);
    const [configData, setConfigData] = useState<ConfigRow[]>([]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ email: string; is_superuser: boolean } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuthAndFetchConfig = async () => {
            const token = getToken();
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                // 1. Verify Auth and Superuser status
                const resAuth = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!resAuth.ok) throw new Error('Invalid token');
                const userData = await resAuth.json();

                if (!userData.is_superuser) {
                    router.push('/');
                    return;
                }

                setUser(userData);

                // 2. Fetch Config Data
                const resConfig = await fetch('/api/config', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!resConfig.ok) {
                    throw new Error('Failed to fetch config');
                }

                const data = await resConfig.json();
                setConfigData(data);

            } catch (err) {
                console.error('Failed to load config manager:', err);
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetchConfig();
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

    const handleEditStart = (row: ConfigRow) => {
        setEditingKey(row.key);
        setEditValue(row.value);
        setError(null);
    };

    const handleEditCancel = () => {
        setEditingKey(null);
        setEditValue('');
        setError(null);
    };

    const handleSave = async (key: string) => {
        setSaving(true);
        setError(null);
        try {
            const token = getToken();
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ updates: [{ key, value: editValue }] })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save configuration');
            }

            // Update local state with the saved value and fresh timestamp
            setConfigData(prev => prev.map(row =>
                row.key === key
                    ? { ...row, value: editValue, updated_at: new Date().toISOString() }
                    : row
            ));

            setEditingKey(null);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col gap-4 items-center justify-center text-zinc-500">
                <RiLoader4Line className="animate-spin" size={32} />
                <p className="text-sm font-medium tracking-tight">Loading Config Manager...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30">
            {/* Navigation */}
            <nav className="border-b border-zinc-800 bg-zinc-900/50 p-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 font-medium hover:text-indigo-400 transition-colors"
                    >
                        <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-md">
                            <RiRobot2Line size={20} />
                        </div>
                        SPEDI Platform
                    </button>
                    <div className="h-4 w-px bg-zinc-800"></div>
                    <div className="flex items-center gap-2 text-zinc-300 font-medium">
                        <RiSettings4Line size={18} className="text-emerald-400" />
                        Config Manager
                    </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400 font-mono">
                        {user?.email}
                        <span className="ml-2 text-emerald-400 font-sans font-medium bg-emerald-400/10 px-2 py-0.5 rounded">Superuser</span>
                    </span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                    >
                        <RiLogoutBoxRLine size={16} /> Logout
                    </button>
                </div>
            </nav>

            <main className="container mx-auto max-w-6xl px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
                    <p className="mt-2 text-zinc-400">Manage global system parameters and environmental settings.</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm flex items-center gap-2">
                        <RiCloseLine size={18} />
                        {error}
                    </div>
                )}

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Key</th>
                                    <th className="px-6 py-4 font-medium">Value</th>
                                    <th className="px-6 py-4 font-medium">Description</th>
                                    <th className="px-6 py-4 font-medium">Last Updated</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {configData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                            No configuration keys found.
                                        </td>
                                    </tr>
                                ) : (
                                    configData.map((row) => (
                                        <tr key={row.key} className="hover:bg-zinc-800/20 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-emerald-400/90 whitespace-nowrap">
                                                {row.key}
                                            </td>
                                            <td className="px-6 py-4 font-mono max-w-xs truncate">
                                                {editingKey === row.key ? (
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-full bg-zinc-950 border border-indigo-500/50 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        autoFocus
                                                        disabled={saving}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSave(row.key);
                                                            if (e.key === 'Escape') handleEditCancel();
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-zinc-300">{row.value}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500 max-w-sm">
                                                {row.description || <span className="italic opacity-50">No description</span>}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500 text-xs whitespace-nowrap">
                                                {new Date(row.updated_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingKey === row.key ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleSave(row.key)}
                                                            disabled={saving}
                                                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50"
                                                            title="Save"
                                                        >
                                                            {saving ? <RiLoader4Line className="animate-spin" size={18} /> : <RiSave3Line size={18} />}
                                                        </button>
                                                        <button
                                                            onClick={handleEditCancel}
                                                            disabled={saving}
                                                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                                                            title="Cancel"
                                                        >
                                                            <RiCloseLine size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditStart(row)}
                                                        className="p-1.5 text-zinc-500 hover:text-indigo-400 bg-transparent rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Edit Value"
                                                    >
                                                        <RiEdit2Line size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
