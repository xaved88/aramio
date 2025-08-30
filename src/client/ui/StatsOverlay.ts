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

    // Column definitions for consistent table structure
    private readonly COLUMNS = [
        { key: 'arrow', width: 'arrow', header: '', align: 'right', getValue: (player: PlayerStats) => player.isCurrentPlayer ? '▶' : '' },
        { key: 'heroId', width: 'heroId', header: 'Hero', align: 'left', getValue: (player: PlayerStats) => player.id.length > 14 ? player.id.substring(0, 6) + '...' + player.id.substring(player.id.length - 5) : player.id },
        { key: 'abilityType', width: 'abilityType', header: 'Ability', align: 'left', getValue: (player: PlayerStats) => player.abilityType },
        { key: 'level', width: 'level', header: 'Lvl', align: 'right', getValue: (player: PlayerStats) => player.level.toString() },
        { key: 'totalXp', width: 'totalXp', header: 'XP', align: 'right', getValue: (player: PlayerStats) => Math.round(player.totalExperience).toString() },
        { key: 'heroKills', width: 'heroKills', header: 'Kills', align: 'right', getValue: (player: PlayerStats) => Math.round(player.heroKills).toString() },
        { key: 'deaths', width: 'deaths', header: 'Deaths', align: 'right', getValue: (player: PlayerStats) => player.deaths.toString() },
        { key: 'minionKills', width: 'minionKills', header: 'Minions', align: 'right', getValue: (player: PlayerStats) => Math.round(player.minionKills).toString() },
        { key: 'turretKills', width: 'turretKills', header: 'Turrets', align: 'right', getValue: (player: PlayerStats) => Math.round(player.turretKills).toString() },
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
            fontStyle: 'bold'
        },
        GAME_TIME: {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        },
        TEAM_TOTALS: {
            fontSize: '16px',
            fontStyle: 'bold'
        },
        NO_PLAYERS: {
            fontSize: '14px',
            color: '#888888'
        }
    } as const;

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
     * Creates team header and totals with consistent styling
     */
    private createTeamInfo(x: number, y: number, teamName: string, teamColor: string, totals: { kills: number, deaths: number, xp: number }): void {
        const header = this.scene.add.text(x, y, teamName, { ...this.TEXT_STYLES.HEADER, color: teamColor });
        header.setDepth(this.DEPTHS.UI_CONTENT);
        header.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(header);

        const totalsText = this.scene.add.text(x + 200, y, `XP: ${Math.round(totals.xp)} | K: ${totals.kills} | D: ${totals.deaths}`, 
            { ...this.TEXT_STYLES.TEAM_TOTALS, color: teamColor });
        totalsText.setDepth(this.DEPTHS.UI_CONTENT);
        totalsText.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(totalsText);
    }

    /**
     * Creates the overlay elements
     */
    private createOverlay(state: SharedGameState): void {
        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRect(0, 0, CLIENT_CONFIG.GAME_CANVAS_WIDTH, CLIENT_CONFIG.GAME_CANVAS_HEIGHT);
        background.setDepth(this.DEPTHS.BACKGROUND);
        background.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(background);

        const playerStats = this.getPlayerStats(state);
        const blueTeamStats = playerStats.filter(p => p.team === 'blue');
        const redTeamStats = playerStats.filter(p => p.team === 'red');

        const centerX = CLIENT_CONFIG.GAME_CANVAS_WIDTH / 2;
        const tableWidth = this.getTotalTableWidth();
        const tableX = centerX - tableWidth / 2 - 30;

        const gameTimeText = this.scene.add.text(centerX, 20, `Game Time: ${this.formatGameTime(state.gameTime)}`, this.TEXT_STYLES.GAME_TIME);
        gameTimeText.setOrigin(0.5, 0);
        gameTimeText.setDepth(this.DEPTHS.UI_CONTENT);
        gameTimeText.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(gameTimeText);

        this.createTeamInfo(tableX + this.COLUMN_WIDTHS.arrow, 70, 'Red Team', '#e74c3c', this.calculateTeamTotals(redTeamStats));
        this.createTeamInfo(tableX + this.COLUMN_WIDTHS.arrow, 370, 'Blue Team', '#3498db', this.calculateTeamTotals(blueTeamStats));

        this.createTeamTable(redTeamStats, tableX, 120, '#e74c3c');
        this.createTeamTable(blueTeamStats, tableX, 420, '#3498db');
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
            return;
        }

        this.overlayElements.push(...this.createTableRow(startX, startY, teamColor));

        const separator = this.scene.add.graphics();
        separator.lineStyle(1, parseInt(teamColor.replace('#', '0x')), 0.5);
        separator.lineBetween(startX, startY + this.CELL_HEIGHT + 5, startX + this.getTotalTableWidth(), startY + this.CELL_HEIGHT + 5);
        separator.setDepth(this.DEPTHS.UI_CONTENT);
        separator.setScrollFactor(0, 0); // Fixed to screen
        this.overlayElements.push(separator);

        stats.forEach((player, index) => {
            const rowY = startY + (index + 1) * (this.CELL_HEIGHT + this.CELL_PADDING) + 10;
            this.overlayElements.push(...this.createTableRow(startX, rowY, teamColor, player));
        });
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
        isHighlighted: boolean = false
    ): Phaser.GameObjects.Text {
        const cell = this.scene.add.text(x, y, text, {
            fontSize: '14px',
            color: isHighlighted ? '#ffff00' : color,
            fontFamily: 'monospace'
        });
        
        if (align === 'right') {
            cell.setOrigin(1, 0);
        }
        
        cell.setDepth(this.DEPTHS.UI_CONTENT);
        cell.setScrollFactor(0, 0); // Fixed to screen
        return cell;
    }

    /**
     * Creates a table row (header or player data)
     */
    private createTableRow(startX: number, startY: number, teamColor: string, player?: PlayerStats): Phaser.GameObjects.Text[] {
        const cells: Phaser.GameObjects.Text[] = [];
        let currentX = startX;

        this.COLUMNS.forEach(column => {
            const x = column.align === 'right' ? currentX + this.COLUMN_WIDTHS[column.width] - 5 : currentX;
            const text = player ? column.getValue(player) : column.header;
            const isHighlighted = player && (column.key === 'arrow' || column.key === 'heroId' || column.key === 'abilityType') ? player.isCurrentPlayer : false;
            
            cells.push(this.createCell(x, startY, text, teamColor, this.COLUMN_WIDTHS[column.width], column.align, isHighlighted));
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
                    isCurrentPlayer: this.playerSessionId === combatant.controller
                });
            }
        });
        return stats.sort((a, b) => a.team !== b.team ? a.team.localeCompare(b.team) : a.id.localeCompare(b.id));
    }

    /**
     * Calculates team totals for kills, deaths, and XP
     */
    private calculateTeamTotals(stats: PlayerStats[]): { kills: number, deaths: number, xp: number } {
        return {
            kills: stats.reduce((sum, player) => sum + player.heroKills, 0),
            deaths: stats.reduce((sum, player) => sum + player.deaths, 0),
            xp: stats.reduce((sum, player) => sum + player.totalExperience, 0)
        };
    }

    /**
     * Destroys the overlay elements
     */
    private destroyOverlay(): void {
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