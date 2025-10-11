import Phaser from 'phaser';
import { HUDContainer } from './HUDContainer';
import { DamageEvent } from '../../shared/types/CombatantTypes';
import { SharedGameState } from '../../shared/types/GameStateTypes';
import { CLIENT_CONFIG } from '../../ClientConfig';

export interface DamageDealtEntry {
    amount: number; // final damage after target's armor reduction
    originalAmount: number; // original damage before target's armor reduction
    damageSource: 'auto-attack' | 'ability' | 'burn';
    targetId: string;
    targetName: string;
    timestamp: number;
    abilityName?: string; // For ability damage, the specific ability name
    wasKillingBlow?: boolean; // Whether this damage entry was a killing blow
}

export class DamageDealtOverlay {
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
    private damageHistory: DamageDealtEntry[] = [];
    private deathSummaryHistory: DamageDealtEntry[] = []; // Frozen damage history for death summary
    private isDeathSummaryMode: boolean = false;
    private readonly maxHistoryTime = 15000; // 15 seconds in milliseconds
    private playerSessionId: string | null = null;
    private processedDamageEvents: Set<string> = new Set();

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

        // Position on the right side of the screen, vertically centered
        this.hudContainer.setPosition(CLIENT_CONFIG.GAME_CANVAS_WIDTH - 320, CLIENT_CONFIG.GAME_CANVAS_HEIGHT / 2 - 150);

        // Create semi-transparent background
        this.background = this.scene.add.graphics();
        this.background.fillStyle(0x000000, 0.7);
        this.background.fillRoundedRect(0, 0, 300, 300, 8);
        this.hudContainer.add(this.background);

        // Create title (will be updated dynamically)
        this.titleText = this.scene.add.text(10, 10, '', {
            fontSize: '16px',
            color: '#6bff6b', // Green color to distinguish from damage taken (red)
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
        });
        this.hudContainer.add(this.titleText);

        // Create damage entries container
        this.createDamageEntries();
        
        // Create breakdown text at the bottom
        this.breakdownText = this.scene.add.text(10, 275, '', {
            fontSize: '15px',
            color: '#ffffff',
            fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY,
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
                fontSize: '15px',
                color: '#ffffff',
                fontFamily: CLIENT_CONFIG.UI.FONTS.PRIMARY
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
                
                const entryText = `${Math.round(damageEntry.amount)} ${attackType} to ${damageEntry.targetName}`;
                
                // Use the stored wasKillingBlow flag instead of checking current state
                let reductionText = '';
                if (damageEntry.wasKillingBlow) {
                    reductionText = ' (kill)';
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
            const baseTitle = 'Damage Dealt (last 15s)';
            const title = this.isDeathSummaryMode ? `${baseTitle} before death` : baseTitle;
            this.titleText.setText(title);
            // Use smaller font for death summary (longer text), larger for regular
            this.titleText.setFontSize(this.isDeathSummaryMode ? 16 : 18);
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
     * Processes damage events and tracks damage dealt by the player
     */
    processDamageEvents(state: SharedGameState, playerHeroId?: string | null): void {
        if (!playerHeroId || this.isDeathSummaryMode) return;

        // Get the player's hero by ID
        const playerHero = state.combatants.get(playerHeroId);
        if (!playerHero) return;

        // Process damage events where the player was the source
        state.damageEvents.forEach(event => {
            if (event.sourceId === playerHero.id) {
                // Use the same deduplication key format as GameScene
                const eventKey = `${event.sourceId}-${event.targetId}-${event.timestamp}`;
                
                // Skip if we've already processed this event
                if (this.processedDamageEvents.has(eventKey)) return;
                
                this.processedDamageEvents.add(eventKey);
                
                // Prevent unbounded growth - clear if too large
                if (this.processedDamageEvents.size > 1000) {
                    this.processedDamageEvents.clear();
                }
                
                this.addDamageEntry(event, state);
            }
        });
    }

    /**
     * Adds a damage entry to the history
     */
    private addDamageEntry(event: DamageEvent, state: SharedGameState): void {
        const target = state.combatants.get(event.targetId);
        
        // If target is not found, it was likely killed and removed - use event data
        const targetName = target ? this.getCombatantName(target) : this.getCombatantNameFromEvent(event);
        const wasKillingBlow = !target || target.health <= 0;

        // Get damage source from event and ability name
        const damageSource = event.damageSource as 'auto-attack' | 'ability';
        const abilityName = this.getAbilityName(event, state);

        const damageEntry: DamageDealtEntry = {
            amount: event.amount,
            originalAmount: event.originalAmount,
            damageSource,
            targetId: event.targetId,
            targetName,
            timestamp: event.timestamp,
            abilityName,
            wasKillingBlow
        };

        this.damageHistory.push(damageEntry);
    }

    /**
     * Gets the ability name for ability damage at the time of damage
     */
    private getAbilityName(event: DamageEvent, state: SharedGameState): string | undefined {
        if (!this.playerSessionId) return undefined;
        
        const playerHero = Array.from(state.combatants.values()).find(c => 
            c.type === 'hero' && c.controller === this.playerSessionId
        );
        
        if (playerHero && playerHero.type === 'hero' && (playerHero as any).ability && (playerHero as any).ability.type) {
            return (playerHero as any).ability.type;
        }
        
        return undefined;
    }

    /**
     * Gets a display name for a combatant
     */
    private getCombatantName(combatant: any): string {
        if (combatant.type === 'hero') {
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
     * Gets a display name for a combatant from damage event data
     * Used when the target has been removed from the game state
     */
    private getCombatantNameFromEvent(event: DamageEvent): string {
        if (event.targetType === 'hero') {
            return 'Hero';
        } else if (event.targetType === 'minion') {
            return 'Minion';
        } else if (event.targetType === 'turret') {
            return 'Turret';
        } else if (event.targetType === 'cradle') {
            return 'Cradle';
        }
        return 'Unknown';
    }

    /**
     * Gets recent damage entries within the time window
     */
    private getRecentDamage(currentTime: number): DamageDealtEntry[] {
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
