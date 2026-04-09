export type Layer = "ground" | "collidables" | "spawns" | "decals";

/** Snapshot of all layers (undo / API). */
export interface MapLayerSnapshot {
  ground: number[][];
  collidables: number[][];
  spawns: number[][];
  decals: number[][];
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
