# log.md — Build Log

---

01 | CHORE   | Initialized project with Fastify and TypeScript
> Scaffolded base structure with services, routes, plugins, and db directories.
> Set up tsconfig.json and verified Node.js 20 compatibility.

02 | FEAT    | Implemented health check route
> Added src/routes/health.ts and registered it in src/server.ts.
> Server verified running on port 3000.

03 | FEAT    | Applied Database Schema Migration
> Created 6 core tables in Supabase public schema (users, devices, sessions, routes, telemetry, config).
> Set up auth user insert trigger and pg_cron 30-day telemetry retention nightly job.
> Configured .env with Supabase credentials.

04 | DECIDE  | Telemetry table restricted to strict explicit schema (id, device_id, recorded_at, raw)
> Dropped inferred hardware columns (lat, lng, mode, etc.) to fully embrace tolerant reader.
> Prevent dual-representation and stale schemas; queries read directly from `raw` JSONB until fields permanently stabilize.

05 | SEED    | Seeded global configuration table
> Inserted default values for MQTT broker (host: mosquitto, port: 1883), device topics, and operational timeouts (2000ms).

06 | FEAT    | Configured Mosquitto broker with ACL and Password Auth
> Created mosquitto.conf, acl, and passwd files. 
> Implemented Dockerfile builder to securely hash plaintext passwords at deploy time.
> Confirmed 'device' and 'server' role boundaries.

07 | FEAT    | Railway deployment and Fail-Fast DB Check
> Created railway.json defining multi-service monorepo deployment (backend & mosquitto).
> Implemented process.exit(1) health check in server.ts preventing silent DB connection failures.

08 | FEAT    | Vercel Deployment & Shadcn UI Custom Preset
> Created Dashboard placeholder landing page using Next.js 15, React 19, and Tailwind v4.
> Setup multi-target build scripts in package.json to separate Vercel and Railway build outputs.
> Fixed `tsconfig.json` path aliasing by relocating `src/components/` and `src/lib/` to project root.
> Initialized standard Shadcn UI with the requested `aurkjEG` preset to overwrite default CSS variables.

09 | FEAT    | Injected is_superuser custom claim into Supabase JWT
> Created DB function and trigger to sync is_superuser to auth.users.raw_app_meta_data.
> Enables privilege checks directly from JWT without a database round-trip on every backend request.

10 | FEAT    | Implemented idempotent superuser seed script
> Created src/db/seed-superuser.ts for automated superuser provisioning.
> Added npm run db:seed:superuser script mapping.
> Successfully seeded superspedi@spedi.io superuser.

11 | FEAT    | Implemented core Auth endpoints (login, logout, me)
> Created AuthService, authPlugin, and auth routes.
> Verified is_superuser claim injection in JWT profiles.
> Local JWT verification structured with SDK fallback.

12 | FEAT    | Implemented Frontend Auth UI
> added next.config.mjs rewrites to proxy /api to backend
> created lib/auth-store.ts for in-memory ephemeral JWT storage
> created /login page with custom dark-themed UI matching shadcn style
> ported app/page.tsx to client component with active JWT validation

13 | FEAT    | Migrated to Asymmetric JWT Verification (ES256)
> Refactored AuthService to use JWKS (JSON Web Key Set) fetched from Supabase.
> Removed dependency on symmetric JWT_SECRET in .env.
> Fixed server crash by ensuring environment variables load before service initialization.
> Optimized nodemon configuration to prevent recursive source scanning.

14 | FEAT    | Implemented ConfigService and /config routes
> Created ConfigService singleton for in-memory caching and DB persistence.
> Integrated load() into server startup sequence for synchronous global config access.
> Implemented superuser-protected GET and PUT /config endpoints.
> Fixed Fastify TypeScript type declarations for request.user and authenticate decorator.

15 | FEAT    | Implemented DeviceService and /devices routes
> Created DeviceService singleton for device lifecycle management.
> Implemented /devices list, /devices/:id detail, and superuser-only registration.
> Added /devices/:id/state stub shadow endpoint for Phase 5 integration.

41 | FEAT    | Documentation & Polish — Telemetry Simulation
> Enhanced `SystemActivity` simulate modal with pre-fill buttons (`STATUS_GEN`, `OBSTACLE_WARN`, `ROUTE_EXEC`).
> Fixed character encoding errors (`â€”` to `—`) in backend and agent mastery documents.

