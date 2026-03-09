'use client';

import { useEffect, useState, useRef } from 'react';
import { RiUser3Line, RiTimeLine, RiRadioButtonLine } from "@remixicon/react";
import { getToken } from '@/lib/auth-store';

interface ActiveSession {
    sessionId: string;
    userId: string;
    deviceId: string;
    connectedAt: string;
}

export function SessionIndicator() {
    const [session, setSession] = useState<ActiveSession | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const fetchSession = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch('/api/session', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSession(data);
            }
        } catch (err) {
            console.error('Failed to fetch initial session', err);
        }
    };

    const connectSSE = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const token = getToken();
        if (!token) return;

        const sse = new EventSource(`/api/events?token=${token}`);
        eventSourceRef.current = sse;

        sse.addEventListener('session_change', (e) => {
            try {
                const data = JSON.parse(e.data);
                setSession(data.payload);
            } catch (err) {
                console.error('Failed to parse session_change event', err);
            }
        });
    };

    useEffect(() => {
        fetchSession();
        connectSSE();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    if (!session) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 text-xs font-medium">
                <RiRadioButtonLine size={14} className="text-zinc-600" />
                Session: Idle
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="flex items-center gap-1.5">
                <RiRadioButtonLine size={14} className="text-emerald-500 animate-pulse" />
                <span>Active Session</span>
            </div>
            <div className="h-3 w-[1px] bg-emerald-500/20" />
            <div className="flex items-center gap-1.5 text-emerald-500/80">
                <RiUser3Line size={14} />
                <span className="font-mono">{session.userId.slice(0, 8)}...</span>
            </div>
            <div className="h-3 w-[1px] bg-emerald-500/20" />
            <div className="flex items-center gap-1.5 text-emerald-500/80">
                <RiTimeLine size={14} />
                <span>{new Date(session.connectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    );
}
