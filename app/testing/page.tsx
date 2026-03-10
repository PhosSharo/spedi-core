'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    RiLoader4Line, RiGamepadLine, RiRouteLine,
    RiPlayLine, RiStopLine, RiWifiLine, RiWifiOffLine,
    RiArrowUpLine, RiArrowDownLine, RiArrowLeftLine, RiArrowRightLine, RiStopCircleLine,
    RiDeleteBinLine, RiAddLine
} from "@remixicon/react";
import { getToken, setToken, logoutDirect, getCurrentUser } from '@/lib/auth-store';
import { apiFetch, getWsUrl } from '@/lib/api';
import { Navbar } from '../components/navbar';

interface Device { id: string; name: string; }

// ── Joystick Simulator ───────────────────────────────────────────────
function JoystickSimulator({ devices }: { devices: Device[] }) {
    const [deviceId, setDeviceId] = useState(devices[0]?.id || '');
    const [sessionActive, setSessionActive] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [throttle, setThrottle] = useState(0);
    const [steering, setSteering] = useState(0);
    const [log, setLog] = useState<string[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = (msg: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    };

    const openSession = async () => {
        if (!deviceId) return;

        try {
            const res = await apiFetch('/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: deviceId }),
            });

            if (res.status === 409) {
                addLog('⚠️ Session conflict — device already claimed');
                return;
            }

            if (!res.ok) throw new Error(`Session open failed: ${res.status}`);

            const data = await res.json();
            setSessionActive(true);
            addLog(`✅ Session opened: ${data.sessionId}`);

            // Connect WebSocket
            connectWs();
        } catch (err: any) {
            addLog(`❌ ${err.message}`);
        }
    };

    const connectWs = () => {
        const token = getToken();
        if (!token) return;

        const wsBaseUrl = getWsUrl();
        const wsUrl = `${wsBaseUrl}/control?token=${token}`;

        addLog(`🔌 Connecting WS to ${wsUrl.split('?')[0]}...`);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsConnected(true);
            addLog('🟢 WebSocket connected');
        };

        ws.onclose = (e) => {
            setWsConnected(false);
            addLog(`🔴 WebSocket closed: ${e.code} ${e.reason || ''}`);
        };

        ws.onerror = () => {
            addLog('❌ WebSocket error');
        };

        ws.onmessage = (e) => {
            addLog(`📥 Received: ${e.data}`);
        };
    };

    const sendCommand = useCallback(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const payload = {
            type: 'joystick',
            payload: { throttle, steering },
        };
        wsRef.current.send(JSON.stringify(payload));
        addLog(`📤 Sent: throttle=${throttle} steering=${steering}`);
    }, [throttle, steering]);

    const startContinuous = () => {
        if (intervalRef.current) return;
        intervalRef.current = setInterval(() => {
            sendCommand();
        }, 200);
        addLog('🔁 Continuous send started (200ms interval)');
    };

    const stopContinuous = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            addLog('⏹️ Continuous send stopped');
        }
    };

    const closeSession = async () => {
        stopContinuous();
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            await apiFetch('/session', { method: 'DELETE' });
            addLog('🛑 Session closed');
        } catch (err: any) {
            addLog(`❌ Close failed: ${err.message}`);
        }

        setSessionActive(false);
        setWsConnected(false);
    };

    // Keyboard controls
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!wsConnected) return;
            if (e.key === 'ArrowUp') setThrottle(prev => Math.min(prev + 10, 100));
            if (e.key === 'ArrowDown') setThrottle(prev => Math.max(prev - 10, -100));
            if (e.key === 'ArrowLeft') setSteering(prev => Math.max(prev - 10, -100));
            if (e.key === 'ArrowRight') setSteering(prev => Math.min(prev + 10, 100));
            if (e.key === ' ') { setThrottle(0); setSteering(0); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [wsConnected]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopContinuous();
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    return (
        <div className="rounded-sm border border-border bg-background p-4 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
                <div className="bg-foreground text-background p-1.5 rounded-sm">
                    <RiGamepadLine size={16} />
                </div>
                <div>
                    <h2 className="text-xs font-bold tracking-widest uppercase font-sans text-foreground">Joystick_Simulator</h2>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {wsConnected ? (
                        <span className="flex items-center gap-1.5 text-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm border border-foreground/30 bg-foreground/5">
                            <RiWifiLine size={12} /> Connected
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm border border-border bg-muted/30">
                            <RiWifiOffLine size={12} /> Disconnected
                        </span>
                    )}
                </div>
            </div>

            {/* Device + Session Controls */}
            <div className="flex wrap items-end gap-3 mb-4 bg-muted/30 p-3 rounded-sm border border-border">
                <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Target_Device</label>
                    <select
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        disabled={sessionActive}
                        className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-foreground disabled:opacity-50"
                    >
                        {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                {!sessionActive ? (
                    <button onClick={openSession} className="flex items-center justify-center gap-2 bg-foreground hover:bg-muted-foreground text-background font-bold px-4 py-1.5 rounded-sm transition-colors text-[10px] uppercase tracking-widest font-sans">
                        <RiPlayLine size={14} /> Open_Session
                    </button>
                ) : (
                    <button onClick={closeSession} className="flex items-center justify-center gap-2 bg-background border border-foreground hover:bg-foreground hover:text-background text-foreground font-bold px-4 py-1.5 rounded-sm transition-colors text-[10px] uppercase tracking-widest font-sans">
                        <RiStopLine size={14} /> Close_Session
                    </button>
                )}
            </div>

            {/* Joystick Controls */}
            {wsConnected && (
                <div className="mb-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Sliders */}
                        <div className="space-y-4 bg-muted/20 p-3 rounded-sm border border-border">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between font-sans">
                                    <span>Throttle</span>
                                    <span className="text-foreground font-mono">{throttle}</span>
                                </label>
                                <input
                                    type="range" min={-100} max={100} value={throttle}
                                    onChange={(e) => setThrottle(parseInt(e.target.value))}
                                    className="w-full mt-2 accent-foreground h-1 bg-border rounded-none appearance-none cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between font-sans">
                                    <span>Steering</span>
                                    <span className="text-foreground font-mono">{steering}</span>
                                </label>
                                <input
                                    type="range" min={-100} max={100} value={steering}
                                    onChange={(e) => setSteering(parseInt(e.target.value))}
                                    className="w-full mt-2 accent-foreground h-1 bg-border rounded-none appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* D-pad + actions */}
                        <div className="flex flex-col items-center gap-3 bg-muted/20 p-3 rounded-sm border border-border">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-sans font-bold">D-PAD_INPUT</p>
                            <div className="grid grid-cols-3 gap-1">
                                <div />
                                <button onClick={() => setThrottle(prev => Math.min(prev + 10, 100))} className="bg-background border border-border hover:bg-muted p-2 rounded-sm transition-colors text-foreground flex items-center justify-center"><RiArrowUpLine size={14} /></button>
                                <div />
                                <button onClick={() => setSteering(prev => Math.max(prev - 10, -100))} className="bg-background border border-border hover:bg-muted p-2 rounded-sm transition-colors text-foreground flex items-center justify-center"><RiArrowLeftLine size={14} /></button>
                                <button onClick={() => { setThrottle(0); setSteering(0); }} className="bg-background border border-foreground hover:bg-foreground hover:text-background p-2 rounded-sm transition-colors text-foreground flex items-center justify-center"><RiStopCircleLine size={14} /></button>
                                <button onClick={() => setSteering(prev => Math.min(prev + 10, 100))} className="bg-background border border-border hover:bg-muted p-2 rounded-sm transition-colors text-foreground flex items-center justify-center"><RiArrowRightLine size={14} /></button>
                                <div />
                                <button onClick={() => setThrottle(prev => Math.max(prev - 10, -100))} className="bg-background border border-border hover:bg-muted p-2 rounded-sm transition-colors text-foreground flex items-center justify-center"><RiArrowDownLine size={14} /></button>
                                <div />
                            </div>

                            <div className="flex gap-2 mt-auto w-full">
                                <button onClick={sendCommand} className="flex-1 bg-background border border-foreground hover:bg-foreground hover:text-background text-foreground text-[10px] font-bold px-2 py-1.5 rounded-sm transition-colors uppercase tracking-widest font-sans">
                                    Tx_Once
                                </button>
                                <button
                                    onClick={intervalRef.current ? stopContinuous : startContinuous}
                                    className={`flex-1 text-[10px] font-bold px-2 py-1.5 rounded-sm transition-colors uppercase tracking-widest font-sans border ${intervalRef.current ? 'bg-foreground border-foreground text-background' : 'bg-background border-border hover:border-foreground text-foreground'}`}
                                >
                                    {intervalRef.current ? 'Halt_Tx' : 'Stream_Tx'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Log */}
            <div className="mt-auto bg-muted/10 border-t border-border p-3 max-h-40 overflow-y-auto font-mono text-[9px] text-muted-foreground space-y-0.5 leading-tight">
                {log.length === 0 ? (
                    <p className="opacity-50 font-sans uppercase tracking-widest text-[9px] font-bold">Event log will appear here...</p>
                ) : log.map((l, i) => <p key={i}>{l}</p>)}
            </div>
        </div>
    );
}

// ── Path Simulator ───────────────────────────────────────────────────
function PathSimulator({ devices }: { devices: Device[] }) {
    const [deviceId, setDeviceId] = useState(devices[0]?.id || '');
    const [routeName, setRouteName] = useState('Test Route');
    const [waypointsText, setWaypointsText] = useState(
        JSON.stringify([
            { lat: 13.7563, lng: 100.5018 },
            { lat: 13.7570, lng: 100.5025 },
            { lat: 13.7580, lng: 100.5030 },
        ], null, 2)
    );
    const [routeId, setRouteId] = useState<string | null>(null);
    const [routeStatus, setRouteStatus] = useState<string | null>(null);
    const [log, setLog] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const addLog = (msg: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    };

    const apiCall = async (method: string, path: string, body?: any) => {
        const res = await apiFetch(path, {
            method,
            headers: { 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || data.message || `HTTP ${res.status}`);
        }
        return data;
    };

    const createRoute = async () => {
        setBusy(true);
        try {
            let waypoints;
            try {
                waypoints = JSON.parse(waypointsText);
            } catch {
                addLog('❌ Invalid JSON in waypoints');
                return;
            }

            const route = await apiCall('POST', '/routes', {
                device_id: deviceId,
                name: routeName,
                waypoints,
            });

            setRouteId(route.id);
            setRouteStatus(route.status);
            addLog(`✅ Route created: ${route.id} (${route.status})`);
        } catch (err: any) {
            addLog(`❌ ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const dispatchRoute = async () => {
        if (!routeId) return;
        setBusy(true);
        try {
            const route = await apiCall('POST', `/routes/${routeId}/start`);
            setRouteStatus(route.status);
            addLog(`🚀 Route dispatched! Status: ${route.status}`);
        } catch (err: any) {
            addLog(`❌ Dispatch failed: ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const abortRoute = async () => {
        if (!routeId) return;
        setBusy(true);
        try {
            await apiCall('POST', `/routes/${routeId}/stop`);
            setRouteStatus('aborted');
            addLog('🛑 Route aborted');
        } catch (err: any) {
            addLog(`❌ Abort failed: ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const deleteRoute = async () => {
        if (!routeId) return;
        setBusy(true);
        try {
            await apiCall('DELETE', `/routes/${routeId}`);
            setRouteId(null);
            setRouteStatus(null);
            addLog('🗑️ Route deleted');
        } catch (err: any) {
            addLog(`❌ Delete failed: ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const statusBadge = (status: string | null) => {
        if (!status) return null;
        const colors: Record<string, string> = {
            draft: 'bg-muted text-muted-foreground border-border',
            active: 'bg-foreground/10 text-foreground border-foreground/30',
            completed: 'bg-muted/50 text-foreground border-border',
            aborted: 'bg-muted text-foreground border-foreground',
        };
        return <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${colors[status] || 'bg-muted text-muted-foreground border-border'}`}>{status}</span>;
    };

    return (
        <div className="rounded-sm border border-border bg-background p-4 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
                <div className="bg-foreground text-background p-1.5 rounded-sm">
                    <RiRouteLine size={16} />
                </div>
                <div>
                    <h2 className="text-xs font-bold tracking-widest uppercase font-sans text-foreground">Path_Simulator</h2>
                </div>
                {routeId && (
                    <div className="ml-auto flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                        <span className="text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded-sm border border-border">{routeId.slice(0, 8)}...</span>
                        {statusBadge(routeStatus)}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 flex-1">
                {/* Left: Form */}
                <div className="space-y-4 bg-muted/20 p-3 rounded-sm border border-border flex flex-col">
                    <div className="flex gap-3">
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Target_Device</label>
                            <select
                                value={deviceId}
                                onChange={(e) => setDeviceId(e.target.value)}
                                className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-foreground"
                            >
                                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Route_Name</label>
                            <input
                                type="text"
                                value={routeName}
                                onChange={(e) => setRouteName(e.target.value)}
                                className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-foreground"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 flex-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Waypoints_JSON</label>
                        <textarea
                            value={waypointsText}
                            onChange={(e) => setWaypointsText(e.target.value)}
                            className="bg-background border border-border rounded-sm px-2 py-1.5 text-[10px] text-foreground font-mono focus:outline-none focus:border-foreground resize-none flex-1 min-h-[120px]"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-2 bg-muted/20 p-3 rounded-sm border border-border">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-sans font-bold mb-1">EXECUTION_CONTROLS</p>
                    <button
                        onClick={createRoute}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 bg-foreground hover:bg-muted-foreground disabled:bg-muted disabled:text-muted-foreground text-background font-bold px-3 py-2 rounded-sm transition-colors text-[10px] uppercase tracking-widest font-sans"
                    >
                        {busy ? <RiLoader4Line className="animate-spin" size={14} /> : <RiPlayLine size={14} />}
                        Create_Route
                    </button>
                    <button
                        onClick={dispatchRoute}
                        disabled={busy || !routeId || routeStatus === 'active'}
                        className="flex items-center justify-center gap-2 bg-background border border-foreground hover:bg-foreground hover:text-background disabled:border-border disabled:text-muted-foreground disabled:bg-muted text-foreground font-bold px-3 py-2 rounded-sm transition-colors text-[10px] uppercase tracking-widest font-sans"
                    >
                        🚀 Dispatch_Route
                    </button>
                    <button
                        onClick={abortRoute}
                        disabled={busy || routeStatus !== 'active'}
                        className="flex items-center justify-center gap-2 bg-background border border-foreground hover:bg-foreground hover:text-background disabled:border-border disabled:text-muted-foreground disabled:bg-muted text-foreground font-bold px-3 py-2 rounded-sm transition-colors text-[10px] uppercase tracking-widest font-sans mt-auto"
                    >
                        <RiStopLine size={14} /> Abort_Route
                    </button>
                    <button
                        onClick={deleteRoute}
                        disabled={busy || !routeId || routeStatus !== 'draft'}
                        className="flex items-center justify-center gap-2 bg-muted hover:bg-muted-foreground disabled:bg-muted/50 disabled:text-muted-foreground text-foreground border border-border font-bold px-3 py-2 rounded-sm transition-colors text-[10px] uppercase tracking-widest font-sans"
                    >
                        🗑️ Delete_Draft
                    </button>
                </div>
            </div>

            {/* Log */}
            <div className="mt-auto bg-muted/10 border-t border-border p-3 max-h-40 overflow-y-auto font-mono text-[9px] text-muted-foreground space-y-0.5 leading-tight">
                {log.length === 0 ? (
                    <p className="opacity-50 font-sans uppercase tracking-widest text-[9px] font-bold">Event log will appear here...</p>
                ) : log.map((l, i) => <p key={i}>{l}</p>)}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function TestingPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ email: string; is_superuser: boolean } | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            try {
                const userData = await getCurrentUser();
                if (!userData) throw new Error('Not authenticated');
                setUser(userData);

                const devRes = await apiFetch('/devices');
                if (devRes.ok) setDevices(await devRes.json());
            } catch (err) {
                console.error('Auth failed:', err);
                setToken(null);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router]);

    const handleLogout = async () => {
        try {
            await logoutDirect();
        } catch { } finally {
            router.push('/login');
        }
    };

    const [creatingDevice, setCreatingDevice] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
            const res = await apiFetch('/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `test-boat-${String(Date.now()).slice(-4)}`,
                    mqtt_client_id: `test-client-${String(Date.now()).slice(-4)}`,
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
                        <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">Testing_Utilities //</h1>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Simulate joystick input and autonomous path dispatch against real API endpoints.</p>
                    </div>
                </div>

                {devices.length === 0 ? (
                    <div className="rounded-sm border border-border bg-background p-12 text-center">
                        <div className="bg-foreground text-background p-3 rounded-sm inline-block mb-4 border border-foreground">
                            <RiGamepadLine size={24} />
                        </div>
                        <h2 className="text-sm font-bold tracking-widest uppercase font-sans text-foreground mb-2">No devices registered</h2>
                        <p className="text-[10px] text-muted-foreground mb-6 max-w-md mx-auto uppercase font-sans tracking-widest">
                            Create a test device to start experimenting. Test devices are safe to remove later.
                        </p>
                        <button
                            onClick={createTestDevice}
                            disabled={creatingDevice}
                            className="inline-flex items-center gap-2 bg-foreground hover:bg-muted-foreground disabled:bg-muted disabled:text-muted-foreground text-background font-bold px-4 py-2 rounded-sm transition-colors text-xs uppercase tracking-widest font-sans"
                        >
                            {creatingDevice ? <RiLoader4Line className="animate-spin" size={16} /> : <RiGamepadLine size={16} />}
                            {creatingDevice ? 'Creating...' : 'Create Test Device'}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 flex-1">
                        {/* Device management bar */}
                        <div className="rounded-sm border border-border bg-background p-3 flex flex-wrap gap-2 items-center">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-4 font-sans">Registered Devices</h3>
                            {devices.map(d => (
                                <div key={d.id} className="flex items-center gap-2 bg-muted border border-border rounded-sm px-2 py-1 text-xs">
                                    <span className="text-foreground font-bold">{d.name}</span>
                                    <span className="text-muted-foreground font-mono text-[10px] bg-background px-1 rounded-sm">{d.id.slice(0, 8)}</span>
                                    <button
                                        onClick={() => deleteDevice(d.id, d.name)}
                                        disabled={deletingId === d.id}
                                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 ml-1"
                                        title="Delete device"
                                    >
                                        {deletingId === d.id ? <RiLoader4Line className="animate-spin" size={12} /> : <RiDeleteBinLine size={12} />}
                                    </button>
                                </div>
                            ))}
                            <div className="ml-auto">
                                <button
                                    onClick={createTestDevice}
                                    disabled={creatingDevice}
                                    className="inline-flex items-center gap-1.5 bg-foreground hover:bg-muted-foreground disabled:bg-muted disabled:text-muted-foreground text-background text-[10px] font-bold px-2 py-1 rounded-sm transition-colors uppercase tracking-widest font-sans"
                                >
                                    {creatingDevice ? <RiLoader4Line className="animate-spin" size={12} /> : <RiAddLine size={12} />}
                                    Add Device
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2 flex-1">
                            <JoystickSimulator devices={devices} />
                            <PathSimulator devices={devices} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

