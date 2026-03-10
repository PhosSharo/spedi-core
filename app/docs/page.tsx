'use client';

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getApiUrl } from '@/lib/api';
import { getToken } from '@/lib/auth-store';
import {
    RiBookOpenLine, RiCodeLine, RiShieldCheckLine,
    RiWifiLine, RiSendPlaneLine, RiServerLine,
    RiLockLine, RiCheckboxCircleLine, RiAlertLine,
    RiArrowRightSLine, RiUserSettingsLine
} from '@remixicon/react';

// Scalar styles
import '@scalar/api-reference-react/style.css';

type Tab = 'guides' | 'reference';

// ── Guide Sections ───────────────────────────────────────────────────
function GuideSection({ id, icon: Icon, title, children }: {
    id: string;
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="rounded-sm border border-border bg-background p-6">
            <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
                <div className="bg-foreground text-background p-1.5 rounded-sm">
                    <Icon size={16} />
                </div>
                <h2 className="text-xs font-bold tracking-widest uppercase font-sans text-foreground">{title}</h2>
            </div>
            <div className="space-y-4 text-xs text-foreground/80 leading-relaxed font-sans">
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
        <div className="rounded-sm border border-border overflow-hidden">
            {title && (
                <div className="px-3 py-1.5 bg-muted/40 border-b border-border flex justify-between items-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">{title}</span>
                    <button onClick={copy} className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans -my-3 -mx-2 p-3 hover:text-foreground active:scale-95 transition-all">
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                </div>
            )}
            <pre className="p-3 bg-muted/10 overflow-x-auto"><code className="text-[10px] font-mono text-foreground/90 leading-relaxed whitespace-pre select-all">{children}</code></pre>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <span className="text-[9px] font-bold text-muted-foreground bg-muted/30 border border-border px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-sans">{children}</span>;
}

// ── Guides Content ───────────────────────────────────────────────────
function GuidesTab() {
    return (
        <div className="flex gap-6 flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <nav className="w-48 flex-shrink-0 overflow-y-auto border-r border-border pr-4 py-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans px-1 mb-3">CONTENTS</p>
                {[
                    { id: 'quick-start', label: 'Quick Start' },
                    { id: 'constants', label: 'System Constants & Configuration' },
                    { id: 'infrastructure', label: 'Infrastructure & Port Mapping' },
                    { id: 'mqtt-broker', label: 'MQTT Broker & Security' },
                    { id: 'hardware', label: 'Hardware Integration' },
                    { id: 'backend', label: 'Backend REST API' },
                    { id: 'realtime', label: 'WebSocket & SSE Streams' },
                    { id: 'auth', label: 'Authentication & Users' },
                ].map(item => (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest font-sans text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                        <RiArrowRightSLine size={10} />
                        {item.label}
                    </a>
                ))}
            </nav>

            {/* Guide Sections */}
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 pb-16">

                {/* Quick Start */}
                <GuideSection id="quick-start" icon={RiSendPlaneLine} title="1. Quick_Start // Order of Operations">
                    <p>
                        SPEDI is a composite system requiring specific bring-up staging. Do not attempt to integrate the mobile app or hardware until the core infrastructure is verified.
                    </p>
                    <div className="rounded-sm border border-border p-4 bg-muted/10 font-sans space-y-4">
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">Phase 1: Database & Platform</p>
                            <p className="text-muted-foreground">Log into Railway and confirm the Supabase instance, Backend instance, and Mosquitto instance are reporting 'Healthy'. Verify you can log into this Dashboard.</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">Phase 2: Establish MQTT Infrastructure</p>
                            <p className="text-muted-foreground">Configure the Railway TCP Proxy for the Mosquitto container (maps internal 1883 to external TCP). Use an MQTT client like MQTTX to verify connection using the `device` credentials.</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">Phase 3: Hardware Verification</p>
                            <p className="text-muted-foreground">Flash the ESP32 with your Wi-Fi credentials and the exact TCP Proxy host/port. Observe the <strong>System Activity</strong> tab on this Dashboard; you should see hardware telemetry events arriving.</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">Phase 4: Client Integration</p>
                            <p className="text-muted-foreground">Once you verify Telemetry ingestion, you can boot the Mobile App to authenticate via the REST API and open a WebSocket channel against the backend to issue control commands.</p>
                        </div>
                    </div>
                </GuideSection>

                {/* System Constants */}
                <GuideSection id="constants" icon={RiServerLine} title="2. System_Constants_&_Configuration">
                    <p>All environmental constants, URLs, authentication keys, and topics are grouped here for explicit reference.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-[11px] font-mono leading-relaxed">

                        <div className="p-3 border border-border bg-foreground/5 rounded-sm space-y-2">
                            <p className="font-bold font-sans text-xs uppercase tracking-widest text-foreground pb-2 border-b border-border/50">Core URLs & Ports</p>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground mr-2">API_BASE_URL</span> <span className="text-right break-all">https://&lt;YOUR_RAILWAY_DOMAIN&gt;</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground mr-2">WS_CONTROL_URL</span> <span className="text-right break-all">wss://&lt;YOUR_RAILWAY_DOMAIN&gt;/control</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground mr-2">SSE_EVENTS_URL</span> <span className="text-right break-all">https://&lt;YOUR_RAILWAY_DOMAIN&gt;/events</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground mr-2">MQTT_HOST</span> <span className="text-right break-all">&lt;YOUR_TCP_PROXY_HOST&gt;</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground mr-2">MQTT_PORT</span> <span className="text-right break-all">&lt;YOUR_TCP_PROXY_PORT&gt;</span></div>
                        </div>

                        <div className="p-3 border border-border bg-foreground/5 rounded-sm space-y-2">
                            <p className="font-bold font-sans text-xs uppercase tracking-widest text-foreground pb-2 border-b border-border/50">Authentication & Keys</p>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">MQTT_DEVICE_USER</span> <span className="text-right">device</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">MQTT_DEVICE_PASS</span> <span className="text-right">spedi2026</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">MQTT_SERVER_USER</span> <span className="text-right">server</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">MQTT_SERVER_PASS</span> <span className="text-right">spedi2026</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">SUPABASE_URL</span> <span className="text-right">&lt;YOUR_SUPABASE_URL&gt;</span></div>
                        </div>

                        <div className="col-span-1 md:col-span-2 p-3 border border-border bg-foreground/5 rounded-sm space-y-2">
                            <p className="font-bold font-sans text-xs uppercase tracking-widest text-foreground pb-2 border-b border-border/50">MQTT Topic Map</p>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Vehicle Telemetry</span> <span className="text-right">spedi/vehicle/status</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Vehicle Camera</span> <span className="text-right">spedi/vehicle/camera</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Platform Joystick</span> <span className="text-right">spedi/vehicle/joystick</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Platform Route</span> <span className="text-right">spedi/vehicle/route</span></div>
                        </div>

                    </div>
                </GuideSection>

                {/* Infrastructure & Port Mapping */}
                <GuideSection id="infrastructure" icon={RiServerLine} title="3. Infrastructure_&_Port_Mapping">
                    <p>
                        If integrating externally, understanding where domains route traffic is critical. The platform runs distinct services managed through Railway.
                    </p>

                    <p className="font-bold text-foreground mt-4 border-b border-border pb-1">Railway Backend (Node.js REST & WebSockets)</p>
                    <ul className="list-disc pl-5 mt-2 space-y-2 marker:text-foreground">
                        <li><strong>Internal Port:</strong> 8080 (Managed by Fastify)</li>
                        <li><strong>Public HTTPS Domain:</strong> Used for all REST API, SSE, and WebSocket traffic (e.g. `&lt;YOUR_RAILWAY_DOMAIN&gt;`). HTTP automatically upgrades wss:// over standard 443 routes.</li>
                    </ul>

                    <p className="font-bold text-foreground mt-6 border-b border-border pb-1">Railway Mosquitto (MQTT Broker)</p>
                    <p className="mt-2 text-red-400 font-bold">CRITICAL: The TCP Proxy must be manually instantiated in Railway!</p>
                    <ul className="list-disc pl-5 mt-2 space-y-2 marker:text-foreground">
                        <li><strong>Internal Port:</strong> 1883</li>
                        <li><strong>Public TCP Proxy:</strong> Raw TCP traffic cannot flow over standard HTTPS boundaries. A dedicated TCP proxy must be generated in the Railway UI under Mosquitto -&gt; Networking.</li>
                        <li><strong>Example Mapping:</strong> `&lt;YOUR_TCP_PROXY_HOST&gt;:&lt;YOUR_TCP_PROXY_PORT&gt; -&gt; 1883`.
                            When configuring your hardware or debugging tools, the <strong>Host</strong> is `&lt;YOUR_TCP_PROXY_HOST&gt;` and the <strong>Port</strong> is `&lt;YOUR_TCP_PROXY_PORT&gt;`.
                        </li>
                    </ul>
                </GuideSection>

                {/* MQTT Broker & Security */}
                <GuideSection id="mqtt-broker" icon={RiShieldCheckLine} title="4. MQTT_Broker_&_Security">
                    <p>
                        The Mosquitto broker leverages a hardcoded `passwd` and `acl` (Access Control List) system.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4 text-[11px] font-mono leading-relaxed">
                        <div className="p-3 border border-border bg-foreground/5 rounded-sm">
                            <p className="font-bold font-sans text-xs uppercase tracking-widest text-foreground pb-2 border-b border-border/50 mb-2">Device Connectivity</p>
                            <p className="text-muted-foreground"><strong>Role:</strong> Physical vehicles / ESP32</p>
                            <p className="text-muted-foreground mt-1"><strong>Username:</strong> device</p>
                            <p className="text-muted-foreground"><strong>Password:</strong> spedi2026</p>
                            <br />
                            <p className="text-indigo-400">ACL Privileges:</p>
                            <ul className="list-disc pl-4 mt-1">
                                <li>PUBLISH to `spedi/vehicle/status`</li>
                                <li>PUBLISH to `spedi/vehicle/camera`</li>
                                <li>SUBSCRIBE to `spedi/vehicle/joystick`</li>
                                <li>SUBSCRIBE to `spedi/vehicle/route`</li>
                            </ul>
                        </div>
                        <div className="p-3 border border-border bg-foreground/5 rounded-sm">
                            <p className="font-bold font-sans text-xs uppercase tracking-widest text-foreground pb-2 border-b border-border/50 mb-2">Server Connectivity</p>
                            <p className="text-muted-foreground"><strong>Role:</strong> Internal Fastify Backend</p>
                            <p className="text-muted-foreground mt-1"><strong>Username:</strong> server</p>
                            <p className="text-muted-foreground"><strong>Password:</strong> spedi2026</p>
                            <br />
                            <p className="text-emerald-400">ACL Privileges:</p>
                            <ul className="list-none mt-1">
                                <li><strong># (Wildcard Read/Write)</strong></li>
                                <li className="text-[10px] mt-1 text-muted-foreground font-sans">The backend manages all command dispatches and consumes all raw hardware feeds.</li>
                            </ul>
                        </div>
                    </div>
                </GuideSection>

                {/* Hardware Integration */}
                <GuideSection id="hardware" icon={RiCodeLine} title="5. Hardware_Integration // ESP32">
                    <p>
                        The device communicates <strong>exclusively via MQTT</strong>. It does not speak HTTP or directly interact with the database.
                    </p>

                    <p className="font-bold text-foreground mt-4">Connecting and Publishing</p>
                    <CodeBlock lang="cpp" title="Arduino Snippet">{`#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "<YOUR_TCP_PROXY_HOST>";
const int mqtt_port = <YOUR_TCP_PROXY_PORT>; // Numeric port!
const char* mqtt_user = "device";
const char* mqtt_pass = "spedi2026";

// Publish telemetry every 2 seconds
void publishTelemetry() {
    JsonDocument doc;
    doc["lat"]             = gps.location.lat();
    doc["lng"]             = gps.location.lng();
    doc["obstacle_left"]   = readUltrasonic(TRIG_L, ECHO_L);
    doc["obstacle_right"]  = readUltrasonic(TRIG_R, ECHO_R);
    doc["smart_move"]      = autonomousMode;

    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish("spedi/vehicle/status", buffer);
}`}</CodeBlock>

                    <p className="font-bold text-foreground mt-4">Listening for Commands</p>
                    <CodeBlock lang="cpp" title="Arduino Snippet">{`void mqttCallback(char* topic, byte* payload, unsigned int length) {
    JsonDocument doc;
    deserializeJson(doc, payload, length);

    if (strcmp(topic, "spedi/vehicle/joystick") == 0) {
        int throttle = doc["throttle"]; // -100 to 100
        int steering = doc["steering"]; // -100 to 100
        setMotors(throttle, steering);
        lastCommandTime = millis(); // Refresh safety timeout
    }
}`}</CodeBlock>

                    <div className="rounded-sm border border-border p-3 bg-muted/10 flex items-start gap-3 mt-4">
                        <RiAlertLine size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-foreground text-xs uppercase font-sans">Safety Timeout</p>
                            <p className="text-muted-foreground">The device must halt motors if no joystick command arrives within 2000ms. Network partition handling must occur on the device firmware side.</p>
                        </div>
                    </div>
                </GuideSection>

                {/* Backend API */}
                <GuideSection id="backend" icon={RiBookOpenLine} title="6. Backend_REST_API">
                    <p>
                        The backend orchestrates everything. Read the <a href="#reference" className="text-foreground underline underline-offset-2">API Reference tab</a> for exact endpoints, but understand this pattern:
                    </p>
                    <div className="rounded-sm border border-border p-4 bg-muted/10 mt-2 space-y-4">
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">JWT Authentication</p>
                            <p className="text-muted-foreground">Virtually all routes require an `<span className="font-mono bg-muted/30 px-1 rounded-sm text-[10px]">Authorization: Bearer &lt;YOUR_TOKEN&gt;</span>` header. Retrieve this via `POST /auth/login`.</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">Content-Type Policy</p>
                            <p className="text-muted-foreground">Ensure `Content-Type: application/json` is set on mutating methods. If sending an empty POST body, `{ }` is acceptable.</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">Device Shadow Concept</p>
                            <p className="text-muted-foreground">The backend isolates client requests and literal vehicle state. `GET /devices/:id/state` returns a `desired` side (actions you requested) and a `reported` side (what the physical device most recently broadcasted via MQTT).</p>
                        </div>
                    </div>
                </GuideSection>

                {/* Realtime streams */}
                <GuideSection id="realtime" icon={RiWifiLine} title="7. Realtime_//_WebSocket_&_SSE">
                    <p>
                        Mobile and web clients leverage two distinct, persistent connections for distinct goals.
                    </p>

                    <p className="font-bold text-foreground mt-4 pb-1 border-b border-border">SSE (Server-Sent Events) - Read-Only Telemetry</p>
                    <p className="mt-2 text-muted-foreground">
                        Connect an `EventSource` to `GET /events?token=YOUR_JWT`. This stream provides unidirectional bursts formatted as `event: type \n data: JSON \n\n`. Events include `telemetry` updates, `device_online` metrics, and `session_change` pings.
                    </p>

                    <p className="font-bold text-foreground mt-6 pb-1 border-b border-border">WebSocket - Joystick Hot Path</p>
                    <p className="mt-2 text-muted-foreground mb-2">
                        You <strong>MUST</strong> explicitly grab a target session via `POST /session` before attempting to control it. Upgrading to `wss://BACKEND/control?token=YOUR_JWT` routes you to the zero-await joystick processor.
                    </p>
                    <p className="text-red-400 font-bold mb-2">IMPORTANT: The WebSocket JSON Payload Format</p>
                    <CodeBlock lang="json" title="WebSocket Frame Payload">{`{
  "type": "joystick",
  "payload": {
    "throttle": 100,
    "steering": -45
  }
}`}</CodeBlock>
                    <p className="text-muted-foreground mt-2">
                        Failing to wrap your commands in the <code>{`{ type, payload }`}</code> schema will result in the backend silently discarding your message structure.
                    </p>
                </GuideSection>

                {/* Authentication & Users */}
                <GuideSection id="auth" icon={RiUserSettingsLine} title="8. Authentication_&_Users">
                    <p>
                        Access is rigidly segregated between regular app operators and superusers via Supabase JWT claims.
                    </p>
                    <ul className="list-disc pl-5 mt-4 space-y-2 marker:text-foreground text-muted-foreground">
                        <li><strong>Superusers</strong> have unconditional system configuration access. The API `is_superuser` property evaluates true. These users cannot be registered via public APIs and must be seeded manually into Supabase.</li>
                        <li><strong>Standard Users</strong> interface via the Mobile or Web clients. They cannot modify `users` resources, write to `config`, or register platforms via POST `devices`. They act exclusively as device operators.</li>
                    </ul>
                </GuideSection>

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
                    hideDownloadButton: false,
                    forceDarkModeState: 'dark',
                    searchHotKey: 'k',
                    withDefaultFonts: false,
                    defaultHttpClient: {
                        targetKey: 'shell',
                        clientKey: 'curl',
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
    const [isSuperuser, setIsSuperuser] = useState(false);

    // Sync token from auth-store
    useEffect(() => {
        const syncAuth = () => {
            const currentToken = getToken();
            setToken(currentToken);

            if (currentToken) {
                try {
                    const payload = JSON.parse(atob(currentToken.split('.')[1]));
                    setIsSuperuser(payload.app_metadata?.is_superuser === true);
                } catch (e) {
                    setIsSuperuser(false);
                }
            } else {
                setIsSuperuser(false);
            }
        };

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

                {/* Credentials Warning */}
                <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-sans">
                    ⚠ Do not share your access token or credentials. Endpoints are auth-protected.
                </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 flex-shrink-0">
                <button
                    onClick={() => setActiveTab('guides')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest font-sans transition-colors border ${activeTab === 'guides'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground'
                        }`}
                >
                    <RiBookOpenLine size={14} />
                    Guides
                </button>

                {isSuperuser && (
                    <button
                        onClick={() => setActiveTab('reference')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest font-sans transition-colors border ${activeTab === 'reference'
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground'
                            }`}
                    >
                        <RiCodeLine size={14} />
                        API Reference
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'guides' ? <GuidesTab /> : <ReferenceTab token={token} />}
            </div>
        </div>
    );
}
