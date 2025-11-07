/**
 * ========================================================================
 * NETWORK CONFIGURATION
 * ========================================================================
 *
 * Controls network behavior and simulation.
 * ========================================================================
 */

const NONE_NETWORK_LATENCY_MS = 0;
const FASTEST_NETWORK_LATENCY_MS = 25;
const FAST_NETWORK_LATENCY_MS = 50;
const SLOW_NETWORK_LATENCY_MS = 100;
const SLOWEST_NETWORK_LATENCY_MS = 150;

export const networkConfig = {
  /**
   * Simulated network latency in milliseconds
   */
  SIMULATED_LATENCY_MS: NONE_NETWORK_LATENCY_MS,
} as const;

export type NetworkConfig = typeof networkConfig;
