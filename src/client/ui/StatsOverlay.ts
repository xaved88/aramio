import Phaser from 'phaser';
import { COMBATANT_TYPES, isHeroCombatant, HeroCombatant, ControllerId } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { hexToColorString } from '../utils/ColorUtils';
import { HUDContainer } from './HUDContainer';

interface PlayerStats {
    id: string;
    displayName: string;
    controller: ControllerId;
    team: string;
    abilityType: string;
    level: number;
    experience: number;
    totalExperience: number; // total XP earned throughout the match
    minionKills: number;
    heroKills: number;
    turretKills: number;
    deaths: number; // number of times this hero has died
    damageTaken: number;
    damageDealt: number;
    isBot: boolean;
    isCurrentPlayer: boolean;
    levelRewards: number; // number of level rewards available
    state: 'alive' | 'respawning'; // current hero state
}

interface TableCell {
    x: number;
    y: number;
    width: number;
    text: string;
    color: string;
    isHighlighted?: boolean;
}

/**
 * StatsOverlay displays player statistics in a table format
 */
export class StatsOverlay {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private overlayElements: Phaser.GameObjects.GameObject[] = [];
    private isVisible: boolean = false;
    private playerSessionId: ControllerId | null = null;
    private victoryDefeatText: Phaser.GameObjects.Text | null = null;
    private backToLobbyButton: Phaser.GameObjects.Text | null = null;
    private damageHintText: Phaser.GameObjects.Text | null = null;
    private cheatHintText: Phaser.GameObjects.Text | null = null;
    private isPostGameMode: boolean = false;
    private room: any = null;

    // Table configuration
    private readonly CELL_HEIGHT = 20;
    private readonly CELL_PADDING = 5;
    private readonly COLUMN_WIDTHS = {
        arrow: 60,
        heroId: 120,
        abilityType: 100,
        level: 35,
        totalXp: 50,
        minionKills: 45,
        heroKills: 45,
        turretKills: 45,
        deaths: 45,
        damageTaken: 60,
        damageDealt: 60
    };

    // Column definitions for consistent table structure
    private readonly COLUMNS = [
        { key: 'arrow', width: 'arrow', header: '', align: 'right', getValue: (player: PlayerStats) => player.isCurrentPlayer ? '▶' : '' },
        { key: 'heroId', width: 'heroId', header: 'Hero', align: 'left', getValue: (player: PlayerStats) => player.displayName },
        { key: 'abilityType', width: 'abilityType', header: 'Ability', align: 'left', getValue: (player: PlayerStats) => player.abilityType },
        { key: 'level', width: 'level', header: 'Lvl', align: 'right', getValue: (player: PlayerStats) => player.levelRewards > 0 ? `(${player.levelRewards}) ${player.level}` : player.level.toString() },
        { key: 'totalXp', width: 'totalXp', header: 'XP', align: 'right', getValue: (player: PlayerStats) => Math.round(player.totalExperience).toString() },
        { key: 'heroKills', width: 'heroKills', header: 'K', align: 'right', getValue: (player: PlayerStats) => Math.round(player.heroKills).toString() },
        { key: 'deaths', width: 'deaths', header: 'D', align: 'right', getValue: (player: PlayerStats) => player.deaths.toString() },
        { key: 'minionKills', width: 'minionKills', header: 'Min.', align: 'right', getValue: (player: PlayerStats) => Math.round(player.minionKills).toString() },
        { key: 'turretKills', width: 'turretKills', header: 'Tur.', align: 'right', getValue: (player: PlayerStats) => Math.round(player.turretKills).toString() },
        { key: 'damageDealt', width: 'damageDealt', header: 'Dealt', align: 'right', getValue: (player: PlayerStats) => Math.round(player.damageDealt).toString() },
        { key: 'damageTaken', width: 'damageTaken', header: 'Taken', align: 'right', getValue: (player: PlayerStats) => Math.round(player.damageTaken).toString() }
    ] as const;

