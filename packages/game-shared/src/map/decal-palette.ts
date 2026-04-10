/**
 * World map `decals` layer tile IDs (editor overlay + server campsite placement).
 */
export const DECAL_TILE_NONE = 0;
export const DECAL_TILE_CAMPSITE = 1;
/** Invisible in-game light source (torch-equivalent radius); editor-only tint. */
export const DECAL_TILE_LIGHT = 2;
/** Interactable sign; message text is stored in world-map `messageDecals`. */
export const DECAL_TILE_MESSAGE = 3;

export interface DecalPaletteEntry {
  id: number;
  label: string;
  /** CSS color for editor buttons / overlay tint */
  color: string;
}

export const DECAL_PALETTE_ENTRIES: readonly DecalPaletteEntry[] = [
  { id: DECAL_TILE_NONE, label: "None", color: "transparent" },
  { id: DECAL_TILE_CAMPSITE, label: "Campsite", color: "rgba(251, 191, 36, 0.45)" },
  { id: DECAL_TILE_LIGHT, label: "Light", color: "rgba(253, 224, 71, 0.4)" },
  { id: DECAL_TILE_MESSAGE, label: "Message", color: "rgba(147, 197, 253, 0.45)" },
] as const;
