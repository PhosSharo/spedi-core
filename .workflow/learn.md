# learn.md â€” Agent Session Log
> Mistakes, incompatibilities, and corrected assumptions. Read before acting.

---

## Windows Scripting â€” 2026-03-10

### âŒ What Failed
Running `nodemon --watch 'src/**/*.ts' --exec 'ts-node' src/server.ts` in `package.json` scripts on Windows.

### ðŸ” Why It Failed
Single quotes around arguments and commands in `package.json` scripts are not handled correctly by the Windows shell when passed through nodemon, or cause "not recognized" errors for commands like `ts-node`.

### âœ… Fix / Workaround
Remove single quotes or replace with double quotes (escaped if necessary). Use `npx` if the command is a local dependency, or ensure the command is available in the shell context. In this case, removing the quotes fixed the "not recognized" error for `ts-node` when invoked via nodemon.

### âš ï¸ Watch Out
Always test scripts on the target OS if they contain quotes or path globs.

---

## Next.js + Fastify Monorepo Build Scripts â€” 2026-03-10

### âŒ What Failed
`bun run build` crashed on Railway deployments because `tsc` failed to parse `shadcn/ui` `.tsx` files, and `package.json` had `"build": "tsc"` overwriting the Next.js `next build` command.

### ðŸ” Why It Failed
The repository is doubling as both the Next.js dashboard (deployed to Vercel) and the Fastify backend (deployed to Railway). Overwriting the base `build`, `dev`, and `start` scripts broke Vercel's default Next.js build tracking and caused `tsc` to try compiling React components.

### âœ… Fix / Workaround
1. **TypeScript**: Add `"jsx": "preserve"` to `tsconfig.json` so `tsc` allows `.tsx` files without erroring.
2. **Scripts**: Splitting scripts is mandatory:
   - `build`: `next build` (For Vercel frontend)
   - `build:backend`: `tsc` (For Railway backend)
   - Do the same for `start` and `dev`.
3. **Railway config**: Update `railway.json` to explicitly use `npm run build:backend` and `npm run start:backend`.

### âš ï¸ Watch Out
When adding UI components to a mixed repo, always ensure `tsc` base config behavior doesn't accidentally block the backend CI pipeline.

---

## Railway Multi-Service & Lockfile Drift â€” 2026-03-10

### âŒ What Failed
Two consecutive Railway deployment failures:
1. **Healthcheck failure**: `railway.json` had an invented `"services"` block â€” Railway silently ignored it.
2. **Frozen lockfile failure**: `bun install --frozen-lockfile` crashed because `bun.lock` was stale.

### ðŸ” Why It Failed
1. Railway's JSON schema only allows `$schema`, `build`, `deploy`, and `environments` at the root. There is **no `services` key**. Multi-service monorepos are configured via the Railway CLI (`railway add --service`) and dashboard, not in the config file.
2. We used `npm install` to add dependencies, which updated `package-lock.json` but not `bun.lock`. Railway auto-detects bun from the committed lockfile and runs frozen install.

### âœ… Fix / Workaround
1. Keep `railway.json` as a **flat, per-service** config â€” only `build` + `deploy`.
2. Pick **one** package manager. Delete the other lockfile. Run `bun install` to regenerate `bun.lock`.
3. Create Mosquitto as a separate service via `railway add --service mosquitto` with root directory `/mosquitto`.

### âš ï¸ Watch Out
- Never commit two lockfiles (`package-lock.json` + `bun.lock`). Railway picks the first one it finds.
- Always use the same package manager for installs (`bun add` not `npm install`).

## Supabase Auth — Valid Email required

### ? What Failed
Seeding a superuser with the identifier 'superspedi'.

### ?? Why It Failed
Supabase Auth requires a valid email format by default; 'superspedi' threw a validation_failed 400 error.

### ? Fix / Workaround
Append a dummy domain (e.g., superspedi@spedi.io) to satisfy the validation constraint.

---

## Supabase JWT — HS256 vs ES256
### ? What Failed
Attempting to verify Supabase JWTs using a symmetric secret string (HS256) failed.
### ?? Why It Failed
Supabase transitioned to ES256. Symmetric secrets are for legacy tokens only.
### ? Fix / Workaround
Implemented lazy-loading of the public key via JWKS endpoint for secure local verification.

## PowerShell — Operator Limitations (&&)
### ? What Failed
Attempting to chain commands using '&&' (e.g., 'git add . && git commit').
### ?? Why It Failed
Standard Windows PowerShell (5.1) does not support '&&' or '||' for logical command chaining; it interprets them as syntax errors.
### ? Fix / Workaround
Use ';' to separate commands (e.g., 'git add .; git commit') or upgrade to PowerShell 7+ if chaining logic is strictly required.

