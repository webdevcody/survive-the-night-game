import * as inspector from "inspector";
import * as fs from "fs";
import * as path from "path";
class Profiler {
    constructor() {
        this.session = null;
        this.enabled = process.env.ENABLE_PROFILING === "true";
        this.callCount = 0;
        this.maxProfiles = parseInt(process.env.MAX_PROFILES || "1", 10);
        if (this.enabled) {
            console.log(`CPU Profiling is ENABLED. Will create up to ${this.maxProfiles} profile(s). Profiles will be saved to the project root.`);
        }
    }
    /**
     * Enable profiling for future profileFunction calls
     */
    enable() {
        this.enabled = true;
        console.log("CPU Profiling enabled");
    }
    /**
     * Disable profiling
     */
    disable() {
        this.enabled = false;
    }
    /**
     * Start CPU profiling using Node.js Inspector API
     */
    start() {
        if (this.session) {
            console.warn("Profiling already started");
            return;
        }
        this.session = new inspector.Session();
        this.session.connect();
        this.session.post("Profiler.enable");
        this.session.post("Profiler.start");
        console.log("CPU profiling started");
    }
    /**
     * Stop CPU profiling and save to file (async)
     */
    stop(filename) {
        return new Promise((resolve, reject) => {
            if (!this.session) {
                console.warn("No active profiling session");
                resolve();
                return;
            }
            this.session.post("Profiler.stop", (err, params) => {
                var _a, _b;
                if (err) {
                    console.error("Error stopping profiler:", err);
                    reject(err);
                    return;
                }
                const profileFilename = filename || `profile-${Date.now()}.cpuprofile`;
                const profilePath = path.join(process.cwd(), profileFilename);
                fs.writeFileSync(profilePath, JSON.stringify(params.profile));
                console.log(`Profile saved to ${profilePath}`);
                (_a = this.session) === null || _a === void 0 ? void 0 : _a.post("Profiler.disable");
                (_b = this.session) === null || _b === void 0 ? void 0 : _b.disconnect();
                this.session = null;
                resolve();
            });
        });
    }
    /**
     * Profile a synchronous function call and save the results
     * Only profiles if enabled via enable() or ENABLE_PROFILING env var
     * Limits profiling to MAX_PROFILES (default: 1) to avoid creating too many files
     */
    profileFunctionSync(fn, filename) {
        if (!this.enabled) {
            return fn();
        }
        // If we've already created the max number of profiles, just execute without profiling
        if (this.callCount >= this.maxProfiles) {
            return fn();
        }
        // If session already exists, just execute (profiling is already running continuously)
        if (this.session) {
            return fn();
        }
        // Start profiling for this function call
        this.callCount++;
        const profileFilename = filename || `profile-call-${this.callCount}-${Date.now()}.cpuprofile`;
        console.log(`Profiling call ${this.callCount}/${this.maxProfiles}...`);
        this.start();
        try {
            const result = fn();
            // Stop profiling and save after function completes
            this.stop(profileFilename).catch((err) => {
                console.error("Error saving profile:", err);
            });
            return result;
        }
        catch (error) {
            // Stop profiling even on error
            this.stop(profileFilename).catch((err) => {
                console.error("Error saving profile:", err);
            });
            throw error;
        }
    }
    /**
     * Profile an async function call and save the results
     */
    async profileFunction(fn, filename) {
        if (!this.enabled) {
            const result = fn();
            return result instanceof Promise ? result : Promise.resolve(result);
        }
        this.start();
        try {
            const result = fn();
            // Handle both sync and async functions
            if (result instanceof Promise) {
                const asyncResult = await result;
                await this.stop(filename);
                return asyncResult;
            }
            await this.stop(filename);
            return result;
        }
        catch (error) {
            await this.stop(filename);
            throw error;
        }
    }
}
export const profiler = new Profiler();
