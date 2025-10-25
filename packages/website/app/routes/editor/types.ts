export type Layer = "ground" | "collidables";

export interface BiomeData {
  ground: number[][];
  collidables: number[][];
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

export interface BiomeInfo {
  name: string;
  fileName: string;
  constantName: string;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
