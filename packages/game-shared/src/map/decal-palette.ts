/**
 * World map `decals` layer tile IDs (editor overlay + server entity placement).
 */
export const DECAL_TILE_NONE = 0;
export const DECAL_TILE_CAMPSITE = 1;
/** Invisible in-game light source (torch-equivalent radius); editor-only tint. */
export const DECAL_TILE_LIGHT = 2;
/** Interactable sign; message text is stored in world-map `messageDecals`. */
export const DECAL_TILE_MESSAGE = 3;
/** Crafting station: Workbench (Scavenging, Scrapping, Crafting, Tailoring). */
export const DECAL_TILE_WORKBENCH = 4;
/** Crafting station: Forge (Gunsmithing, Engineering). */
export const DECAL_TILE_FORGE = 5;
/** Crafting station: Chemistry Table (Chemistry). */
export const DECAL_TILE_CHEMISTRY_TABLE = 6;

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
  { id: DECAL_TILE_WORKBENCH, label: "Workbench", color: "rgba(180, 130, 70, 0.5)" },
  { id: DECAL_TILE_FORGE, label: "Forge", color: "rgba(239, 68, 68, 0.45)" },
  { id: DECAL_TILE_CHEMISTRY_TABLE, label: "Chem Table", color: "rgba(52, 211, 153, 0.45)" },
] as const;