---

## Next.js Proxy Removal — 2026-03-10

### ❌ What Failed
Using `next.config.mjs` rewrites as an API proxy for the Railway backend.

### 🔍 Why It Failed
The proxy obscured the real connection status and introduced complexity when syncing Supabase auth states between the client and the proxy layer. It also made debugging CORS and WebSocket connections significantly harder.

### ✅ Fix / Workaround
Killed the proxy. Frontend now calls the Railway API directly. This requires `@fastify/cors` to be configured on the backend to allow the Vercel origin.

---

## Railway Build Failures — `noEmit: true` — 2026-03-10

### ❌ What Failed
Railway deployments crashed because the `dist/` directory was empty after "successful" builds.

### 🔍 Why It Failed
Next.js requires `noEmit: true` in the main `tsconfig.json`. When Railway runs `npx tsc`, it obeys this flag and produces zero JavaScript files. `node dist/server.js` then fails because the file doesn't exist.

### ✅ Fix / Workaround
Created `tsconfig.build.json` specifically for the backend that sets `noEmit: false` and excludes the `app/` directory. Updated `railway.json` to use `npx tsc -p tsconfig.build.json`.

---

## SSE / WebSocket Authentication — 2026-03-10

### ❌ What Failed
The `/events` (SSE) endpoint returned 401 Unauthorized even with a valid token.

### 🔍 Why It Failed
Browser APIs for `EventSource` (SSE) and `WebSocket` do not support setting custom HTTP headers (like `Authorization`). The backend auth plugin was only looking at headers.

### ✅ Fix / Workaround
Updated the Fastify auth plugin to check for a `token` query parameter as a fallback if the `Authorization` header is missing.
`const token = request.headers.authorization?.split(' ')[1] || (request.query as any).token;`

---

## Fastify CORS — `strictPreflight` — 2026-03-10

### ❌ What Failed
`DELETE` requests were blocked by CORS policy on Vercel, even with `DELETE` in the allowed methods list.

### 🔍 Why It Failed
`@fastify/cors` defaults to `strictPreflight: true`. This causes Fastify to strictly match the `OPTIONS` preflight request against the router. For dynamic routes like `/devices/:id`, it often fails to match correctly or strips methods it doesn't think apply, returning only `GET,HEAD,POST`.

### ✅ Fix / Workaround
Set `strictPreflight: false` in the CORS registration. This forces Fastify to return the full list of configured `methods` for any preflight request.
---

## Flutter Web CORS Blocking — 2026-03-10

### ❌ What Failed
Flutter Web and mobile clients were blocked by CORS when attempting to connect to the Railway backend.

### 🔍 Why It Failed
The Fastify CORS configuration was restricted to a static list of trusted origins (`localhost:3000` and `spedi-core.vercel.app`). Flutter Web, which often runs on dynamic ports during development or from various test environments, was not included.

### ✅ Fix / Workaround
Updated `src/server.ts` to use `origin: true` in the CORS configuration. This reflects the request's `Origin` header in the `Access-Control-Allow-Origin` response, allowing connections from any origin while still supporting `credentials: true`.

### ⚠️ Watch Out
- While permissive, this is appropriate for development and MVP clients (like mobile apps) that don't have a single fixed web origin. In higher security environments, consider using a regex or a more restricted validation function.

---

## Fastify JSON Parsing — Empty Bodies — 2026-03-11

### ❌ What Failed
Endpoints like `POST /routes/:id/start` or `DELETE /session` failed with `400 Bad Request` or crashed with `FST_ERR_CTP_EMPTY_JSON_BODY` when the request body was omitted or empty.

### 🔍 Why It Failed
Fastify's default JSON parser rejects `application/json` content types with empty or malformed literal strings. Even if the schema allows an optional body, the *parser* layer catches it first and returns an error.

### ✅ Fix / Workaround
Replaced the default `application/json` parser using `fastify.addContentTypeParser` with `parseAs: 'string'`. The custom parser returns `{}` if the body is an empty string, allowing the request to proceed to the routing/validation layer where the schema can handle it.

---

## React State Deduplication — Identity Collapse — 2026-03-11

### ❌ What Failed
The System Activity panel appeared "stuck" or empty after the first log arrived.

### 🔍 Why It Failed
The component used `if (prev.some((l) => l.id === newLog.id)) return prev;` to prevent duplicate logs (history re-streams). If the backend emitted a log without an `id`, `newLog.id` became `undefined`. Since `undefined === undefined`, every subsequent log without an ID was treated as a duplicate of the first one, silently dropping all new activity.

