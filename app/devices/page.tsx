'use client';

import { useEffect, useState } from 'react';
import { RiLoader4Line, RiDeleteBinLine, RiAddLine, RiServerLine } from "@remixicon/react";
import { apiFetch } from '@/lib/api';

interface Device { id: string; name: string; }

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [creatingDevice, setCreatingDevice] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const devRes = await apiFetch('/devices');
                if (devRes.ok) setDevices(await devRes.json());
            } catch (err) {
                console.error('Failed to load devices:', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const deleteDevice = async (id: string, name: string) => {
        if (!confirm(`Delete device "${name}"? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await apiFetch(`/devices/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            setDevices(prev => prev.filter(d => d.id !== id));
        } catch (err: any) {
            console.error('Failed to delete device:', err);
            alert(`Failed: ${err.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    const createTestDevice = async () => {
        setCreatingDevice(true);
        try {
            const timestamp = String(Date.now()).slice(-4);
            const res = await apiFetch('/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `test-boat-${timestamp}`,
                    mqtt_client_id: `test-client-${timestamp}`,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            const newDevice = await res.json();
            setDevices(prev => [...prev, newDevice]);
        } catch (err: any) {
            console.error('Failed to create test device:', err);
            alert(`Failed: ${err.message}`);
        } finally {
            setCreatingDevice(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 lg:p-6 flex items-center justify-center h-full text-muted-foreground">
                <RiLoader4Line className="animate-spin" size={24} />
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 flex flex-col gap-4 h-full">
            <div className="border-b border-border pb-4 flex items-end justify-between">
                <div>
                    <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">Device_Management //</h1>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Provision and manage registered hardware units</p>
                </div>
            </div>

            <div className="flex flex-col gap-4 flex-1">
                <div className="rounded-sm border border-border bg-background p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                        <h2 className="text-xs font-bold tracking-widest uppercase font-sans text-foreground mb-1">Provisioning</h2>
                        <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest">Generate ephemeral test devices to simulate hardware endpoints</p>
                    </div>
                    <button
                        onClick={createTestDevice}
                        disabled={creatingDevice}
                        className="inline-flex shrink-0 items-center justify-center min-w-[140px] gap-2 bg-foreground hover:bg-muted-foreground disabled:bg-muted disabled:text-muted-foreground text-background font-bold px-4 py-2 rounded-sm transition-colors text-[10px] uppercase tracking-widest font-sans"
                    >
                        {creatingDevice ? <RiLoader4Line className="animate-spin" size={14} /> : <RiAddLine size={14} />}
                        {creatingDevice ? 'Creating...' : 'Create Test Device'}
                    </button>
                </div>

                <div className="rounded-sm border border-border bg-background overflow-hidden flex-1 flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-muted/30">
                                <tr className="border-b border-border text-foreground font-sans uppercase tracking-widest text-[10px]">
                                    <th className="px-4 py-3 font-bold">Device Name</th>
                                    <th className="px-4 py-3 font-bold">Device ID</th>
                                    <th className="px-4 py-3 font-bold">Status</th>
                                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {devices.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground uppercase tracking-widest text-[10px] font-sans">
                                            <div className="flex flex-col items-center justify-center opacity-50">
                                                <RiServerLine size={24} className="mb-2" />
                                                No devices registered in the system
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    devices.map((d) => (
                                        <tr key={d.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="px-4 py-3 font-bold text-foreground">
                                                {d.name}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground font-mono">
                                                {d.id}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[9px] border border-border bg-muted/30 px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-bold">Registered</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => deleteDevice(d.id, d.name)}
                                                    disabled={deletingId === d.id}
                                                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 text-[10px] uppercase tracking-widest font-sans bg-background border border-border px-2 py-1 rounded-sm hover:border-foreground"
                                                >
                                                    {deletingId === d.id ? <RiLoader4Line className="animate-spin" size={12} /> : <RiDeleteBinLine size={12} />}
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
