/**
 * ========================================================================
 * WAVE SYSTEM TYPES
 * ========================================================================
 * Types for the wave-based zombie spawning system
 */

/**
 * Wave state enum representing the current phase of the wave system
 */
export enum WaveState {
  /** Preparation phase - time between waves, players can prepare */
  PREPARATION = "PREPARATION",

  /** Wave active - zombies are spawning and attacking */
  ACTIVE = "ACTIVE",

  /** Wave completed - all zombies killed, transitioning to preparation */
  COMPLETED = "COMPLETED",
}

/**
 * Wave information data structure
 */
export interface WaveInfo {
  /** Current wave number (starts at 1) */
  waveNumber: number;

  /** Current wave state */
  waveState: WaveState;

  /** Timestamp when current phase started (ms) */
  phaseStartTime: number;

  /** Duration of current phase in seconds */
  phaseDuration: number;

  /** Number of zombies remaining in current wave (0 during preparation) */
  zombiesRemaining?: number;

  /** Total number of zombies in current wave */
  totalZombies?: number;
}
