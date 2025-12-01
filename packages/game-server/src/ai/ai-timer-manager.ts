/**
 * Centralized timer management for AI controllers
 * Tracks all timers used by AI decision-making and behavior
 */
export class AITimerManager {
  // Timers
  public decisionTimer: number = 0;
  public pathRecalcTimer: number = 0;
  public interactTimer: number = 0;
  public stuckCheckTimer: number = 0;
  public fireTimer: number = 0;
  public retargetTimer: number = 0;
  public reactionTimer: number = 0; // Slight delay for humanlike reactions
  public inventoryManagementTimer: number = 0; // Timer for dropping useless ammo

  /**
   * Update all timers by deltaTime
   */
  update(deltaTime: number): void {
    this.decisionTimer += deltaTime;
    this.pathRecalcTimer += deltaTime;
    this.interactTimer += deltaTime;
    this.stuckCheckTimer += deltaTime;
    this.fireTimer += deltaTime;
    this.retargetTimer += deltaTime;
    this.inventoryManagementTimer += deltaTime;

    // Update reaction timer (counts down)
    if (this.reactionTimer > 0) {
      this.reactionTimer -= deltaTime;
    }
  }

  /**
   * Reset a specific timer
   */
  reset(timerName: keyof AITimerManager): void {
    if (typeof this[timerName] === "number") {
      (this[timerName] as number) = 0;
    }
  }

  /**
   * Reset all timers
   */
  resetAll(): void {
    this.decisionTimer = 0;
    this.pathRecalcTimer = 0;
    this.interactTimer = 0;
    this.stuckCheckTimer = 0;
    this.fireTimer = 0;
    this.retargetTimer = 0;
    this.reactionTimer = 0;
    this.inventoryManagementTimer = 0;
  }
}
