'use client';

import { TelemetryPanel } from './components/telemetry-panel';
import { SystemActivity } from './components/system-activity';
import { CameraSnapshot } from './components/camera-snapshot';

export default function Home() {
  return (
    <div className="p-4 lg:p-6 flex flex-col gap-4 h-full xl:h-screen overflow-hidden">
      <div className="border-b border-border pb-4 flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">Mission_Control //</h1>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Real-time status and system intelligence</p>
        </div>
        <div className="text-[10px] text-foreground font-mono uppercase tracking-widest bg-muted px-2 py-1 rounded-sm border mb-1">
          SYS_STAT: [ONLINE]
        </div>
      </div>

      <div className="flex flex-col flex-1 h-full overflow-y-auto xl:overflow-hidden gap-6 pb-6">
        {/* Real-time Status */}
        <div className="shrink-0 flex flex-col gap-2">
          <h2 className="text-[10px] font-bold tracking-widest uppercase font-sans text-muted-foreground ml-1">Live_Telemetry_Stream</h2>
          <TelemetryPanel />
        </div>

        {/* Intelligence Grid */}
        <div className="flex flex-col xl:flex-row gap-6 flex-1 xl:min-h-0">

          {/* System Activity Stream */}
          <div className="flex flex-col gap-2 flex-1 min-h-[400px] xl:min-h-0">
            <h2 className="text-[10px] font-bold tracking-widest uppercase font-sans text-muted-foreground ml-1">Unified_System_Activity</h2>
            <div className="flex-1 min-h-0">
              <SystemActivity />
            </div>
          </div>

          {/* Camera Snapshot */}
          <div className="flex flex-col gap-2 xl:w-96 shrink-0 min-h-[300px] xl:min-h-0">
            <h2 className="text-[10px] font-bold tracking-widest uppercase font-sans text-muted-foreground ml-1">Remote_Vision</h2>
            <div className="flex-1 min-h-0">
              <CameraSnapshot />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
