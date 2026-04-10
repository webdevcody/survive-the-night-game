import type { WorldMapDialogueNpcEntry, WorldMapMessageDecalEntry, WorldMapSpawnerMetaEntry } from "@shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
export interface WorldMapFile {
    ground: number[][];
    collidables: number[][];
    /** Omitted in legacy files; treated as all zeros when missing. */
    spawns?: number[][];
    /** Omitted in legacy files; treated as all zeros when missing. */
    decals?: number[][];
    /** Optional dialogue NPC placements (see shared `WorldMapDialogueNpcEntry`). */
    dialogueNpcs?: WorldMapDialogueNpcEntry[];
    /** Optional message decals (`DECAL_TILE_MESSAGE`); see `WorldMapMessageDecalEntry`. */
    messageDecals?: WorldMapMessageDecalEntry[];
    /** Optional authored quests (see `WorldMapQuestDefinition`). */
    quests?: WorldMapQuestDefinition[];
    /** Optional spawner labels from the map editor (not used by the server yet). */
    spawnerMeta?: WorldMapSpawnerMetaEntry[];
}
export declare function tryLoadWorldMapFile(): WorldMapFile | null;
export declare function validateWorldMapDimensions(data: WorldMapFile): boolean;
