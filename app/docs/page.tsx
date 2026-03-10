'use client';

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getApiUrl } from '@/lib/api';
import { getToken } from '@/lib/auth-store';
import {
    RiBookOpenLine, RiCodeLine, RiShieldCheckLine,
    RiWifiLine, RiServerLine, RiCheckboxCircleLine, 
    RiAlertLine, RiSettings3Line, RiDatabase2Line
} from '@remixicon/react';

// Scalar styles
import '@scalar/api-reference-react/style.css';

type Tab = 'guides' | 'reference';

// ── Technical Spec Panels ──────────────────────────────────────────────
function SpecPanel({ title, children, icon: Icon, id }: { title: string; children: React.ReactNode; icon?: React.ElementType; id?: string }) {
    return (
        <section id={id} className="border border-border bg-surface rounded-sm overflow-hidden scroll-mt-6">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 border-b border-border">
                {Icon && <Icon size={14} className="text-muted-foreground" />}
                <h2 className="text-xs font-bold tracking-widest uppercase font-sans text-foreground">{title}</h2>
            </div>
            <div className="p-4 space-y-6">
                {children}
            </div>
        </section>
    );
}

function CodeBlock({ lang, title, children }: { lang: string; title?: string; children: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="border border-border rounded-sm overflow-hidden bg-background mt-2">
            {title && (
                <div className="px-3 py-1.5 bg-muted/20 border-b border-border flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans">{title}</span>
                    <button onClick={copy} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans hover:text-foreground active:scale-95 transition-all">
                        {copied ? '✓ COPIED' : 'COPY'}
                    </button>
                </div>
            )}
            <pre className="p-3 overflow-x-auto"><code className="text-[11px] font-mono text-foreground/90 leading-relaxed whitespace-pre select-all block">{children}</code></pre>
        </div>
    );
}

