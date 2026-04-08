/**
 * Interface for environmental event strategies
 */
export interface IEnvironmentalEventStrategy {
  /**
   * Called on each periodic cycle (replaces former wave-complete hook)
   */
  onPeriodicRoll(completedCycleIndex: number): void;

  /**
   * Called every tick to update the event
   */
  update(deltaTime: number): void;

  /**
   * Check if this event is currently active
   */
  isActive(): boolean;

  /**
   * End the event
   */
  end(): void;
}
