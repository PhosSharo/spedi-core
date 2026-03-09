import { RiRobot2Line, RiSignalTowerLine, RiDashboard3Line } from "@remixicon/react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30">
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-zinc-800 bg-zinc-900/50 pt-24 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(79,70,229,0.15),transparent)]" />
        <div className="container mx-auto max-w-6xl px-6 relative">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-sm font-medium text-zinc-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              System Live
            </div>
            <h1 className="mt-8 text-5xl font-bold tracking-tight sm:text-7xl">
              SPEDI <span className="text-indigo-500">Dashboard</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              Low-latency orchestration for autonomous devices. Monitor telemetry, manage sessions, and execute commands in real-time.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all">
                Launch Console
              </button>
              <button className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-all">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </header>

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
            <a href="#" className="hover:text-zinc-200">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
