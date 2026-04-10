import { getStats } from "./math";
export class PerformanceTracker {
    constructor() {
        this.trackMap = new Map();
        this.trackMapStart = new Map();
    }
    trackStart(key) {
        if (!this.trackMapStart.has(key)) {
            this.trackMapStart.set(key, performance.now());
        }
        else {
            throw new Error("Track already started");
        }
    }
    trackEnd(key) {
        var _a;
        const start = this.trackMapStart.get(key);
        if (start === undefined) {
            throw new Error("Track not started");
        }
        this.trackMap.set(key, [...((_a = this.trackMap.get(key)) !== null && _a !== void 0 ? _a : []), performance.now() - start]);
        this.trackMapStart.delete(key);
    }
    printAllStats() {
        for (const key of this.trackMap.keys()) {
            this.printStats(key);
        }
    }
    printStats(key) {
        var _a;
        const numbers = (_a = this.trackMap.get(key)) !== null && _a !== void 0 ? _a : [];
        console.log(key);
        console.log(getStats(numbers));
    }
}
