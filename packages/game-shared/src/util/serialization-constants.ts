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
 * Bit positions (0-8, UInt16):
 * 0: timestamp
 * 1: waveNumber
 * 2: waveState
 * 3: phaseStartTime
 * 4: phaseDuration
 * 5: isFullState
 * 6: removedEntityIds (has removals)
 * 7: mapData (only sent on full state)
 * 8: votingState (sent during voting phase)
 */
export const GAME_STATE_BIT_TIMESTAMP = 1 << 0; // 0x0001
export const GAME_STATE_BIT_WAVE_NUMBER = 1 << 1; // 0x0002
export const GAME_STATE_BIT_WAVE_STATE = 1 << 2; // 0x0004
export const GAME_STATE_BIT_PHASE_START_TIME = 1 << 3; // 0x0008
export const GAME_STATE_BIT_PHASE_DURATION = 1 << 4; // 0x0010
export const GAME_STATE_BIT_IS_FULL_STATE = 1 << 5; // 0x0020
export const GAME_STATE_BIT_REMOVED_ENTITY_IDS = 1 << 6; // 0x0040
export const GAME_STATE_BIT_MAP_DATA = 1 << 7; // 0x0080
export const GAME_STATE_BIT_VOTING_STATE = 1 << 8; // 0x0100

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
  GAME_STATE_BIT_MAP_DATA,
  GAME_STATE_BIT_VOTING_STATE,
] as const;
