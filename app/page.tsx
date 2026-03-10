'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiRobot2Line, RiSignalTowerLine, RiDashboard3Line, RiLoader4Line, RiLogoutBoxRLine } from "@remixicon/react";
import { getToken, setToken, logoutDirect, getCurrentUser } from '@/lib/auth-store';

import { TelemetryPanel } from './components/telemetry-panel';
import { SessionIndicator } from './components/session-indicator';
import { Navbar } from './components/navbar';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; is_superuser: boolean } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (!userData) throw new Error('Not authenticated');
        setUser(userData);
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

      <main className="container mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Mission Control</h1>
          <p className="text-zinc-400 mt-1">Real-time monitoring and command interface for connected vessels.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TelemetryPanel />
          </div>
          <div>
            <SessionIndicator />
          </div>
        </div>
      </main>
    </div>
  );
}
