/**
 * Utility class for managing player name persistence in localStorage
 */
export class PlayerNameStorage {
    private static readonly STORAGE_KEY = 'aramio_player_name';
    private static readonly MAX_NAME_LENGTH = 20; // Reasonable limit for display names

    /**
     * Save player name to localStorage
     * @param name The player name to save
     */
    static savePlayerName(name: string): void {
        if (!name || typeof name !== 'string') {
            return;
        }

        // Trim and validate name length
        const trimmedName = name.trim();
        if (trimmedName.length === 0 || trimmedName.length > this.MAX_NAME_LENGTH) {
            return;
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, trimmedName);
            console.log(`Saved player name: ${trimmedName}`);
        } catch (error) {
            console.warn('Failed to save player name to localStorage:', error);
        }
    }

    /**
     * Get player name from localStorage
     * @returns The saved player name, or null if none exists
     */
    static getPlayerName(): string | null {
        try {
            const name = localStorage.getItem(this.STORAGE_KEY);
            if (name && name.trim().length > 0) {
                return name.trim();
            }
            return null;
        } catch (error) {
            console.warn('Failed to get player name from localStorage:', error);
            return null;
        }
    }

    /**
     * Clear the saved player name from localStorage
     */
    static clearPlayerName(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('Cleared player name from localStorage');
        } catch (error) {
            console.warn('Failed to clear player name from localStorage:', error);
        }
    }

    /**
     * Check if a player name exists in localStorage
     * @returns True if a name exists, false otherwise
     */
    static hasPlayerName(): boolean {
        return this.getPlayerName() !== null;
    }

    /**
     * Get the maximum allowed name length
     * @returns Maximum name length
     */
    static getMaxNameLength(): number {
        return this.MAX_NAME_LENGTH;
    }
}
