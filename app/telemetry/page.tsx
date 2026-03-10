'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RiLoader4Line, RiSearchLine, RiArrowRightLine, RiArrowLeftLine } from "@remixicon/react";
import { getToken, setToken, logoutDirect, getCurrentUser } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import { Navbar } from '../components/navbar';

interface TelemetryRecord {
    id: number;
    device_id: string;
    recorded_at: string;
    raw: Record<string, any>;
}

interface Device {
    id: string;
    name: string;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    });
}

// ── Lightweight Canvas Chart ──────────────────────────────────────────
function TelemetryChart({ records }: { records: TelemetryRecord[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || records.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;

        ctx.clearRect(0, 0, W, H);

        const sorted = [...records].sort((a, b) =>
            new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );

        const lats = sorted.map(r => r.raw.lat ?? null);
        const lngs = sorted.map(r => r.raw.lng ?? null);
        const obsL = sorted.map(r => r.raw.obstacle_left ?? null);
        const obsR = sorted.map(r => r.raw.obstacle_right ?? null);

        const mTop = 20, mRight = 60, mBottom = 40, mLeft = 60;
        const plotW = W - mLeft - mRight;
        const plotH = H - mTop - mBottom;

        const times = sorted.map(r => new Date(r.recorded_at).getTime());
        const tMin = Math.min(...times);
        const tMax = Math.max(...times);
        const tRange = tMax - tMin || 1;
        const xOf = (t: number) => mLeft + ((t - tMin) / tRange) * plotW;

        const validNums = (arr: (number | null)[]) => arr.filter(v => v !== null) as number[];

        const gpsVals = [...validNums(lats), ...validNums(lngs)];
        const gpsMin = gpsVals.length ? Math.min(...gpsVals) : 0;
        const gpsMax = gpsVals.length ? Math.max(...gpsVals) : 1;
        const gpsRange = gpsMax - gpsMin || 1;
        const gpsY = (v: number) => mTop + plotH - ((v - gpsMin) / gpsRange) * plotH;

        const obsVals = [...validNums(obsL), ...validNums(obsR)];
        const obsMin = obsVals.length ? Math.min(...obsVals) : 0;
        const obsMax = obsVals.length ? Math.max(...obsVals) : 100;
        const obsRange = obsMax - obsMin || 1;
        const obsY = (v: number) => mTop + plotH - ((v - obsMin) / obsRange) * plotH;

        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = mTop + (plotH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(mLeft, y);
            ctx.lineTo(W - mRight, y);
            ctx.stroke();
        }

        const drawLine = (
            data: (number | null)[],
            color: string,
            yFn: (v: number) => number,
        ) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            let started = false;
            data.forEach((v, i) => {
                if (v === null) { started = false; return; }
                const x = xOf(times[i]);
                const y = yFn(v);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else { ctx.lineTo(x, y); }
            });
            ctx.stroke();
        };

        drawLine(lats, '#6366f1', gpsY);
        drawLine(lngs, '#8b5cf6', gpsY);
        drawLine(obsL, '#f59e0b', obsY);
        drawLine(obsR, '#ef4444', obsY);

        ctx.fillStyle = '#71717a';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const y = mTop + (plotH / 4) * i;
            const val = gpsMax - (gpsRange / 4) * i;
            ctx.fillText(val.toFixed(4), mLeft - 6, y + 3);
        }

        ctx.textAlign = 'left';
        for (let i = 0; i <= 4; i++) {
            const y = mTop + (plotH / 4) * i;
            const val = obsMax - (obsRange / 4) * i;
            ctx.fillText(val.toFixed(0), W - mRight + 6, y + 3);
        }

        ctx.textAlign = 'center';
        const tickCount = Math.min(6, sorted.length);
        for (let i = 0; i < tickCount; i++) {
            const idx = Math.floor((i / (tickCount - 1 || 1)) * (sorted.length - 1));
            const x = xOf(times[idx]);
            const label = new Date(sorted[idx].recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            ctx.fillText(label, x, H - mBottom + 16);
        }

        const legend = [
            { label: 'Lat', color: '#6366f1' },
            { label: 'Lng', color: '#8b5cf6' },
            { label: 'Obs L', color: '#f59e0b' },
            { label: 'Obs R', color: '#ef4444' },
        ];
        let lx = mLeft;
        legend.forEach(({ label, color }) => {
            ctx.fillStyle = color;
            ctx.fillRect(lx, 4, 14, 3);
            ctx.fillStyle = '#a1a1aa';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, lx + 18, 10);
            lx += 70;
        });

    }, [records]);

    if (records.length === 0) {
        return (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 flex items-center justify-center text-zinc-500 text-sm">
                No data to chart. Select a date range and query.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: '280px' }}
            />
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function TelemetryPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ email: string; is_superuser: boolean } | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const [deviceId, setDeviceId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [records, setRecords] = useState<TelemetryRecord[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [querying, setQuerying] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const router = useRouter();

    // Auth check
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userData = await getCurrentUser();
                if (!userData) throw new Error('Not authenticated');
                setUser(userData);

                // Fetch devices
                const devRes = await apiFetch('/devices');
                if (devRes.ok) {
                    const devData = await devRes.json();
                    setDevices(devData);
                    if (devData.length > 0) setDeviceId(devData[0].id);
                }
            } catch (err) {
                console.error('Auth verification failed:', err);
                setToken(null);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        // Default date range: last 24 hours
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        setTo(now.toISOString().slice(0, 16));
        setFrom(dayAgo.toISOString().slice(0, 16));

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

    const fetchTelemetry = useCallback(async (cursor?: string) => {
        const token = getToken();
        if (!token || !deviceId) return;

        const isLoadMore = !!cursor;
        if (isLoadMore) setLoadingMore(true);
        else setQuerying(true);

        try {
            const params = new URLSearchParams({ device_id: deviceId, limit: '100' });
            if (from) params.set('from', new Date(from).toISOString());
            if (to) params.set('to', new Date(to).toISOString());
            if (cursor) params.set('cursor', cursor);

            const res = await apiFetch(`/telemetry?${params}`);

            if (!res.ok) throw new Error('Failed to fetch telemetry');

            const result = await res.json();

            if (isLoadMore) {
                setRecords(prev => [...prev, ...result.data]);
            } else {
                setRecords(result.data);
            }
            setNextCursor(result.next_cursor);
        } catch (err) {
            console.error('Telemetry fetch failed:', err);
        } finally {
            setQuerying(false);
            setLoadingMore(false);
        }
    }, [deviceId, from, to]);

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
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Telemetry History</h1>
                    <p className="text-zinc-400 mt-1">Query historical device telemetry. Raw records, no downsampling.</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-end gap-4 mb-8 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Device</label>
                        <select
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                        >
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">From</label>
                        <input
                            type="datetime-local"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">To</label>
                        <input
                            type="datetime-local"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                        />
                    </div>

                    <button
                        onClick={() => fetchTelemetry()}
                        disabled={querying || !deviceId}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm"
                    >
                        {querying ? (
                            <RiLoader4Line className="animate-spin" size={16} />
                        ) : (
                            <RiSearchLine size={16} />
                        )}
                        Query
                    </button>

                    <span className="text-xs text-zinc-500 self-center ml-auto">
                        {records.length} record{records.length !== 1 ? 's' : ''} loaded
                    </span>
                </div>

                {/* Chart */}
                <div className="mb-8">
                    <TelemetryChart records={records} />
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                                    <th className="text-left px-4 py-3 font-medium">Timestamp</th>
                                    <th className="text-right px-4 py-3 font-medium">Lat</th>
                                    <th className="text-right px-4 py-3 font-medium">Lng</th>
                                    <th className="text-right px-4 py-3 font-medium">Obs Left</th>
                                    <th className="text-right px-4 py-3 font-medium">Obs Right</th>
                                    <th className="text-right px-4 py-3 font-medium">WP Index</th>
                                    <th className="text-center px-4 py-3 font-medium">Autopilot</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                                            No records. Select a date range and click Query.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((r) => (
                                        <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-4 py-2.5 text-zinc-300 font-mono text-xs whitespace-nowrap">
                                                {formatTime(r.recorded_at)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-zinc-200">
                                                {r.raw.lat?.toFixed(6) ?? '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-zinc-200">
                                                {r.raw.lng?.toFixed(6) ?? '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-amber-400">
                                                {r.raw.obstacle_left ?? '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-red-400">
                                                {r.raw.obstacle_right ?? '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-zinc-300">
                                                {r.raw.waypoint_index ?? '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                {r.raw.autopilot_active === true ? (
                                                    <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-xs font-medium">ON</span>
                                                ) : r.raw.autopilot_active === false ? (
                                                    <span className="text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded text-xs font-medium">OFF</span>
                                                ) : (
                                                    <span className="text-zinc-600">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {nextCursor && (
                        <div className="border-t border-zinc-800 px-4 py-3 flex justify-center">
                            <button
                                onClick={() => fetchTelemetry(nextCursor)}
                                disabled={loadingMore}
                                className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:text-zinc-600 transition-colors"
                            >
                                {loadingMore ? (
                                    <RiLoader4Line className="animate-spin" size={16} />
                                ) : (
                                    <RiArrowRightLine size={16} />
                                )}
                                Load More
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
