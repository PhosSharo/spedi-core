'use client';

import { useEffect, useState, useRef } from 'react';
import { getToken } from '@/lib/auth-store';
import { getApiUrl } from '@/lib/api';
import { RiCamera3Line, RiImageAddLine } from '@remixicon/react';

export function CameraSnapshot() {
    const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
    const [timestamp, setTimestamp] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        const connectSSE = () => {
            const token = getToken();
            if (!token) return;

            const sse = new EventSource(`${getApiUrl()}/events?token=${token}`);
            eventSourceRef.current = sse;

            sse.addEventListener('camera_snapshot', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    const { dataUri, timestamp: ts } = data.payload;
                    setSnapshotUri(dataUri);
                    setTimestamp(ts);
                } catch (err) {
                    console.error('Failed to parse camera snapshot event', err);
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

    return (
        <div className="w-full h-full flex flex-col border border-border bg-background rounded-sm overflow-hidden aspect-video relative">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full flex items-center justify-between p-3 px-4 bg-gradient-to-b from-black/80 to-transparent z-10">
                <div className="flex items-center gap-2">
                    <RiCamera3Line size={16} className="text-white" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white font-sans drop-shadow-md">Live_Snapshot //</h3>
                </div>

                {timestamp && (
                    <div className="text-[10px] font-mono text-white/70 uppercase tracking-widest drop-shadow-md">
                        {new Date(timestamp).toLocaleTimeString()}
                    </div>
                )}
            </div>

            {/* Image display */}
            <div className="flex-1 bg-black/90 flex items-center justify-center overflow-hidden">
                {snapshotUri ? (
                    <img
                        src={snapshotUri}
                        alt="Latest Camera Snapshot"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-50">
                        <RiImageAddLine size={32} />
                        <span className="text-[10px] uppercase font-mono tracking-widest">Awaiting Snapshot...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
