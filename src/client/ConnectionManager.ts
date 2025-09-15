import { Client } from 'colyseus.js';

/**
 * Handles server connection logic and room joining
 */
export class ConnectionManager {
    private client: Client | null = null;
    private room: any = null;

    constructor() {}

    async connect(): Promise<{ client: Client; room: any; sessionId: string }> {
        // Determine server URL based on environment
        let serverUrl: string;
        if (window.location.hostname === 'localhost' && window.location.port === '3000') {
            // Development: Vite dev server on 3000, but Colyseus server on 2567
            serverUrl = 'ws://localhost:2567';
        } else {
            // Production: same host and port
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            serverUrl = `${protocol}//${window.location.host}`;
        }

        this.client = new Client(serverUrl);
        console.log(`Attempting to connect to server at: ${serverUrl}`);
        
        console.log('Attempting to join or create room...');
        this.room = await this.client.joinOrCreate('game');
        console.log('Connected to server');
        
        const sessionId = this.room.sessionId;
        console.log(`Client session ID: ${sessionId}`);

        return { client: this.client, room: this.room, sessionId };
    }

    getRoom(): any {
        return this.room;
    }

    getClient(): Client | null {
        return this.client;
    }
}
