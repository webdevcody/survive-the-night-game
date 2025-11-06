/**
 * ========================================================================
 * NETWORK CONFIGURATION
 * ========================================================================
 *
 * Controls network behavior and simulation.
 * ========================================================================
 */

const FASTEST_NETWORK_LATENCY_MS = 25;
const FAST_NETWORK_LATENCY_MS = 50;
const SLOW_NETWORK_LATENCY_MS = 100;
const SLOWEST_NETWORK_LATENCY_MS = 150;

export const SIMULATED_LATENCY_MS = FASTEST_NETWORK_LATENCY_MS; // Artificial network delay for testing (0 = none)
