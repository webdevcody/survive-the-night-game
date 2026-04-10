export class Cooldown {
    constructor(duration, startReady = false) {
        this.timeRemaining = 0;
        this.duration = duration;
        if (startReady) {
            this.setAsReady();
        }
        else {
            this.reset();
        }
    }
    setAsReady() {
        this.timeRemaining = 0;
    }
    update(deltaTime) {
        this.timeRemaining = Math.max(0, this.timeRemaining - deltaTime);
    }
    reset() {
        this.timeRemaining = this.duration;
    }
    /**
     * Sets the time remaining to a specific value (useful for offsetting cooldowns)
     */
    setTimeRemaining(timeRemaining) {
        this.timeRemaining = Math.max(0, Math.min(timeRemaining, this.duration));
    }
    isReady() {
        return this.timeRemaining <= 0;
    }
    getRemainingTime() {
        return this.timeRemaining;
    }
}
