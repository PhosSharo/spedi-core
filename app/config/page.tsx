'use client';

import { useEffect, useState } from 'react';
import { RiRobot2Line, RiSettings4Line, RiLoader4Line, RiLogoutBoxRLine, RiSave3Line, RiCloseLine, RiEdit2Line, RiCheckLine } from "@remixicon/react";
import { apiFetch } from '@/lib/api';

interface ConfigRow {
    id: number;
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
    updated_by: string | null;
}

export default function ConfigManager() {
    const [configData, setConfigData] = useState<ConfigRow[]>([]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const resConfig = await apiFetch('/config');
                if (!resConfig.ok) {
                    throw new Error('Failed to fetch config');
                }

                const data = await resConfig.json();
                setConfigData(data);
            } catch (err) {
                console.error('Failed to load config manager:', err);
                setError('Failed to fetch configuration data.');
            }
        };

        fetchConfig();
    }, []);

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
        setSuccess(null);
        try {
            const res = await apiFetch('/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
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
            setSuccess('Configuration saved. The backend is reloading to apply changes; this may take a few seconds.');

            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setSuccess(null);
            }, 5000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 lg:p-6 flex flex-col gap-4 h-full">
            <div className="border-b border-border pb-4 flex items-end justify-between">
                <div>
                    <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">System_Configuration //</h1>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Manage global system parameters and environmental settings.</p>
                </div>
            </div>

            {error && (
                <div className="rounded-sm bg-foreground text-background border border-foreground p-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 font-sans">
                    <RiCloseLine size={16} />
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-sm bg-background text-foreground border border-foreground p-3 text-[10px] uppercase font-sans tracking-widest flex items-center gap-2">
                    <RiCheckLine size={16} />
                    {success}
                </div>
            )}

            <div className="rounded-sm border border-border bg-background flex-1 flex flex-col">
                <div className="overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-muted/30 text-foreground text-[10px] uppercase tracking-widest font-sans border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-bold">Key</th>
                                <th className="px-4 py-3 font-bold">Value</th>
                                <th className="px-4 py-3 font-bold">Description</th>
                                <th className="px-4 py-3 font-bold">Last Updated</th>
                                <th className="px-4 py-3 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {configData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground uppercase tracking-widest font-sans text-[10px]">
                                        No configuration keys found.
                                    </td>
                                </tr>
                            ) : (
                                configData.map((row) => (
                                    <tr key={row.key} className="hover:bg-muted/50 transition-colors group">
                                        <td className="px-4 py-3 font-mono text-foreground font-bold whitespace-nowrap">
                                            {row.key}
                                        </td>
                                        <td className="px-4 py-3 font-mono max-w-xs truncate">
                                            {editingKey === row.key ? (
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-full bg-background border border-foreground rounded-sm px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                                    autoFocus
                                                    disabled={saving}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSave(row.key);
                                                        if (e.key === 'Escape') handleEditCancel();
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground">{row.value}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-[10px] uppercase font-sans tracking-wide max-w-sm">
                                            {row.description || <span className="italic opacity-50">NULL</span>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-[10px] uppercase font-sans tracking-widest whitespace-nowrap">
                                            {new Date(row.updated_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {editingKey === row.key ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSave(row.key)}
                                                        disabled={saving}
                                                        className="p-1 text-background bg-foreground hover:bg-muted-foreground rounded-sm transition-colors disabled:opacity-50 border border-foreground"
                                                        title="Save"
                                                    >
                                                        {saving ? <RiLoader4Line className="animate-spin" size={16} /> : <RiSave3Line size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={handleEditCancel}
                                                        disabled={saving}
                                                        className="p-1 text-foreground hover:text-background hover:bg-foreground rounded-sm transition-colors disabled:opacity-50 border border-border"
                                                        title="Cancel"
                                                    >
                                                        <RiCloseLine size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEditStart(row)}
                                                    className="p-1 text-muted-foreground hover:text-foreground bg-transparent rounded-sm transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    title="Edit Value"
                                                >
                                                    <RiEdit2Line size={16} />
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
        </div>
    );
}
