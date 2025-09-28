import { Room, Client } from '@colyseus/core';
import { LobbyState } from '../schema/LobbyState';
import { PlayerSlot } from '../schema/PlayerSlot';
import { SERVER_CONFIG } from '../../ServerConfig';
import { GameplayConfig, configProvider } from '../config/ConfigProvider';
import { Server } from '@colyseus/core';

export class LobbyRoom extends Room<LobbyState> {
    maxClients = SERVER_CONFIG.MAX_CLIENTS_PER_ROOM;
    private gameplayConfig!: GameplayConfig;
    private gameRoomId: string | null = null;

    onCreate(options: any) {
        this.gameplayConfig = options.gameplayConfig;
        
        // Initialize lobby state
        const lobbyState = new LobbyState();
        lobbyState.teamSize = 5;
        lobbyState.lobbyPhase = 'waiting';
        lobbyState.canStart = false;
        // Load available configs into state and set default selection
        const configs = configProvider.getAvailableConfigs();
        lobbyState.availableConfigs.clear();
        configs.forEach((name) => lobbyState.availableConfigs.push(name));
        if (configs.length > 0) {
            lobbyState.selectedConfig = configs.includes('default') ? 'default' : configs[0];
        }
        
        // Initialize empty team slots
        for (let i = 0; i < lobbyState.teamSize; i++) {
            lobbyState.blueTeam.push(new PlayerSlot());
            lobbyState.redTeam.push(new PlayerSlot());
        }
        
        this.setState(lobbyState);
        this.setupMessageHandlers();
        
        console.log(`LobbyRoom created with ID: ${this.roomId}`);
    }

    onJoin(client: Client, options: any) {
        console.log(`Player ${client.sessionId} joined LobbyRoom ${this.roomId}`);
        
        // Find an empty slot or assign to team with fewer players
        const blueCount = this.getTeamPlayerCount('blue');
        const redCount = this.getTeamPlayerCount('red');
        
        let assignedTeam: 'blue' | 'red';
        if (blueCount <= redCount) {
            assignedTeam = 'blue';
        } else {
            assignedTeam = 'red';
        }
        
        this.assignPlayerToTeam(client.sessionId, assignedTeam);
        this.updateCanStartStatus();
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`Player ${client.sessionId} left LobbyRoom ${this.roomId}`);
        
        this.removePlayerFromTeam(client.sessionId);
        this.updateCanStartStatus();
        
