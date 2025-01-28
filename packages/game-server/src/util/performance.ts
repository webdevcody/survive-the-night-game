import { getStats } from "./math";

export class PerformanceTracker {
  private trackMap: Map<string, number[]>;
  private trackMapStart: Map<string, number>;

  constructor() {
    this.trackMap = new Map();
    this.trackMapStart = new Map();
  }

  public trackStart(key: string) {
    if (!this.trackMapStart.has(key)) {
      this.trackMapStart.set(key, performance.now());
    } else {
      throw new Error("Track already started");
    }
  }

  public trackEnd(key: string) {
    const start = this.trackMapStart.get(key);

    if (start === undefined) {
      throw new Error("Track not started");
    }

    this.trackMap.set(key, [...(this.trackMap.get(key) ?? []), performance.now() - start]);
    this.trackMapStart.delete(key);
  }

  public printAllStats() {
    for (const key of this.trackMap.keys()) {
      this.printStats(key);
    }
  }

  public printStats(key: string) {
    const numbers = this.trackMap.get(key) ?? [];
    console.log(key);
    console.log(getStats(numbers));
  }
}
