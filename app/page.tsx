'use client';

import { TelemetryPanel } from './components/telemetry-panel';

export default function Home() {
  return (
    <div className="p-4 lg:p-6 flex flex-col gap-4 h-full">
      <div className="border-b border-border pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">Mission_Control //</h1>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Real-time telemetry and command interface</p>
        </div>
        <div className="text-[10px] text-foreground font-mono uppercase tracking-widest bg-muted px-2 py-1 rounded-sm border mb-1">
          SYS_STAT: [ONLINE]
        </div>
      </div>

      <div className="flex flex-col flex-1 h-full">
        <TelemetryPanel />
      </div>
    </div>
  );
}
