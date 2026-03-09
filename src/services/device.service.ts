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

export interface DeviceShadowStub {
    desired: Record<string, any>;
    reported: Record<string, any>;
}

export class DeviceService {
    private supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

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
     * Returns a stub shadow state for Phase 5.
     */
    getStateStub(deviceId: string): DeviceShadowStub {
        // Implementation will expand in Phase 5 to pull from in-memory shadow
        return {
            desired: {},
            reported: {}
        };
    }
}

export const deviceService = new DeviceService();
