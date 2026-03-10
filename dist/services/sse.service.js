"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseService = void 0;
class SseService {
    // Map of active SSE connections, keyed by a unique connection ID
    clients = new Map();
    /**
     * Registers a new SSE client connection.
     * Keeps the connection open and handles formatting messages as SSE.
     */
    addClient(id, reply) {
        // Set standard SSE headers
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*' // or specific origin if preferred
        });
        // Send an initial heartbeat to confirm connection
        reply.raw.write(':\n\n');
        this.clients.set(id, reply);
        // Handle client disconnect
        reply.raw.on('close', () => {
            this.clients.delete(id);
        });
    }
    /**
     * Broadcasts an event to all connected SSE clients.
     * The dashboard is a global observer, so it receives events for all devices.
     */
    broadcast(event) {
        if (this.clients.size === 0)
            return;
        const dataString = JSON.stringify({
            deviceId: event.deviceId,
            payload: event.payload
        });
        // SSE format:
        // event: [type]\n
        // data: [json]\n\n
        const message = `event: ${event.type}\ndata: ${dataString}\n\n`;
        for (const [id, reply] of this.clients.entries()) {
            try {
                reply.raw.write(message);
            }
            catch (err) {
                console.error(`Failed to broadcast to SSE client ${id}:`, err);
                this.clients.delete(id);
            }
        }
    }
    /**
     * Send an event to a specific client (e.g. initial state flush on connect)
     */
    sendToClient(id, event) {
        const reply = this.clients.get(id);
        if (!reply)
            return;
        const dataString = JSON.stringify({
            deviceId: event.deviceId,
            payload: event.payload
        });
        const message = `event: ${event.type}\ndata: ${dataString}\n\n`;
        try {
            reply.raw.write(message);
        }
        catch (err) {
            console.error(`Failed to send to SSE client ${id}:`, err);
            this.clients.delete(id);
        }
    }
    /**
     * Closes all active SSE connections (useful for graceful shutdown)
     */
    closeAll() {
        for (const [id, reply] of this.clients.entries()) {
            reply.raw.end();
            this.clients.delete(id);
        }
    }
}
exports.sseService = new SseService();
