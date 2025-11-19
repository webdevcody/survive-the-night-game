/**
 * Constants for entity field type serialization
 * These values are used to encode the type of a serialized field value
 */
export const FIELD_TYPE_STRING = 0;
export const FIELD_TYPE_NUMBER = 1;
export const FIELD_TYPE_BOOLEAN = 2;
export const FIELD_TYPE_OBJECT = 3;
export const FIELD_TYPE_NULL = 4;

/**
 * Bitset flags for game state fields
 * Used to track which game state fields have changed and need to be serialized
 * Bit positions (0-7):
 * 0: timestamp
 * 1: waveNumber
 * 2: waveState
 * 3: phaseStartTime
 * 4: phaseDuration
 * 5: isFullState
 * 6: removedEntityIds (has removals)
 * 7: reserved
 */
export const GAME_STATE_BIT_TIMESTAMP = 1 << 0; // 0x01
export const GAME_STATE_BIT_WAVE_NUMBER = 1 << 1; // 0x02
export const GAME_STATE_BIT_WAVE_STATE = 1 << 2; // 0x04
export const GAME_STATE_BIT_PHASE_START_TIME = 1 << 3; // 0x08
export const GAME_STATE_BIT_PHASE_DURATION = 1 << 4; // 0x10
export const GAME_STATE_BIT_IS_FULL_STATE = 1 << 5; // 0x20
export const GAME_STATE_BIT_REMOVED_ENTITY_IDS = 1 << 6; // 0x40

/**
 * Array of game state field bits in deterministic order for serialization/deserialization
 * This ensures both client and server iterate through fields in the same order
 */
export const GAME_STATE_FIELD_BITS = [
  GAME_STATE_BIT_TIMESTAMP,
  GAME_STATE_BIT_WAVE_NUMBER,
  GAME_STATE_BIT_WAVE_STATE,
  GAME_STATE_BIT_PHASE_START_TIME,
  GAME_STATE_BIT_PHASE_DURATION,
  GAME_STATE_BIT_IS_FULL_STATE,
  GAME_STATE_BIT_REMOVED_ENTITY_IDS,
] as const;
