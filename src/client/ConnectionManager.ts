import { Client } from 'colyseus.js';

/**
 * Handles server connection logic and room joining
 */
export class ConnectionManager {
    private client: Client | null = null;
    private room: any = null;

    constructor() {}

    private getServerUrl(): string {
        if (window.location.hostname === 'localhost' && window.location.port === '3000') {
            // Development: Vite dev server on 3000, but Colyseus server on 2567
            return 'ws://localhost:2567';
        } else {
            // Production: same host and port
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.host}`;
        }
    }

    async connectToLobby(): Promise<{ client: Client; room: any; sessionId: string }> {
        const serverUrl = this.getServerUrl();

        this.client = new Client(serverUrl);
        console.log(`Attempting to connect to lobby at: ${serverUrl}`);
        
        console.log('Attempting to join or create lobby room...');
        this.room = await this.client.joinOrCreate('lobby');
        console.log('Connected to lobby');
        
        const sessionId = this.room.sessionId;
        console.log(`Client session ID: ${sessionId}`);

        return { client: this.client, room: this.room, sessionId };
    }

    async connectToGame(lobbyData: any, playerLobbyId?: string): Promise<{ client: Client; room: any; sessionId: string }> {
        const serverUrl = this.getServerUrl();

        this.client = new Client(serverUrl);
        console.log(`Attempting to connect to game room with lobby data:`, lobbyData);
        
        console.log('Attempting to join or create game room...');
        this.room = await this.client.joinOrCreate('game', { lobbyData: lobbyData, playerLobbyId });
        console.log('Connected to game');
        
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
