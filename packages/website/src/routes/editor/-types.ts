import type {
  WorldMapDialogueNpcEntry,
  WorldMapMerchantEntry,
  WorldMapMessageDecalEntry,
  WorldMapScavengeDecalEntry,
  WorldMapSpawnerMetaEntry,
} from "@survive-the-night/game-shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@survive-the-night/game-shared/map/quest-types";

export type Layer = "ground" | "collidables" | "spawns" | "decals";

/** Right sidebar primary section (editor overlay). */
export type EditorSidebarSection =
  | "cursor"
  | "tiles"
  | "markers"
  | "npcs"
  | "spawners"
  | "merchants"
  | "scavenge"
  | "quests";

/** Snapshot of all layers (undo / API). */
export interface MapLayerSnapshot {
  ground: number[][];
  collidables: number[][];
  spawns: number[][];
  decals: number[][];
  dialogueNpcs: WorldMapDialogueNpcEntry[];
  /** Added for message decals; absent in snapshots taken before this feature. */
  messageDecals?: WorldMapMessageDecalEntry[];
  /** Added for scavenge decal piles; absent in older snapshots. */
  scavengeDecals?: WorldMapScavengeDecalEntry[];
  /** Added for per-tile merchant stock; absent in older snapshots. */
  merchantMeta?: WorldMapMerchantEntry[];
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
