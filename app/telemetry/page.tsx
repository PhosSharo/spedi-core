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
            <div className="p-12 flex items-center justify-center text-muted-foreground text-[10px] uppercase font-sans tracking-widest">
                No data to chart. Select a date range and query.
            </div>
        );
    }

    return (
        <div className="p-2">
            <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: '200px' }}
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
                        <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">Telemetry_DB //</h1>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Query historical device telemetry. Raw records, no downsampling.</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-end gap-4 p-4 rounded-sm border border-border bg-background">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Device_ID</label>
                        <select
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            className="bg-background border border-border rounded-sm px-3 py-1 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all"
                        >
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Query_Start</label>
                        <input
                            type="datetime-local"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="bg-background border border-border rounded-sm px-3 py-1 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Query_End</label>
                        <input
                            type="datetime-local"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="bg-background border border-border rounded-sm px-3 py-1 text-xs text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all"
                        />
                    </div>

                    <button
                        onClick={() => fetchTelemetry()}
                        disabled={querying || !deviceId}
                        className="flex items-center gap-2 rounded-sm bg-foreground px-4 py-1.5 text-xs font-bold font-sans uppercase tracking-widest text-background hover:bg-muted hover:text-foreground border border-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {querying ? (
                            <RiLoader4Line className="animate-spin" size={14} />
                        ) : (
                            <RiSearchLine size={14} />
                        )}
                        Execute
                    </button>

                    <span className="text-[10px] text-muted-foreground self-center ml-auto uppercase tracking-widest font-sans">
                        ROWS_FETCHED: {records.length}
                    </span>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 flex-1">
                    {/* Object explorer / left pane */}
                    <div className="lg:w-2/3 flex flex-col gap-4">
                        {/* Chart */}
                        <div className="border border-border rounded-sm bg-background p-1">
                            <TelemetryChart records={records} />
                        </div>

                        {/* Table */}
                        <div className="rounded-sm border border-border bg-background overflow-hidden flex-1 flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/30">
                                        <tr className="border-b border-border text-foreground font-sans uppercase tracking-widest text-[10px]">
                                            <th className="px-4 py-2 font-bold">Timestamp</th>
                                            <th className="px-4 py-2 font-bold text-right">Lat</th>
                                            <th className="px-4 py-2 font-bold text-right">Lng</th>
                                            <th className="px-4 py-2 font-bold text-right">Obs (L)</th>
                                            <th className="px-4 py-2 font-bold text-right">Obs (R)</th>
                                            <th className="px-4 py-2 font-bold text-right">WP_IDX</th>
                                            <th className="px-4 py-2 font-bold text-center">Auto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {records.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground uppercase tracking-widest text-[10px] font-sans">
                                                    No records in time parameter
                                                </td>
                                            </tr>
                                        ) : (
                                            records.map((r) => (
                                                <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                                                        {formatTime(r.recorded_at)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {r.raw.lat?.toFixed(6) ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {r.raw.lng?.toFixed(6) ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {r.raw.obstacle_left ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {r.raw.obstacle_right ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {r.raw.waypoint_index ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        {r.raw.autopilot_active === true ? (
                                                            <span className="text-background bg-foreground px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest font-sans">ON</span>
                                                        ) : r.raw.autopilot_active === false ? (
                                                            <span className="text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest font-sans bg-muted/50">OFF</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
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
                                <div className="border-t border-border px-4 py-2 flex justify-center bg-muted/30">
                                    <button
                                        onClick={() => fetchTelemetry(nextCursor)}
                                        disabled={loadingMore}
                                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:text-muted-foreground disabled:text-muted-foreground transition-colors font-sans"
                                    >
                                        {loadingMore ? (
                                            <RiLoader4Line className="animate-spin" size={14} />
                                        ) : (
                                            <RiArrowRightLine size={14} />
                                        )}
                                        Fetch Next Chunk
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:w-1/3 flex flex-col gap-4">
                        {/* Optional right panel for logs or raw viewer, empty for now but keeps layout balanced */}
                        <div className="flex-1 rounded-sm border border-border bg-background p-4 flex items-center justify-center text-muted-foreground text-[10px] uppercase font-sans tracking-widest">
                            System Terminal // Idle
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
