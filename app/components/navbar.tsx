'use client';

import { useRouter, usePathname } from 'next/navigation';
import { RiRobot2Line, RiLogoutBoxRLine, RiBookOpenLine, RiDashboard3Line, RiLineChartLine, RiTestTubeLine } from "@remixicon/react";
import { SessionIndicator } from './session-indicator';

interface NavbarProps {
    user: { email: string; is_superuser: boolean } | null;
    onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <nav className="border-b bg-background px-4 py-2 flex items-center justify-between text-xs font-sans uppercase tracking-wider">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 font-bold cursor-pointer" onClick={() => router.push('/')}>
                    <div className="border p-1 rounded-sm bg-muted text-muted-foreground">
                        <RiRobot2Line size={14} />
                    </div>
                    <span>SPEDI_TERM</span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => router.push('/')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors ${pathname === '/' ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                    >
                        <RiDashboard3Line size={14} />
                        Dashboard
                    </button>
                    <button
                        onClick={() => router.push('/telemetry')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors ${pathname === '/telemetry' ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                    >
                        <RiLineChartLine size={14} />
                        Telemetry
                    </button>
                    <button
                        onClick={() => router.push('/testing')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors ${pathname === '/testing' ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                    >
                        <RiTestTubeLine size={14} />
                        Testing
                    </button>
                    <button
                        onClick={() => router.push('/docs')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors ${pathname === '/docs' ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                    >
                        <RiBookOpenLine size={14} />
                        Docs
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <SessionIndicator />

                <div className="h-3 w-px bg-border" />

                <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono flex items-center gap-2 lowercase tracking-normal">
                        {user?.email}
                        {user?.is_superuser && (
                            <span className="font-sans font-bold bg-foreground text-background px-1.5 py-0.5 rounded-sm uppercase tracking-widest text-[9px]">
                                SU
                            </span>
                        )}
                    </span>

                    {user?.is_superuser && (
                        <button
                            onClick={() => router.push('/config')}
                            className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors border rounded-sm hover:bg-muted"
                        >
                            SYS_CFG
                        </button>
                    )}

                    <button
                        onClick={onLogout}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors pl-1"
                    >
                        <RiLogoutBoxRLine size={14} /> EXIT
                    </button>
                </div>
            </div>
        </nav>
    );
}
