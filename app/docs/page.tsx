'use client';

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getApiUrl } from '@/lib/api';
import { getToken } from '@/lib/auth-store';
import {
    RiBookOpenLine, RiCodeLine, RiShieldCheckLine,
    RiWifiLine, RiServerLine, RiCheckboxCircleLine,
    RiAlertLine, RiSettings3Line, RiDatabase2Line,
    RiCpuLine, RiSmartphoneLine, RiDashboardLine
} from '@remixicon/react';

import '@scalar/api-reference-react/style.css';

type PageTab = 'guides' | 'reference';

// ── Reusable Components ─────────────────────────────────────────────

function SpecPanel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-5">
            <h2 className="text-sm font-bold tracking-widest uppercase font-sans text-foreground border-b border-border pb-2">{title}</h2>
            <div className="text-xs text-muted-foreground leading-relaxed space-y-5">
                {children}
            </div>
        </div>
    );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border/50 pb-1">{title}</h3>
            {children}
        </div>
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
        <div className="border border-border rounded-sm overflow-hidden bg-background mt-2 relative group">
            {title && (
                <div className="px-3 py-1.5 bg-muted/20 border-b border-border flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans">{title}</span>
                    <button onClick={copy} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans hover:text-foreground active:scale-95 transition-all p-1">
                        {copied ? '✓ COPIED' : 'COPY'}
                    </button>
                </div>
            )}
            {!title && (
                <button onClick={copy} className="absolute top-2 right-2 text-[10px] font-bold text-muted-foreground bg-background/80 border border-border px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:text-foreground md:flex hidden">
                    {copied ? '✓ COPIED' : 'COPY'}
                </button>
            )}
            <pre className="p-3 overflow-x-auto"><code className="text-[11px] font-mono text-foreground/90 leading-relaxed whitespace-pre block">{children}</code></pre>
        </div>
    );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="border border-border rounded-sm overflow-hidden mt-2">
            <table className="w-full text-[11px]">
                <thead>
                    <tr className="bg-muted/20 border-b border-border">
                        {headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left font-bold uppercase tracking-widest text-muted-foreground font-sans">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="font-mono">
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-b-0">
                            {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 text-foreground/90">{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function KVRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className={`text-right break-all text-foreground text-[11px] ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

// ── Guide Section Definitions ────────────────────────────────────────

type GuideSection = 'overview' | 'infra' | 'arduino' | 'mobile' | 'sse' | 'shadow';

const GUIDE_SECTIONS: { id: GuideSection; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'System Overview', icon: RiDashboardLine },
    { id: 'infra', label: 'Infrastructure', icon: RiServerLine },
    { id: 'arduino', label: 'Arduino / Firmware', icon: RiCpuLine },
    { id: 'mobile', label: 'Mobile / Flutter', icon: RiSmartphoneLine },
    { id: 'sse', label: 'SSE Integration', icon: RiWifiLine },
    { id: 'shadow', label: 'Device Shadow', icon: RiDatabase2Line },
];

// ── Section 1: System Overview ───────────────────────────────────────

function OverviewSection() {
    return (
        <SpecPanel title="System Overview">
            <p>
                SPEDI is an IoT-based autonomous RC boat. The backend orchestrates communication between three clients — an ESP32 device (Arduino firmware), a Flutter mobile controller, and a Next.js admin dashboard — through a Fastify server on Railway, a self-hosted Mosquitto MQTT broker, and a Supabase PostgreSQL database.
            </p>

            <Subsection title="Device Shadow Pattern">
                <p>
                    The server maintains an in-memory representation of each device with two halves. <strong className="text-foreground">Desired</strong> captures what the server intends the device to do — set by the mobile app via REST or WebSocket. <strong className="text-foreground">Reported</strong> captures what the device says it is doing — updated from MQTT telemetry. The <strong className="text-foreground">delta</strong> between the two is computed on read and returned via <code>GET /devices/:id/state</code>.
                </p>
                <p>
                    The shadow is authoritative. If the device disconnects and reconnects, the current desired state is immediately available for reconciliation. The shadow is lost on server restart — the device&apos;s built-in 2000ms command timeout stops motors, which is acceptable for a supervised MVP.
                </p>
            </Subsection>
        </SpecPanel>
    );
}

// ── Section 2: Infrastructure ────────────────────────────────────────

function InfraSection() {
    const apiUrl = getApiUrl();
    return (
        <SpecPanel title="Infrastructure & Endpoints">
            <Subsection title="Connection Endpoints">
                <div className="p-3 border border-border bg-foreground/5 rounded-sm space-y-1 font-mono text-[11px]">
                    <KVRow label="REST API Base" value={apiUrl} />
                    <KVRow label="SSE Event Stream" value={`${apiUrl}/events?token=<JWT>`} />
                    <KVRow label="WebSocket Control" value={`${apiUrl.replace(/^http/, 'ws')}/control?token=<JWT>`} />
                    <div className="border-t border-border/50 mt-2 pt-2">
                        <KVRow label="MQTT Public Proxy" value="centerbeam.proxy.rlwy.net : 14546" />
                        <KVRow label="MQTT Internal (Railway)" value="mosquitto.railway.internal : 1883" />
                    </div>
                </div>
            </Subsection>

            <Subsection title="MQTT Broker Accounts">
                <DataTable
                    headers={['Account', 'Username', 'Permissions']}
                    rows={[
                        ['Device', 'spedi-device', 'Read: joystick, route  ·  Write: status, camera'],
                        ['Server', 'spedi-server', 'Full read/write on all topics'],
                    ]}
                />
                <p className="mt-2">
                    The server is the sole legitimate publisher to command topics (<code>joystick</code>, <code>route</code>). The device can only subscribe to those topics and publish to <code>status</code> and <code>camera</code>. Passwords are managed via hashed <code>passwd</code> and <code>acl</code> files baked into the Mosquitto Docker image at deploy time.
                </p>
            </Subsection>

            <Subsection title="Authentication">
                <p>
                    All REST and SSE endpoints require a JWT issued by Supabase Auth. Obtain a token via <code>POST /auth/login</code>. Pass it as a <code>Bearer</code> header on REST requests, or as a <code>?token=</code> query parameter on SSE and WebSocket connections — browser <code>EventSource</code> and <code>WebSocket</code> APIs do not reliably support custom headers during connection upgrade.
                </p>
                <p>
                    Two privilege levels exist: <strong className="text-foreground">Superuser</strong> (full administrative access including config and user management) and <strong className="text-foreground">Standard User</strong> (restricted to documentation access on the dashboard). The <code>is_superuser</code> flag is embedded in the JWT&apos;s <code>app_metadata</code> and cannot be set or promoted via API.
                </p>
            </Subsection>
        </SpecPanel>
    );
}

// ── Section 3: Arduino / Firmware ────────────────────────────────────

function ArduinoSection() {
    return (
        <SpecPanel title="Arduino / Firmware Integration">
            <Subsection title="MQTT Connection">
                <p>
                    The ESP32 connects directly to the Mosquitto broker. The library of choice is <code>PubSubClient</code>. The host must <strong className="text-foreground">not</strong> include the <code>mqtt://</code> protocol prefix — <code>PubSubClient</code> expects a bare hostname.
                </p>
                <CodeBlock lang="cpp" title="Connection Setup (C++)">{`#include <PubSubClient.h>

const char* mqtt_server = "centerbeam.proxy.rlwy.net";
const int   mqtt_port   = 14546;
const char* mqtt_user   = "spedi-device";
const char* mqtt_pass   = "<password>";

void setupMQTT() {
    mqttClient.setServer(mqtt_server, mqtt_port);
    mqttClient.setCallback(onMessage);
    mqttClient.connect("spedi-device-01", mqtt_user, mqtt_pass);

    // Subscribe to command topics
    mqttClient.subscribe("spedi/vehicle/joystick");
    mqttClient.subscribe("spedi/vehicle/route");
}`}</CodeBlock>
            </Subsection>

            <Subsection title="Topic Reference">
                <DataTable
                    headers={['Topic', 'Direction', 'QoS', 'Payload']}
                    rows={[
                        ['spedi/vehicle/status', 'Device → Server', '1', 'Telemetry JSON (see below)'],
                        ['spedi/vehicle/joystick', 'Server → Device', '0', '{ throttle, steering }'],
                        ['spedi/vehicle/route', 'Server → Device', '1', '{ action, waypoints[] }'],
                        ['spedi/vehicle/camera', 'Device → Server', '0', 'Base64 JPEG string'],
                    ]}
                />
            </Subsection>

            <Subsection title="Telemetry Payload">
                <p>Publish telemetry to <code>spedi/vehicle/status</code> at a regular interval (recommended: 2 seconds). The server is a <strong className="text-foreground">tolerant reader</strong>, but the dashboard&apos;s map visualization requires a specific set of locked fields. Other fields can be freely named and included as needed.</p>
                <CodeBlock lang="json" title="Example Telemetry Payload">{`{
  // Required/Locked fields for Map Visualization
  "lat": 13.7563,
  "lng": 100.5018,
  "satellite_count": 8,
  "waypoint_index": 0,
  "mode": "manual",
  
  // Flexible/Custom fields (examples)
  "obstacle_left": 45,
  "obstacle_right": 120,
  "smart_move_active": false,
  "autopilot_active": false,
  "bearing": 127.5,
  "speed": 2.3
}`}</CodeBlock>
                <p className="mt-2">
                    <strong className="text-foreground">Locked Fields:</strong> <code>lat</code>, <code>lng</code>, <code>satellite_count</code>, <code>waypoint_index</code>, and <code>mode</code> are strictly required by the dashboard algorithms for rendering the live map and trail.
                </p>
                <p className="mt-2">
                    <strong className="text-foreground">Flexible Fields:</strong> Altitude, speed, heading, obstacle distances, etc., can be named however you want (e.g., <code>obs_l</code> vs <code>obstacle_left</code>). The superuser maps these custom fields into the in-memory shadow via the <code>telemetry_field_map</code> configuration.
                </p>
            </Subsection>

            <Subsection title="Receiving Commands">
                <p>The device receives two types of commands.</p>
                <CodeBlock lang="json" title="Joystick Command (spedi/vehicle/joystick)">{`{
  "throttle": 75,
  "steering": -25
}`}</CodeBlock>
                <CodeBlock lang="json" title="Route Command (spedi/vehicle/route)">{`{
  "action": "start",
  "waypoints": [
    { "lat": 13.7563, "lng": 100.5018 },
    { "lat": 13.7570, "lng": 100.5025 }
  ]
}`}</CodeBlock>
                <p className="mt-2">
                    The <code>action</code> field is either <code>"start"</code> (begin autonomous navigation) or <code>"stop"</code> (abort and return to idle). Waypoints are only present on <code>"start"</code>.
                </p>
            </Subsection>

            <Subsection title="Behavioral Rules">
                <ul className="list-disc pl-4 space-y-1.5">
                    <li><strong className="text-foreground">Command timeout:</strong> The device&apos;s firmware implements a 2000ms inactivity timeout. If no joystick command arrives within that window, motors stop. The server does not enforce this — it is a device-side safety mechanism.</li>
                    <li><strong className="text-foreground">Payload size limit:</strong> Telemetry payloads exceeding <code>telemetry_max_payload_bytes</code> (default: 4096 bytes) are silently dropped at ingestion. Keep payloads compact.</li>
                    <li><strong className="text-foreground">ACL enforcement:</strong> The device account can only read <code>joystick</code> and <code>route</code> topics, and write to <code>status</code> and <code>camera</code>. Publishing to command topics from the device is rejected by the broker.</li>
                </ul>
            </Subsection>
        </SpecPanel>
    );
}

// ── Section 4: Mobile / Flutter ──────────────────────────────────────

function MobileSection() {
    const apiUrl = getApiUrl();
    return (
        <SpecPanel title="Mobile / Flutter Integration">
            <Subsection title="Authentication">
                <p>Authenticate via the backend, not Supabase directly. The backend enriches the JWT with the <code>is_superuser</code> custom claim.</p>
                <CodeBlock lang="json" title="POST /auth/login">{`// Request
{ "email": "pilot@spedi.io", "password": "..." }

// Response 200
{
  "user":    { "id": "uuid", "email": "pilot@spedi.io", "is_superuser": false },
  "session": { "access_token": "<JWT>", "refresh_token": "...", "expires_in": 3600 }
}`}</CodeBlock>
                <p className="mt-2">
                    Store the <code>access_token</code> in memory — not <code>SharedPreferences</code> or local storage. Pass it as <code>Authorization: Bearer &lt;JWT&gt;</code> on all subsequent REST requests.
                </p>
            </Subsection>

            <Subsection title="Session Lifecycle">
                <p>
                    A control session grants exclusive device access. Only one user can control a device at a time, and each user can hold at most one session.
                </p>
                <CodeBlock lang="text" title="Session Flow">{`1. POST /session       { "device_id": "<uuid>" }   → 200 ActiveSession | 409 Conflict
2. GET  /session                                    → 200 ActiveSession | null
3. DELETE /session                                  → 200 (closes session, publishes stop)`}</CodeBlock>
                <p className="mt-2">
                    Opening a session sets the device&apos;s desired mode to <code>"manual"</code>. Closing a session resets desired state to idle and publishes a zero-throttle stop command to the device via MQTT. <code>POST /auth/logout</code> also closes the active session automatically.
                </p>
            </Subsection>

            <Subsection title="WebSocket Control (Joystick)">
                <p>
                    Connect to the WebSocket endpoint after opening a session. The JWT is passed as a query parameter because the browser/Flutter WebSocket API does not reliably support custom headers during the upgrade handshake.
                </p>
                <CodeBlock lang="text" title="Connection">{`ws(s)://<API_HOST>/control?token=<JWT>`}</CodeBlock>
                <p className="mt-2 mb-2">
                    Every frame must use the following envelope. The server silently drops messages that do not match this structure.
                </p>
                <CodeBlock lang="json" title="Joystick Frame (Client → Server)">{`{
  "type": "joystick",
  "payload": {
    "throttle": 75,
    "steering": -25
  }
}`}</CodeBlock>
                <ul className="list-disc pl-4 space-y-1.5 mt-3">
                    <li><strong className="text-foreground">Throttle:</strong> integer, typically -100 to 100. Positive is forward.</li>
                    <li><strong className="text-foreground">Steering:</strong> integer, typically -100 to 100. Negative is left.</li>
                    <li><strong className="text-foreground">Command gating:</strong> If the device reports <code>smart_move_active: true</code> (obstacle avoidance engaged), joystick commands are silently dropped by the server. No error is returned — the check is an in-memory read.</li>
                    <li><strong className="text-foreground">Grace period:</strong> On WebSocket disconnect, the server waits 30 seconds before closing the session. If the client reconnects within that window, the session resumes with no interruption. After 30 seconds, the session closes with reason <code>"timeout"</code> and a stop command is published.</li>
                </ul>
            </Subsection>

            <Subsection title="Autonomous Route Dispatch">
                <p>
                    Routes are created as drafts, then dispatched to the device. The full lifecycle:
                </p>
                <CodeBlock lang="text" title="Route Flow">{`1. POST   /routes             Create draft (≥2 waypoints required)
2. POST   /routes/:id/start   Dispatch to device via MQTT
3. POST   /routes/:id/stop    Abort and return to idle
4. DELETE /routes/:id          Delete draft (only if status is "draft")`}</CodeBlock>
                <CodeBlock lang="json" title="POST /routes — Create Draft">{`{
  "device_id": "<uuid>",
  "name": "River Patrol Alpha",
  "waypoints": [
    { "lat": 13.7563, "lng": 100.5018 },
    { "lat": 13.7570, "lng": 100.5025 },
    { "lat": 13.7580, "lng": 100.5030 }
  ]
}`}</CodeBlock>
                <p className="mt-2">
                    Dispatch preconditions (checked in order, fail-fast): the route must belong to the target device, no other route can be <code>"active"</code> on that device, and the requesting user must have an active session. Route completion is detected automatically — when the device&apos;s <code>autopilot_active</code> transitions from <code>true</code> to <code>false</code> while a route is active, the server marks it as <code>"completed"</code>.
                </p>
            </Subsection>
        </SpecPanel>
    );
}

// ── Section 5: SSE Integration ───────────────────────────────────────

function SseSection() {
    return (
        <SpecPanel title="Dashboard SSE Integration">
            <Subsection title="Connection">
                <p>
                    The dashboard opens a single persistent <code>EventSource</code> connection to receive all live updates. The server manages client lifecycle, heartbeats, and broadcasts through a unified <code>SseService</code>.
                </p>
                <CodeBlock lang="javascript" title="EventSource Setup">{`const token = getAccessToken();
const source = new EventSource(\`\${API_URL}/events?token=\${token}\`);

source.addEventListener('telemetry', (e) => {
    const { deviceId, payload } = JSON.parse(e.data);
    // payload contains the full reported state
});

source.addEventListener('syslog', (e) => {
    const { payload } = JSON.parse(e.data);
    // payload: { id, level, source, category, message, meta, timestamp }
});`}</CodeBlock>
            </Subsection>

            <Subsection title="Event Types">
                <DataTable
                    headers={['Event', 'Data Shape', 'Trigger']}
                    rows={[
                        ['telemetry', '{ deviceId, payload }', 'Every telemetry tick (~2s)'],
                        ['syslog', '{ payload: { level, source, ... } }', 'System log entry (auth, session, route, error)'],
                        ['session_change', '{ deviceId, payload: Session | null }', 'Session opened or closed'],
                        ['device_online', '{ deviceId, payload: { status, ts } }', 'Device MQTT connection established'],
                        ['device_offline', '{ deviceId, payload: { status, ts } }', 'Device MQTT connection lost'],
                        ['camera_snapshot', '{ payload: { timestamp, dataUri } }', 'Camera frame received from device'],
                    ]}
                />
            </Subsection>

            <Subsection title="Initial State Flush">
                <p>
                    On connection, the server immediately sends the current state so the client does not need a separate REST call:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                    <li>One <code>telemetry</code> event per device with non-empty reported shadow</li>
                    <li>The full recent <code>syslog</code> history (oldest first)</li>
                    <li>The latest <code>camera_snapshot</code> if available</li>
                </ul>
            </Subsection>

            <Subsection title="Connection Stability">
                <p>
                    The server sends an SSE comment line (<code>:\n\n</code>) every 30 seconds as a heartbeat. This prevents Railway and Vercel reverse proxies from closing idle connections. The response includes <code>X-Accel-Buffering: no</code> to disable proxy buffering and ensure events are flushed immediately.
                </p>
                <p>
                    If the connection drops, <code>EventSource</code> reconnects automatically. On reconnect, the server re-flushes the initial state.
                </p>
            </Subsection>
        </SpecPanel>
    );
}

// ── Section 6: Device Shadow ─────────────────────────────────────────

function ShadowSection() {
    return (
        <SpecPanel title="Device Shadow Reference">
            <Subsection title="Shadow Structure">
                <p>
                    Each device has a shadow maintained in server memory. The shadow is the single source of truth for all real-time state reads — no database queries are involved.
                </p>
                <CodeBlock lang="json" title="GET /devices/:id/state — Response">{`{
  "desired": {
    "mode": "manual",
    "throttle": 50,
    "steering": -10,
    "route": null
  },
  "reported": {
    "lat": 13.7563,
    "lng": 100.5018,
    "mode": "manual",
    "obstacle_left": 45,
    "obstacle_right": 120,
    "smart_move_active": false,
    "autopilot_active": false,
    "waypoint_index": 0
  },
  "delta": {
    "throttle": { "desired": 50, "reported": undefined },
    "steering": { "desired": -10, "reported": undefined }
  }
}`}</CodeBlock>
            </Subsection>

            <Subsection title="Desired State">
                <DataTable
                    headers={['Field', 'Type', 'Description']}
                    rows={[
                        ['mode', 'idle | manual | auto', 'Current operating mode. Set by session open/close and route dispatch.'],
                        ['throttle', 'number', 'Last commanded throttle value.'],
                        ['steering', 'number', 'Last commanded steering value.'],
                        ['route', '{lat,lng}[] | null', 'Active waypoint array. Set on route dispatch, cleared on idle.'],
                    ]}
                />
            </Subsection>

            <Subsection title="Reported State">
                <p>
                    The reported side is a dynamic <code>Record&lt;string, any&gt;</code>. Its structure depends on the <code>telemetry_field_map</code> configuration entry.
                </p>
                <ul className="list-disc pl-4 space-y-1.5 mt-2">
                    <li><strong className="text-foreground">With mapping configured:</strong> The <code>telemetry_field_map</code> is a JSON object <code>{`{ "device_key": "shadow_key" }`}</code>. Only keys present in the map are extracted from the device payload; all others are ignored in the shadow (but still stored in the DB <code>raw</code> column).</li>
                    <li><strong className="text-foreground">Without mapping (default):</strong> All payload keys pass through directly into the shadow via shallow merge. This is the tolerant reader default.</li>
                </ul>
                <CodeBlock lang="json" title="Example telemetry_field_map (Config Table)">{`{
  "lat": "lat",
  "lng": "lng",
  "obstacle_left": "obstacle_left",
  "obstacle_right": "obstacle_right",
  "smart_move_active": "smart_move_active",
  "autopilot_active": "autopilot_active",
  "waypoint_index": "waypoint_index"
}`}</CodeBlock>
                <p className="mt-2">
                    When the Arduino developer renames a field (e.g., <code>obs_l</code> → <code>obstacle_left</code>), the superuser updates this mapping via <code>PUT /config</code>. No backend code change or redeployment is required.
                </p>
            </Subsection>

            <Subsection title="Delta Computation">
                <p>
                    The delta contains every desired key whose value differs from its reported counterpart. This is computed at read time and returned by <code>GET /devices/:id/state</code>. Mobile clients can use the delta to detect when the device has not yet converged to the desired state.
                </p>
            </Subsection>
        </SpecPanel>
    );
}

// ── Guides Tab (Section-Based Navigation) ────────────────────────────

function GuidesTab() {
    const [activeSection, setActiveSection] = useState<GuideSection>('overview');

    return (
        <div className="flex gap-0 flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <nav className="w-52 flex-shrink-0 overflow-y-auto border-r border-border pr-0 pt-1 hidden md:flex flex-col">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans px-3 mb-2">Sections</p>
                {GUIDE_SECTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveSection(id)}
                        className={`flex items-center gap-2 px-3 py-2.5 text-xs font-sans text-left transition-colors w-full ${activeSection === id
                                ? 'text-foreground bg-muted/20 border-r-2 border-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
                            }`}
                    >
                        <Icon size={14} className="flex-shrink-0" />
                        {label}
                    </button>
                ))}
            </nav>

            {/* Mobile Section Selector */}
            <div className="md:hidden flex gap-1 overflow-x-auto pb-2 mb-2 border-b border-border/50 flex-shrink-0 px-2">
                {GUIDE_SECTIONS.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveSection(id)}
                        className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest font-sans whitespace-nowrap rounded-sm transition-colors ${activeSection === id
                                ? 'bg-muted/30 text-foreground'
                                : 'text-muted-foreground'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Section Content — CSS hidden toggle, all remain mounted */}
            <div className="flex-1 overflow-y-auto pl-6 pr-2 pb-16">
                <div className={activeSection === 'overview' ? '' : 'hidden'}><OverviewSection /></div>
                <div className={activeSection === 'infra' ? '' : 'hidden'}><InfraSection /></div>
                <div className={activeSection === 'arduino' ? '' : 'hidden'}><ArduinoSection /></div>
                <div className={activeSection === 'mobile' ? '' : 'hidden'}><MobileSection /></div>
                <div className={activeSection === 'sse' ? '' : 'hidden'}><SseSection /></div>
                <div className={activeSection === 'shadow' ? '' : 'hidden'}><ShadowSection /></div>
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
                    url: `${getApiUrl()}/openapi.json?v=${Date.now()}`,
                    theme: 'kepler',
                    layout: 'classic',
                    hideModels: true,
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
    const [activeTab, setActiveTab] = useState<PageTab>('guides');
    const [token, setToken] = useState<string | null>(null);

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
                    <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">Developer_Documentation //</h1>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Integration guides and interactive API reference.</p>
                </div>

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
                    API Reference
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'guides' ? <GuidesTab /> : <ReferenceTab token={token} />}
        </div>
    );
}
