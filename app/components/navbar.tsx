'use client';

import { useRouter, usePathname } from 'next/navigation';
import { RiRobot2Line, RiLogoutBoxRLine, RiBookOpenLine, RiDashboard3Line } from "@remixicon/react";
import { SessionIndicator } from './session-indicator';

interface NavbarProps {
    user: { email: string; is_superuser: boolean } | null;
    onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <nav className="border-b border-zinc-800 bg-zinc-900/50 p-4 px-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 font-medium cursor-pointer" onClick={() => router.push('/')}>
                    <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-md">
                        <RiRobot2Line size={20} />
                    </div>
                    SPEDI Platform
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => router.push('/')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                    >
                        <RiDashboard3Line size={16} />
                        Dashboard
                    </button>
                    <button
                        onClick={() => router.push('/docs')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/docs' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                    >
                        <RiBookOpenLine size={16} />
                        Docs
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <SessionIndicator />

                <div className="h-4 w-px bg-zinc-800" />

                <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400 font-mono flex items-center gap-2">
                        {user?.email}
                        {user?.is_superuser && (
                            <span className="text-emerald-400 font-sans font-medium bg-emerald-400/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                                Superuser
                            </span>
                        )}
                    </span>

                    {user?.is_superuser && (
                        <button
                            onClick={() => router.push('/config')}
                            className="px-3 py-1.5 text-zinc-400 hover:text-indigo-400 transition-colors text-xs font-medium border border-zinc-800 rounded-md hover:border-indigo-500/30 hover:bg-indigo-500/5"
                        >
                            Config
                        </button>
                    )}

                    <button
                        onClick={onLogout}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-red-400 transition-colors pl-2"
                    >
                        <RiLogoutBoxRLine size={16} /> Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
