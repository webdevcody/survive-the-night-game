export declare class PerformanceTracker {
    private trackMap;
    private trackMapStart;
    constructor();
    trackStart(key: string): void;
    trackEnd(key: string): void;
    printAllStats(): void;
    printStats(key: string): void;
}
