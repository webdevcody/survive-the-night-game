export const TICK_RATE = 20;

export const PERFORMANCE_LOG_INTERVAL = 5000;
export const TICK_RATE_MS = 1000 / TICK_RATE;

// Performance monitoring - disabled by default for production safety
export const ENABLE_PERFORMANCE_MONITORING = process.env.ENABLE_PERFORMANCE_MONITORING === "true";

