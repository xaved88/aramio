export type ControlMode = 'mouse' | 'keyboard' | 'moba';

export class ControlModeStorage {
    private static readonly STORAGE_KEY = 'aramio_control_mode';

    static saveControlMode(mode: ControlMode): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, mode);
        } catch (error) {
            console.warn('Failed to save control mode:', error);
        }
    }

    static getControlMode(): ControlMode {
        try {
            const mode = localStorage.getItem(this.STORAGE_KEY);
            return (mode === 'keyboard' || mode === 'mouse' || mode === 'moba') ? mode : 'keyboard';
        } catch (error) {
            console.warn('Failed to load control mode:', error);
            return 'keyboard';
        }
    }
}

