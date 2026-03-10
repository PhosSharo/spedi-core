'use client';

import { useEffect, useState, useRef } from 'react';
import { RiUser3Line, RiTimeLine, RiRadioButtonLine } from "@remixicon/react";
import { getToken } from '@/lib/auth-store';
import { apiFetch, getApiUrl } from '@/lib/api';

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
        try {
            const res = await apiFetch('/session');
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

        const sse = new EventSource(`${getApiUrl()}/events?token=${token}`);
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
            <div className="flex items-center gap-2 px-2 py-1 rounded-sm border bg-muted text-muted-foreground text-[10px] font-mono uppercase tracking-widest leading-none">
                <RiRadioButtonLine size={12} />
                Idle
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 px-2 py-1 rounded-sm border bg-foreground text-background text-[10px] font-mono uppercase tracking-widest leading-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-1.5 font-bold">
                <RiRadioButtonLine size={12} className="animate-pulse" />
                <span>LINK_ESTABLISHED</span>
            </div>
            <div className="h-3 w-px bg-background/30" />
            <div className="flex items-center gap-1.5 opacity-90">
                <RiUser3Line size={12} />
                <span>{session.userId.slice(0, 8)}...</span>
            </div>
            <div className="h-3 w-px bg-background/30" />
            <div className="flex items-center gap-1.5 opacity-90">
                <RiTimeLine size={12} />
                <span>{new Date(session.connectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    );
}
