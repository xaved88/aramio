import Phaser from 'phaser';
import { HUDContainer } from './HUDContainer';
import { CLIENT_CONFIG } from '../../ClientConfig';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { ControllerId } from '../../shared/types/CombatantTypes';
import { hexToColorString } from '../utils/ColorUtils';

interface KillFeedEntry {
    killerName: string;
    victimName: string;
    killerTeam: string;
    victimTeam: string;
    timestamp: number;
    involvedPlayer: boolean;
    container: Phaser.GameObjects.Container;
}

export class KillFeed {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private entries: KillFeedEntry[] = [];
    private processedKillEvents: Set<string> = new Set();
    private playerSessionId: ControllerId | null = null;
    
    private readonly MAX_ENTRIES = 5;
    private readonly ENTRY_HEIGHT = 20;
    private readonly ENTRY_SPACING = 3;
    private readonly FEED_X = 10; // Top left corner
    private readonly FEED_Y = 100; // Below the HUD elements
    private readonly FADE_DURATION = 5000; // How long before entries start to fade
    private readonly REMOVE_DELAY = 6000; // How long before entries are removed

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createContainer();
    }

    setHUDCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
        this.hudCamera = camera;
    }

    setCameraManager(cameraManager: any): void {
        this.cameraManager = cameraManager;
        if (this.hudContainer) {
            this.hudContainer.setCameraManager(cameraManager);
        }
    }

    setPlayerSessionId(sessionId: ControllerId | null): void {
        this.playerSessionId = sessionId;
    }

    private createContainer(): void {
        // Create HUD container
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
    }

    /**
     * Process kill events from the game state and add to kill feed
     */
    processKillEvents(state: SharedGameState): void {
        // Filter for hero kills only
        const heroKills = state.killEvents.filter(event => event.targetType === 'hero');
        
        heroKills.forEach(event => {
            const eventKey = `${event.sourceId}-${event.targetId}-${event.timestamp}`;
            
            // Skip if we've already processed this event
            if (this.processedKillEvents.has(eventKey)) {
                return;
            }
            
            this.processedKillEvents.add(eventKey);
            
            // Get killer and victim info
            const killer = state.combatants.get(event.sourceId);
            const victim = state.combatants.get(event.targetId);
            
            if (!killer || !victim) {
                return;
            }
            
            // Check if player is involved (either as killer or victim)
            const isPlayerKiller = killer.type === 'hero' && killer.controller === this.playerSessionId;
            const isPlayerVictim = victim.type === 'hero' && victim.controller === this.playerSessionId;
            const involvedPlayer = isPlayerKiller || isPlayerVictim;
            
            // Get display names - capitalize non-hero types
            const killerName = killer.type === 'hero' 
                ? killer.displayName 
                : killer.type.charAt(0).toUpperCase() + killer.type.slice(1);
            const victimName = victim.type === 'hero' 
                ? victim.displayName 
                : victim.type.charAt(0).toUpperCase() + victim.type.slice(1);
            
            // Add entry to feed
            this.addEntry(
                killerName,
                victimName,
                killer.team,
                victim.team,
                event.timestamp,
                involvedPlayer,
                isPlayerKiller,
                isPlayerVictim
            );
        });
    }

    /**
     * Add a new entry to the kill feed
     */
    private addEntry(
        killerName: string,
        victimName: string,
        killerTeam: string,
        victimTeam: string,
        timestamp: number,
        involvedPlayer: boolean,
        isKillerPlayer: boolean,
        isVictimPlayer: boolean
    ): void {
        // Remove oldest entry if we're at max capacity
        if (this.entries.length >= this.MAX_ENTRIES) {
            const oldestEntry = this.entries.shift();
            if (oldestEntry) {
                oldestEntry.container.destroy();
            }
        }
        
        // Calculate Y position for new entry (appears at the bottom of the list)
        const newEntryY = this.FEED_Y + this.entries.length * (this.ENTRY_HEIGHT + this.ENTRY_SPACING);
        
        // Create container for this entry at its final position
        const entryContainer = this.scene.add.container(this.FEED_X, newEntryY);
        entryContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.HUD);
        entryContainer.setScrollFactor(0, 0);
        
        // Create background
        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.2);
        background.fillRoundedRect(0, 0, 160, this.ENTRY_HEIGHT, 3);
        entryContainer.add(background);
        
        // Get team colors - use player color (purple) if this is the player
        const killerColor = isKillerPlayer 
            ? hexToColorString(CLIENT_CONFIG.SELF_COLORS.PRIMARY)
            : hexToColorString(killerTeam === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED);
        const victimColor = isVictimPlayer 
            ? hexToColorString(CLIENT_CONFIG.SELF_COLORS.PRIMARY)
            : hexToColorString(victimTeam === 'blue' ? CLIENT_CONFIG.TEAM_COLORS.BLUE : CLIENT_CONFIG.TEAM_COLORS.RED);
        
        // Create text: "KillerName killed VictimName"
        const fontSize = involvedPlayer ? '11px' : '10px';
        const fontWeight = involvedPlayer ? 'bold' : 'normal';
        
        // Killer name
        const killerText = this.scene.add.text(5, this.ENTRY_HEIGHT / 2, killerName, {
            fontSize: fontSize,
            fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY,
            color: killerColor,
            fontStyle: fontWeight
        });
        killerText.setOrigin(0, 0.5);
        entryContainer.add(killerText);
        
        // Skull icon instead of "killed" text
        const skullIcon = this.scene.add.text(
            killerText.x + killerText.width + 4, 
            this.ENTRY_HEIGHT / 2, 
            '☠', 
            {
                fontSize: fontSize,
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY,
                color: '#FFFFFF',
                fontStyle: fontWeight
            }
        );
        skullIcon.setOrigin(0, 0.5);
        entryContainer.add(skullIcon);
        
        // Victim name
        const victimText = this.scene.add.text(
            skullIcon.x + skullIcon.width + 4, 
            this.ENTRY_HEIGHT / 2, 
            victimName, 
            {
                fontSize: fontSize,
                fontFamily: CLIENT_CONFIG.UI.FONTS.DEFAULT_FAMILY,
                color: victimColor,
                fontStyle: fontWeight
            }
        );
        victimText.setOrigin(0, 0.5);
        entryContainer.add(victimText);
        
        // Add to HUD container
        if (this.hudContainer) {
            this.hudContainer.add(entryContainer);
        }
        
        // Create entry object
        const entry: KillFeedEntry = {
            killerName,
            victimName,
            killerTeam,
            victimTeam,
            timestamp,
            involvedPlayer,
            container: entryContainer
        };
        
        this.entries.push(entry);
        
        // Make sure all entries are in correct positions (in case any were mid-fade)
        this.updatePositionsImmediate();
        
        // Fade in animation - start at lower opacity for less prominence
        // No position animation - entry appears in place
        entryContainer.setAlpha(0);
        this.scene.tweens.add({
            targets: entryContainer,
            alpha: 0.85,
            duration: 300,
            ease: 'Power2'
        });
        
        // Schedule fade out and removal
        this.scene.time.delayedCall(this.FADE_DURATION, () => {
            this.scene.tweens.add({
                targets: entryContainer,
                alpha: 0,
                duration: 1000,
                ease: 'Power2'
            });
        });
        
        this.scene.time.delayedCall(this.REMOVE_DELAY, () => {
            this.removeEntry(entry);
        });
    }

    /**
     * Remove an entry from the feed
     */
    private removeEntry(entry: KillFeedEntry): void {
        const index = this.entries.indexOf(entry);
        if (index !== -1) {
            this.entries.splice(index, 1);
            entry.container.destroy();
            this.updatePositions();
        }
    }

    /**
     * Update positions of all entries with animation (used when removing entries)
     */
    private updatePositions(): void {
        this.entries.forEach((entry, index) => {
            const targetY = this.FEED_Y + index * (this.ENTRY_HEIGHT + this.ENTRY_SPACING);
            
            // Smooth transition to new position
            this.scene.tweens.add({
                targets: entry.container,
                y: targetY,
                duration: 500,
                ease: 'Power2'
            });
        });
    }

    /**
     * Update positions of all entries immediately (no animation, used when adding entries)
     */
    private updatePositionsImmediate(): void {
        this.entries.forEach((entry, index) => {
            const targetY = this.FEED_Y + index * (this.ENTRY_HEIGHT + this.ENTRY_SPACING);
            entry.container.y = targetY;
        });
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.entries.forEach(entry => {
            entry.container.destroy();
        });
        this.entries = [];
        this.processedKillEvents.clear();
    }

    destroy(): void {
        this.clear();
        this.hudContainer?.destroy();
    }
}