42 | FEAT    | API Reference & Documentation — RBAC Visibility
> Restricted "API Reference" tab in `/docs` to superusers only by verifying `is_superuser` claim in the JWT.
> Added comprehensive "User Management" section to documentation guides.
> Updated "Telemetry" and "Authentication" guide sections with RBAC and simulation details.
> Refined backend OpenAPI (Swagger) tags: added `Telemetry`, `Users`, `Debug`, and reassigned endpoints for better discovery.
> Fixed JSX nesting and formatting issues in `app/docs/page.tsx`.

43 | FEAT    | API Reference — Documentation Enrichment
> Embedded high-level Architecture, RBAC, and Data Model guides into the OpenAPI `info.description`.
> Detailed all Swagger tags with security policies, simulation instructions, and connection lifecycles.
> Added comprehensive JSON examples to `Telemetry`, `Users`, `Config`, and `Routes` schemas.
> Ensured the API reference is self-documenting and mirrors the manual guides.

44 | FEAT    | Simulation & Styling Fixes
> Fixed Mosquitto container permission warnings for `passwd` and `acl` files.
> Implemented "Premium Terminal" aesthetics in `Modal` component with CRT scanline and glow effects.
> Fixed "Not Found" error during telemetry simulation by refactoring `apiFetch` in `SystemActivity` for robust absolute URL handling.
> Enhanced `apiFetch` utility with default `Content-Type: application/json` handling.
> Polished `SystemActivity` log stream and pre-fill button aesthetics.

16 | FEAT    | Implemented Dashboard Config Manager Page
> Created /config route in Next.js App Router for configuration management.
> Implemented superuser protection and automatic redirect for unauthorized users.
> Built an interactive table allowing superusers to view and edit system configurations in real-time.
> Added a secure 'Config' navigation link to the dashboard header.

17 | FEAT    | Implemented MqttService wrapper with ConfigService integration
> Created src/services/mqtt.service.ts — MQTT.js wrapper reading broker address and topics from ConfigService.
> Exponential backoff reconnect (1s → 30s ceiling), re-subscribes all topics on reconnect.
> Emits device_online / device_offline events. QoS 0 for joystick, QoS 1 for routes.
> Integrated into server.ts startup sequence (config → MQTT → HTTP) with graceful shutdown.
> Added MQTT_USERNAME / MQTT_PASSWORD to .env for broker authentication.

18 | FEAT    | Upgraded DeviceService to real in-memory Device Shadow
> Replaced stub with Map<deviceId, DeviceShadow> holding desired + reported states.
> Added updateReported (tolerant reader, shallow merge), setDesired, getState (with delta), getReported.
> All shadow reads are synchronous in-memory. Added async updateLastSeen (fire-and-forget).
> Updated GET /devices/:id/state to return real shadow with computed delta.

19 | FEAT    | Implemented TelemetryService ingestion pipeline
> Created src/services/telemetry.service.ts — MQTT message → sync pipeline → async DB.
> Pipeline: (1) DeviceService.updateReported, (2) RouteService hook, (3) SSE hook, (4) async raw insert, (5) async last_seen_at.
> Tolerant reader: parses JSON, stores full raw payload verbatim, never rejects unknown fields.
> Wired into server.ts via mqttService.onMessage → telemetryService.ingest.

20 | FIX     | Refined DeviceService reported shadow extraction
> Strongly typed the `reported` object in memory: mode, lat, lng, obstacle_left, obstacle_right, smart_move_active, waypoint_index.
> Updated `updateReported` to extract only known fields into typed properties, discarding unknown fields from the in-memory shadow.
> The DB (via TelemetryService) remains the tolerant reader storing the full raw payload.

21 | FEAT    | Implemented GET /events SSE Endpoint
> Created `src/services/sse.service.ts` to track open SSE client connections and broadcast events.
> Added `GET /events` route protected by JWT authentication to start the persistent stream.
> On connection, immediately flushes the current shadow state for all devices as an initial `telemetry` event.
> Wired `telemetryService.onSSE` to broadcast live telemetry JSON.
> Wired `mqttService` connection events to broadcast `device_online` and `device_offline`.
> `session_change` event remains a stub pending SessionService implementation.

22 | FEAT    | Built Live Telemetry Component for Dashboard
> Created `TelemetryPanel` component connecting to `GET /events` via `EventSource`.
> Handles auth token injection via query params and automatic reconnection with 5s exponential backoff.
> Renders dynamic grid for GPS position, obstacle sonar sensors, device mode, and smart move status.
> Replaced the static Hero section on `app/page.tsx` with the live Observability view.

