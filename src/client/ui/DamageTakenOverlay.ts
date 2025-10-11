import Phaser from 'phaser';
import { HUDContainer } from './HUDContainer';
import { DamageEvent } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';

export interface DamageEntry {
    amount: number; // final damage after armor reduction
    originalAmount: number; // original damage before armor reduction
    damageSource: 'auto-attack' | 'ability' | 'burn';
    attackerId: string;
    attackerName: string;
    timestamp: number;
    abilityName?: string; // For ability damage, the specific ability name
    wasKillingBlow?: boolean; // Whether this damage entry was the killing blow
}

export class DamageTakenOverlay {
    private scene: Phaser.Scene;
    private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null;
    private cameraManager: any = null;
    private hudContainer: HUDContainer | null = null;
    private background: Phaser.GameObjects.Graphics | null = null;
    private titleText: Phaser.GameObjects.Text | null = null;
    private damageEntries: Phaser.GameObjects.Text[] = [];
    private breakdownText: Phaser.GameObjects.Text | null = null;
    private isVisible: boolean = false;
    
    // Damage tracking properties
    private damageHistory: DamageEntry[] = [];
    private deathSummaryHistory: DamageEntry[] = []; // Frozen damage history for death summary
    private isDeathSummaryMode: boolean = false;
    private readonly maxHistoryTime = 15000; // 15 seconds in milliseconds
    private playerSessionId: string | null = null;
    private processedDamageEvents: Set<string> = new Set();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createContainer();
        
        // No automatic cleanup - only clean up when the overlay is shown
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

    setPlayerSessionId(sessionId: string | null): void {
        this.playerSessionId = sessionId;
    }

