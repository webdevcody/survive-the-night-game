import type {
  WorldMapDialogueNpcEntry,
  WorldMapSpawnerMetaEntry,
} from "@survive-the-night/game-shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@survive-the-night/game-shared/map/quest-types";

export type Layer = "ground" | "collidables" | "spawns" | "decals";

/** Right sidebar primary section (editor overlay). */
export type EditorSidebarSection = "tiles" | "npcs" | "spawners" | "quests";

/** Snapshot of all layers (undo / API). */
export interface MapLayerSnapshot {
  ground: number[][];
  collidables: number[][];
  spawns: number[][];
  decals: number[][];
  dialogueNpcs: WorldMapDialogueNpcEntry[];
  quests: WorldMapQuestDefinition[];
  spawnerMeta: WorldMapSpawnerMetaEntry[];
}

export interface SheetDimensions {
  cols: number;
  rows: number;
  totalTiles: number;
}

export interface ClipboardData {
  tiles: number[][];
  width: number;
  height: number;
  layer: Layer;
}

export interface Position {
  row: number;
  col: number;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
