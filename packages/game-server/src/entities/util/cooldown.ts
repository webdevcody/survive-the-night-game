export class Cooldown {
  private timeRemaining: number = 0;
  private duration: number;

  constructor(duration: number, startReady = false) {
    this.duration = duration;
    if (startReady) {
      this.setAsReady();
    } else {
      this.reset();
    }
  }

  setAsReady() {
    this.timeRemaining = 0;
  }

  update(deltaTime: number): void {
    this.timeRemaining = Math.max(0, this.timeRemaining - deltaTime);
  }

  reset(): void {
    this.timeRemaining = this.duration;
  }

  /**
   * Sets the time remaining to a specific value (useful for offsetting cooldowns)
   */
  setTimeRemaining(timeRemaining: number): void {
    this.timeRemaining = Math.max(0, Math.min(timeRemaining, this.duration));
  }

  isReady(): boolean {
    return this.timeRemaining <= 0;
  }
}
