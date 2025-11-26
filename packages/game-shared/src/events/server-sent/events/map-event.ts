/**
 * Map data structure used in full game state updates.
 * Map data is now sent as part of the GAME_STATE_UPDATE event rather than a separate MAP event.
 */
export interface MapData {
  ground: number[][];
  collidables: number[][];
  biomePositions?: {
    campsite: { x: number; y: number };
    farm?: { x: number; y: number };
    gasStation?: { x: number; y: number };
    city?: { x: number; y: number };
    dock?: { x: number; y: number };
    shed?: { x: number; y: number };
    merchants?: Array<{ x: number; y: number }>;
  };
}
