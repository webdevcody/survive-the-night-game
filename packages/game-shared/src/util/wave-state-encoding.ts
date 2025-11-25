import { WaveState } from "../types/wave";

/**
 * Wave State encoding using sequential IDs.
 * Each wave state is assigned a unique sequential ID (0-255).
 * This allows encoding wave states as uint8 instead of strings.
 */

// Sequential IDs for each wave state (0-255)
export const WAVE_STATE_IDS: Record<WaveState, number> = {
  [WaveState.PREPARATION]: 0,
  [WaveState.ACTIVE]: 1,
  [WaveState.COMPLETED]: 2,
} as const;

// Reverse lookup: ID -> wave state
const ID_TO_WAVE_STATE: Record<number, WaveState> = {
  0: WaveState.PREPARATION,
  1: WaveState.ACTIVE,
  2: WaveState.COMPLETED,
};

/**
 * Encode a wave state to a uint8 ID.
 * @param state The wave state
 * @returns Encoded uint8 value (0-255)
 */
export function encodeWaveState(state: WaveState): number {
  const id = WAVE_STATE_IDS[state];
  if (id === undefined) {
    throw new Error(`Unknown wave state: ${state}`);
  }
  return id;
}

/**
 * Decode a uint8 ID to a wave state.
 * @param encoded The encoded uint8 value
 * @returns The wave state
 */
export function decodeWaveState(encoded: number): WaveState {
  if (encoded < 0 || encoded > 255) {
    throw new Error(`Invalid encoded wave state: ${encoded} (must be 0-255)`);
  }

  const state = ID_TO_WAVE_STATE[encoded];
  if (!state) {
    throw new Error(`No wave state found for ID: ${encoded}`);
  }

  return state;
}
