'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiRobot2Line, RiSignalTowerLine, RiDashboard3Line, RiLoader4Line, RiLogoutBoxRLine } from "@remixicon/react";
import { getToken, setToken, logoutDirect } from '@/lib/auth-store';

import { TelemetryPanel } from './components/telemetry-panel';
import { SessionIndicator } from './components/session-indicator';
import { Navbar } from './components/navbar';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; is_superuser: boolean } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Invalid token');
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error('Auth verification failed:', err);
        setToken(null);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = getToken();
      if (token) {
        // Best-effort backend session cleanup
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => { });
      }
      await logoutDirect();
    } catch (err) {
      console.error('Logout failed:', err);
      setToken(null);
    } finally {
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


      {/* Observability Panel */}
      <main className="container mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Observability</h1>
            <p className="text-zinc-400 mt-1">Live telemetry streaming from active devices.</p>
          </div>
        </div>

        <TelemetryPanel />
      </main>

      {/* Feature Grid */}
      <main className="container mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-zinc-700 hover:bg-zinc-900/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-colors">
              <RiSignalTowerLine size={24} />
            </div>
            <h3 className="mt-6 text-xl font-semibold">Real-time MQTT</h3>
            <p className="mt-2 text-zinc-400">Global telemetry streaming via self-hosted Mosquitto broker with sub-50ms latency.</p>
          </div>
          <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-zinc-700 hover:bg-zinc-900/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-colors">
              <RiRobot2Line size={24} />
            </div>
            <h3 className="mt-6 text-xl font-semibold">Device Shadow</h3>
            <p className="mt-2 text-zinc-400">Automatic state reconciliation between desired and reported device configurations.</p>
          </div>
          <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-zinc-700 hover:bg-zinc-900/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-colors">
              <RiDashboard3Line size={24} />
            </div>
            <h3 className="mt-6 text-xl font-semibold">Edge Orchestration</h3>
            <p className="mt-2 text-zinc-400">Distribute tasks and monitor execution flows through a unified orchestration plane.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-900 bg-black/50 py-12">
        <div className="container mx-auto max-w-6xl px-6 flex flex-col items-center justify-between gap-6 sm:flex-row sm:text-left">
          <p className="text-sm text-zinc-500">© 2026 SPEDI Systems. All rights reserved.</p>
          <div className="flex gap-6 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-zinc-200">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-200">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
