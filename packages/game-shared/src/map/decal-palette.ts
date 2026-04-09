/**
 * World map `decals` layer tile IDs (editor overlay + server campsite placement).
 */
export const DECAL_TILE_NONE = 0;
export const DECAL_TILE_CAMPSITE = 1;

export interface DecalPaletteEntry {
  id: number;
  label: string;
  /** CSS color for editor buttons / overlay tint */
  color: string;
}

export const DECAL_PALETTE_ENTRIES: readonly DecalPaletteEntry[] = [
  { id: DECAL_TILE_NONE, label: "None", color: "transparent" },
  { id: DECAL_TILE_CAMPSITE, label: "Campsite", color: "rgba(251, 191, 36, 0.45)" },
] as const;
