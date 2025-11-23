/**
 * Interface for environmental event strategies
 */
export interface IEnvironmentalEventStrategy {
  /**
   * Called when a wave completes
   */
  onWaveComplete(completedWaveNumber: number): void;

  /**
   * Called when a wave starts
   */
  onWaveStart(): void;

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
