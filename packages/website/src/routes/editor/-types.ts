import type { WorldMapDialogueNpcEntry } from "@survive-the-night/game-shared/map/world-map-types";

export type Layer = "ground" | "collidables" | "spawns" | "decals";

/** Snapshot of all layers (undo / API). */
export interface MapLayerSnapshot {
  ground: number[][];
  collidables: number[][];
  spawns: number[][];
  decals: number[][];
  dialogueNpcs: WorldMapDialogueNpcEntry[];
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
