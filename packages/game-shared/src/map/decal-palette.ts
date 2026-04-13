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
/** Personal bank locker (spawned entity + interact). */
export const DECAL_TILE_LOCKER = 7;
/** Spawns a merchant (shop) entity at this tile; client draws `COLLIDABLE_TILE_MERCHANT` from collidables.png. */
export const DECAL_TILE_SHOPKEEPER = 8;
/** Global auction house interactable (uses locker art on client). */
export const DECAL_TILE_AUCTION_HOUSE = 9;

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
  { id: DECAL_TILE_LOCKER, label: "Locker", color: "rgba(148, 163, 184, 0.5)" },
  { id: DECAL_TILE_SHOPKEEPER, label: "Shopkeeper", color: "rgba(196, 181, 253, 0.5)" },
  { id: DECAL_TILE_AUCTION_HOUSE, label: "Auction", color: "rgba(250, 204, 21, 0.45)" },
] as const;

/** Short text drawn inside each decal cell in the map editor (message tiles use line preview instead). */
const DECAL_TILE_SHORT: Record<number, string> = {
  [DECAL_TILE_NONE]: "",
  [DECAL_TILE_CAMPSITE]: "CAMP",
  [DECAL_TILE_LIGHT]: "LITE",
  [DECAL_TILE_MESSAGE]: "",
  [DECAL_TILE_WORKBENCH]: "WORK",
  [DECAL_TILE_FORGE]: "FORG",
  [DECAL_TILE_CHEMISTRY_TABLE]: "CHEM",
  [DECAL_TILE_LOCKER]: "BNK",
  [DECAL_TILE_SHOPKEEPER]: "SHOP",
  [DECAL_TILE_AUCTION_HOUSE]: "AH",
};

/**
 * Fixed short label for editor overlay (empty for {@link DECAL_TILE_MESSAGE} — use first line of * `messageDecals` for that cell).
 */
export function getDecalPaletteShortLabel(decalTileId: number): string {
  if (decalTileId <= 0) return "";
  return DECAL_TILE_SHORT[decalTileId] ?? "";
}
