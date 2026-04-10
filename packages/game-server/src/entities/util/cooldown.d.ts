export declare class Cooldown {
    private timeRemaining;
    private duration;
    constructor(duration: number, startReady?: boolean);
    setAsReady(): void;
    update(deltaTime: number): void;
    reset(): void;
    /**
     * Sets the time remaining to a specific value (useful for offsetting cooldowns)
     */
    setTimeRemaining(timeRemaining: number): void;
    isReady(): boolean;
    getRemainingTime(): number;
}
