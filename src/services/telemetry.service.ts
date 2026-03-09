import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { deviceService } from './device.service';

/**
 * TelemetryService — Ingestion pipeline for device MQTT payloads.
 *
 * On message:
 *   1. DeviceService.updateReported — sync, in-memory
 *   2. RouteService.onTelemetry — sync, in-memory (stub until RouteService exists)
 *   3. SSE broadcast — sync, fire/forget (stub until SSE is implemented)
 *   4. DB insert raw telemetry — async, not awaited
 *   5. Device last_seen_at update — async, not awaited
 *
 * Tolerant reader: never rejects payloads due to unexpected fields.
 * The full raw JSON is stored verbatim in telemetry.raw (jsonb).
 */

export class TelemetryService {
    private supabase: SupabaseClient;

    // Callback hooks — set by other services during init
    private routeHandler: ((deviceId: string, reported: Record<string, any>) => void) | null = null;
    private sseHandler: ((deviceId: string, payload: Record<string, any>) => void) | null = null;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Register RouteService's onTelemetry handler.
     * Called once during server init when RouteService is ready.
     */
    onRoute(handler: (deviceId: string, reported: Record<string, any>) => void): void {
        this.routeHandler = handler;
    }

    /**
     * Register SSE broadcast handler.
     * Called once during server init when SSE is ready.
     */
    onSSE(handler: (deviceId: string, payload: Record<string, any>) => void): void {
        this.sseHandler = handler;
    }

    /**
     * Primary ingestion method — called by MqttService on every incoming message.
     *
     * Topic format expected: the status topic (e.g. "spedi/vehicle/status").
     * Device ID resolution: for MVP with one device, we resolve from the
     * topic or use a lookup. Currently uses mqtt_client_id from the payload
     * or falls back to resolving from registered devices.
     *
     * @param topic   The MQTT topic the message arrived on
     * @param payload The raw Buffer from MQTT
     */
    ingest(topic: string, payload: Buffer): void {
        // ── Parse ────────────────────────────────────────────────
        let parsed: Record<string, any>;
        try {
            parsed = JSON.parse(payload.toString());
        } catch {
            console.warn('TelemetryService: Received non-JSON payload, dropping.', {
                topic,
                raw: payload.toString().substring(0, 200),
            });
            return;
        }

        // Resolve device ID — MVP: extract from payload or use hardcoded lookup.
        // The device includes mqtt_client_id or device_id in its payload,
        // or we derive it from the topic structure.
        const deviceId = this.resolveDeviceId(topic, parsed);
        if (!deviceId) {
            console.warn('TelemetryService: Could not resolve device ID, dropping.', { topic });
            return;
        }

        // ── Synchronous pipeline (in-memory, zero DB) ────────────

        // 1. Update reported state in DeviceService shadow
        deviceService.updateReported(deviceId, parsed);

        // 2. Notify RouteService (if registered) — for route completion detection
        if (this.routeHandler) {
            try {
                this.routeHandler(deviceId, parsed);
            } catch (err) {
                console.error('TelemetryService: RouteService.onTelemetry threw:', err);
            }
        }

        // 3. Broadcast to SSE clients (if registered)
        if (this.sseHandler) {
            try {
                this.sseHandler(deviceId, parsed);
            } catch (err) {
                console.error('TelemetryService: SSE broadcast threw:', err);
            }
        }

        // ── Async operations (fire-and-forget, not awaited) ──────

        // 4. Persist raw telemetry to DB
        this.persistTelemetry(deviceId, parsed);

        // 5. Update device last_seen_at
        deviceService.updateLastSeen(deviceId);
    }

    // ── Private ──────────────────────────────────────────────────

    /**
     * Resolve device ID from topic or payload.
     * MVP strategy: single device. The device_id is looked up from registered
     * devices by mqtt_client_id if present in payload, or derived from topic.
     *
     * For multi-device future: topic would include device ID segment
     * (e.g. spedi/vehicle/{device_id}/status) or payload would carry it.
     */
    private resolveDeviceId(topic: string, parsed: Record<string, any>): string | null {
        // Prefer explicit device_id in payload
        if (parsed.device_id && typeof parsed.device_id === 'string') {
            return parsed.device_id;
        }

        // Fallback: extract from topic segments if structured as .../device_id/...
        const segments = topic.split('/');
        // For "spedi/vehicle/status" — no device segment in MVP topic structure.
        // In MVP with one device, we use a well-known placeholder.
        // This will be replaced when topic structure includes device_id.
        if (segments.length >= 3) {
            // Check if there's a 4th segment that could be a device ID
            if (segments.length >= 4) {
                return segments[2]; // e.g. spedi/vehicle/{device_id}/status
            }
        }

        // MVP fallback: if only one device exists, we can use 'default'.
        // Higher-level services should register the device mapping.
        // For now, return a stable key so the shadow is consistent.
        return 'default';
    }

    /**
     * Persist telemetry to the database. Async, fire-and-forget.
     * Tolerant reader: stores full raw payload as-is, no field validation.
     */
    private persistTelemetry(deviceId: string, raw: Record<string, any>): void {
        this.supabase
            .from('telemetry')
            .insert({
                device_id: deviceId,
                recorded_at: new Date().toISOString(),
                raw,
            })
            .then(({ error }) => {
                if (error) {
                    console.error(`TelemetryService: DB insert failed for device ${deviceId}:`, error);
                }
            });
    }
}

export const telemetryService = new TelemetryService();