23 | FEAT    | DeviceService desired side + publish methods
> Added `publishJoystick`, `publishRoute`, `resetDesired` to DeviceService.
> MqttService injected via `init()` to avoid circular imports. All publish ops are fire-and-forget.

24 | FEAT    | Implemented SessionService with in-memory mutex and grace period
> Created `src/services/session.service.ts` — in-memory session map as source of truth.
> One session per device, enforced in-memory before DB write. 30s grace period on WS disconnect.
> Orphan cleanup on startup closes all sessions with `ended_at = null` as `server_restart`.

25 | FEAT    | Implemented WebSocket /control handler and session REST routes
> Created `src/routes/control.ts` — WS /control?token=JWT with zero-await joystick hot path.
> JWT verified once on upgrade. Per-message: session check (memory) → smart_move gate (memory) → publish.
> Created `src/routes/session.ts` — POST/GET/DELETE /session for session lifecycle.
> Registered @fastify/websocket plugin and wired full startup sequence in server.ts.

26 | FEAT    | Wired auth/logout to session close + completed device state endpoint
> `POST /auth/logout` now calls `sessionService.close()` before signing out — device gets stop command.
> `GET /devices/:id/state` returns full `{desired, reported, delta, session}` from memory, no longer a stub.

27 | FEAT    | Dashboard Session Indicator (Header)
> Backend: Added `EventEmitter` to `SessionService` to emit `session_change` events.
> Backend: Wired `SessionService` to `sseService` for real-time broadcasting.
> Frontend: Created `SessionIndicator` component in header to show active session status.
> Frontend: Fetches initial status from `GET /api/session` and updates via SSE.

28 | FEAT    | RouteService with dispatch and completion detection
> Created `src/services/route.service.ts` — dispatch() validates 3 preconditions: ownership, no active conflict (DB), active session (memory).
> onTelemetry() detects `autopilot_active` true→false transition to mark route as completed. Async DB write.
> Created `src/routes/routes.ts` — CRUD + POST /:id/start (dispatch) + POST /:id/stop (abort).
> Wired into telemetry pipeline via existing `telemetryService.onRoute()` hook.

29 | FEAT    | OpenAPI spec with @fastify/swagger
> Installed `@fastify/swagger`. Registered with OpenAPI 3.0 metadata, BearerAuth security scheme, and tags.
> Annotated all 8 route files (health, auth, config, devices, session, routes, realtime, control) with full schemas.
> Spec exposed at `GET /openapi.json`.

30 | FEAT    | API Documentation page with Scalar
> Extracted `Navbar` from `app/page.tsx` into `app/components/navbar.tsx`.
> Installed `@scalar/api-reference-react` and created `app/docs/page.tsx`.
> Documents all backend endpoints in real-time from `/api/openapi.json`.

31 | FEAT    | Telemetry history page and chart
> Created `src/routes/telemetry.ts` — `GET /telemetry` with cursor-based pagination, date range filters.
> Created `app/telemetry/page.tsx` — device selector, date pickers, canvas line chart (GPS + obstacles), data table, and "Load More" pagination.
> Added "Telemetry" link to `Navbar`.

32 | FEAT    | Testing utilities — joystick + path simulator
> Created `app/testing/page.tsx` — two testing tools hitting real API endpoints.
> Joystick: open session → WS connect → d-pad/sliders/keyboard → send commands (single or continuous 200ms).
> Path: create route with JSON waypoints → dispatch → abort → delete draft.
> Added "Testing" link to `Navbar`.

