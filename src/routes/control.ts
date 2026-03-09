import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authService } from '../services/auth.service';
import { sessionService } from '../services/session.service';
import { deviceService } from '../services/device.service';

/**
 * WebSocket /control handler — the joystick hot path.
 *
 * Connection: JWT verified once on upgrade. Active session confirmed
 * in memory. If either fails, socket is closed immediately.
 *
 * Messages: Each frame is parsed, session and command gating checked
 * in memory, then DeviceService.publishJoystick fires. Zero awaits.
 * Zero DB reads. All in-memory.
 *
 * Disconnect: 30s grace period starts. Reconnect within window
 * resumes session. Timer expiry closes session and publishes stop.
 */

const controlRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/control', { websocket: true }, (socket, request) => {
        // ── Upgrade validation (runs once per connection) ────────

        // Extract token from query string
        const url = new URL(request.url, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            socket.close(4001, 'Missing token');
            return;
        }

        // Verify JWT — async, but only happens once at connection time
        authService.verifyToken(token).then((user) => {
            if (!user) {
                socket.close(4001, 'Invalid or expired token');
                return;
            }

            // Check active session in memory
            const deviceId = sessionService.getDeviceForUser(user.id);
            if (!deviceId) {
                socket.close(4003, 'No active session');
                return;
            }

            // Confirm ownership
            if (!sessionService.isOwner(user.id, deviceId)) {
                socket.close(4003, 'Session not owned');
                return;
            }

            // Cancel grace period if reconnecting within window
            sessionService.cancelGracePeriod(deviceId);

            console.log(`🎮 WS connected: user=${user.id} device=${deviceId}`);

            // ── Message handler (hot path — zero awaits) ────────
            socket.on('message', (raw: Buffer | string) => {
                // Gate 1: session still active in memory
                if (!sessionService.isOwner(user.id, deviceId)) {
                    // Session was closed while socket was open — drop silently
                    return;
                }

                // Parse message
                let msg: any;
                try {
                    msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
                } catch {
                    // Malformed JSON — drop silently, no error response on hot path
                    return;
                }

                if (msg.type === 'joystick' && msg.payload) {
                    // Gate 2: command gating — drop if smart_move is active
                    const reported = deviceService.getReported(deviceId);
                    if (reported.smart_move_active === true) {
                        // Device is in autonomous obstacle avoidance — joystick is meaningless
                        return;
                    }

                    // Hot path publish — zero await, zero DB
                    const { throttle, steering } = msg.payload;
                    if (typeof throttle === 'number' && typeof steering === 'number') {
                        deviceService.publishJoystick(deviceId, { throttle, steering });
                    }
                }
            });

            // ── Disconnect handler ──────────────────────────────
            socket.on('close', () => {
                console.log(`🎮 WS disconnected: user=${user.id} device=${deviceId}`);
                // Start grace period — session stays alive for 30s
                sessionService.startGracePeriod(deviceId);
            });

            socket.on('error', (err) => {
                console.error(`🎮 WS error: user=${user.id}`, err.message);
            });
        }).catch((err) => {
            console.error('WS auth error:', err);
            socket.close(4001, 'Authentication failed');
        });
    });
};

export default controlRoutes;
