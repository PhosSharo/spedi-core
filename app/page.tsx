'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { RiLoader4Line, RiSearchLine, RiArrowRightLine } from '@remixicon/react';
import { TelemetryPanel } from './components/telemetry-panel';
import { getToken } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';

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
      <div className="p-12 flex items-center justify-center text-muted-foreground text-[10px] uppercase font-sans tracking-widest h-full min-h-[150px]">
        No historical data loaded.
      </div>
    );
  }

  return (
    <div className="p-2 h-full min-h-[150px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
}

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [records, setRecords] = useState<TelemetryRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const devRes = await apiFetch('/devices');
        if (devRes.ok) {
          const devData = await devRes.json();
          setDevices(devData);
          if (devData.length > 0) setDeviceId(devData[0].id);
        }
      } catch (err) {
        console.error('Data initialization failed:', err);
      }
    };

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setTo(now.toISOString().slice(0, 16));
    setFrom(dayAgo.toISOString().slice(0, 16));

    initData();
  }, []);

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

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="border-b border-border pb-4 flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">Mission_Control //</h1>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Real-time status and historical intelligence</p>
        </div>
        <div className="text-[10px] text-foreground font-mono uppercase tracking-widest bg-muted px-2 py-1 rounded-sm border mb-1">
          SYS_STAT: [ONLINE]
        </div>
      </div>

      <div className="flex flex-col flex-1 h-full overflow-y-auto gap-6 pb-6">
        {/* Real-time Status */}
        <div className="shrink-0 flex flex-col gap-2">
          <h2 className="text-[10px] font-bold tracking-widest uppercase font-sans text-muted-foreground ml-1">Live_Telemetry_Stream</h2>
          <TelemetryPanel />
        </div>

        {/* Historical Explorer */}
        <div className="flex flex-col gap-2 flex-1 min-h-[400px]">
          <h2 className="text-[10px] font-bold tracking-widest uppercase font-sans text-muted-foreground ml-1 mt-2">Historical_Data_Explorer</h2>
          <div className="flex flex-col h-full gap-4">
            <div className="flex flex-wrap items-end gap-3 p-3 rounded-sm border border-border bg-background shrink-0">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Device_ID</label>
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Query_Start</label>
                <input
                  type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Query_End</label>
                <input
                  type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)}
                  className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              <button
                onClick={() => fetchTelemetry()} disabled={querying || !deviceId}
                className="flex items-center gap-1.5 rounded-sm bg-foreground px-3 py-1.5 text-xs font-bold font-sans uppercase tracking-widest text-background hover:bg-muted hover:text-foreground border border-foreground transition-all disabled:opacity-50"
              >
                {querying ? <RiLoader4Line className="animate-spin" size={14} /> : <RiSearchLine size={14} />} Execute
              </button>

              <span className="text-[9px] text-muted-foreground self-center ml-auto uppercase tracking-widest font-sans">
                ROWS: {records.length}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">
              {/* Chart Pane */}
              <div className="lg:w-2/3 flex flex-col min-h-[200px]">
                <div className="border border-border rounded-sm bg-background p-1 flex-1">
                  <TelemetryChart records={records} />
                </div>
              </div>

              {/* Table Pane */}
              <div className="lg:w-1/3 flex flex-col rounded-sm border border-border bg-background overflow-hidden h-full max-h-[400px]">
                <div className="overflow-x-auto overflow-y-auto flex-1 text-xs">
                  <table className="w-full text-left relative">
                    <thead className="bg-muted/50 sticky top-0 backdrop-blur-md z-10">
                      <tr className="border-b border-border text-foreground font-sans uppercase tracking-widest text-[9px]">
                        <th className="px-3 py-2 font-bold w-1/3">Time</th>
                        <th className="px-3 py-2 font-bold text-right w-1/3">Lat</th>
                        <th className="px-3 py-2 font-bold text-right w-1/3">Lng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground uppercase tracking-widest text-[9px] font-sans">
                            No records retrieved
                          </td>
                        </tr>
                      ) : (
                        records.map((r) => (
                          <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-3 py-2 text-muted-foreground text-[10px]">
                              {formatTime(r.recorded_at)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {r.raw.lat?.toFixed(5) ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {r.raw.lng?.toFixed(5) ?? '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {nextCursor && (
                  <div className="border-t border-border p-2 flex justify-center bg-muted/30 shrink-0">
                    <button
                      onClick={() => fetchTelemetry(nextCursor)} disabled={loadingMore}
                      className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-foreground hover:text-muted-foreground disabled:text-muted-foreground transition-colors font-sans"
                    >
                      {loadingMore ? <RiLoader4Line className="animate-spin" size={12} /> : <RiArrowRightLine size={12} />} Fetch Next Chunk
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