33 | REFACTOR | Auth architecture rethink — direct Supabase auth
> Fixed `next.config.mjs` — proxy rewrite now uses `BACKEND_URL` env var (defaults to localhost for dev).
> Rewrote `lib/auth-store.ts` with `loginDirect()` and `logoutDirect()` using Supabase client directly.
> Updated `app/login/page.tsx` — login calls Supabase directly, no backend round-trip.
> Updated logout handlers in all 5 dashboard pages to use `logoutDirect()`.
> Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env`.

34 | REDESIGN | Complete Frontend Overhaul to Monochromatic Data Terminal Aesthetic
> Unified global styles (zinc/black scheme, 1px borders, 6px radii, no shadows).
> Updated `layout.tsx` with `DM Sans` (UI) and `JetBrains Mono` (Data).
> Refactored `Navbar`, `TelemetryPanel`, and `SessionIndicator` core components.
> Redesigned all routes (Login, Telemetry, Config, Docs, Testing) for visual consistency.
> Verified successful production build via `npm run build`.

35 | REDESIGN | Refactored Navigation to Left Sidebar Structure
> Created `Sidebar` component to replace top `Navbar`.
> Abstracted top-level page structures into a global `DashboardLayout` client wrapper.
> Standardized all dashboard routes (Home, Telemetry, Testing, Config, Docs) within the new layout context.
> Verified Next.js build and routing.

36 | REFACTOR | Merged Telemetry into Dashboard & Created Devices Page
> Moved historical telemetry chart and query interface from `/telemetry` into the main `/` dashboard below the live stream.
> Extracted device provisioning and list logic from the `/testing` payload into a new dedicated `/devices` route.
> Re-verified frontend compilation with `npm run build` after removing the isolated `/telemetry` route.

37 | REFACTOR | Docs & Testing Redesign
> Deleted the `/testing` page (JoystickSimulator, PathSimulator). Removed `TESTING` from sidebar nav.
> Rewrote `/docs` as a two-tab layout: Guides (IoT/Arduino + Mobile/Flutter conceptual docs) and API Reference (Scalar with auto-injected JWT, forced dark mode).
> Added OpenAPI `example` values to `auth.ts`, `devices.ts`, `session.ts`, `routes.ts` so Scalar pre-populates realistic payloads.
> Verified clean build: `npm run build` — 0 errors, route table confirms `/docs` present and `/testing` absent.

38 | FEAT    | Implemented User Management Service (Supabase Admin)
> Created `UserService` using `@supabase/supabase-js` Admin Auth API.
> Enables superusers to list, create, update, and delete standard accounts.
> Strict enforcement: no superuser elevation possible via API.

39 | FEAT    | User Management API Routes & Swagger Mocks
> Created `src/routes/users.ts` with full CRUD support for superusers.
> Added realistic OpenAPI examples for Scalar documentation.
> Registered `userRoutes` in `src/server.ts`.

40 | FEAT    | Role-Based Access Control (RBAC) Dashboard Guards
> Implemented route guards in `DashboardLayout` to redirect non-superusers to `/docs`.
> Updated `Sidebar` to dynamically hide administrative tabs for standard users.
> Ensures the dashboard remains documentation-only for non-privileged accounts.

41 | FEAT    | User Management Frontend Interface
> Created `app/users/page.tsx` with CRUD modals matching the terminal aesthetic.
> Integrated "USERS" navigation link into the sidebar for superusers.
> Verified end-to-end functionality and production build.

45 | FIX     | Resolved CORS blocking for Flutter Web and mobile clients
> Updated CORS configuration in server.ts to use origin: true.
> Allows diverse clients (Flutter, development environments) to connect without protocol-level blocks.

46 | FIX     | Fastify empty JSON bodies & Live System Activity Drops
> Replaced `@fastify` default `application/json` parser to gracefully emit `{}` on empty strings instead of crashing with `FST_ERR_CTP_EMPTY_JSON_BODY`.
> Injected an unbounded `await new Promise` lock to `GET /events` enforcing persistent TCP hooks for `sseService` streaming.
> Removed conflicting wildcard CORS headers in `sse.service.ts` to favor global configurations.

47 | DOCS    | Overhauling System Documentation
> Addressed developer onboarding feedback by restructuring `app/docs/page.tsx` into strict isolated integration domains.
> Defined raw TCP port mapping required for Railway's Mosquitto container.
> Hard-documented the `{ type, payload }` WebSocket framing wrapper.
> Expanded touch targets and added CSS selection helpers to code blocks for mobile browser copies.

48 | DOCS    | API Reference and System Constants Overhaul
> Added `Camera` tags to server OpenAPI schema and created `/camera` REST endpoint to fetch latest SSE snapshots.
> Consolidated all Railway infrastructure variables, connection URLs, and topic mappings into a centralized 'System Constants' section in `app/docs/page.tsx`.
> Replaced hardcoded credentials with variable placeholders across all code examples for security.
> Standardized all internal developer references to use `spedi2026` as the designated MQTT default.

49 | FIX     | Dashboard System Activity Resilience & Deduplication
> Fixed "invisible logs" bug where `undefined === undefined` ID comparisons collapsed the React state array.
> Implemented defensive fallback UUIDs in `system-activity.tsx` to handle legacy or malformed SSE events.
> Added property fallback rendering (level, source, message) to prevent UI crashes on incomplete log metadata.
> Injected `logService.info` triggers into `DeviceService` control paths to ensure activity is visible.

50 | FIX     | Fastify Schema Strict Mode & Empty Body Tolerance
> Rewrote Fastify JSON content-type parser to consume payload streams and return `{}` for empty inputs, preventing `FST_ERR_CTP_EMPTY_JSON_BODY`.
> Configured `ajv.customOptions.strict: false` in `server.ts` to allow standard OpenAPI `example` keywords without crashing the startup validator.
> Modified `apiFetch` to conditionally omit `Content-Type` headers for empty bodies.

51 | FIX     | Dynamic API Host Resolution for Remote LAN Testing
> Implemented `resolveApiUrl()` in `lib/api.ts` to dynamically replace `127.0.0.1` with `window.location.hostname`.
> Fixes "Silent SSE Drop" where mobile phones or remote laptops testing the dashboard would try to connect to their own loopback instead of the host server.
> Restored visibility of System Activity logs and stable Route command execution for all network clients.

52 | REFACTOR | Shared SSE Context & Authentication Alignment
> Created `sse-context.tsx` with `SseProvider` to unify 4 duplicate connections into 1.
> Aligned SSE lifecycle with authentication: connection only fires *after* token is verified.
> Rewrote `SystemActivity`, `TelemetryPanel`, `SessionIndicator`, and `CameraSnapshot` as pure subscribers via `useSseEvent`.

53 | FIX     | Control Pipeline Optimization & De-noising
> Removed per-frame logging from `deviceService.publishJoystick()` to prevent syslog buffer flooding.
> Optimized `SseService` with a 30s keep-alive heartbeat for connection stability.
> Verified hot-path joystick latency remains sub-1ms.

54 | FEAT    | Backend Test Infrastructure (Vitest)
> Established backend testing framework using Vitest.
> Created `vitest.config.ts` and 3 dedicated test suites (34 tests total).
> Coverage: SSE broadcast pipeline, control hot path (performance benchmarks), and session lifecycle (mutex & grace periods).

55 | FIX     | CORS Header Preservation in SSE Stream
> Injected `reply.getHeaders()` into `reply.raw.writeHead()` call in `SseService`.
> Prevents the global Fastify CORS headers from being overwritten by the raw Node.js response writer.
> Restores SSE visibility for cross-origin clients (Vercel).

56 | FIX     | Production Build Pipeline (tsc)
> Excluded `src/tests` from `tsconfig.build.json`.
> Prevents `tsc` from throwing "Module not found" errors due to extensionless imports in Vitest files during Railway deployment.

57 | FIX     | SSE Proxy Buffering (Real-time regression)
> Added `X-Accel-Buffering: no` to `sse.service.ts` response headers.
> Ensures reverse proxies (Railway/Vercel) flush SSE chunks immediately instead of waiting for a buffer limit.

58 | FIX     | SSE Reconnect Handler (Stale Listeners)
> Added `attachedTypesRef.current.clear()` to `sse-context.tsx`.
> Fixes soft-reconnects failing to bind event listeners to the new `EventSource` instance.

59 | FIX     | Global API Error Logging
> Added global `onError` hook to Fastify in `server.ts`.
> Pipes all HTTP 4xx/5xx errors to `logService` so they appear in the dashboard System Activity stream.

60 | FEAT    | Live Map Visualization & Toggle Navigation Panel
> Integrated MapLibre GL JS with OpenFreeMap dark vector tiles for real-time boat tracking.
> Implemented smooth position interpolation (rAF loop) and shortest-arc bearing rotation for telemetry stream.
> Refactored `page.tsx` intelligence grid with a tabbed toggle between `NAV_VIEW` (default) and `SYSTEM_ACTIVITY`.
> Added fullscreen overlay mode for the map with Escape-key collapse support.
> Built `geo-utils` library for bearing, haversine, and route progress computation with full unit test coverage.
> Verified Next.js production build and SSR compatibility.

330 | FIX     | Tab Toggle Mount/Unmount Regression
> Fixed SSE subscription loss caused by conditional rendering (mount/unmount) of SystemActivity and LiveMap on tab toggle.
> Switched to CSS `hidden` class toggle — both panels stay mounted at all times, preserving subscriptions and accumulated state.

62 | FEAT    | Map Style & Contrast Optimization
> Replaced the unmaintained OpenFreeMap dark style with a custom `map-style-dark.json` derived from Liberty.
> Enhanced contrast for water bodies (#0f1c2c) and desaturated background/roads for high-visibility data terminal aesthetic.

63 | FEAT    | Robust Map Initialization (LocalStorage)
> Removed hardcoded `DEFAULT_CENTER` coordinates.
> Initial map center resolves via: `localStorage` (last tick) > Shadow state fetch > Region default (Gulf of Thailand).
> Persists real-time coordinates to `localStorage` on every telemetry pulse.
