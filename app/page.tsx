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
      <div className="min-h-screen bg-background flex flex-col gap-4 items-center justify-center text-muted-foreground">
        <RiLoader4Line className="animate-spin" size={24} />
        <p className="text-[10px] uppercase font-mono tracking-widest">SYS_INIT :: VERIFY_CREDENTIALS</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col selection:bg-foreground selection:text-background">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 p-4 lg:p-6 flex flex-col gap-4">
        <div className="border-b border-border pb-4 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">Mission_Control //</h1>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Real-time telemetry and command interface</p>
          </div>
          <div className="text-[10px] text-foreground font-mono uppercase tracking-widest bg-muted px-2 py-1 rounded-sm border mb-1">
            SYS_STAT: [ONLINE]
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-3/4 flex flex-col gap-4">
            <TelemetryPanel />
          </div>
          <div className="lg:w-1/4 flex flex-col gap-4 items-start">
            <SessionIndicator />
          </div>
        </div>
      </main>
    </div>
  );
}
