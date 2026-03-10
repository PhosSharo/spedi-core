'use client';

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getApiUrl } from '@/lib/api';
import { getToken } from '@/lib/auth-store';
import {
    RiBookOpenLine, RiCodeLine, RiShieldCheckLine,
    RiWifiLine, RiSendPlaneLine, RiServerLine,
    RiLockLine, RiCheckboxCircleLine, RiAlertLine,
    RiArrowRightSLine
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
                    <button onClick={copy} className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans hover:text-foreground transition-colors">
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                </div>
            )}
            <pre className="p-3 bg-muted/10 overflow-x-auto"><code className="text-[10px] font-mono text-foreground/90 leading-relaxed whitespace-pre">{children}</code></pre>
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
                    { id: 'overview', label: 'Overview' },
                    { id: 'quick-start', label: 'Quick Start' },
                    { id: 'authentication', label: 'Authentication' },
                    { id: 'iot-integration', label: 'IoT Integration' },
                    { id: 'mobile-integration', label: 'Mobile Integration' },
                    { id: 'websocket', label: 'WebSocket Control' },
                    { id: 'telemetry', label: 'Telemetry Stream' },
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
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-8">
                {/* Overview */}
                <GuideSection id="overview" icon={RiBookOpenLine} title="Overview">
                    <p>
                        SPEDI is an IoT orchestration platform that mediates between physical devices (ESP32-based RC boats), a mobile controller application, and an admin dashboard. The backend exposes a REST API for resource operations, a WebSocket endpoint for real-time joystick control, and an SSE stream for live telemetry monitoring.
                    </p>
                    <p>
                        The system uses the <strong>Device Shadow</strong> pattern — maintaining in-memory <Label>desired</Label> and <Label>reported</Label> state objects for each device. Commands update the desired state and publish to MQTT; telemetry updates the reported state and broadcasts to connected clients.
                    </p>
                    <div className="rounded-sm border border-border p-4 bg-muted/10">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans mb-2">Architecture Flow</p>
                        <p className="font-mono text-[10px] text-foreground/70 leading-relaxed">
                            Mobile App → WebSocket → Server → MQTT → Device<br />
                            Device → MQTT → Server → SSE → Dashboard<br />
                            Device → MQTT → Server → Database (async persist)
                        </p>
                    </div>
                </GuideSection>

                {/* Quick Start */}
                <GuideSection id="quick-start" icon={RiSendPlaneLine} title="Quick_Start">
                    <p>Make your first authenticated API call in three steps:</p>

                    <p className="font-bold text-foreground">1. Obtain a JWT</p>
                    <CodeBlock lang="bash" title="curl">{`curl -X POST https://YOUR_BACKEND/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"dev@spedi.io","password":"password"}'`}</CodeBlock>
                    <p className="text-muted-foreground">The response contains <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">session.access_token</code> — this is your JWT.</p>

                    <p className="font-bold text-foreground">2. Use the token</p>
                    <CodeBlock lang="bash" title="curl">{`curl https://YOUR_BACKEND/devices \\
  -H "Authorization: Bearer YOUR_TOKEN"`}</CodeBlock>

                    <p className="font-bold text-foreground">3. Explore</p>
                    <p>Switch to the <strong>API Reference</strong> tab. Your token is automatically injected — use "Try It" on any endpoint.</p>
                </GuideSection>

                {/* Authentication */}
                <GuideSection id="authentication" icon={RiLockLine} title="Authentication">
                    <p>
                        Authentication is handled by Supabase Auth. The backend verifies JWTs using Supabase's JWKS (asymmetric ES256). Every request to a protected endpoint must include the JWT as a Bearer token in the <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">Authorization</code> header.
                    </p>
                    <div className="rounded-sm border border-border p-3 bg-muted/10 space-y-2">
                        <div className="flex items-start gap-2">
                            <RiCheckboxCircleLine size={12} className="text-foreground mt-0.5 flex-shrink-0" />
                            <p><strong>Token lifetime:</strong> 1 hour (configurable in Supabase). Use <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">refresh_token</code> to obtain a new access token without re-authenticating.</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <RiCheckboxCircleLine size={12} className="text-foreground mt-0.5 flex-shrink-0" />
                            <p><strong>Superuser:</strong> Checked via the <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">is_superuser</code> claim in <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">app_metadata</code>. Required for device registration, deletion, and config mutation.</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <RiAlertLine size={12} className="text-foreground mt-0.5 flex-shrink-0" />
                            <p><strong>WebSocket auth:</strong> The <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">/control</code> endpoint accepts the token as a query parameter: <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">?token=JWT</code></p>
                        </div>
                    </div>
                </GuideSection>

                {/* IoT Integration */}
                <GuideSection id="iot-integration" icon={RiServerLine} title="IoT_Integration // Arduino / ESP32">
                    <p>
                        Devices communicate via MQTT, not HTTP. The ESP32 connects to the Mosquitto broker and subscribes to command topics. The backend is the sole publisher to these topics.
                    </p>

                    <p className="font-bold text-foreground">Configurable MQTT Topics</p>
                    <p className="mb-2">
                        The backend subscribes to and publishes on topics defined dynamically in the Configuration table. The defaults are shown below, but they can be customized via the Dashboard.
                    </p>
                    <div className="rounded-sm border border-border overflow-hidden">
                        <table className="w-full text-[10px] font-mono">
                            <thead><tr className="bg-muted/30 border-b border-border">
                                <th className="p-2 text-left font-bold text-muted-foreground uppercase tracking-widest font-sans">Topic</th>
                                <th className="p-2 text-left font-bold text-muted-foreground uppercase tracking-widest font-sans">Direction</th>
                                <th className="p-2 text-left font-bold text-muted-foreground uppercase tracking-widest font-sans">Payload</th>
                            </tr></thead>
                            <tbody>
                                <tr className="border-b border-border/50"><td className="p-2">spedi/vehicle/joystick</td><td className="p-2">Server → Device</td><td className="p-2">{`{ throttle, steering }`}</td></tr>
                                <tr className="border-b border-border/50"><td className="p-2">spedi/vehicle/route</td><td className="p-2">Server → Device</td><td className="p-2">{`{ action, waypoints[] }`}</td></tr>
                                <tr className="border-b border-border/50"><td className="p-2">spedi/vehicle/status</td><td className="p-2">Device → Server</td><td className="p-2">{`{ lat, lng, obstacles, mode, ... }`}</td></tr>
                                <tr><td className="p-2">spedi/vehicle/camera</td><td className="p-2">Device → Server</td><td className="p-2">Binary JPEG buffer</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <p className="font-bold text-foreground">Arduino Example — Publishing Telemetry</p>
                    <CodeBlock lang="cpp" title="Arduino / ESP32 (PubSubClient)">{`#include <PubSubClient.h>
#include <ArduinoJson.h>

// Publish telemetry every 2 seconds
void publishTelemetry() {
    JsonDocument doc;
    doc["lat"]             = gps.location.lat();
    doc["lng"]             = gps.location.lng();
    doc["satellites"]      = gps.satellites.value();
    doc["obstacle_left"]   = readUltrasonic(TRIG_L, ECHO_L);
    doc["obstacle_right"]  = readUltrasonic(TRIG_R, ECHO_R);
    doc["smart_move"]      = autonomousMode;
    doc["waypoint_index"]  = currentWaypointIdx;

    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish("spedi/vehicle/status", buffer);
}`}</CodeBlock>

                    <p className="font-bold text-foreground">Arduino Example — Receiving Joystick Commands</p>
                    <CodeBlock lang="cpp" title="Arduino / ESP32 (PubSubClient)">{`void mqttCallback(char* topic, byte* payload, unsigned int length) {
    JsonDocument doc;
    deserializeJson(doc, payload, length);

    if (strcmp(topic, "spedi/vehicle/joystick") == 0) {
        int throttle = doc["throttle"];
        int steering = doc["steering"];
        setMotors(throttle, steering);
        lastCommandTime = millis(); // Reset 2s timeout
    }
}`}</CodeBlock>

                    <div className="rounded-sm border border-border p-3 bg-muted/10 flex items-start gap-2">
                        <RiAlertLine size={12} className="text-foreground mt-0.5 flex-shrink-0" />
                        <p><strong>Timeout:</strong> The device stops motors if no joystick command arrives within 2000ms. The server must maintain a stable publish cadence during manual control.</p>
                    </div>

                    <p className="font-bold text-foreground">Telemetry Field Mapping</p>
                    <p>
                        The backend does <strong>not</strong> hardcode telemetry field names. A superuser-configurable <Label>telemetry_field_map</Label> entry in the Config table maps device payload keys to shadow keys. This means you can rename fields in your Arduino code without breaking the backend.
                    </p>
                    <CodeBlock lang="json" title="Config: telemetry_field_map (example)">{`{
  "lat": "lat",
  "lng": "lng",
  "obstacle_left": "obstacle_left",
  "obstacle_right": "obstacle_right",
  "smart_move": "smart_move_active",
  "waypoint_index": "waypoint_index"
}`}</CodeBlock>
                    <p className="text-muted-foreground">
                        If you rename <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">obstacle_left</code> to <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">sonar_left</code> in your Arduino code, simply update the mapping: <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">{`"sonar_left": "obstacle_left"`}</code>. If no mapping is configured, all payload keys pass through directly.
                    </p>

                    <p className="font-bold text-foreground">Payload Size Limits</p>
                    <p>
                        Payloads exceeding <Label>telemetry_max_payload_bytes</Label> (default 4096) for the status topic, or <Label>camera_max_payload_bytes</Label> (default 256000) for the camera topic, are silently dropped. Keep telemetry lightweight. Continuous video streaming is not supported; only occasional JPEG snapshots should be sent to the camera topic.
                    </p>
                </GuideSection>

                {/* Mobile Integration */}
                <GuideSection id="mobile-integration" icon={RiCodeLine} title="Mobile_Integration // Flutter / Dart">
                    <p>
                        Mobile clients interact with the backend through REST for resource operations and WebSocket for real-time joystick control. Authentication uses the same Supabase JWT as all other clients.
                    </p>

                    <p className="font-bold text-foreground">Dart — Authenticate and Open a Session</p>
                    <CodeBlock lang="dart" title="Flutter / Dart (http package)">{`import 'dart:convert';
import 'package:http/http.dart' as http;

const baseUrl = 'https://YOUR_BACKEND';

// 1. Login
final loginRes = await http.post(
  Uri.parse('\$baseUrl/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'email': 'pilot@spedi.io',
    'password': 'password',
  }),
);
final token = jsonDecode(loginRes.body)['session']['access_token'];

// 2. Open a control session
final sessionRes = await http.post(
  Uri.parse('\$baseUrl/session'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer \$token',
  },
  body: jsonEncode({'device_id': 'YOUR_DEVICE_ID'}),
);`}</CodeBlock>

                    <p className="font-bold text-foreground">Dart — WebSocket Joystick Control</p>
                    <CodeBlock lang="dart" title="Flutter / Dart (web_socket_channel)">{`import 'package:web_socket_channel/web_socket_channel.dart';

final wsUrl = 'wss://YOUR_BACKEND/control?token=\$token';
final channel = WebSocketChannel.connect(Uri.parse(wsUrl));

// Send joystick state at 200ms intervals
Timer.periodic(Duration(milliseconds: 200), (_) {
  channel.sink.add(jsonEncode({
    'type': 'joystick',
    'payload': {
      'throttle': currentThrottle,  // -100 to 100
      'steering': currentSteering,  // -100 to 100
    },
  }));
});

// Listen for server messages
channel.stream.listen((data) {
  print('Server: \$data');
});`}</CodeBlock>

                    <div className="rounded-sm border border-border p-3 bg-muted/10 flex items-start gap-2">
                        <RiCheckboxCircleLine size={12} className="text-foreground mt-0.5 flex-shrink-0" />
                        <p><strong>Session mutex:</strong> Only one user can control a device at a time. <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">POST /session</code> returns <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">409</code> if the device is already claimed.</p>
                    </div>
                </GuideSection>

                {/* WebSocket */}
                <GuideSection id="websocket" icon={RiWifiLine} title="WebSocket_Control">
                    <p>
                        The <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">GET /control</code> endpoint upgrades to WebSocket. It is the joystick hot path — zero database reads, zero awaits.
                    </p>

                    <p className="font-bold text-foreground">Connection Lifecycle</p>
                    <div className="rounded-sm border border-border p-4 bg-muted/10 font-mono text-[10px] text-foreground/70 leading-loose">
                        1. Client opens <code className="bg-muted/30 px-1 rounded-sm">ws://host/control?token=JWT</code><br />
                        2. Server verifies JWT once — if invalid, closes with <code className="bg-muted/30 px-1 rounded-sm">4001</code><br />
                        3. Server checks for active session — if none, closes with <code className="bg-muted/30 px-1 rounded-sm">4003</code><br />
                        4. Client sends JSON frames: <code className="bg-muted/30 px-1 rounded-sm">{`{ type: "joystick", payload: { throttle, steering } }`}</code><br />
                        5. Server publishes to MQTT — fire and forget<br />
                        6. On disconnect: 30s grace window before session closes automatically
                    </div>

                    <p className="font-bold text-foreground">Command Gating</p>
                    <p>Commands are silently dropped if <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">reported.smart_move_active</code> is <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">true</code> — the device's obstacle avoidance takes priority.</p>
                </GuideSection>

                {/* Telemetry */}
                <GuideSection id="telemetry" icon={RiShieldCheckLine} title="Telemetry_Stream // SSE">
                    <p>
                        The <code className="font-mono text-[10px] bg-muted/30 px-1 rounded-sm">GET /events</code> endpoint opens a Server-Sent Events (SSE) stream. It is unidirectional — the server pushes telemetry, session, and device status events to all connected clients.
                    </p>

                    <p className="font-bold text-foreground">Event Types</p>
                    <div className="rounded-sm border border-border overflow-hidden">
                        <table className="w-full text-[10px] font-mono">
                            <thead><tr className="bg-muted/30 border-b border-border">
                                <th className="p-2 text-left font-bold text-muted-foreground uppercase tracking-widest font-sans">Event</th>
                                <th className="p-2 text-left font-bold text-muted-foreground uppercase tracking-widest font-sans">Payload</th>
                            </tr></thead>
                            <tbody>
                                <tr className="border-b border-border/50"><td className="p-2">telemetry</td><td className="p-2">GPS, obstacle distances, mode flags</td></tr>
                                <tr className="border-b border-border/50"><td className="p-2">device_online</td><td className="p-2">Device connected to MQTT broker</td></tr>
                                <tr className="border-b border-border/50"><td className="p-2">device_offline</td><td className="p-2">Device disconnected from MQTT broker</td></tr>
                                <tr><td className="p-2">session_change</td><td className="p-2">Control session opened/closed</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <p className="font-bold text-foreground">JavaScript Example — Consuming SSE</p>
                    <CodeBlock lang="javascript" title="Browser / Node.js">{`const token = 'YOUR_JWT';
const es = new EventSource(
  'https://YOUR_BACKEND/events',
  // Note: EventSource doesn't support custom headers.
  // Auth is checked via cookie or query param depending on implementation.
);

es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data.payload);
};`}</CodeBlock>
                </GuideSection>
            </div>
        </div>
    );
}

// ── API Reference Tab ────────────────────────────────────────────────
function ReferenceTab({ token }: { token: string | null }) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden rounded-sm border border-border">
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

    // Sync token from auth-store
    useEffect(() => {
        setToken(getToken());
        const interval = setInterval(() => {
            setToken(getToken());
        }, 5000);
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
                {([
                    { key: 'guides' as Tab, label: 'Guides', icon: RiBookOpenLine },
                    { key: 'reference' as Tab, label: 'API Reference', icon: RiCodeLine },
                ]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest font-sans transition-colors border ${activeTab === tab.key
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'guides' ? <GuidesTab /> : <ReferenceTab token={token} />}
            </div>
        </div>
    );
}