    private createContainer(): void {
        this.hudContainer = new HUDContainer(this.scene);
        this.hudContainer.setDepth(CLIENT_CONFIG.RENDER_DEPTH.MODALS); // Above stats overlay
        this.hudContainer.setVisible(false);

        // Set up camera manager if available
        if (this.cameraManager) {
            this.hudContainer.setCameraManager(this.cameraManager);
        }

        // Position on the left side of the screen, vertically centered
        this.hudContainer.setPosition(20, CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2 - 150);

        // Create semi-transparent background
        this.background = this.scene.add.graphics();
        this.background.fillStyle(0x000000, 0.7);
        this.background.fillRoundedRect(0, 0, 300, 300, 8);
        this.hudContainer.add(this.background);

        // Create title (will be updated dynamically)
        this.titleText = this.scene.add.text(10, 10, '', {
            fontSize: '16px',
            color: '#ff6b6b',
            fontFamily: 'Arial, sans-serif'
        });
        this.hudContainer.add(this.titleText);

        // Create damage entries container
        this.createDamageEntries();
        
        // Create breakdown text at the bottom
        this.breakdownText = this.scene.add.text(10, 275, '', {
            fontSize: '13px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.hudContainer.add(this.breakdownText);
    }

    private createDamageEntries(): void {
        // Clear existing entries
        this.damageEntries.forEach(entry => entry.destroy());
        this.damageEntries = [];

        // Create placeholder entries (will be updated with real data)
        for (let i = 0; i < 12; i++) {
            const entry = this.scene.add.text(10, 35 + (i * 18), '', {
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'Arial, sans-serif'
            });
            this.hudContainer!.add(entry);
            this.damageEntries.push(entry);
        }
    }

    show(): void {
        if (this.hudContainer) {
            this.hudContainer.setVisible(true);
            this.isVisible = true;
        }
    }

    hide(): void {
        if (this.hudContainer) {
            this.hudContainer.setVisible(false);
            this.isVisible = false;
        }
    }

    isShowing(): boolean {
        return this.isVisible;
    }

    updateDamageEntries(currentTime: number, state?: SharedGameState): void {
        if (!this.hudContainer || !this.isVisible) return;

        // Get recent damage entries
        const recentDamage = this.getRecentDamage(currentTime);
        
        // Sort by timestamp (most recent first)
        const sortedEntries = [...recentDamage].sort((a, b) => b.timestamp - a.timestamp);

        // Update damage entry texts
        for (let i = 0; i < this.damageEntries.length; i++) {
            const entry = this.damageEntries[i];
            
            if (i < sortedEntries.length) {
                const damageEntry = sortedEntries[i];
                
                // Format the damage entry text
                let attackType = '';
                if (damageEntry.damageSource === 'ability' && damageEntry.abilityName) {
                    attackType = `'${damageEntry.abilityName}'`;
                } else if (damageEntry.damageSource === 'auto-attack') {
                    attackType = 'Auto Attack';
                } else if (damageEntry.damageSource === 'burn') {
                    attackType = 'Burn';
                }
                
                // Calculate armor reduction percentage from stored original amount
                const reductionPercent = damageEntry.originalAmount > 0 
                    ? Math.round(((damageEntry.originalAmount - damageEntry.amount) / damageEntry.originalAmount) * 100)
                    : 0;
                
                const entryText = `${Math.round(damageEntry.amount)} ${attackType} from ${damageEntry.attackerName}`;
                
                // Use the stored wasKillingBlow flag instead of checking current state
                let reductionText = '';
                if (damageEntry.wasKillingBlow) {
                    reductionText = ' (killing blow)';
                } else if (reductionPercent > 0) {
                    reductionText = ` (${reductionPercent}% reduced)`;
                }
                
                entry.setText(entryText + reductionText);
                entry.setVisible(true);
                entry.setColor('#ffffff'); // All entries use white color
            } else {
                entry.setVisible(false);
            }
        }

        // Update total damage
        const totalDamage = recentDamage.reduce((total, entry) => total + entry.amount, 0);
        if (this.titleText) {
            const baseTitle = 'Damage Taken (last 15s)';
            const title = this.isDeathSummaryMode ? `${baseTitle} before death` : baseTitle;
            this.titleText.setText(title);
        }

        // Calculate damage breakdown
        let bulletDamage = 0;
        let abilityDamage = 0;
        
        recentDamage.forEach(entry => {
            if (entry.damageSource === 'auto-attack') {
                bulletDamage += entry.amount;
            } else if (entry.damageSource === 'ability') {
                abilityDamage += entry.amount;
            }
        });

        // Update breakdown text
        if (this.breakdownText && totalDamage > 0) {
            const bulletPercent = Math.round((bulletDamage / totalDamage) * 100);
            const abilityPercent = Math.round((abilityDamage / totalDamage) * 100);
            this.breakdownText.setText(`Total: ${Math.round(totalDamage)} • Bullet: ${bulletPercent}% • Ability: ${abilityPercent}%`);
            this.breakdownText.setVisible(true);
        } else if (this.breakdownText) {
            this.breakdownText.setVisible(false);
        }
    }

    /**
     * Processes damage events and tracks damage taken by the player
     */
    processDamageEvents(state: SharedGameState, playerHeroId?: string | null): void {
        if (!playerHeroId || this.isDeathSummaryMode) return;

        // Get the player's hero by ID
        const playerHero = state.combatants.get(playerHeroId);
        if (!playerHero) return;

        // Process damage events where the player was the target
        state.damageEvents.forEach(event => {
            if (event.targetId === playerHero.id) {
                // Use the same deduplication key format as GameScene
                const eventKey = `${event.sourceId}-${event.targetId}-${event.timestamp}`;
                
                // Skip if we've already processed this event
                if (this.processedDamageEvents.has(eventKey)) return;
                
                this.processedDamageEvents.add(eventKey);
                this.addDamageEntry(event, state);
            }
        });
    }

    /**
     * Adds a damage entry to the history
     */
    private addDamageEntry(event: DamageEvent, state: SharedGameState): void {
        const attacker = state.combatants.get(event.sourceId);
        if (!attacker) return;

        // Get damage source from event and ability name
        const damageSource = event.damageSource as 'auto-attack' | 'ability';
        const abilityName = this.getAbilityName(event, attacker, state);

        // Determine if this was a killing blow by checking if the target is dead
        let wasKillingBlow = false;
        if (this.playerSessionId) {
            const playerHero = Array.from(state.combatants.values()).find(c => 
                c.type === 'hero' && c.controller === this.playerSessionId
            );
            wasKillingBlow = !!(playerHero && playerHero.health <= 0);
        }

        const damageEntry: DamageEntry = {
            amount: event.amount,
            originalAmount: event.originalAmount,
            damageSource,
            attackerId: event.sourceId,
            attackerName: this.getCombatantName(attacker),
            timestamp: event.timestamp,
            abilityName,
            wasKillingBlow
        };

        this.damageHistory.push(damageEntry);
    }

    /**
     * Gets the ability name for ability damage at the time of damage
     * This is called once when the damage entry is created and never again
     */
    private getAbilityName(event: DamageEvent, attacker: any, state: SharedGameState): string | undefined {
        if (attacker.type !== 'hero') return undefined;
        
        // Get the ability type from the attacker's current ability at the time of damage
        const hero = attacker as any;
        if (hero.ability && hero.ability.type) {
            return hero.ability.type;
        }
        
        return undefined;
    }

    /**
     * Gets a display name for a combatant
     */
    private getCombatantName(combatant: any): string {
        if (combatant.type === 'hero') {
            // Use the hero's display name instead of truncated ID
            return combatant.displayName;
        } else if (combatant.type === 'minion') {
            return 'Minion';
        } else if (combatant.type === 'turret') {
            return 'Turret';
        } else if (combatant.type === 'cradle') {
            return 'Cradle';
        }
        return 'Unknown';
    }


    /**
     * Gets recent damage entries within the time window
     */
    private getRecentDamage(currentTime: number): DamageEntry[] {
        if (this.isDeathSummaryMode) {
            return this.deathSummaryHistory;
        }
        const cutoffTime = currentTime - this.maxHistoryTime;
        return this.damageHistory.filter(entry => entry.timestamp >= cutoffTime);
    }

    /**
     * Captures current damage history for death summary
     */
    captureDeathSummary(currentGameTime: number): void {
        const cutoffTime = currentGameTime - this.maxHistoryTime;
        this.deathSummaryHistory = this.damageHistory.filter(entry => entry.timestamp >= cutoffTime);
        this.isDeathSummaryMode = true;
    }

    /**
     * Clears death summary and returns to normal mode
     */
    clearDeathSummary(): void {
        this.deathSummaryHistory = [];
        this.isDeathSummaryMode = false;
    }

    /**
     * Returns true if currently in death summary mode
     */
    isInDeathSummaryMode(): boolean {
        return this.isDeathSummaryMode;
    }

    /**
     * Cleans up old damage entries and processed events
     */
    private cleanupOldEntries(): void {
        // Use the most recent damage entry timestamp as reference, or current time if no entries
        const currentTime = this.damageHistory.length > 0 
            ? Math.max(...this.damageHistory.map(entry => entry.timestamp))
            : Date.now();
        const cutoffTime = currentTime - this.maxHistoryTime;
        
        // Clean up old damage entries (older than 15 seconds)
        this.damageHistory = this.damageHistory.filter(entry => entry.timestamp >= cutoffTime);
        
        // Note: We don't clean up processedDamageEvents here because it can cause
        // the same damage events to be processed multiple times if the cleanup
        // removes events that are still in the damage history
    }

    /**
     * Clears all damage history and processed events
     */
    clear(): void {
        this.damageHistory = [];
        this.deathSummaryHistory = [];
        this.isDeathSummaryMode = false;
        this.processedDamageEvents.clear();
    }

    destroy(): void {
        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }
        this.background = null;
        this.titleText = null;
        this.breakdownText = null;
        this.damageEntries = [];
        this.clear();
    }
}