    // Depth configuration for consistent layering
    private readonly DEPTHS = {
        BACKGROUND: CLIENT_CONFIG.RENDER_DEPTH.GAME_UI,
        UI_CONTENT: CLIENT_CONFIG.RENDER_DEPTH.GAME_UI + 1
    } as const;

    // Text styles for consistent appearance
    private readonly TEXT_STYLES = {
        HEADER: {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        },
        GAME_TIME: {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        },
        TEAM_TOTALS: {
            fontSize: '18px',
            fontStyle: 'bold',
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        },
        NO_PLAYERS: {
            fontSize: '15px',
            color: '#888888',
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        }
    } as const;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setHUDCamera(hudCamera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = hudCamera;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        if (this.hudContainer) {
            this.hudContainer.setCameraManager(cameraManager);
        }
    }

    setRoom(room: any): void {
        this.room = room;
    }

    /**
     * Sets the current player session ID for highlighting
     */
    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.playerSessionId = sessionId;
    }

    /**
     * Shows the stats overlay
     */
    show(state: SharedGameState): void {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.isPostGameMode = false;
        this.createOverlay(state);
        
        // Show control hints in regular stats mode
        if (this.damageHintText) {
            this.damageHintText.setVisible(true);
        }
        if (this.cheatHintText) {
            this.cheatHintText.setVisible(true);
        }
    }

    showPostGame(state: SharedGameState, winningTeam: string, playerTeam: string): void {
        // If stats screen is already visible, hide it first to allow post-game stats to show
        if (this.isVisible) {
            this.hide();
        }
        
        this.isVisible = true;
        this.isPostGameMode = true;
        this.createOverlay(state);
        this.addVictoryDefeatDisplay(winningTeam, playerTeam);
        this.addBackToLobbyButton();
        
        // Hide control hints in post-game mode
        if (this.damageHintText) {
            this.damageHintText.setVisible(false);
        }
        if (this.cheatHintText) {
            this.cheatHintText.setVisible(false);
        }
    }

    /**
     * Hides the stats overlay
     */
    hide(): void {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.destroyOverlay();
    }

    /**
     * Updates the stats overlay with new data
     */
    update(state: SharedGameState): void {
        if (!this.isVisible) return;
        
        this.destroyOverlay();
        this.createOverlay(state);
    }

    /**
     * Creates team header with consistent styling
     */
    private createTeamInfo(x: number, y: number, teamName: string, teamColor: string): void {
        const header = this.scene.add.text(x, y, teamName, { ...this.TEXT_STYLES.HEADER, color: teamColor });
        header.setDepth(this.DEPTHS.UI_CONTENT);
        header.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(header);
        this.hudContainer!.add(header);
    }

    /**
     * Creates the overlay elements
     */
    private createOverlay(state: SharedGameState): void {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(this.DEPTHS.BACKGROUND);
        
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }
        
        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRect(0, 0, CLIENT_CONFIG.GAME_CANVAS_WIDTH, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        background.setDepth(this.DEPTHS.BACKGROUND);
        background.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(background);
        this.hudContainer.add(background);

        const playerStats = this.getPlayerStats(state);
        const blueTeamStats = playerStats.filter(p => p.team === 'blue');
        const redTeamStats = playerStats.filter(p => p.team === 'red');

        const centerX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2;
        const tableWidth = this.getTotalTableWidth();
        const tableX = centerX - tableWidth / 2 - 30;

        const gameTimeText = this.scene.add.text(centerX, 35, `Game Time: ${this.formatGameTime(state.gameTime)}`, this.TEXT_STYLES.GAME_TIME);
        gameTimeText.setOrigin(0.5, 0);
        gameTimeText.setDepth(this.DEPTHS.UI_CONTENT);
        gameTimeText.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(gameTimeText);
        this.hudContainer.add(gameTimeText);

        this.createTeamInfo(tableX + this.COLUMN_WIDTHS.arrow, 90, 'Red Team', '#e74c3c');
        this.createTeamInfo(tableX + this.COLUMN_WIDTHS.arrow, 400, 'Blue Team', '#3498db');

        this.createTeamTable(redTeamStats, tableX, 140, '#e74c3c');
        this.createTeamTable(blueTeamStats, tableX, 450, '#3498db');

        // Add hints about additional overlays at the bottom
        this.createOverlayHints();
    }

    /**
     * Creates hints about additional overlays at the bottom of the stats screen
     */
    private createOverlayHints(): void {
        // No hints - controls are shown in tutorial
    }

    /**
     * Creates a proper table for team stats
     */
    private createTeamTable(stats: PlayerStats[], startX: number, startY: number, teamColor: string): void {
        if (stats.length === 0) {
            const noPlayersText = this.scene.add.text(startX, startY, 'No players', this.TEXT_STYLES.NO_PLAYERS);
            noPlayersText.setDepth(this.DEPTHS.UI_CONTENT);
            noPlayersText.setScrollFactor(0, 0); // Fixed to screen
            this.overlayElements.push(noPlayersText);
            this.hudContainer!.add(noPlayersText);
            return;
        }

        this.overlayElements.push(...this.createTableRow(startX, startY, teamColor));

        // Separator with margins - more on left (arrow width), less on right
        const separator = this.scene.add.graphics();
        const leftInset = this.COLUMN_WIDTHS.arrow; // Arrow column width on left
        const rightInset = 0; // Less margin on right
        separator.lineStyle(1, parseInt(teamColor.replace('#', '0x')), 0.5);
        separator.lineBetween(startX + leftInset, startY + this.CELL_HEIGHT + 5, startX + this.getTotalTableWidth() - rightInset, startY + this.CELL_HEIGHT + 5);
        separator.setDepth(this.DEPTHS.UI_CONTENT);
        separator.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(separator);
        this.hudContainer!.add(separator);

        stats.forEach((player, index) => {
            const rowY = startY + (index + 1) * (this.CELL_HEIGHT + this.CELL_PADDING) + 10;
            this.overlayElements.push(...this.createTableRow(startX, rowY, teamColor, player));
        });
        
        // Add totals row with extra spacing
        const totalsRowY = startY + (stats.length + 1) * (this.CELL_HEIGHT + this.CELL_PADDING) + 18;
        
        // Add separator before totals
        const totalsSepar = this.scene.add.graphics();
        totalsSepar.lineStyle(1, parseInt(teamColor.replace('#', '0x')), 0.5);
        totalsSepar.lineBetween(startX + leftInset, totalsRowY - 8, startX + this.getTotalTableWidth() - rightInset, totalsRowY - 8);
        totalsSepar.setDepth(this.DEPTHS.UI_CONTENT);
        totalsSepar.setScrollFactor(0, 0);
        this.overlayElements.push(totalsSepar);
        this.hudContainer!.add(totalsSepar);
        
        // Calculate totals
        const totals = this.calculateTeamTotals(stats);
        const totalsData: PlayerStats = {
            id: 'totals',
            displayName: 'Totals',
            controller: 'totals' as ControllerId,
            team: stats[0]?.team || 'blue',
            abilityType: '',
            level: 0,
            experience: 0,
            totalExperience: totals.xp,
            minionKills: totals.minionKills,
            heroKills: totals.kills,
            turretKills: totals.turretKills,
            deaths: totals.deaths,
            damageTaken: totals.damageTaken,
            damageDealt: totals.damageDealt,
            isBot: false,
            isCurrentPlayer: false,
            levelRewards: 0,
            state: 'alive'
        };
        
        this.overlayElements.push(...this.createTableRow(startX, totalsRowY, teamColor, totalsData, true));
    }

    /**
     * Converts hex number to hex color string
     */
    private hexNumberToString(hex: number): string {
        return `#${hex.toString(16).padStart(6, '0')}`;
    }

    /**
     * Creates a table cell with consistent styling
     */
    private createCell(
        x: number, 
        y: number, 
        text: string, 
        color: string, 
        width: number, 
        align: 'left' | 'right' = 'left',
        isHighlighted: boolean = false,
        isDead: boolean = false,
        team?: string,
        isBot: boolean = false
    ): Phaser.GameObjects.Text {
        // Determine final color: yellow for highlighted (current player), respawn color for dead, normal otherwise
        let finalColor = color;
        if (isHighlighted) {
            finalColor = '#ffff00';
        } else if (isDead && team) {
            // Use the same respawn colors as the game renderer
            const respawnColor = team === 'blue' 
                ? CLIENT_CONFIG.TEAM_COLORS.BLUE_RESPAWNING 
                : CLIENT_CONFIG.TEAM_COLORS.RED_RESPAWNING;
            finalColor = this.hexNumberToString(respawnColor);
        }
        
        const cell = this.scene.add.text(x, y, text, {
            fontSize: '15px',
            color: finalColor,
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
            fontStyle: isBot ? 'italic' : 'normal'
        });
        
        if (align === 'right') {
            cell.setOrigin(1, 0);
        }
        
        cell.setDepth(this.DEPTHS.UI_CONTENT);
        cell.setScrollFactor(0, 0); // Fixed to screen
        this.hudContainer!.add(cell);
        
        return cell;
    }

    /**
     * Creates a table row (header or player data)
     */
    private createTableRow(startX: number, startY: number, teamColor: string, player?: PlayerStats, isTotalsRow: boolean = false): Phaser.GameObjects.Text[] {
        const cells: Phaser.GameObjects.Text[] = [];
        let currentX = startX;

        this.COLUMNS.forEach(column => {
            const x = column.align === 'right' ? currentX + this.COLUMN_WIDTHS[column.width] - 5 : currentX;
            // Hide level column in totals row (it doesn't make sense to sum levels)
            const text = (isTotalsRow && column.key === 'level') ? '' : (player ? column.getValue(player) : column.header);
            // Highlight entire current player row
            const isHighlighted = !isTotalsRow && player ? player.isCurrentPlayer : false;
            const isDead = player && !player.isCurrentPlayer && !isTotalsRow ? player.state === 'respawning' : false;
            const team = player?.team;
            // Only italicize name (heroId) and ability columns for bots (not for totals)
            const isBot = !isTotalsRow && player?.isBot && (column.key === 'heroId' || column.key === 'abilityType');
            
            cells.push(this.createCell(x, startY, text, teamColor, this.COLUMN_WIDTHS[column.width], column.align, isHighlighted, isDead, team, isBot));
            currentX += this.COLUMN_WIDTHS[column.width];
        });

        return cells;
    }

    /**
     * Gets the total width of the table
     */
    private getTotalTableWidth(): number {
        return Object.values(this.COLUMN_WIDTHS).reduce((sum, width) => sum + width, 0);
    }

    /**
     * Extracts player stats from game state
     */
    private getPlayerStats(state: SharedGameState): PlayerStats[] {
        const stats: PlayerStats[] = [];
        state.combatants.forEach((combatant) => {
            if (combatant.type === COMBATANT_TYPES.HERO && isHeroCombatant(combatant)) {
                const deaths = state.killEvents.filter(killEvent => 
                    killEvent.targetId === combatant.id && killEvent.targetType === 'hero'
                ).length;
                
                stats.push({
                    id: combatant.id,
                    displayName: combatant.displayName,
                    controller: combatant.controller,
                    team: combatant.team,
                    abilityType: combatant.ability.type,
                    level: combatant.level,
                    experience: combatant.experience,
                    totalExperience: combatant.roundStats.totalExperience,
                    minionKills: combatant.roundStats.minionKills,
                    heroKills: combatant.roundStats.heroKills,
                    turretKills: combatant.roundStats.turretKills,
                    deaths: deaths,
                    damageTaken: combatant.roundStats.damageTaken,
                    damageDealt: combatant.roundStats.damageDealt,
                    isBot: combatant.controller.startsWith('bot'),
                    isCurrentPlayer: this.playerSessionId === combatant.controller,
                    levelRewards: combatant.levelRewards.length,
                    state: combatant.state
                });
            }
        });
        return stats.sort((a, b) => a.team !== b.team ? a.team.localeCompare(b.team) : a.id.localeCompare(b.id));
    }

    /**
     * Calculates team totals for all stats
     */
    private calculateTeamTotals(stats: PlayerStats[]): { 
        kills: number, 
        deaths: number, 
        xp: number,
        minionKills: number,
        turretKills: number,
        damageDealt: number,
        damageTaken: number
    } {
        return {
            kills: stats.reduce((sum, player) => sum + player.heroKills, 0),
            deaths: stats.reduce((sum, player) => sum + player.deaths, 0),
            xp: stats.reduce((sum, player) => sum + player.totalExperience, 0),
            minionKills: stats.reduce((sum, player) => sum + player.minionKills, 0),
            turretKills: stats.reduce((sum, player) => sum + player.turretKills, 0),
            damageDealt: stats.reduce((sum, player) => sum + player.damageDealt, 0),
            damageTaken: stats.reduce((sum, player) => sum + player.damageTaken, 0)
        };
    }

    /**
     * Destroys the overlay elements
     */
    private destroyOverlay(): void {
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        this.overlayElements = [];
    }

    /**
     * Cleans up the overlay
     */
    destroy(): void {
        this.hide();
    }

    /**
     * Adds victory/defeat display to the stats overlay
     */
    private addVictoryDefeatDisplay(winningTeam: string, playerTeam: string): void {
        if (!this.hudContainer) return;
        
        const isVictory = winningTeam === playerTeam;
        const text = isVictory ? 'VICTORY!' : 'DEFEAT!';
        const textColor = isVictory ? '#4CAF50' : '#F44336';
        
        // Position in upper right corner with same padding as health bar (20px)
        this.victoryDefeatText = this.scene.add.text(
            CLIENT_CONFIG.GAME_CANVAS_WIDTH - 20,
            20,
            text,
            {
                fontSize: '48px',
                color: textColor,
                fontStyle: 'bold',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                stroke: '#000000',
                strokeThickness: 3,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 4,
                    fill: true
                }
            }
        ).setOrigin(1, 0).setDepth(this.DEPTHS.UI_CONTENT).setScrollFactor(0, 0); // Right-aligned origin
        
        this.hudContainer.add(this.victoryDefeatText);
        this.overlayElements.push(this.victoryDefeatText);
    }

    /**
     * Adds back to lobby button
     */
    private addBackToLobbyButton(): void {
        if (!this.hudContainer) return;
        
        const buttonX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2;
        const buttonY = CLIENT_CONFIG.GAME_CANVAS_HEIGHT - 35;
        
        // Create button text with background (like lobby buttons)
        this.backToLobbyButton = this.scene.add.text(
            buttonX,
            buttonY,
            'Back to Lobby',
            {
                fontSize: '24px',
                color: '#FFFFFF',
                fontStyle: 'bold',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
                backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.PROCEED_BUTTON),
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5).setDepth(this.DEPTHS.UI_CONTENT).setScrollFactor(0, 0).setInteractive();
        
        this.hudContainer.add(this.backToLobbyButton);
        this.overlayElements.push(this.backToLobbyButton);
        
        // Add click handler
        this.backToLobbyButton.on('pointerdown', () => {
            this.handleBackToLobby();
        });
        
        // Add hover effects (like lobby buttons)
        this.backToLobbyButton.on('pointerover', () => {
            if (this.backToLobbyButton) {
                this.backToLobbyButton.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.PROCEED_BUTTON_HOVER) });
            }
        });
        
        this.backToLobbyButton.on('pointerout', () => {
            if (this.backToLobbyButton) {
                this.backToLobbyButton.setStyle({ backgroundColor: hexToColorString(CLIENT_CONFIG.UI.COLORS.PROCEED_BUTTON) });
            }
        });
    }

    /**
     * Handles back to lobby button click
     */
    private handleBackToLobby(): void {
        // Send message to server to return to lobby
        if (this.room) {
            this.room.send('returnToLobby', {});
        }
    }

    /**
     * Formats the game time in minutes and seconds
     */
    private formatGameTime(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
} 