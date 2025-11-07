/**
 * Fixed timestep simulator for consistent physics simulation
 *
 * Ensures client and server use the same timestep for physics calculations,
 * regardless of rendering frame rate. This prevents speed inconsistencies
 * and drift accumulation.
 */
export class FixedTimestepSimulator {
  private readonly FIXED_TIMESTEP: number;
  private accumulator: number = 0;
  private lastTime: number = Date.now();

  constructor(fixedTimestep: number) {
    this.FIXED_TIMESTEP = fixedTimestep;
  }

  /**
   * Update simulation using fixed timestep
   * @param updateCallback - Called with fixed deltaTime (always FIXED_TIMESTEP)
   * @returns Number of simulation steps processed
   */
  update(updateCallback: (deltaTime: number) => void): number {
    const currentTime = Date.now();
    const frameTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Clamp frameTime to prevent large jumps (e.g., tab switch)
    const clampedFrameTime = Math.min(frameTime, this.FIXED_TIMESTEP * 5); // Max 5 steps

    // Accumulate time
    this.accumulator += clampedFrameTime;

    // Process fixed timesteps
    let steps = 0;
    while (this.accumulator >= this.FIXED_TIMESTEP) {
      updateCallback(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
      steps++;
    }

    return steps;
  }

  /**
   * Get interpolation alpha for smooth rendering
   * Alpha represents how far through the current timestep we are
   */
  getInterpolationAlpha(): number {
    return this.accumulator / this.FIXED_TIMESTEP;
  }

  /**
   * Reset the simulator (useful for reconnection or restart)
   */
  reset(): void {
    this.accumulator = 0;
    this.lastTime = Date.now();
  }
}