### ✅ Fix / Workaround
Implemented a defensive fallback ID in the frontend parser: 
`newLog.id = newLog.id || `fallback-id-${Date.now()}-${Math.random()}`;`
This ensures every event is treated as unique unless a real, stable ID is provided by the server.

---

## Fastify AJV Strict Mode — `example` vs `examples` — 2026-03-11

### ❌ What Failed
Backend server crashed on startup with `strict mode: unknown keyword: "example"` error when loading route schemas.

### 🔍 Why It Failed
Fastify v5 uses a strict JSON schema validator by default. In OpenAPI 3.0/3.1, `example` is a common but technically non-standard keyword in specific contexts (standard is `examples` as an array). Strict mode rejects unknown keywords to prevent silent schema drift.

### ✅ Fix / Workaround
Set `ajv: { customOptions: { strict: false } }` in the Fastify constructor. This allows the system to boot even if legacy or strictly "OpenAPI-only" keywords like `example` are present in the developer-friendly schemas.

---

## Remote Device "Silent Connection Drop" — 2026-03-11

### ❌ What Failed
System Activity panel remained empty and Route commands failed when accessing the dashboard from a mobile phone or another PC on the same LAN, even though it worked on the host PC.

### 🔍 Why It Failed
The `NEXT_PUBLIC_API_URL` was hardcoded to `127.0.0.1`. When a browser on a phone loads the JS, it attempts to connect to `127.0.0.1` — which is the phone's own loopback. Since the backend isn't running *on the phone*, the connection is refused silently.

### ✅ Fix / Workaround
Implemented `resolveApiUrl()` in `lib/api.ts`. It detects the browser's `window.location.hostname`. If the dashboard is accessed via a network IP, it dynamically rewrites the API base URL to match that IP, ensuring remote browsers point to the correct server host.

---

## Conditional Content-Type for Fetch — 2026-03-11

### ❌ What Failed
`POST /routes/:id/start` returned 400 Bad Request when sent without a body.

### 🔍 Why It Failed
Forcing `Content-Type: application/json` on a fetch request with a `null` or `undefined` body triggers many modern server parsers (including Fastify) to expect a valid JSON string (at least `""` or `{}`). If the body is physically absent but the header is present, it's flagged as an invalid/empty JSON request.

### ✅ Fix / Workaround
Updated `apiFetch` to only attach the `Content-Type` header if an actual `string` body is provided in the options.

---

## SSE Token Race Condition — 2026-03-11

### ❌ What Failed
`EventSource` connections in dashboard components were established but never received data, despite valid tokens in the browser.

### 🔍 Why It Failed
Components were mounting and initializing `new EventSource()` in `useEffect` hooks *before* the `DashboardLayout` had finished restoring the user's JWT from `getCurrentUser()`. The token was `null` at the moment of connection, causing the backend to (correctly) return 401, which `EventSource` doesn't expose clearly.

### ✅ Fix / Workaround
Implemented a `SseProvider` context in `sse-context.tsx`. This provider is mounted *inside* the auth-verified block of `DashboardLayout`. This guarantees that the SSE connection is only attempted once the token is stable and available.

---

## Redundant SSE / WebSocket Connections — 2026-03-11

### ❌ What Failed
Opening the dashboard triggered 4+ separate TCP connections to `/events` (System Activity, Telemetry, Session Indicator, Camera).

### 🔍 Why It Failed
Every component managed its own lifecycle and `EventSource` instance. This wasted server resources and multiplied the "initial state burst" overhead by 4x for every page load.

### ✅ Fix / Workaround
Unified all SSE consumers into the `SseProvider`. Components now use a simple `useSseEvent(type, callback)` hook to subscribe to the single, shared data stream.

---

## Hot-Path Logging Hygiene — 2026-03-11

### ❌ What Failed
The System Activity panel was flooded with joystick coordinates, making it impossible to see real system events.

### 🔍 Why It Failed
`publishJoystick()` called `logService.info()` on every frame (~5-10 times per second). This not only created visual noise but also pushed the 200-slot circular log buffer past its limit every few seconds, deleting older, more critical logs before they could be read.

### ✅ Fix / Workaround
Strictly removed all logging from performance-critical "hot paths" (Joystick, Route execution). These paths now use in-memory shadow updates only. Higher-level events (Auth, Session start, Route dispatch) remain logged. 

### ⚠️ Watch Out
Always benchmark the impact of "convenience logging" on high-frequency loops. If it executes more than once per user action, it probably shouldn't be in the persistent syslog.
