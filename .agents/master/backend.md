# SPEDI Backend Design Document

**Stack:** Node.js 20 + Fastify â€” Mosquitto on Railway â€” Supabase PostgreSQL + Auth â€” Next.js dashboard on Vercel  
**Status:** Pre-build. Authoritative reference.

---

## Domain Summary

Backend mediates between three clients â€” Flutter controller app, Next.js admin dashboard, physical boat â€” using the Device Shadow pattern. Server holds `desired` state (what the boat should do), device reports `reported` state (what it is doing). Server is the sole MQTT publisher to command topics. App never touches MQTT directly.

All API interaction is documented and interactively testable via the dashboard's `/docs` portal, which parses the Fastify OpenAPI spec and auto-injects Supabase session tokens for seamless "Try It" debugging.

Two interaction modes: **manual** (joystick stream over WebSocket) and **auto** (route dispatched once over REST). Hot path for joystick must never touch the database or await anything.

---

## Entity Relationship

```
users â”€â”€< devices â”€â”€< sessions
              â”‚  â”€â”€< routes
              â””â”€â”€< telemetry

config  (global key-value, no device FK in MVP)
```

**users** `id, email, is_superuser bool, created_at`  
Extends Supabase auth.users via trigger. `is_superuser` never writable through API. Set only by deploy-time seed script.

**devices** `id, name, mqtt_client_id unique, owner_idâ†’users, created_at, last_seen_at`  
`mqtt_client_id` ties a physical device to a record. `last_seen_at` updated async on telemetry â€” never blocks ingestion.

**sessions** `id, device_idâ†’devices, user_idâ†’users, started_at, ended_at nullable, end_reason`  
One active session per device at a time. Enforced in application layer, not DB constraint. `end_reason` values: `user_disconnect`, `timeout`, `server_restart`, `superseded`. On server startup, all sessions with `ended_at = null` are closed with `server_restart`.

**routes** `id, device_idâ†’devices, created_byâ†’users, name, waypoints jsonb, status, created_at, dispatched_at, completed_at`  
`waypoints` is JSONB array of `{lat, lng}` â€” always read/written as a unit, never partially updated. `status` values: `draft`, `active`, `completed`, `aborted`. One `active` route per device enforced in application layer.

**telemetry** `id bigserial, device_idâ†’devices, recorded_at, raw jsonb`  
Append-only. `raw` stores the full device payload verbatim. This is the truest form of the Tolerant Reader pattern: no device-sent fields are presumed stable. Querying values like GPS or obstacle readings is done via JSONB operators (e.g., `raw->>'lat'`). When a field stabilizes and requires indexing, it is promoted to a generated column or a typed column via migration.

**config** `id serial, key unique, value text, description, updated_at, updated_byâ†’users`  
Flat key-value. All values stored as text; application layer parses. Known keys: `mqtt_broker_host`, `mqtt_broker_port`, `mqtt_topic_joystick`, `mqtt_topic_route`, `mqtt_topic_status`, `joystick_timeout_ms`, `telemetry_interval_ms`.

---

## API Endpoints

### Auth
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/login` | â€” | Returns JWT. Delegates to Supabase Auth. |
| POST | `/auth/logout` | required | Closes active session if exists, publishes idle to device. |
| GET | `/auth/me` | required | Returns `{id, email, is_superuser}`. |

### Devices
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/devices` | required | List. Always one device in MVP. |
| GET | `/devices/:id` | required | Full record. |
| POST | `/devices` | superuser | Registers device. Body: `{name, mqtt_client_id}`. |
| GET | `/devices/:id/state` | required | Returns `{desired, reported, delta, session}` from memory. |

### Sessions
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/session` | required | Opens session. 409 if device already claimed. Sets `desired.mode = manual`. |
| GET | `/session` | required | Current active session or null. |
| DELETE | `/session` | required | Closes session. Resets desired to idle. Publishes stop. |

### Routes
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/routes` | required | Paginated. Query: `device_id`, `status`. |
| POST | `/routes` | required | Body: `{device_id, name, waypoints}`. Validates â‰¥2 points, valid coords. Returns `{id}`. |
| GET | `/routes/:id` | required | Full record including waypoints. |
| DELETE | `/routes/:id` | required | Only if status is `draft`. |
| POST | `/routes/:id/start` | required | Validates: draft/aborted status, no active route on device, active session exists. Sets status `active`, publishes to MQTT, records `dispatched_at`. |
| POST | `/routes/:id/stop` | required | Sets status `aborted`, resets desired to idle, publishes stop_route. |

### Telemetry
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/telemetry` | required | Cursor-based pagination. Query: `device_id`, `from`, `to`, `limit` (max 1000), `cursor`. |

### Config
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/config` | superuser | All config rows. |
| PUT | `/config` | superuser | Body: `{updates: [{key, value}]}`. Writes to DB, hot-reloads affected services. Returns `{reloaded: bool}`. |

### Realtime
| Protocol | Path | Auth | Notes |
|----------|------|------|-------|
| SSE | `/events` | required | Telemetry stream for dashboard. Flushes current shadow on connect. Event types: `telemetry`, `session_change`, `device_online`, `device_offline`. |
| WebSocket | `/control?token=JWT` | JWT in query param | Flutter app only. Joystick in: `{type:"joystick", payload:{throttle, steering}}`. Validated once on connect. |

