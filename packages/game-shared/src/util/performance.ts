/**
 * Performance timing utility that tracks running averages of code execution times.
 * Useful for identifying performance bottlenecks with more stable metrics than console.time.
 */
class PerformanceTimer {
  private timers: Map<
    string,
    {
      samples: number[];
      maxSamples: number;
      startTime: number | null;
    }
  > = new Map();

  private defaultMaxSamples = 60; // Default to 60 samples (1 second at 60fps)

  /**
   * Start timing a labeled section of code
   * @param label Unique identifier for this timer
   */
  start(label: string): void {
    if (!this.timers.has(label)) {
      this.timers.set(label, {
        samples: [],
        maxSamples: this.defaultMaxSamples,
        startTime: null,
      });
    }

    const timer = this.timers.get(label)!;
    timer.startTime = performance.now();
  }

  /**
   * End timing and record the sample
   * @param label Unique identifier for this timer
   */
  end(label: string): void {
    const endTime = performance.now();
    const timer = this.timers.get(label);

    if (!timer || timer.startTime === null) {
      console.warn(`Timer "${label}" was not started`);
      return;
    }

    const duration = endTime - timer.startTime;
    timer.samples.push(duration);

    // Keep only the most recent samples
    if (timer.samples.length > timer.maxSamples) {
      timer.samples.shift();
    }

    timer.startTime = null;
  }

  /**
   * Get the running average for a timer
   * @param label Unique identifier for the timer
   * @returns Average time in milliseconds, or null if no samples exist
   */
  getAverage(label: string): number | null {
    const timer = this.timers.get(label);
    if (!timer || timer.samples.length === 0) {
      return null;
    }

    const sum = timer.samples.reduce((acc, val) => acc + val, 0);
    return sum / timer.samples.length;
  }

  /**
   * Get the minimum time recorded
   * @param label Unique identifier for the timer
   * @returns Minimum time in milliseconds, or null if no samples exist
   */
  getMin(label: string): number | null {
    const timer = this.timers.get(label);
    if (!timer || timer.samples.length === 0) {
      return null;
    }

    return Math.min(...timer.samples);
  }

  /**
   * Get the maximum time recorded
   * @param label Unique identifier for the timer
   * @returns Maximum time in milliseconds, or null if no samples exist
   */
  getMax(label: string): number | null {
    const timer = this.timers.get(label);
    if (!timer || timer.samples.length === 0) {
      return null;
    }

    return Math.max(...timer.samples);
  }

  /**
   * Get the most recent sample
   * @param label Unique identifier for the timer
   * @returns Most recent time in milliseconds, or null if no samples exist
   */
  getLast(label: string): number | null {
    const timer = this.timers.get(label);
    if (!timer || timer.samples.length === 0) {
      return null;
    }

    return timer.samples[timer.samples.length - 1];
  }

  /**
   * Get statistics for a timer
   * @param label Unique identifier for the timer
   * @returns Object with avg, min, max, last, and sampleCount
   */
  getStats(label: string): {
    avg: number | null;
    min: number | null;
    max: number | null;
    last: number | null;
    sampleCount: number;
  } {
    const timer = this.timers.get(label);

    return {
      avg: this.getAverage(label),
      min: this.getMin(label),
      max: this.getMax(label),
      last: this.getLast(label),
      sampleCount: timer?.samples.length ?? 0,
    };
  }

  /**
   * Log statistics for a timer to the console
   * @param label Unique identifier for the timer
   */
  logStats(label: string): void {
    const stats = this.getStats(label);

    if (stats.sampleCount === 0) {
      console.log(`[${label}] No samples recorded`);
      return;
    }

    console.log(
      `[${label}] avg: ${stats.avg?.toFixed(3)}ms | min: ${stats.min?.toFixed(
        3
      )}ms | max: ${stats.max?.toFixed(3)}ms | last: ${stats.last?.toFixed(3)}ms | samples: ${
        stats.sampleCount
      }`
    );
  }

  /**
   * Set the maximum number of samples to keep for a timer
   * @param label Unique identifier for the timer
   * @param maxSamples Maximum number of samples to keep
   */
  setMaxSamples(label: string, maxSamples: number): void {
    if (!this.timers.has(label)) {
      this.timers.set(label, {
        samples: [],
        maxSamples,
        startTime: null,
      });
    } else {
      const timer = this.timers.get(label)!;
      timer.maxSamples = maxSamples;

      // Trim samples if needed
      if (timer.samples.length > maxSamples) {
        timer.samples = timer.samples.slice(timer.samples.length - maxSamples);
      }
    }
  }

  /**
   * Reset a timer's samples
   * @param label Unique identifier for the timer
   */
  reset(label: string): void {
    const timer = this.timers.get(label);
    if (timer) {
      timer.samples = [];
      timer.startTime = null;
    }
  }

  /**
   * Reset all timers
   */
  resetAll(): void {
    this.timers.clear();
  }
}

// Export a singleton instance for convenience
export const perfTimer = new PerformanceTimer();
