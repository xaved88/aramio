import Phaser from 'phaser';
import { COMBATANT_TYPES, isHeroCombatant, HeroCombatant, ControllerId } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../Config';

interface PlayerStats {
    id: string;
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
    private playerSessionId: ControllerId | null = null;

    // Table configuration
    private readonly CELL_HEIGHT = 20;
    private readonly CELL_PADDING = 5;
        private readonly COLUMN_WIDTHS = {
        arrow: 60,
        heroId: 120,
        abilityType: 100,
        level: 30,
        totalXp: 50,
        minionKills: 60,
        heroKills: 60,
        turretKills: 60,
        deaths: 60,
        damageTaken: 60,
        damageDealt: 60
    };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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
        const tableX = centerX - tableWidth / 2 - 30; // Center the table horizontally, offset more to the left

        // Create team headers
        const headerStyle = {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        };

        // Add game time display above team headers
        const gameTimeText = this.scene.add.text(centerX, 20, `Game Time: ${this.formatGameTime(state.gameTime)}`, {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        gameTimeText.setOrigin(0.5, 0);
        gameTimeText.setDepth(1001);
        this.overlayElements.push(gameTimeText);

        const redHeader = this.scene.add.text(tableX + this.COLUMN_WIDTHS.arrow, 70, 'Red Team', {
            ...headerStyle,
            color: '#e74c3c'
        });
        redHeader.setDepth(1001);
        this.overlayElements.push(redHeader);

        const blueHeader = this.scene.add.text(tableX + this.COLUMN_WIDTHS.arrow, 370, 'Blue Team', {
            ...headerStyle,
            color: '#3498db'
        });
        blueHeader.setDepth(1001);
        this.overlayElements.push(blueHeader);

        // Create red team table
        this.createTeamTable(redTeamStats, tableX, 120, '#e74c3c');
        
        // Create blue team table
        this.createTeamTable(blueTeamStats, tableX, 420, '#3498db');
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

        // Arrow column header (empty) - right aligned
        const arrowHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.arrow - 5, startY, '', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        arrowHeader.setOrigin(1, 0);
        arrowHeader.setDepth(1001);
        cells.push(arrowHeader);
        currentX += this.COLUMN_WIDTHS.arrow;

        // Hero ID header - left aligned
        const playerIdHeader = this.scene.add.text(currentX, startY, 'Hero', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        playerIdHeader.setDepth(1001);
        cells.push(playerIdHeader);
        currentX += this.COLUMN_WIDTHS.heroId;

        // Ability Type header - left aligned
        const abilityTypeHeader = this.scene.add.text(currentX, startY, 'Ability', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        abilityTypeHeader.setDepth(1001);
        cells.push(abilityTypeHeader);
        currentX += this.COLUMN_WIDTHS.abilityType;

        // Level header - right aligned
        const levelHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.level - 5, startY, 'Lvl', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        levelHeader.setOrigin(1, 0);
        levelHeader.setDepth(1001);
        cells.push(levelHeader);
        currentX += this.COLUMN_WIDTHS.level;

        // Total XP header - right aligned
        const xpHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.totalXp - 5, startY, 'XP', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        xpHeader.setOrigin(1, 0);
        xpHeader.setDepth(1001);
        cells.push(xpHeader);
        currentX += this.COLUMN_WIDTHS.totalXp;

        // Hero Kills header - right aligned
        const heroKillsHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.heroKills - 5, startY, 'Kills', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        heroKillsHeader.setOrigin(1, 0);
        heroKillsHeader.setDepth(1001);
        cells.push(heroKillsHeader);
        currentX += this.COLUMN_WIDTHS.heroKills;

        // Deaths header - right aligned
        const deathsHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.deaths - 5, startY, 'Deaths', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        deathsHeader.setOrigin(1, 0);
        deathsHeader.setDepth(1001);
        cells.push(deathsHeader);
        currentX += this.COLUMN_WIDTHS.deaths;

        // Minion Kills header - right aligned
        const minionKillsHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.minionKills - 5, startY, 'Minions', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        minionKillsHeader.setOrigin(1, 0);
        minionKillsHeader.setDepth(1001);
        cells.push(minionKillsHeader);
        currentX += this.COLUMN_WIDTHS.minionKills;

        // Turret Kills header - right aligned
        const turretKillsHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.turretKills - 5, startY, 'Turrets', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        turretKillsHeader.setOrigin(1, 0);
        turretKillsHeader.setDepth(1001);
        cells.push(turretKillsHeader);
        currentX += this.COLUMN_WIDTHS.turretKills;

        // Damage Dealt header - right aligned
        const damageDealtHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.damageDealt - 5, startY, 'Dealt', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        damageDealtHeader.setOrigin(1, 0);
        damageDealtHeader.setDepth(1001);
        cells.push(damageDealtHeader);
        currentX += this.COLUMN_WIDTHS.damageDealt;

        // Damage Taken header - right aligned
        const damageTakenHeader = this.scene.add.text(currentX + this.COLUMN_WIDTHS.damageTaken - 5, startY, 'Taken', {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        damageTakenHeader.setOrigin(1, 0);
        damageTakenHeader.setDepth(1001);
        cells.push(damageTakenHeader);
        currentX += this.COLUMN_WIDTHS.damageTaken;

        return cells;
    }

    /**
     * Creates a player row with individual cells
     */
    private createPlayerRow(player: PlayerStats, startX: number, startY: number, teamColor: string): Phaser.GameObjects.Text[] {
        const cells: Phaser.GameObjects.Text[] = [];
        let currentX = startX;

        // Arrow cell pointing at currently controlled hero - right aligned
        const arrowText = player.isCurrentPlayer ? '▶' : '';
        const arrowCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.arrow - 5, startY, arrowText, {
            fontSize: '14px',
            color: player.isCurrentPlayer ? '#ffff00' : teamColor, // Yellow for current player
            fontFamily: 'monospace'
        });
        arrowCell.setOrigin(1, 0);
        arrowCell.setDepth(1001);
        cells.push(arrowCell);
        currentX += this.COLUMN_WIDTHS.arrow;

        // Hero ID cell - left aligned
        const heroId = player.id.length > 14 
            ? player.id.substring(0, 6) + '...' + player.id.substring(player.id.length - 5)
            : player.id;
        const playerIdCell = this.scene.add.text(currentX, startY, heroId, {
            fontSize: '14px',
            color: player.isCurrentPlayer ? '#ffff00' : teamColor, // Yellow for current player
            fontFamily: 'monospace'
        });
        playerIdCell.setDepth(1001);
        cells.push(playerIdCell);
        currentX += this.COLUMN_WIDTHS.heroId;

        // Ability Type cell - left aligned
        const abilityTypeCell = this.scene.add.text(currentX, startY, player.abilityType, {
            fontSize: '14px',
            color: player.isCurrentPlayer ? '#ffff00' : teamColor, // Yellow for current player
            fontFamily: 'monospace'
        });
        abilityTypeCell.setDepth(1001);
        cells.push(abilityTypeCell);
        currentX += this.COLUMN_WIDTHS.abilityType;

        // Level cell - right aligned
        const levelCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.level - 5, startY, player.level.toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        levelCell.setOrigin(1, 0);
        levelCell.setDepth(1001);
        cells.push(levelCell);
        currentX += this.COLUMN_WIDTHS.level;

        // Total XP cell - right aligned
        const xpCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.totalXp - 5, startY, Math.round(player.totalExperience).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        xpCell.setOrigin(1, 0);
        xpCell.setDepth(1001);
        cells.push(xpCell);
        currentX += this.COLUMN_WIDTHS.totalXp;

        // Hero Kills cell - right aligned
        const heroKillsCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.heroKills - 5, startY, Math.round(player.heroKills).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        heroKillsCell.setOrigin(1, 0);
        heroKillsCell.setDepth(1001);
        cells.push(heroKillsCell);
        currentX += this.COLUMN_WIDTHS.heroKills;

        // Deaths cell - right aligned
        const deathsCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.deaths - 5, startY, player.deaths.toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        deathsCell.setOrigin(1, 0);
        deathsCell.setDepth(1001);
        cells.push(deathsCell);
        currentX += this.COLUMN_WIDTHS.deaths;

        // Minion Kills cell - right aligned
        const minionKillsCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.minionKills - 5, startY, Math.round(player.minionKills).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        minionKillsCell.setOrigin(1, 0);
        minionKillsCell.setDepth(1001);
        cells.push(minionKillsCell);
        currentX += this.COLUMN_WIDTHS.minionKills;

        // Turret Kills cell - right aligned
        const turretKillsCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.turretKills - 5, startY, Math.round(player.turretKills).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        turretKillsCell.setOrigin(1, 0);
        turretKillsCell.setDepth(1001);
        cells.push(turretKillsCell);
        currentX += this.COLUMN_WIDTHS.turretKills;

        // Damage Dealt cell - right aligned
        const damageDealtCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.damageDealt - 5, startY, Math.round(player.damageDealt).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        damageDealtCell.setOrigin(1, 0);
        damageDealtCell.setDepth(1001);
        cells.push(damageDealtCell);
        currentX += this.COLUMN_WIDTHS.damageDealt;

        // Damage Taken cell - right aligned
        const damageTakenCell = this.scene.add.text(currentX + this.COLUMN_WIDTHS.damageTaken - 5, startY, Math.round(player.damageTaken).toString(), {
            fontSize: '14px',
            color: teamColor,
            fontFamily: 'monospace'
        });
        damageTakenCell.setOrigin(1, 0);
        damageTakenCell.setDepth(1001);
        cells.push(damageTakenCell);
        currentX += this.COLUMN_WIDTHS.damageTaken;

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
                
                // Calculate deaths by counting kill events where this hero was the target
                const deaths = state.killEvents.filter(killEvent => 
                    killEvent.targetId === combatant.id && killEvent.targetType === 'hero'
                ).length;
                
                stats.push({
                    id: combatant.id,
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
                    isBot,
                    isCurrentPlayer
                });
            }
        });

        // Sort by team, then by hero ID for consistent ordering
        return stats.sort((a, b) => {
            if (a.team !== b.team) {
                return a.team.localeCompare(b.team);
            }
            return a.id.localeCompare(b.id);
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