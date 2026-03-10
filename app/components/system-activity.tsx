'use client';

import { useEffect, useState, useRef } from 'react';
import { getToken } from '@/lib/auth-store';
import { getApiUrl } from '@/lib/api';
import { RiTerminalBoxLine, RiFilter3Line } from '@remixicon/react';

export type LogSource = 'arduino' | 'mobile' | 'system';
export type LogLevel = 'info' | 'warn' | 'error';
export type LogType = 'telemetry' | 'connection' | 'auth' | 'route' | 'camera' | 'config' | 'session';

export interface LogEntry {
    id: string;
    timestamp: string;
    source: LogSource;
    level: LogLevel;
    type: LogType;
    message: string;
    data?: any;
}

export function SystemActivity() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<'all' | LogSource>('all');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        const connectSSE = () => {
            const token = getToken();
            if (!token) return;

            const sse = new EventSource(`${getApiUrl()}/events?token=${token}`);
            eventSourceRef.current = sse;

            sse.addEventListener('syslog', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    const newLog = data.payload as LogEntry;

                    setLogs((prev) => {
                        // Deduplicate in case of reconnects pushing history again
                        if (prev.some((l) => l.id === newLog.id)) return prev;

                        // We unshift to put newest at the top, or keep an array and sort.
                        // Since history comes in oldest-first from the server loop:
                        // for (let i = recentLogs.length - 1; i >= 0; i--) { send(); }
                        // The frontend will receive oldest first. We should put newest at the top (index 0).
                        return [newLog, ...prev].slice(0, 500); // cap memory
                    });
                } catch (err) {
                    console.error('Failed to parse syslog event', err);
                }
            });

            sse.onerror = () => {
                sse.close();
                setTimeout(connectSSE, 5000);
            };
        };

        connectSSE();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filteredLogs = logs.filter(l => filter === 'all' || l.source === filter);

    const getSourceColor = (source: LogSource) => {
        switch (source) {
            case 'arduino': return 'text-indigo-400 border-indigo-400/20 bg-indigo-400/10';
            case 'mobile': return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10';
            case 'system': return 'text-foreground border-border bg-muted/30';
            default: return 'text-muted-foreground border-border bg-muted/30';
        }
    };

    const getLevelIcon = (level: LogLevel) => {
        switch (level) {
            case 'error': return '🔴';
            case 'warn': return '🟡';
            case 'info': return '🟢';
            default: return '⚪';
        }
    };

    return (
        <div className="w-full h-full flex flex-col border border-border bg-background rounded-sm overflow-hidden min-h-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-3 px-4 bg-muted/30 shrink-0">
                <div className="flex items-center gap-2">
                    <RiTerminalBoxLine size={16} className="text-foreground" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground font-sans">System_Activity //</h3>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    <RiFilter3Line size={12} />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="bg-background border border-border text-foreground rounded-sm px-2 py-1 pr-6 focus:border-foreground focus:outline-none transition-colors cursor-pointer text-[10px] uppercase font-sans tracking-widest appearance-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fafafa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.25rem center',
                            backgroundSize: '1em'
                        }}
                    >
                        <option value="all" className="bg-background text-foreground">ALL_SOURCES</option>
                        <option value="arduino" className="bg-background text-foreground">ARDUINO_IoT</option>
                        <option value="mobile" className="bg-background text-foreground">MOBILE_APP</option>
                        <option value="system" className="bg-background text-foreground">BACKEND_SYS</option>
                    </select>
                </div>
            </div>

            {/* Log Stream */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-[#0c0c0e]">
                {filteredLogs.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        Waiting for events...
                    </div>
                ) : (
                    filteredLogs.map(log => (
                        <div key={log.id} className="flex flex-col gap-1 text-[11px] font-mono">
                            <div
                                className="flex items-start gap-2 cursor-pointer hover:bg-white/5 p-1 rounded-sm transition-colors"
                                onClick={() => toggleExpand(log.id)}
                            >
                                <span className="text-muted-foreground whitespace-nowrap opacity-50">
                                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className="text-[9px] mt-[2px] opacity-75">{getLevelIcon(log.level)}</span>
                                <span className={`uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${getSourceColor(log.source)}`}>
                                    {log.source.substring(0, 3)}
                                </span>
                                <span className="text-foreground/70 uppercase tracking-widest w-16 shrink-0">
                                    [{log.type}]
                                </span>
                                <span className={`text-foreground/90 break-all ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : ''}`}>
                                    {log.message}
                                </span>
                            </div>

                            {/* Expanded Payload */}
                            {expandedIds.has(log.id) && log.data && (
                                <div className="ml-24 pl-2 border-l-2 border-border/50 bg-black/20 p-2 rounded-r-sm overflow-x-auto text-[10px] text-muted-foreground">
                                    <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    ))
                )
                }
            </div >
        </div >
    );
}