---

## Authentication and Authorization

Supabase Auth issues JWTs with custom claim `app_metadata.is_superuser` injected via DB trigger at login. Backend verifies JWT locally using Supabase JWT secret â€” no network call per request. Fastify `preHandler` hook attaches `request.user = {id, is_superuser}`.

- **Authenticated:** any valid JWT
- **Superuser:** `request.user.is_superuser === true`
- **Session owner:** requesting user must own the active session on the target device

WebSocket uses `?token=` query param â€” browser WebSocket implementations do not reliably support Authorization headers during upgrade.

---

## Service Boundaries

**AuthService** â€” wraps Supabase Auth. Exposes `verify(token)`. Stateless.

**DeviceService** â€” owns in-memory shadow `{desired, reported}`. Single mutation point. Exposes `getState()`, `setDesired(partial)`, `updateReported(payload)`, `publishJoystick(payload)`, `publishRoute(action, waypoints)`.

**SessionService** â€” owns session lifecycle and in-memory session map. Exposes `open(userId, deviceId)`, `close(userId, reason)`, `getActive(deviceId)`, `isActive(userId)`. Cleans orphaned sessions on startup.

**RouteService** â€” owns route persistence, dispatch precondition validation, and completion detection. Triggers async DB updates from telemetry events.

**TelemetryService** â€” ingests MQTT payloads. Updates `reported` synchronously. Fires async: DB insert, `last_seen_at` update, SSE broadcast, RouteService notification.

**ConfigService** â€” loads config at startup. Exposes `get(key)`. Hot-reloads affected services on PUT /config.

**MQTTClient** â€” infrastructure wrapper around MQTT.js. Reconnects with exponential backoff (1s â†’ 30s ceiling). Routes incoming messages to TelemetryService.

---

## Business Logic

**Session mutex:** Check in-memory session map before DB write. If occupied â†’ 409. Write DB record only after in-memory check passes.

**Command gating:** On joystick WebSocket message â€” drop silently if `reported.smart_move_active` is true. Memory read only, no DB.

**Route dispatch preconditions** (in order, fail-fast):
1. Route belongs to target device
2. No `active` route exists for device (DB query â€” acceptable, low-frequency)
3. Requesting user has active session on device (memory)

**Route completion detection:** When `reported.autopilot_active` transitions `true â†’ false` while a route is `active`, mark route `completed`. Async DB write.

**Config hot reload:** Apply updates to memory map, notify affected services. MQTT topic changes â†’ resubscribe. Broker host/port changes â†’ full reconnect. Rollback DB write if reload fails.

**Server startup sequence:**
1. ConfigService loads from DB
2. SessionService closes all orphaned sessions (`server_restart`)
3. MQTTClient connects
4. HTTP server starts accepting

---

## Data Flow

**Joystick hot path:**
```
Flutter â†’ WS frame â†’ check session (memory) â†’ check smart_move (memory)
â†’ DeviceService.publishJoystick â†’ MQTT.publish (fire/forget) â†’ Mosquitto â†’ Device
```
Zero awaits. Zero DB touches.

**Telemetry ingestion:**
```
Device â†’ Mosquitto â†’ MQTTClient â†’ TelemetryService.ingest
â†’ updateReported (sync, memory)
â†’ RouteService.onTelemetry (sync, memory)
â†’ SSE broadcast (sync, fire/forget)
â†’ DB insert (async, not awaited)
â†’ last_seen_at update (async, not awaited)
```

**Payload schema evolution:**
```
Any MQTT payload â†’ store full payload in telemetry.raw (jsonb)
â†’ extract known fields into typed columns
â†’ unknown fields survive in raw, no rejection
```

---

## Risks and Tradeoffs

**Shadow lost on restart.** Device's 2000ms timeout stops motors. Acceptable for supervised MVP.

**Mosquitto single point of failure.** Railway restarts it automatically. SSE going silent is the observable indicator.

**Route completion ambiguity.** `autopilot_active â†’ false` cannot distinguish completion from GPS loss. Requires device-side explicit completion event to resolve cleanly.

**JWT expiry on open WebSocket.** Token validated once at connection. Acceptable for single-user MVP.

**Railway credit depletion.** $5/month, no automatic alerting when depleted.

**Telemetry table growth.** ~43,200 rows/day. Supabase 500MB free tier. Retention policy needed before sustained operation.

**Media evolution.** Camera transitioning to video stream is a separate protocol concern (WebRTC/HLS/RTSP) â€” must never be routed through MQTT or treated as telemetry.

---

## Open Decisions

1. **Telemetry retention policy.** Mechanism and period undefined.
2. **WebSocket reconnect grace period.** How long does a session persist after WS disconnect before auto-close? Affects SessionService implementation directly.
3. **Route completion detection.** Accept ambiguity or require device-side completion event.
4. **Telemetry chart downsampling.** Server-side time-bucket averaging, or defer.
5. **Device registration flow.** Currently manual/superuser-only. SaaS future needs claim-token provisioning.