// ── Guides Content ───────────────────────────────────────────────────
function GuidesTab() {
    return (
        <div className="flex gap-6 flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <nav className="w-56 flex-shrink-0 overflow-y-auto border-r border-border pr-4 pt-1 hidden md:block">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans px-2 mb-3">Sections</p>
                {[
                    { id: 'architecture', label: '1. Architecture & Shadow' },
                    { id: 'configuration', label: '2. Dynamic Configuration' },
                    { id: 'hardware', label: '3. Hardware (MQTT)' },
                    { id: 'client', label: '4. Client Apps (REST/WS)' },
                ].map(item => (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="flex items-center gap-1.5 px-2 py-2 rounded-sm text-xs font-sans text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors"
                    >
                        {item.label}
                    </a>
                ))}
            </nav>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 pb-16">
                
                {/* 1. Architecture */}
                <SpecPanel id="architecture" title="1. Architecture & Device Shadow" icon={RiServerLine}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-4">
                        <p>
                            SPEDI implements the standard IoT Device Shadow architecture to ensure reliable state management between the cloud and the physical vehicle. This pattern maintains a persistent virtual representation of the device, allowing applications to interact with its state even when connectivity is intermittent.
                        </p>
                        
                        <div className="border border-border p-3 bg-muted/5 rounded-sm">
                            <p className="text-xs font-bold text-foreground mb-2">The Device Shadow Pattern</p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li><strong>Desired State:</strong> Represents the intended device state. When a client sends a joystick command via WebSocket, the server updates the <code className="text-[10px] font-mono bg-muted/40 px-1 py-0.5 rounded-sm text-foreground">desired</code> state in memory and publishes the command to MQTT.</li>
                                <li><strong>Reported State:</strong> Represents the latest state broadcasted by the physical device via MQTT telemetry. The server compares <code className="text-[10px] font-mono bg-muted/40 px-1 py-0.5 rounded-sm text-foreground">desired</code> against <code className="text-[10px] font-mono bg-muted/40 px-1 py-0.5 rounded-sm text-foreground">reported</code> to reconcile client UI state and validate incoming commands.</li>
                            </ul>
                        </div>
                    </div>
                </SpecPanel>

                {/* 2. Configuration */}
                <SpecPanel id="configuration" title="2. Dynamic Configuration" icon={RiSettings3Line}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-4">
                        <p>
                            <strong>Almost nothing is hardcoded.</strong> MQTT broker addresses, port proxies, topics, payload limits, and telemetry mapping rules live exclusively in the PostgreSQL database and are fetched into server memory at boot. You can view and edit these in the <strong>Config</strong> tab.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-border p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-subtle pb-1 mb-2">MQTT Topic Topology</p>
                                <p className="mb-2">Config keys dictate where hardware should listen or publish. Example keys (mutable via Dashboard):</p>
                                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                                    <li><code className="text-[10px] font-mono text-foreground">mqtt_topic_status</code> (Default: spedi/vehicle/status)</li>
                                    <li><code className="text-[10px] font-mono text-foreground">mqtt_topic_joystick</code> (Default: spedi/vehicle/joystick)</li>
                                    <li><code className="text-[10px] font-mono text-foreground">mqtt_topic_route</code> (Default: spedi/vehicle/route)</li>
                                </ul>
                            </div>
                            <div className="border border-border p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-subtle pb-1 mb-2">Tolerant Reader Parsing</p>
                                <p className="mb-2">The device publisher schema is owned by the hardware team and can evolve dynamically. The backend stores the raw JSON natively.</p>
                                <p>To map hardware JSON fields into standardized memory keys (like lat/lng), update the <code className="text-[10px] font-mono text-foreground bg-muted/40 px-1">telemetry_field_map</code> config key in the database rather than requiring a backend code change.</p>
                            </div>
                        </div>
                    </div>
                </SpecPanel>

                {/* 3. Hardware */}
                <SpecPanel id="hardware" title="3. Hardware Integration (MQTT)" icon={RiShieldCheckLine}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-6">
                        <p>
                            Devices (ESP32) interface via MQTT over a TCP proxy. See the Config Tab for the mapped Broker IP, Port, and Topic strings. 
                        </p>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Publishing Telemetry</p>
                            <CodeBlock lang="cpp" title="Telemetry Loop">{`#include <PubSubClient.h>
#include <ArduinoJson.h>

// Substitute with values from the Config database
const char* mqtt_server = "centerbeam.proxy.rlwy.net";
const int mqtt_port = 14546;

void publishTelemetry() {
    JsonDocument doc;
    doc["lat"] = gps.location.lat(); // Mapped via telemetry_field_map
    doc["lng"] = gps.location.lng();
    doc["smart_move"] = autonomousMode;
    
    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish("spedi/vehicle/status", buffer); // Match mqtt_topic_status config
}`}</CodeBlock>
                        </div>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Command Timeout Constraint</p>
                            <div className="border border-border bg-muted/5 p-4 rounded-sm">
                                <p className="mb-2"><strong>Context:</strong> The device receives joystick JSON packets over MQTT. If the client loses connection, the server will cease publishing commands, but the device will maintain its last known motor state.</p>
                                <p><strong>Requirement:</strong> The device firmware must implement a timeout check: <code>millis() - lastCommandTime &gt; 2000 ms</code>. If the threshold is exceeded, the device must autonomously halt motor outputs to prevent collisions.</p>
                            </div>
                        </div>
                    </div>
                </SpecPanel>

                {/* 4. Client Apps */}
                <SpecPanel id="client" title="4. Client Applications (REST & Websockets)" icon={RiWifiLine}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-6">
                        <p>
                            Device interfaces map to specific transport protocols based on operational requirements.
                        </p>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Observability via SSE (Server-Sent Events)</p>
                            <p className="mb-2">Admin Dashboards or passive monitoring maps use a unidirectional <code className="text-[10px] font-mono text-foreground px-1 bg-muted/40">GET /events</code> endpoint. As MQTT telemetry hits the server, it multiplexes it down to connected browsers. It is lightweight, unidirectional, and strictly read-only.</p>
                        </div>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Active Control via WebSocket</p>
                            <p className="mb-2">Applications requiring active navigation control utilize WebSockets. Connections require session verification via REST endpoints prior to initialization.</p>
                            <ol className="list-decimal pl-4 space-y-2 mb-4">
                                <li>Execute <code className="text-[10px] font-mono text-foreground px-1 bg-muted/40">POST /session</code> with a valid JWT. The backend sets the session mode in memory.</li>
                                <li>Open a WebSocket to <code className="text-[10px] font-mono text-foreground px-1 bg-muted/40">wss://.../control?token=YOUR_JWT</code>.</li>
                                <li>Transmit JSON payloads via the socket using the defined frame schema. Over-schema or invalid payloads are discarded.</li>
                            </ol>
                            <CodeBlock lang="json" title="WebSocket Frame Payload">{`{
  "type": "joystick",
  "payload": {
    "throttle": 75,
    "steering": -25
  }
}`}</CodeBlock>
                        </div>
                        
                        <div className="border border-border p-3 bg-muted/5 rounded-sm">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground">System Roles</p>
                            <p className="mt-2 text-muted-foreground"><strong>Superuser:</strong> Created only via CLI / seed. Grants global access to rewrite <code>telemetry_field_map</code>, DB configs, or user access.</p>
                            <p className="mt-1 text-muted-foreground"><strong>Standard User:</strong> Registered through UI workflows. Used by Controller applications to get JWT tokens and acquire active driving sessions. Cannot manipulate configs.</p>
                        </div>
                    </div>
                </SpecPanel>

            </div>
        </div>
    );
}

