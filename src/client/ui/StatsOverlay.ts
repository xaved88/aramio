import Phaser from 'phaser';
import { COMBATANT_TYPES, isHeroCombatant, HeroCombatant } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../Config';

interface PlayerStats {
    id: string;
    controller: string;
    team: string;
    level: number;
    experience: number;
    totalExperience: number; // total XP earned throughout the match
    minionKills: number;
    heroKills: number;
    turretKills: number;
    damageTaken: number;
    damageDealt: number;
    isBot: boolean;
    isCurrentPlayer: boolean;
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
    private overlayElements: Phaser.GameObjects.GameObject[] = [];
    private isVisible: boolean = false;
    private playerSessionId: string | null = null;

    // Table configuration
    private readonly CELL_HEIGHT = 20;
    private readonly CELL_PADDING = 5;
    private readonly COLUMN_WIDTHS = {
        arrow: 20,
        playerId: 120,
        level: 50,
        totalXp: 70,
        minionKills: 80,
        heroKills: 70,
        turretKills: 80,
        damageTaken: 90,
        damageDealt: 90
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Sets the current player session ID for highlighting
     */
    setPlayerSessionId(sessionId: string | null): void {
        this.playerSessionId = sessionId;
    }

    /**
     * Shows the stats overlay
     */
    show(state: SharedGameState): void {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.createOverlay(state);
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
     * Toggles the stats overlay visibility
     */
    toggle(state: SharedGameState): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(state);
        }
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
     * Creates the overlay elements
     */
    private createOverlay(state: SharedGameState): void {
        // Create semi-transparent background
        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRect(0, 0, CLIENT_CONFIG.GAME_CANVAS_WIDTH, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        background.setDepth(1000);
        this.overlayElements.push(background);

        // Get player stats
        const playerStats = this.getPlayerStats(state);
        const blueTeamStats = playerStats.filter(p => p.team === 'blue');
        const redTeamStats = playerStats.filter(p => p.team === 'red');

        // Calculate center positions
        const centerX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2;
        const tableWidth = this.getTotalTableWidth();
        const tableX = centerX - tableWidth / 2; // Center the table horizontally

        // Create team headers
        const headerStyle = {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        };

        const redHeader = this.scene.add.text(tableX, 50, 'Red Team', {
            ...headerStyle,
            color: '#e74c3c'
        });
        redHeader.setDepth(1001);
        this.overlayElements.push(redHeader);

        const blueHeader = this.scene.add.text(tableX, 350, 'Blue Team', {
            ...headerStyle,
            color: '#3498db'
        });
        blueHeader.setDepth(1001);
        this.overlayElements.push(blueHeader);

        // Create red team table
        this.createTeamTable(redTeamStats, tableX, 100, '#e74c3c');
        
        // Create blue team table
        this.createTeamTable(blueTeamStats, tableX, 400, '#3498db');
    }

    /**
     * Creates a proper table for team stats
     */
    private createTeamTable(stats: PlayerStats[], startX: number, startY: number, teamColor: string): void {
        if (stats.length === 0) {
            const noPlayersText = this.scene.add.text(startX, startY, 'No players', {
                fontSize: '14px',
                color: '#888888'
            });
            noPlayersText.setDepth(1001);
            this.overlayElements.push(noPlayersText);
            return;
        }

        // Create table header
        const headerCells = this.createHeaderRow(startX, startY, teamColor);
        this.overlayElements.push(...headerCells);

        // Create separator line
        const separator = this.scene.add.graphics();
        separator.lineStyle(1, parseInt(teamColor.replace('#', '0x')), 0.5);
        separator.lineBetween(startX, startY + this.CELL_HEIGHT + 5, 
                            startX + this.getTotalTableWidth(), startY + this.CELL_HEIGHT + 5);
        separator.setDepth(1001);
        this.overlayElements.push(separator);

        // Create player rows
        stats.forEach((player, index) => {
            const rowY = startY + (index + 1) * (this.CELL_HEIGHT + this.CELL_PADDING) + 10;
            const playerCells = this.createPlayerRow(player, startX, rowY, teamColor);
            this.overlayElements.push(...playerCells);
        });
    }

    /**
     * Creates the header row cells
     */
    private createHeaderRow(startX: number, startY: number, teamColor: string): Phaser.GameObjects.Text[] {
        const cells: Phaser.GameObjects.Text[] = [];
        let currentX = startX;

        // Arrow column header (empty)
        const arrowHeader = this.scene.add.text(currentX, startY, '', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        arrowHeader.setDepth(1001);
        cells.push(arrowHeader);
        currentX += this.COLUMN_WIDTHS.arrow;

        // Player ID header
        const playerIdHeader = this.scene.add.text(currentX, startY, 'Player ID', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        playerIdHeader.setDepth(1001);
        cells.push(playerIdHeader);
        currentX += this.COLUMN_WIDTHS.playerId;

        // Level header
        const levelHeader = this.scene.add.text(currentX, startY, 'Level', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        levelHeader.setDepth(1001);
        cells.push(levelHeader);
        currentX += this.COLUMN_WIDTHS.level;

        // Total XP header
        const xpHeader = this.scene.add.text(currentX, startY, 'Total XP', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        xpHeader.setDepth(1001);
        cells.push(xpHeader);
        currentX += this.COLUMN_WIDTHS.totalXp;

        // Minion Kills header
        const minionKillsHeader = this.scene.add.text(currentX, startY, 'Minion K', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        minionKillsHeader.setDepth(1001);
        cells.push(minionKillsHeader);
        currentX += this.COLUMN_WIDTHS.minionKills;

        // Hero Kills header
        const heroKillsHeader = this.scene.add.text(currentX, startY, 'Hero K', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        heroKillsHeader.setDepth(1001);
        cells.push(heroKillsHeader);
        currentX += this.COLUMN_WIDTHS.heroKills;

        // Turret Kills header
        const turretKillsHeader = this.scene.add.text(currentX, startY, 'Turret K', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        turretKillsHeader.setDepth(1001);
        cells.push(turretKillsHeader);
        currentX += this.COLUMN_WIDTHS.turretKills;

        // Damage Taken header
        const damageTakenHeader = this.scene.add.text(currentX, startY, 'Dmg Taken', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        damageTakenHeader.setDepth(1001);
        cells.push(damageTakenHeader);
        currentX += this.COLUMN_WIDTHS.damageTaken;

        // Damage Dealt header
        const damageDealtHeader = this.scene.add.text(currentX, startY, 'Dmg Dealt', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        damageDealtHeader.setDepth(1001);
        cells.push(damageDealtHeader);
        currentX += this.COLUMN_WIDTHS.damageDealt;

        return cells;
    }

    /**
     * Creates a player row with individual cells
     */
    private createPlayerRow(player: PlayerStats, startX: number, startY: number, teamColor: string): Phaser.GameObjects.Text[] {
        const cells: Phaser.GameObjects.Text[] = [];
        let currentX = startX;

        // Arrow cell
        const arrowText = player.isCurrentPlayer ? '▶' : ' ';
        const arrowCell = this.scene.add.text(currentX, startY, arrowText, {
            fontSize: '14px',
            color: player.isCurrentPlayer ? '#ffff00' : teamColor, // Yellow for current player
            fontFamily: 'monospace'
        });
        arrowCell.setDepth(1001);
        cells.push(arrowCell);
        currentX += this.COLUMN_WIDTHS.arrow;

        // Player ID cell
        const playerId = player.controller.length > 16 ? player.controller.substring(0, 16) : player.controller;
        const playerIdCell = this.scene.add.text(currentX, startY, playerId, {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        playerIdCell.setDepth(1001);
        cells.push(playerIdCell);
        currentX += this.COLUMN_WIDTHS.playerId;

        // Level cell
        const levelCell = this.scene.add.text(currentX, startY, player.level.toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        levelCell.setDepth(1001);
        cells.push(levelCell);
        currentX += this.COLUMN_WIDTHS.level;

        // Total XP cell
        const xpCell = this.scene.add.text(currentX, startY, Math.round(player.totalExperience).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        xpCell.setDepth(1001);
        cells.push(xpCell);
        currentX += this.COLUMN_WIDTHS.totalXp;

        // Minion Kills cell
        const minionKillsCell = this.scene.add.text(currentX, startY, Math.round(player.minionKills).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        minionKillsCell.setDepth(1001);
        cells.push(minionKillsCell);
        currentX += this.COLUMN_WIDTHS.minionKills;

        // Hero Kills cell
        const heroKillsCell = this.scene.add.text(currentX, startY, Math.round(player.heroKills).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        heroKillsCell.setDepth(1001);
        cells.push(heroKillsCell);
        currentX += this.COLUMN_WIDTHS.heroKills;

        // Turret Kills cell
        const turretKillsCell = this.scene.add.text(currentX, startY, Math.round(player.turretKills).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        turretKillsCell.setDepth(1001);
        cells.push(turretKillsCell);
        currentX += this.COLUMN_WIDTHS.turretKills;

        // Damage Taken cell
        const damageTakenCell = this.scene.add.text(currentX, startY, Math.round(player.damageTaken).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        damageTakenCell.setDepth(1001);
        cells.push(damageTakenCell);
        currentX += this.COLUMN_WIDTHS.damageTaken;

        // Damage Dealt cell
        const damageDealtCell = this.scene.add.text(currentX, startY, Math.round(player.damageDealt).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        damageDealtCell.setDepth(1001);
        cells.push(damageDealtCell);
        currentX += this.COLUMN_WIDTHS.damageDealt;

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
                const isBot = combatant.controller.startsWith('bot');
                const isCurrentPlayer = this.playerSessionId === combatant.controller;
                
                stats.push({
                    id: combatant.id,
                    controller: combatant.controller,
                    team: combatant.team,
                    level: combatant.level,
                    experience: combatant.experience,
                    totalExperience: combatant.roundStats.totalExperience,
                    minionKills: combatant.roundStats.minionKills,
                    heroKills: combatant.roundStats.heroKills,
                    turretKills: combatant.roundStats.turretKills,
                    damageTaken: combatant.roundStats.damageTaken,
                    damageDealt: combatant.roundStats.damageDealt,
                    isBot,
                    isCurrentPlayer
                });
            }
        });

        // Sort by team, then by controller
        return stats.sort((a, b) => {
            if (a.team !== b.team) {
                return a.team.localeCompare(b.team);
            }
            return a.controller.localeCompare(b.controller);
        });
    }

    /**
     * Destroys the overlay elements
     */
    private destroyOverlay(): void {
        // Destroy all overlay elements
        this.overlayElements.forEach(element => element.destroy());
        this.overlayElements = [];
    }

    /**
     * Cleans up the overlay
     */
    destroy(): void {
        this.hide();
    }
} 