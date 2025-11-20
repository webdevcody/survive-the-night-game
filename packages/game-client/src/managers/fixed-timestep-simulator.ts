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
  private lastTime: number = performance.now();

  constructor(fixedTimestep: number) {
    this.FIXED_TIMESTEP = fixedTimestep;
  }

  /**
   * Update simulation using fixed timestep
   * @param updateCallback - Called with fixed deltaTime (always FIXED_TIMESTEP)
   * @param deltaTimeSeconds - Optional frame delta time in seconds. If not provided, calculates internally.
   *                           This allows the caller to pass a more accurate delta time (e.g., from requestAnimationFrame).
   * @returns Number of simulation steps processed
   */
  update(updateCallback: (deltaTime: number) => void, deltaTimeSeconds?: number): number {
    let frameTime: number;
    
    if (deltaTimeSeconds !== undefined) {
      // Use provided delta time (more accurate, especially at low FPS)
      frameTime = deltaTimeSeconds;
    } else {
      // Fallback: calculate delta time internally
      const currentTime = performance.now();
      frameTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
      this.lastTime = currentTime;
    }

    // Clamp frameTime to prevent large jumps (e.g., tab switch)
    // Increased max steps from 5 to 10 to handle lower FPS better (allows up to 0.5 seconds catch-up)
    const clampedFrameTime = Math.min(frameTime, this.FIXED_TIMESTEP * 10);

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
    this.lastTime = performance.now();
  }
}

