'use client';

import { useEffect, useState, useRef } from 'react';
import {
    RiMapPinLine,
    RiRadarLine,
    RiSteering2Line,
    RiCarLine,
    RiWifiOffLine,
    RiRefreshLine
} from "@remixicon/react";
import { getToken } from '@/lib/auth-store';

interface TelemetryData {
    mode: string | null;
    lat: number | null;
    lng: number | null;
    obstacle_left: number | null;
    obstacle_right: number | null;
    smart_move_active: boolean | null;
    waypoint_index: number | null;
}

export function TelemetryPanel() {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [deviceStatus, setDeviceStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connectSSE = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const token = getToken();
        if (!token) {
            setConnectionState('disconnected');
            return;
        }

        setConnectionState('connecting');

        // We use the query param approach since EventSource doesn't support Authorization headers
        const sse = new EventSource(`/api/events?token=${token}`);
        eventSourceRef.current = sse;

        sse.onopen = () => {
            setConnectionState('connected');
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        sse.addEventListener('telemetry', (e) => {
            try {
                const data = JSON.parse(e.data);
                // we assume data.payload matches our TelemetryData shape
                setTelemetry(data.payload);
            } catch (err) {
                console.error('Failed to parse telemetry event', err);
            }
        });

        sse.addEventListener('device_online', () => {
            setDeviceStatus('online');
        });

        sse.addEventListener('device_offline', () => {
            setDeviceStatus('offline');
        });

        sse.onerror = (err) => {
            console.error('SSE connection error:', err);
            setConnectionState('disconnected');
            sse.close();

            // Reconnect with backoff
            if (!reconnectTimeoutRef.current) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    connectSSE();
                }, 5000); // 5s backoff
            }
        };
    };

    useEffect(() => {
        connectSSE();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // Format helpers
    const formatValue = (val: number | string | boolean | null | undefined, suffix = '') => {
        if (val === null || val === undefined) return '--';
        if (typeof val === 'number') return `${val.toFixed(notInt(val) ? 4 : 0)}${suffix}`;
        if (typeof val === 'boolean') return val ? 'Active' : 'Inactive';
        return val.toString();
    };

    const notInt = (n: number) => n % 1 !== 0;

    return (
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 p-4 px-6 bg-zinc-900/80">
                <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${deviceStatus === 'online' ? 'bg-emerald-500 animate-pulse' :
                            deviceStatus === 'offline' ? 'bg-red-500' : 'bg-zinc-600'
                        }`} />
                    <h3 className="text-sm font-semibold text-zinc-200">Live Telemetry</h3>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    {connectionState === 'connecting' && (
                        <span className="flex items-center gap-1.5 text-amber-400">
                            <RiRefreshLine size={14} className="animate-spin" />
                            Connecting Stream...
                        </span>
                    )}
                    {connectionState === 'disconnected' && (
                        <span className="flex items-center gap-1.5 text-red-400">
                            <RiWifiOffLine size={14} />
                            Stream Offline
                        </span>
                    )}
                    {connectionState === 'connected' && (
                        <span className="text-zinc-500 flex flex-col items-end leading-none">
                            <span>SSE Active</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* GPS */}
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-4 flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-400">
                        <RiMapPinLine size={48} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Position</span>
                    <div className="flex items-baseline gap-1 mt-1 font-mono">
                        <span className="text-lg text-zinc-200">{formatValue(telemetry?.lat)}</span>
                        <span className="text-zinc-600 text-xs">LAT</span>
                    </div>
                    <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-lg text-zinc-200">{formatValue(telemetry?.lng)}</span>
                        <span className="text-zinc-600 text-xs">LNG</span>
                    </div>
                </div>

                {/* Sonar */}
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-4 flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-400">
                        <RiRadarLine size={48} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Obstacle Sensors</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-zinc-500 text-xs font-mono w-4">L</span>
                        <span className="text-lg text-zinc-200 font-mono">{formatValue(telemetry?.obstacle_left, 'cm')}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-zinc-500 text-xs font-mono w-4">R</span>
                        <span className="text-lg text-zinc-200 font-mono">{formatValue(telemetry?.obstacle_right, 'cm')}</span>
                    </div>
                </div>

                {/* Mode */}
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-4 flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-400">
                        <RiSteering2Line size={48} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Vehicle Mode</span>
                    <div className="mt-2 text-2xl font-bold capitalize text-zinc-100">
                        {telemetry?.mode || 'Unknown'}
                    </div>
                    <div className="mt-auto text-xs text-zinc-500">
                        Wpt Index: <span className="font-mono text-zinc-300">{formatValue(telemetry?.waypoint_index)}</span>
                    </div>
                </div>

                {/* Smart Move */}
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-4 flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-400">
                        <RiCarLine size={48} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Smart Move</span>
                    <div className="mt-2 flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${telemetry?.smart_move_active ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-zinc-700'}`} />
                        <span className={`text-lg font-medium ${telemetry?.smart_move_active ? 'text-rose-400' : 'text-zinc-500'}`}>
                            {formatValue(telemetry?.smart_move_active)}
                        </span>
                    </div>
                    <p className="mt-auto text-xs text-zinc-600 leading-tight">
                        When active, device overrides all commands for obstacle avoidance.
                    </p>
                </div>
            </div>
        </div>
    );
}
