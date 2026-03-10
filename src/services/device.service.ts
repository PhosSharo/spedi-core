import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DeviceRecord {
    id: string;
    name: string;
    mqtt_client_id: string;
    owner_id: string;
    created_at: string;
    last_seen_at: string | null;
}

/**
 * In-memory Device Shadow — the authoritative source of truth for
 * what the device should be doing (desired) vs what it reports (reported).
 */
export interface DeviceShadow {
    desired: {
        mode: 'idle' | 'manual' | 'auto';
        throttle: number;
        steering: number;
        route: Array<{ lat: number; lng: number }> | null;
        [key: string]: any;
    };
    reported: {
        mode: string | null;
        lat: number | null;
        lng: number | null;
        obstacle_left: number | null;
        obstacle_right: number | null;
        smart_move_active: boolean | null;
        waypoint_index: number | null;
    };
}

export interface DeviceState {
    desired: DeviceShadow['desired'];
    reported: DeviceShadow['reported'];
    delta: Record<string, any>;
}

export class DeviceService {
    private supabase: SupabaseClient;

    /**
     * In-memory shadow map. Keyed by device ID.
     * Authoritative — all shadow reads are sync memory operations.
     */
    private shadows: Map<string, DeviceShadow> = new Map();

    /**
     * Lazy reference to MqttService.
     * Injected via init() to avoid circular imports
     * (TelemetryService imports DeviceService; server.ts imports both).
     */
    private mqtt: { publishJoystick: (payload: { throttle: number; steering: number }) => void; publishRoute: (action: string, waypoints?: Array<{ lat: number; lng: number }>) => void } | null = null;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Inject MqttService reference at init time.
     * Called once in server.ts after both singletons are created.
     */
    init(mqtt: { publishJoystick: (payload: { throttle: number; steering: number }) => void; publishRoute: (action: string, waypoints?: Array<{ lat: number; lng: number }>) => void }): void {
        this.mqtt = mqtt;
    }

    // ── Shadow Operations (synchronous, in-memory) ──────────────

    /**
     * Get or create the shadow for a device.
     * Lazily initializes with idle defaults on first access.
     */
    private getOrCreateShadow(deviceId: string): DeviceShadow {
        let shadow = this.shadows.get(deviceId);
        if (!shadow) {
            shadow = {
                desired: {
                    mode: 'idle',
                    throttle: 0,
                    steering: 0,
                    route: null,
                },
                reported: {
                    mode: null,
                    lat: null,
                    lng: null,
                    obstacle_left: null,
                    obstacle_right: null,
                    smart_move_active: null,
                    waypoint_index: null,
                },
            };
            this.shadows.set(deviceId, shadow);
        }
        return shadow;
    }

    updateReported(deviceId: string, payload: Record<string, any>): void {
        const shadow = this.getOrCreateShadow(deviceId);

        // Tolerant reader: extract only known fields into typed properties, ignore the rest.
        if (payload.mode !== undefined) shadow.reported.mode = String(payload.mode);
        if (payload.lat !== undefined) shadow.reported.lat = Number(payload.lat);
        if (payload.lng !== undefined) shadow.reported.lng = Number(payload.lng);
        if (payload.obstacle_left !== undefined) shadow.reported.obstacle_left = Number(payload.obstacle_left);
        if (payload.obstacle_right !== undefined) shadow.reported.obstacle_right = Number(payload.obstacle_right);
        if (payload.smart_move_active !== undefined) shadow.reported.smart_move_active = Boolean(payload.smart_move_active);
        if (payload.waypoint_index !== undefined) shadow.reported.waypoint_index = Number(payload.waypoint_index);
    }

    /**
     * Update desired state (partial merge).
     * Synchronous — zero DB, zero await.
     */
    setDesired(deviceId: string, partial: Partial<DeviceShadow['desired']>): void {
        const shadow = this.getOrCreateShadow(deviceId);
        shadow.desired = { ...shadow.desired, ...partial };
    }