        // Check if there are any human players left
        this.checkForEmptyRoom();
    }

    onDispose() {
        console.log(`LobbyRoom ${this.roomId} disposed`);
    }

    private checkForEmptyRoom(): void {
        // Count human players (non-bot controllers)
        let humanPlayerCount = 0;
        
        // Check blue team
        for (let i = 0; i < this.state.blueTeam.length; i++) {
            const slot = this.state.blueTeam[i];
            if (slot && slot.playerId && !slot.isBot) {
                humanPlayerCount++;
            }
        }
        
        // Check red team
        for (let i = 0; i < this.state.redTeam.length; i++) {
            const slot = this.state.redTeam[i];
            if (slot && slot.playerId && !slot.isBot) {
                humanPlayerCount++;
            }
        }

        // If no human players left, destroy the room after a short delay
        if (humanPlayerCount === 0) {
            console.log('No human players left in lobby, destroying in 10 seconds...');
            setTimeout(() => {
                // Double-check that no humans joined in the meantime
                let currentHumanCount = 0;
                
                // Check blue team
                for (let i = 0; i < this.state.blueTeam.length; i++) {
                    const slot = this.state.blueTeam[i];
                    if (slot && slot.playerId && !slot.isBot) {
                        currentHumanCount++;
                    }
                }
                
                // Check red team
                for (let i = 0; i < this.state.redTeam.length; i++) {
                    const slot = this.state.redTeam[i];
                    if (slot && slot.playerId && !slot.isBot) {
                        currentHumanCount++;
                    }
                }

                if (currentHumanCount === 0) {
                    console.log('Destroying empty lobby room');
                    this.disconnect();
                } else {
                    console.log('Human players rejoined lobby, keeping room alive');
                }
            }, SERVER_CONFIG.ROOM.EMPTY_LOBBY_CLEANUP_DELAY_MS);
        }
    }

    private setupMessageHandlers() {
        this.onMessage('switchTeam', (client, data) => {
            this.handleSwitchTeam(client.sessionId, data.team);
        });

        this.onMessage('setTeamSize', (client, data) => {
            this.handleSetTeamSize(data.size);
        });

        this.onMessage('startGame', (client) => {
            this.handleStartGame();
        });

        this.onMessage('toggleReady', (client) => {
            this.handleToggleReady(client.sessionId);
        });

        this.onMessage('switchPlayerTeam', (client, data) => {
            this.handleSwitchPlayerTeam(data.playerId, data.targetTeam);
        });

        this.onMessage('setPlayerDisplayName', (client, data) => {
            this.handleSetPlayerDisplayName(client.sessionId, data.displayName);
        });

        this.onMessage('setConfig', (client, data) => {
            const name: string = data?.name;
            if (!name) return;
            if (this.state.availableConfigs.indexOf(name) === -1) return;
            this.state.selectedConfig = name;
            console.log(`Lobby selected config set to: ${name}`);
        });
    }

    private handleSwitchTeam(playerId: string, team: 'blue' | 'red') {
        // Remove player from current team
        this.removePlayerFromTeam(playerId);
        
        // Add to new team
        this.assignPlayerToTeam(playerId, team);
        this.updateCanStartStatus();
    }

    private handleSetTeamSize(size: number) {
        if (size < 1 || size > 5) return;
        
        this.state.teamSize = size;
        
        // Resize teams
        this.resizeTeam('blue', size);
        this.resizeTeam('red', size);
        
        this.updateCanStartStatus();
    }

    private handleStartGame() {
        if (!this.state.canStart) return;
        
        this.state.lobbyPhase = 'starting';
        
        // Create lobby data to pass to game room
        const lobbyData = {
            teamSize: this.state.teamSize,
            blueTeam: Array.from(this.state.blueTeam),
            redTeam: Array.from(this.state.redTeam),
            selectedConfig: this.state.selectedConfig
            // No longer need lobbyRoomId since we'll destroy this room
        };
        
        // Broadcast game starting with lobby data
        this.broadcast('gameStarting', { lobbyData: lobbyData });
        
        console.log(`LobbyRoom ${this.roomId}: Starting game with lobby data:`, lobbyData);
        
        // Destroy this lobby room after a short delay to allow clients to process the message
        setTimeout(() => {
            console.log(`LobbyRoom ${this.roomId}: Destroying lobby room after game start`);
            this.disconnect();
        }, 1000); // 1 second delay
    }

    private handleToggleReady(playerId: string) {
        const slot = this.findPlayerSlot(playerId);
        if (slot) {
            slot.isReady = !slot.isReady;
            this.updateCanStartStatus();
        }
    }

    private handleSwitchPlayerTeam(playerId: string, targetTeam: 'blue' | 'red') {
        // Remove player from current team
        this.removePlayerFromTeam(playerId);
        
        // Add to target team
        this.assignPlayerToTeam(playerId, targetTeam);
        this.updateCanStartStatus();
    }

    private handleSetPlayerDisplayName(playerId: string, displayName: string) {
        // Validate display name
        if (!displayName || typeof displayName !== 'string') {
            console.log(`Invalid display name for player ${playerId}: ${displayName}`);
            return;
        }

        // Trim and limit length
        const trimmedName = displayName.trim();
        if (trimmedName.length === 0) {
            console.log(`Empty display name for player ${playerId}`);
            return;
        }

        if (trimmedName.length > 20) {
            console.log(`Display name too long for player ${playerId}: ${trimmedName}`);
            return;
        }

        // Find player slot and update display name
        const slot = this.findPlayerSlot(playerId);
        if (slot) {
            slot.playerDisplayName = trimmedName;
            console.log(`Updated display name for player ${playerId} to: ${trimmedName}`);
        } else {
            console.log(`Player slot not found for player ${playerId}`);
        }
    }

    private assignPlayerToTeam(playerId: string, team: 'blue' | 'red') {
        const teamArray = team === 'blue' ? this.state.blueTeam : this.state.redTeam;
        
        // Find first empty slot
        for (let i = 0; i < teamArray.length; i++) {
            const slot = teamArray[i];
            if (slot && !slot.playerId) {
                slot.playerId = playerId;
                slot.playerDisplayName = `Player ${playerId.slice(0, 6)}`;
                slot.isBot = false;
                slot.isReady = false;
                break;
            }
        }
        
        this.updateTeamSizes();
    }

    private removePlayerFromTeam(playerId: string) {
        // Remove from blue team
        for (let i = 0; i < this.state.blueTeam.length; i++) {
            const slot = this.state.blueTeam[i];
            if (slot && slot.playerId === playerId) {
                slot.playerId = '';
                slot.playerDisplayName = '';
                slot.isBot = false;
                slot.isReady = false;
                break;
            }
        }
        
        // Remove from red team
        for (let i = 0; i < this.state.redTeam.length; i++) {
            const slot = this.state.redTeam[i];
            if (slot && slot.playerId === playerId) {
                slot.playerId = '';
                slot.playerDisplayName = '';
                slot.isBot = false;
                slot.isReady = false;
                break;
            }
        }
        
        this.updateTeamSizes();
    }

    private resizeTeam(team: 'blue' | 'red', newSize: number) {
        const teamArray = team === 'blue' ? this.state.blueTeam : this.state.redTeam;
        
        if (newSize > teamArray.length) {
            // Add empty slots
            for (let i = teamArray.length; i < newSize; i++) {
                teamArray.push(new PlayerSlot());
            }
        } else if (newSize < teamArray.length) {
            // Remove slots (keep players, remove empty slots)
            const playersToKeep: PlayerSlot[] = [];
            
            for (let i = 0; i < teamArray.length && playersToKeep.length < newSize; i++) {
                const slot = teamArray[i];
                if (slot && slot.playerId) {
                    playersToKeep.push(slot);
                }
            }
            
            // Clear and repopulate
            teamArray.clear();
            playersToKeep.forEach(slot => teamArray.push(slot));
            
            // Fill remaining slots with empty slots
            while (teamArray.length < newSize) {
                teamArray.push(new PlayerSlot());
            }
        }
    }

    private findPlayerSlot(playerId: string): PlayerSlot | null {
        for (let i = 0; i < this.state.blueTeam.length; i++) {
            const slot = this.state.blueTeam[i];
            if (slot && slot.playerId === playerId) {
                return slot;
            }
        }
        
        for (let i = 0; i < this.state.redTeam.length; i++) {
            const slot = this.state.redTeam[i];
            if (slot && slot.playerId === playerId) {
                return slot;
            }
        }
        
        return null;
    }

    private getTeamPlayerCount(team: 'blue' | 'red'): number {
        const teamArray = team === 'blue' ? this.state.blueTeam : this.state.redTeam;
        return teamArray.filter(slot => slot.playerId && !slot.isBot).length;
    }

    private updateTeamSizes() {
        this.state.blueTeamSize = this.getTeamPlayerCount('blue');
        this.state.redTeamSize = this.getTeamPlayerCount('red');
    }

    private updateCanStartStatus() {
        const bluePlayers = this.getTeamPlayerCount('blue');
        const redPlayers = this.getTeamPlayerCount('red');
        
        // Can start if at least one team has a player
        this.state.canStart = bluePlayers > 0 || redPlayers > 0;
    }

}
