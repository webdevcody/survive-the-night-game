declare class Profiler {
    private session;
    private enabled;
    private callCount;
    private maxProfiles;
    constructor();
    /**
     * Enable profiling for future profileFunction calls
     */
    enable(): void;
    /**
     * Disable profiling
     */
    disable(): void;
    /**
     * Start CPU profiling using Node.js Inspector API
     */
    start(): void;
    /**
     * Stop CPU profiling and save to file (async)
     */
    stop(filename?: string): Promise<void>;
    /**
     * Profile a synchronous function call and save the results
     * Only profiles if enabled via enable() or ENABLE_PROFILING env var
     * Limits profiling to MAX_PROFILES (default: 1) to avoid creating too many files
     */
    profileFunctionSync<T>(fn: () => T, filename?: string): T;
    /**
     * Profile an async function call and save the results
     */
    profileFunction<T>(fn: () => T | Promise<T>, filename?: string): Promise<T>;
}
export declare const profiler: Profiler;
export {};