    /**
     * Reset desired state to idle defaults.
     * Used on session close and disconnect timeout.
     * Synchronous — zero DB, zero await.
     */
    resetDesired(deviceId: string): void {
        const shadow = this.getOrCreateShadow(deviceId);
        shadow.desired = {
            mode: 'idle',
            throttle: 0,
            steering: 0,
            route: null,
        };
    }

    // ── Publish Operations (fire-and-forget, zero await) ────────

    /**
     * Publish a joystick command to the device.
     * Updates desired in-memory and publishes via MQTT.
     * QoS 0, no callback, no await — this is the hot path.
     */
    publishJoystick(deviceId: string, payload: { throttle: number; steering: number }): void {
        this.setDesired(deviceId, { throttle: payload.throttle, steering: payload.steering });
        if (this.mqtt) {
            this.mqtt.publishJoystick(payload);
        }
    }

    /**
     * Publish a route command to the device.
     * Updates desired in-memory and publishes via MQTT.
     * QoS 1 for reliable delivery — routes are infrequent.
     */
    publishRoute(deviceId: string, action: string, waypoints?: Array<{ lat: number; lng: number }>): void {
        if (action === 'start' && waypoints) {
            this.setDesired(deviceId, { mode: 'auto', route: waypoints });
        } else if (action === 'stop') {
            this.resetDesired(deviceId);
        }
        if (this.mqtt) {
            this.mqtt.publishRoute(action, waypoints);
        }
    }

    /**
     * Returns the full shadow state including a computed delta.
     * Delta contains desired keys whose values differ from reported.
     */
    getState(deviceId: string): DeviceState {
        const shadow = this.getOrCreateShadow(deviceId);

        // Compute delta: desired keys that differ from reported
        const delta: Record<string, any> = {};
        const reportedRecord = shadow.reported as Record<string, any>;
        for (const key of Object.keys(shadow.desired)) {
            const desiredVal = shadow.desired[key];
            const reportedVal = reportedRecord[key];
            if (JSON.stringify(desiredVal) !== JSON.stringify(reportedVal)) {
                delta[key] = { desired: desiredVal, reported: reportedVal };
            }
        }

        return {
            desired: { ...shadow.desired },
            reported: { ...shadow.reported },
            delta,
        };
    }

    /**
     * Read reported state directly (for command gating checks).
     * Returns empty object if no shadow exists.
     */
    getReported(deviceId: string): Record<string, any> {
        return this.shadows.get(deviceId)?.reported ?? {};
    }

    // ── DB Operations (async) ───────────────────────────────────

    /**
     * Lists all devices in the system.
     */
    async listDevices(): Promise<DeviceRecord[]> {
        const { data, error } = await this.supabase
            .from('devices')
            .select('*');

        if (error) {
            console.error('Failed to list devices:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Retrieves a single device by ID.
     */
    async getDeviceById(id: string): Promise<DeviceRecord | null> {
        const { data, error } = await this.supabase
            .from('devices')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            console.error(`Failed to get device ${id}:`, error);
            throw error;
        }

        return data;
    }

    /**
     * Registers a new device.
     */
    async registerDevice(name: string, mqttClientId: string, ownerId: string): Promise<DeviceRecord> {
        const { data, error } = await this.supabase
            .from('devices')
            .insert({
                name,
                mqtt_client_id: mqttClientId,
                owner_id: ownerId
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to register device:', error);
            throw error;
        }

        return data;
    }

    /**
     * Updates last_seen_at for a device. Async, fire-and-forget.
     */
    updateLastSeen(deviceId: string): void {
        this.supabase
            .from('devices')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', deviceId)
            .then(({ error }) => {
                if (error) {
                    console.error(`Failed to update last_seen_at for ${deviceId}:`, error);
                }
            });
    }
    /**
     * Deletes a device by ID. Removes from DB and clears in-memory shadow.
     */
    async deleteDevice(deviceId: string): Promise<void> {
        const { error } = await this.supabase
            .from('devices')
            .delete()
            .eq('id', deviceId);

        if (error) {
            console.error(`Failed to delete device ${deviceId}:`, error);
            throw error;
        }

        this.shadows.delete(deviceId);
    }
}

export const deviceService = new DeviceService();
