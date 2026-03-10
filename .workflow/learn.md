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
While permissive, this is appropriate for development and MVP clients (like mobile apps) that don't have a single fixed web origin. In higher security environments, consider using a regex or a more restricted validation function.
