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
                
                {/* 1. Architecture & Connection Specs */}
                <SpecPanel id="architecture" title="1. Architecture & Connection Properties" icon={RiServerLine}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-6">
                        
                        <div className="p-3 border border-border bg-foreground/5 rounded-sm space-y-2 font-mono text-xs">
                            <p className="font-bold font-sans uppercase tracking-widest text-foreground pb-2 border-b border-border/50">Core Endpoints & Ports</p>
                            
                            <div className="flex justify-between items-center py-1">
                                <span className="text-muted-foreground">REST API Base</span> 
                                <span className="text-right break-all text-foreground">{getApiUrl()}</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-1">
                                <span className="text-muted-foreground">SSE Events Stream</span> 
                                <span className="text-right break-all text-foreground">{getApiUrl()}/events</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-1 border-t border-border/50 pt-3 mt-1">
                                <span className="text-muted-foreground">MQTT Public Proxy (ESP32)</span> 
                                <span className="text-right break-all text-foreground">centerbeam.proxy.rlwy.net : 14546</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-1">
                                <span className="text-muted-foreground">MQTT Internal (Backend)</span> 
                                <span className="text-right break-all text-foreground">mosquitto.railway.internal : 1883</span>
                            </div>
                        </div>

                        <div className="border border-border p-3 bg-muted/5 rounded-sm">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Mosquitto Accounts</p>
                            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                                <li><strong>Device:</strong> <code>user: spedi-device</code>. Restricted ACL (Read: commands, Write: status). Used on hardware.</li>
                                <li><strong>Server:</strong> <code>user: spedi-server</code>. Full R/W. Used exclusively by backend.</li>
                            </ul>
                        </div>
                    </div>
                </SpecPanel>

                {/* 2. Hardware */}
                <SpecPanel id="hardware" title="2. Hardware Integration (MQTT)" icon={RiShieldCheckLine}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-6">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Firmware Configuration (ESP32)</p>
                            <p className="mb-2">Host must NOT include <code>mqtt://</code> prefix.</p>
                            <CodeBlock lang="cpp" title="Firmware (C++)">{`#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "centerbeam.proxy.rlwy.net";
const int mqtt_port = 14546;

void publishTelemetry() {
    JsonDocument doc;
    doc["lat"] = gps.lat();
    doc["lng"] = gps.lng();
    
    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish("spedi/vehicle/status", buffer); 
}`}</CodeBlock>
                        </div>
                    </div>
                </SpecPanel>

                {/* 3. Client Apps */}
                <SpecPanel id="client" title="3. Client Integration (REST & WebSockets)" icon={RiWifiLine}>
                    <div className="text-xs text-muted-foreground leading-relaxed space-y-6">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">Control Flow</p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li><code>POST /auth/login</code> for JWT.</li>
                                <li><code>POST /session</code> with Bearer Token.</li>
                                <li>WebSocket to <code>/control?token=&lt;JWT&gt;</code>.</li>
                            </ol>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground border-b border-border pb-1 mb-2">WebSocket Frame</p>
                            <CodeBlock lang="json" title="MANDATORY CLIENT WEBSOCKET FRAME">{`{
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