// ── API Reference Tab ────────────────────────────────────────────────
function ReferenceTab({ token }: { token: string | null }) {
    return (
        <div className="flex-1 flex flex-col overflow-y-auto rounded-sm border border-border">
            <ApiReferenceReact
                configuration={{
                    url: `${getApiUrl()}/openapi.json`,
                    theme: 'kepler',
                    layout: 'classic',
                    hideModels: false,
                    hideDownloadButton: true,
                    forceDarkModeState: 'dark',
                    searchHotKey: 'k',
                    withDefaultFonts: false,
                    defaultHttpClient: {
                        targetKey: 'js',
                        clientKey: 'fetch',
                    },
                    authentication: {
                        preferredSecurityScheme: 'BearerAuth',
                        securitySchemes: {
                            BearerAuth: {
                                token: token || '',
                            },
                        },
                    },
                    customCss: `
                        .scalar-app {
                            --scalar-background-1: #09090b;
                            --scalar-background-2: #18181b;
                            --scalar-background-3: #27272a;
                            --scalar-color-1: #fafafa;
                            --scalar-color-2: #a1a1aa;
                            --scalar-color-3: #71717a;
                            --scalar-color-accent: #fafafa;
                            --scalar-border-color: #27272a;
                            --scalar-font: 'DM Sans', sans-serif;
                            --scalar-font-code: 'JetBrains Mono', monospace;
                        }
                    `,
                }}
            />
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function DocsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('guides');
    const [token, setToken] = useState<string | null>(null);

    // Sync token from auth-store
    useEffect(() => {
        const syncAuth = () => setToken(getToken());
        syncAuth();
        const interval = setInterval(syncAuth, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 lg:p-6 flex flex-col gap-4 h-full overflow-hidden">
            {/* Header */}
            <div className="border-b border-border pb-4 flex items-end justify-between flex-shrink-0">
                <div>
                    <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">API_Documentation //</h1>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Platform documentation and interactive API reference.</p>
                </div>

                {/* Auth Status */}
                <div className="flex items-center gap-2">
                    {token ? (
                        <span className="flex items-center gap-1.5 text-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm border border-foreground/30 bg-foreground/5 font-sans">
                            <RiCheckboxCircleLine size={12} />
                            Token_Active
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm border border-border bg-muted/30 font-sans">
                            <RiAlertLine size={12} />
                            No_Token — Log in to enable Try It
                        </span>
                    )}
                </div>

            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 border-b border-border/50 pb-0.5 flex-shrink-0">
                <button
                    onClick={() => setActiveTab('guides')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest font-sans rounded-t-sm transition-colors ${activeTab === 'guides' ? 'bg-muted/30 text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:bg-muted/10'}`}
                >
                    Integration Guides
                </button>
                <button
                    onClick={() => setActiveTab('reference')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest font-sans rounded-t-sm transition-colors ${activeTab === 'reference' ? 'bg-muted/30 text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:bg-muted/10'}`}
                >
                    API / Swagger Reference
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'guides' ? <GuidesTab /> : <ReferenceTab token={token} />}
        </div>
    );
}
