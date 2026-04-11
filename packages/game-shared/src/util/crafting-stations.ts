export const CRAFTING_STATION_IDS = [
  "workbench",
  "forge",
  "chemistry_table",
  "campfire",
] as const;

export type CraftingStationId = (typeof CRAFTING_STATION_IDS)[number];

export const CRAFTING_STATION_LABELS: Record<CraftingStationId, string> = {
  workbench: "Workbench",
  forge: "Forge",
  chemistry_table: "Chemistry Table",
  campfire: "Campfire",
};

/**
 * `campfire` is represented in-world by the existing `campsite_fire` entity.
 */
export const CRAFTING_STATION_ENTITY_TYPES: Record<CraftingStationId, string> = {
  workbench: "workbench",
  forge: "forge",
  chemistry_table: "chemistry_table",
  campfire: "campsite_fire",
};

export function isCraftingStationId(value: string): value is CraftingStationId {
  return (CRAFTING_STATION_IDS as readonly string[]).includes(value);
}

export function getCraftingStationIdForEntityType(entityType: string): CraftingStationId | null {
  for (const stationId of CRAFTING_STATION_IDS) {
    if (CRAFTING_STATION_ENTITY_TYPES[stationId] === entityType) {
      return stationId;
    }
  }
  return null;
}
