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

// ── Guides Content ───────────────────────────────────────────────────
function GuidesTab() {
    return (
        <div className="flex gap-6 flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <nav className="w-56 flex-shrink-0 overflow-y-auto border-r border-border pr-4 pt-1 hidden md:block">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans px-2 mb-3">Sections</p>
                {[
                    { id: 'architecture', label: '1. Architecture & Shadow' },
                    { id: 'infrastructure', label: '2. Infrastructure & Broker' },
                    { id: 'hardware', label: '3. Hardware Integration' },
                    { id: 'client', label: '4. Client Integration' },
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

                {/* 2. Infrastructure */}
                <SpecPanel id="infrastructure" title="2. Infrastructure & Broker Settings" icon={RiSettings3Line}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-6">
                        <p>
                            SPEDI utilizes Eclipse Mosquitto for message brokering. When integrating with PaaS providers like Railway, external port mappings and security ACLs govern the connection lifecycle.
                        </p>
                        
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Network Ports & TCP Proxy</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-border p-3 bg-muted/5 rounded-sm">
                                    <p className="font-bold text-foreground mb-1">Internal Network (Backend)</p>
                                    <p>The Fastify backend running in the same private network (e.g., identical Railway project namespace) connects directly to the containerized broker over the standard unencrypted port: <code className="text-[10px] font-mono text-foreground px-1 bg-muted/20">1883</code>.</p>
                                </div>
                                <div className="border border-border p-3 bg-muted/5 rounded-sm">
                                    <p className="font-bold text-foreground mb-1">External Access (Hardware ESP32)</p>
                                    <p>Physical devices accessing the system via public internet MUST use the TCP Proxy. Railway maps external traffic to port 1883 by provisioning a randomized port (e.g., <code className="text-[10px] font-mono text-foreground px-1 bg-muted/20">14546</code>). Hardware firmware must be configured with this public port.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Mosquitto Credentials & ACL Constraints</p>
                            <p className="mb-2">Traffic segregation prevents malicious manipulation. <code>mosquitto.conf</code> contains two disparate credential schemas:</p>
                            <ul className="list-disc pl-4 space-y-2 mt-2">
                                <li><strong>Device Account:</strong> (e.g., <code>user: spedi-device</code>). Provisioned onto hardware clients. Has restricted ACL matching: <em>Read-Only</em> for command topics, <em>Write-Only</em> for telemetry/status topics. Cannot inspect siblings.</li>
                                <li><strong>Server Account:</strong> (e.g., <code>user: spedi-server</code>). Utilized exclusively by the Node.js backend to facilitate data bridging. Retains wildcard (<code>#</code>) R/W permissions necessary for state shadowing and frontend multiplexing. Do not load these onto hardware.</li>
                            </ul>
                        </div>
                    </div>
                </SpecPanel>

                {/* 3. Hardware */}
                <SpecPanel id="hardware" title="3. Hardware Integration (MQTT)" icon={RiShieldCheckLine}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-6">
                        <p>
                            The physical vehicle (ESP32) layer requires explicit configuration against the external broker surface.
                        </p>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Connection String Formatting</p>
                            <ul className="list-disc pl-4 space-y-2 text-muted-foreground">
                                <li><strong>Host / Address:</strong> Specify the raw TCP Proxy domain address (e.g., <code>abc.proxy.rlwy.net</code>). <em>Crucially, omit all schema prefixes (do not use <code>tcp://</code> or <code>mqtt://</code>) when passing into standard Arduino C++ libraries.</em></li>
                                <li><strong>Port:</strong> Specify the public proxy port mapped to the service, absolutely do not supply 1883.</li>
                                <li><strong>Authentication:</strong> Supply the <em>Device Account</em> credentials via <code>PubSubClient::connect(clientId, user, pass)</code>.</li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Publishing & Parsing Constraints</p>
                            <p className="mb-2">Hardware publishes physical sensor logic natively formatted. Mapped schema definitions reside entirely in the <code className="text-[10px] font-mono text-foreground bg-muted/20 px-1">telemetry_field_map</code> PostgreSQL config, allowing agnostic C++ serialization without needing backend patching.</p>
                            <CodeBlock lang="cpp" title="Example Firmware C++">{`// Correct format: No protocol prefix, randomized public port.
const char* mqtt_server = "roundhouse.proxy.rlwy.net";
const int mqtt_port = 23908; 

void transmitTelemetry() {
    JsonDocument doc;
    doc["lat"] = gps.lat();     // Key mapped remotely via telemetry_field_map
    doc["lng"] = gps.lng();
    
    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish("spedi/vehicle/status", buffer); 
}`}</CodeBlock>
                        </div>
                    </div>
                </SpecPanel>

                {/* 4. Client Apps */}
                <SpecPanel id="client" title="4. Client Integration (REST & WebSockets)" icon={RiWifiLine}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-6">
                        <p>
                            High-level clients (Mobile Apps, Web Dashboards) are abstracted away from MQTT via the Node.js API boundary.
                        </p>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Control Flow Checklist</p>
                            <ol className="list-decimal pl-4 space-y-2 mb-4">
                                <li>Exchange credentials at <code className="text-[10px] font-mono text-foreground bg-muted/20 px-1">POST /auth/login</code> to receive a stateless JWT access token.</li>
                                <li>Execute <code className="text-[10px] font-mono text-foreground bg-muted/20 px-1">POST /session</code> with <code>Authorization: Bearer &lt;TOKEN&gt;</code> to acquire the vehicle steering mutex. Validating mutex acquisition is mandatory before transmitting commands.</li>
                                <li>Engage a WebSocket connection against <code className="text-[10px] font-mono text-foreground bg-muted/20 px-1">wss://&lt;BACKEND&gt;/control?token=&lt;YOUR_TOKEN&gt;</code>.</li>
                            </ol>
                        </div>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">WebSocket Socket Framing Envelope</p>
                            <div className="border border-red-900/40 bg-red-500/5 p-3 rounded-sm mb-3">
                                <p className="font-bold text-red-400 mb-1 text-[11px]">Constraint Warning</p>
                                <p className="text-muted-foreground">The bidirectional WebSocket requires strict JSON packet framing. Raw motor logic (flat objects) transmitted directly into the socket will fail JSON-schema validation and drop silently. Ensure you nest properties under a typed envelope payload.</p>
                            </div>
                            <CodeBlock lang="json" title="MANDATORY CLIENT WEBSOCKET FRAME">{`// Clients MUST emit this shape into the socket
{
  "type": "joystick",
  "payload": {
    "throttle": 75,
    "steering": -25
  }
}`}</CodeBlock>
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
