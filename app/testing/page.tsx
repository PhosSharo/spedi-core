'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    RiLoader4Line, RiGamepadLine, RiRouteLine,
    RiPlayLine, RiStopLine, RiWifiLine, RiWifiOffLine,
    RiArrowUpLine, RiArrowDownLine, RiArrowLeftLine, RiArrowRightLine, RiStopCircleLine
} from "@remixicon/react";
import { getToken, setToken, logoutDirect } from '@/lib/auth-store';
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
        const token = getToken();
        if (!token || !deviceId) return;

        try {
            const res = await fetch('/api/session', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
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

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/control?token=${token}`;

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

        const token = getToken();
        if (!token) return;

        try {
            await fetch('/api/session', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-violet-500/10 text-violet-400 p-2 rounded-lg">
                    <RiGamepadLine size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-zinc-100">Joystick Simulator</h2>
                    <p className="text-xs text-zinc-500">Open session → WS connect → send joystick commands</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {wsConnected ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                            <RiWifiLine size={14} /> Connected
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                            <RiWifiOffLine size={14} /> Disconnected
                        </span>
                    )}
                </div>
            </div>

            {/* Device + Session Controls */}
            <div className="flex flex-wrap items-end gap-3 mb-6">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Device</label>
                    <select
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        disabled={sessionActive}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50"
                    >
                        {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                {!sessionActive ? (
                    <button onClick={openSession} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm">
                        <RiPlayLine size={16} /> Open Session
                    </button>
                ) : (
                    <button onClick={closeSession} className="flex items-center gap-2 bg-red-600/80 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm">
                        <RiStopLine size={16} /> Close Session
                    </button>
                )}
            </div>

            {/* Joystick Controls */}
            {wsConnected && (
                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Sliders */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex justify-between">
                                    <span>Throttle</span>
                                    <span className="text-indigo-400 font-mono">{throttle}</span>
                                </label>
                                <input
                                    type="range" min={-100} max={100} value={throttle}
                                    onChange={(e) => setThrottle(parseInt(e.target.value))}
                                    className="w-full mt-1 accent-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex justify-between">
                                    <span>Steering</span>
                                    <span className="text-indigo-400 font-mono">{steering}</span>
                                </label>
                                <input
                                    type="range" min={-100} max={100} value={steering}
                                    onChange={(e) => setSteering(parseInt(e.target.value))}
                                    className="w-full mt-1 accent-indigo-500"
                                />
                            </div>
                        </div>

                        {/* D-pad + actions */}
                        <div className="flex flex-col items-center gap-3">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Arrow keys or click</p>
                            <div className="grid grid-cols-3 gap-1">
                                <div />
                                <button onClick={() => setThrottle(prev => Math.min(prev + 10, 100))} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors"><RiArrowUpLine size={16} className="text-zinc-300" /></button>
                                <div />
                                <button onClick={() => setSteering(prev => Math.max(prev - 10, -100))} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors"><RiArrowLeftLine size={16} className="text-zinc-300" /></button>
                                <button onClick={() => { setThrottle(0); setSteering(0); }} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors"><RiStopCircleLine size={16} className="text-red-400" /></button>
                                <button onClick={() => setSteering(prev => Math.min(prev + 10, 100))} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors"><RiArrowRightLine size={16} className="text-zinc-300" /></button>
                                <div />
                                <button onClick={() => setThrottle(prev => Math.max(prev - 10, -100))} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors"><RiArrowDownLine size={16} className="text-zinc-300" /></button>
                                <div />
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button onClick={sendCommand} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                                    Send Once
                                </button>
                                <button
                                    onClick={intervalRef.current ? stopContinuous : startContinuous}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${intervalRef.current ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'}`}
                                >
                                    {intervalRef.current ? 'Stop Stream' : 'Stream'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Log */}
            <div className="bg-black/50 rounded-xl border border-zinc-800 p-3 max-h-40 overflow-y-auto font-mono text-[11px] text-zinc-400 space-y-0.5">
                {log.length === 0 ? (
                    <p className="text-zinc-600">Event log will appear here...</p>
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
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const opts: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(`/api${path}`, opts);
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
            draft: 'bg-zinc-700 text-zinc-300',
            active: 'bg-emerald-500/10 text-emerald-400',
            completed: 'bg-indigo-500/10 text-indigo-400',
            aborted: 'bg-red-500/10 text-red-400',
        };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-zinc-700 text-zinc-300'}`}>{status}</span>;
    };

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-amber-500/10 text-amber-400 p-2 rounded-lg">
                    <RiRouteLine size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-zinc-100">Path Simulator</h2>
                    <p className="text-xs text-zinc-500">Create route → dispatch → monitor status</p>
                </div>
                {routeId && (
                    <div className="ml-auto flex items-center gap-2 text-xs">
                        <span className="text-zinc-500 font-mono">{routeId.slice(0, 8)}...</span>
                        {statusBadge(routeStatus)}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Left: Form */}
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Device</label>
                            <select
                                value={deviceId}
                                onChange={(e) => setDeviceId(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            >
                                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Route Name</label>
                            <input
                                type="text"
                                value={routeName}
                                onChange={(e) => setRouteName(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Waypoints (JSON)</label>
                        <textarea
                            value={waypointsText}
                            onChange={(e) => setWaypointsText(e.target.value)}
                            rows={6}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={createRoute}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
                    >
                        {busy ? <RiLoader4Line className="animate-spin" size={16} /> : <RiPlayLine size={16} />}
                        Create Route
                    </button>
                    <button
                        onClick={dispatchRoute}
                        disabled={busy || !routeId || routeStatus === 'active'}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
                    >
                        🚀 Dispatch Route
                    </button>
                    <button
                        onClick={abortRoute}
                        disabled={busy || routeStatus !== 'active'}
                        className="flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
                    >
                        <RiStopLine size={16} /> Abort Route
                    </button>
                    <button
                        onClick={deleteRoute}
                        disabled={busy || !routeId || routeStatus !== 'draft'}
                        className="flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-200 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
                    >
                        🗑️ Delete Draft
                    </button>
                </div>
            </div>

            {/* Log */}
            <div className="bg-black/50 rounded-xl border border-zinc-800 p-3 max-h-40 overflow-y-auto font-mono text-[11px] text-zinc-400 space-y-0.5">
                {log.length === 0 ? (
                    <p className="text-zinc-600">Event log will appear here...</p>
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
            const token = getToken();
            if (!token) { router.push('/login'); return; }

            try {
                const res = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Invalid token');
                setUser(await res.json());

                const devRes = await fetch('/api/devices', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
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
            const token = getToken();
            if (token) {
                fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(() => { });
            }
            await logoutDirect();
        } catch { } finally {
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
        <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30">
            <Navbar user={user} onLogout={handleLogout} />

            <main className="container mx-auto max-w-7xl px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Testing Utilities</h1>
                    <p className="text-zinc-400 mt-1">Simulate joystick input and autonomous path dispatch against real API endpoints.</p>
                </div>

                <div className="grid gap-8 lg:grid-cols-1">
                    <JoystickSimulator devices={devices} />
                    <PathSimulator devices={devices} />
                </div>
            </main>
        </div>
    );
}
