import { Room, Client } from '@colyseus/core';
import { GameState, Player } from '../schema/GameState';

export class GameRoom extends Room<GameState> {
    maxClients = 10;

    onCreate(options: any) {
        const gameState = new GameState();
        gameState.gameTime = 0;
        gameState.gamePhase = 'waiting';
        this.setState(gameState);
        
        this.onMessage('move', (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(`${client.sessionId} joined`);
        const player = new Player();
        player.id = client.sessionId;
        player.x = Math.random() * 800;
        player.y = Math.random() * 600;
        player.team = this.state.players.size % 2 === 0 ? 'blue' : 'red';
        player.health = 100;
        player.maxHealth = 100;
        this.state.players.set(client.sessionId, player);
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`${client.sessionId} left`);
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log('Room disposed');
    }
} 