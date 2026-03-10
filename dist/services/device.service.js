"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceService = exports.DeviceService = void 0;
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
class DeviceService {
    supabase;
    /**
     * In-memory shadow map. Keyed by device ID.
     * Authoritative — all shadow reads are sync memory operations.
     */
    shadows = new Map();
    /**
     * Lazy reference to MqttService.
     * Injected via init() to avoid circular imports
     * (TelemetryService imports DeviceService; server.ts imports both).
     */
    mqtt = null;
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    /**
     * Inject MqttService reference at init time.
     * Called once in server.ts after both singletons are created.
     */
    init(mqtt) {
        this.mqtt = mqtt;
    }
    // ── Shadow Operations (synchronous, in-memory) ──────────────
    /**
     * Get or create the shadow for a device.
     * Lazily initializes with idle defaults on first access.
     */
    getOrCreateShadow(deviceId) {
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
    updateReported(deviceId, payload) {
        const shadow = this.getOrCreateShadow(deviceId);
        // Tolerant reader: extract only known fields into typed properties, ignore the rest.
        if (payload.mode !== undefined)
            shadow.reported.mode = String(payload.mode);
        if (payload.lat !== undefined)
            shadow.reported.lat = Number(payload.lat);
        if (payload.lng !== undefined)
            shadow.reported.lng = Number(payload.lng);
        if (payload.obstacle_left !== undefined)
            shadow.reported.obstacle_left = Number(payload.obstacle_left);
        if (payload.obstacle_right !== undefined)
            shadow.reported.obstacle_right = Number(payload.obstacle_right);
        if (payload.smart_move_active !== undefined)
            shadow.reported.smart_move_active = Boolean(payload.smart_move_active);
        if (payload.waypoint_index !== undefined)
            shadow.reported.waypoint_index = Number(payload.waypoint_index);
    }
    /**
     * Update desired state (partial merge).
     * Synchronous — zero DB, zero await.
     */
    setDesired(deviceId, partial) {
        const shadow = this.getOrCreateShadow(deviceId);
        shadow.desired = { ...shadow.desired, ...partial };
    }
    /**
     * Reset desired state to idle defaults.
     * Used on session close and disconnect timeout.
     * Synchronous — zero DB, zero await.
     */
    resetDesired(deviceId) {
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
    publishJoystick(deviceId, payload) {
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
    publishRoute(deviceId, action, waypoints) {
        if (action === 'start' && waypoints) {
            this.setDesired(deviceId, { mode: 'auto', route: waypoints });
        }
        else if (action === 'stop') {
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
    getState(deviceId) {
        const shadow = this.getOrCreateShadow(deviceId);
        // Compute delta: desired keys that differ from reported
        const delta = {};
        const reportedRecord = shadow.reported;
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
    getReported(deviceId) {
        return this.shadows.get(deviceId)?.reported ?? {};
    }
    // ── DB Operations (async) ───────────────────────────────────
    /**
     * Lists all devices in the system.
     */
    async listDevices() {
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
    async getDeviceById(id) {
        const { data, error } = await this.supabase
            .from('devices')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null; // Not found
            console.error(`Failed to get device ${id}:`, error);
            throw error;
        }
        return data;
    }
    /**
     * Registers a new device.
     */
    async registerDevice(name, mqttClientId, ownerId) {
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
    updateLastSeen(deviceId) {
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
    async deleteDevice(deviceId) {
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
exports.DeviceService = DeviceService;
exports.deviceService = new DeviceService();
