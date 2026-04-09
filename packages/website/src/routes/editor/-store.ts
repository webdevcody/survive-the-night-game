import { create } from "zustand";
import type {
  ClipboardData,
  Layer,
  MapLayerSnapshot,
  Position,
  SaveStatus,
  SheetDimensions,
} from "./-types";
import {
  createEmptyGroundLayer,
  createEmptyCollidablesLayer,
  createEmptySpawnsLayer,
  createEmptyDecalsLayer,
  getFullMapTileCount,
  getMapSideLength,
} from "./-utils";
import type { DecalData } from "@survive-the-night/game-shared/config/decals-config";

const MAX_UNDO_HISTORY = 20;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

interface EditorState {
  // Grid state
  groundGrid: number[][];
  collidablesGrid: number[][];
  spawnsGrid: number[][];
  decalsGrid: number[][];
  activeLayer: Layer;
  selectedTileId: number;

  // Export state
  exportText: string;

  // Drag state
  isDragging: boolean;
  hasModifiedDuringDrag: boolean;

  saveStatus: SaveStatus;

  // Items management (legacy UI; not persisted in world-map.json)
  currentItems: string[];
  isItemsModalOpen: boolean;

  // Palette selection (collidables)
  isPaletteSelectionMode: boolean;
  paletteSelectionStart: Position | null;
  paletteSelectionCurrent: Position | null;

  // Palette selection (ground)
  isGroundPaletteSelectionMode: boolean;
  groundPaletteSelectionStart: Position | null;
  groundPaletteSelectionCurrent: Position | null;

  // Clipboard
  clipboard: ClipboardData | null;

  // Fill bucket
  isFillBucketMode: boolean;

  // History
  history: MapLayerSnapshot[];

  // Sheet dimensions
  groundDimensions: SheetDimensions;
  collidablesDimensions: SheetDimensions;
  sheetsLoaded: boolean;

  // Decals
  selectedDecalId: string | null;
  decals: DecalData[];

  // Viewport camera (top-left tile visible)
  cameraX: number;
  cameraY: number;
  viewportWidthTiles: number;
  viewportHeightTiles: number;

  // Actions
  setGroundGrid: (grid: number[][]) => void;
  setCollidablesGrid: (grid: number[][]) => void;
  setSpawnsGrid: (grid: number[][]) => void;
  setDecalsGrid: (grid: number[][]) => void;
  setActiveLayer: (layer: Layer) => void;
  setSelectedTileId: (id: number) => void;
  setExportText: (text: string) => void;
  setIsDragging: (dragging: boolean) => void;
  setHasModifiedDuringDrag: (modified: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setCurrentItems: (items: string[]) => void;
  setIsItemsModalOpen: (open: boolean) => void;
  setIsPaletteSelectionMode: (mode: boolean) => void;
  setPaletteSelectionStart: (pos: Position | null) => void;
  setPaletteSelectionCurrent: (pos: Position | null) => void;
  setIsGroundPaletteSelectionMode: (mode: boolean) => void;
  setGroundPaletteSelectionStart: (pos: Position | null) => void;
  setGroundPaletteSelectionCurrent: (pos: Position | null) => void;
  setClipboard: (data: ClipboardData | null) => void;
  setIsFillBucketMode: (mode: boolean) => void;
  setHistory: (history: MapLayerSnapshot[]) => void;
  setGroundDimensions: (dimensions: SheetDimensions) => void;
  setCollidablesDimensions: (dimensions: SheetDimensions) => void;
  setSheetsLoaded: (loaded: boolean) => void;
  setSelectedDecalId: (id: string) => void;
  removeDecal: (index: number) => void;

  setCamera: (x: number, y: number) => void;
  panCamera: (dx: number, dy: number) => void;
  setViewportSize: (widthTiles: number, heightTiles: number) => void;
  clampCameraToViewport: () => void;

  // Complex actions
  saveToHistory: () => void;
  undo: () => void;
  addItem: (entityType: string) => void;
  removeItem: (index: number) => void;
  clearActiveLayer: () => void;
  switchLayer: (layer: Layer) => void;
  handleGridCellClick: (
    row: number,
    col: number,
    saveHistory?: boolean,
    /** When true (e.g. drag stroke), always paint selected tile — no toggle on matching cells. */
    paintStroke?: boolean,
  ) => void;
  floodFillGround: (startRow: number, startCol: number, newTileId: number) => void;
  pasteClipboard: (startRow: number, startCol: number) => void;
}

const initialSize = getFullMapTileCount();

export const useEditorStore = create<EditorState>((set, get) => ({
  groundGrid: createEmptyGroundLayer(initialSize),
  collidablesGrid: createEmptyCollidablesLayer(initialSize),
  spawnsGrid: createEmptySpawnsLayer(initialSize),
  decalsGrid: createEmptyDecalsLayer(initialSize),
  activeLayer: "ground",
  selectedTileId: 0,
  exportText: "",
  isDragging: false,
  hasModifiedDuringDrag: false,
  saveStatus: "idle",
  currentItems: [],
  isItemsModalOpen: false,
  isPaletteSelectionMode: false,
  paletteSelectionStart: null,
  paletteSelectionCurrent: null,
  isGroundPaletteSelectionMode: false,
  groundPaletteSelectionStart: null,
  groundPaletteSelectionCurrent: null,
  clipboard: null,
  isFillBucketMode: false,
  history: [],
  groundDimensions: { cols: 10, rows: 3, totalTiles: 30 },
  collidablesDimensions: { cols: 10, rows: 3, totalTiles: 30 },
  sheetsLoaded: false,
  selectedDecalId: null,
  decals: [],
  cameraX: 0,
  cameraY: 0,
  viewportWidthTiles: 32,
  viewportHeightTiles: 24,

  setGroundGrid: (grid) => set({ groundGrid: grid }),
  setCollidablesGrid: (grid) => set({ collidablesGrid: grid }),
  setSpawnsGrid: (grid) => set({ spawnsGrid: grid }),
  setDecalsGrid: (grid) => set({ decalsGrid: grid }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  setExportText: (text) => set({ exportText: text }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setHasModifiedDuringDrag: (modified) => set({ hasModifiedDuringDrag: modified }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setCurrentItems: (items) => set({ currentItems: items }),
  setIsItemsModalOpen: (open) => set({ isItemsModalOpen: open }),
  setIsPaletteSelectionMode: (mode) => set({ isPaletteSelectionMode: mode }),
  setPaletteSelectionStart: (pos) => set({ paletteSelectionStart: pos }),
  setPaletteSelectionCurrent: (pos) => set({ paletteSelectionCurrent: pos }),
  setIsGroundPaletteSelectionMode: (mode) => set({ isGroundPaletteSelectionMode: mode }),
  setGroundPaletteSelectionStart: (pos) => set({ groundPaletteSelectionStart: pos }),
  setGroundPaletteSelectionCurrent: (pos) => set({ groundPaletteSelectionCurrent: pos }),
  setClipboard: (data) => set({ clipboard: data }),
  setIsFillBucketMode: (mode) => set({ isFillBucketMode: mode }),
  setHistory: (history) => set({ history }),
  setGroundDimensions: (dimensions) => set({ groundDimensions: dimensions }),
  setCollidablesDimensions: (dimensions) => set({ collidablesDimensions: dimensions }),
  setSheetsLoaded: (loaded) => set({ sheetsLoaded: loaded }),
  setSelectedDecalId: (id) => set({ selectedDecalId: id }),
  removeDecal: (index) => {
    const { decals } = get();
    set({ decals: decals.filter((_, i) => i !== index) });
  },

  setCamera: (x, y) => {
    const { viewportWidthTiles, viewportHeightTiles, groundGrid } = get();
    const mapSize = getMapSideLength(groundGrid);
    const maxX = Math.max(0, mapSize - viewportWidthTiles);
    const maxY = Math.max(0, mapSize - viewportHeightTiles);
    set({ cameraX: clamp(x, 0, maxX), cameraY: clamp(y, 0, maxY) });
  },

  panCamera: (dx, dy) => {
    const { cameraX, cameraY } = get();
    get().setCamera(cameraX + dx, cameraY + dy);
  },

  setViewportSize: (widthTiles, heightTiles) => {
    set({ viewportWidthTiles: widthTiles, viewportHeightTiles: heightTiles });
    get().clampCameraToViewport();
  },

  clampCameraToViewport: () => {
    const { cameraX, cameraY, viewportWidthTiles, viewportHeightTiles, groundGrid } = get();
    const mapSize = getMapSideLength(groundGrid);
    const maxX = Math.max(0, mapSize - viewportWidthTiles);
    const maxY = Math.max(0, mapSize - viewportHeightTiles);
    set({
      cameraX: clamp(cameraX, 0, maxX),
      cameraY: clamp(cameraY, 0, maxY),
    });
  },

  saveToHistory: () => {
    const { groundGrid, collidablesGrid, spawnsGrid, decalsGrid, history } = get();
    const snapshot: MapLayerSnapshot = {
      ground: groundGrid.map((row) => [...row]),
      collidables: collidablesGrid.map((row) => [...row]),
      spawns: spawnsGrid.map((row) => [...row]),
      decals: decalsGrid.map((row) => [...row]),
    };
    let next = [...history, snapshot];
    if (next.length > MAX_UNDO_HISTORY) {
      next = next.slice(next.length - MAX_UNDO_HISTORY);
    }
    set({ history: next });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    set({
      groundGrid: previousState.ground,
      collidablesGrid: previousState.collidables,
      spawnsGrid: previousState.spawns,
      decalsGrid: previousState.decals,
      history: history.slice(0, -1),
    });
  },

  addItem: (entityType) => {
    const { currentItems } = get();
    set({ currentItems: [...currentItems, `Entities.${entityType.toUpperCase()}`] });
  },

  removeItem: (index) => {
    const { currentItems } = get();
    set({ currentItems: currentItems.filter((_, i) => i !== index) });
  },

  clearActiveLayer: () => {
    const { activeLayer, saveToHistory, groundGrid } = get();
    saveToHistory();
    const n = getMapSideLength(groundGrid);

    if (activeLayer === "ground") {
      set({ groundGrid: createEmptyGroundLayer(n) });
    } else if (activeLayer === "collidables") {
      set({ collidablesGrid: createEmptyCollidablesLayer(n) });
    } else if (activeLayer === "spawns") {
      set({ spawnsGrid: createEmptySpawnsLayer(n) });
    } else {
      set({ decalsGrid: createEmptyDecalsLayer(n) });
    }
  },

  switchLayer: (layer) => {
    set({
      activeLayer: layer,
      selectedTileId:
        layer === "ground" ? 0 : layer === "spawns" || layer === "decals" ? 0 : -1,
      isPaletteSelectionMode: false,
      isGroundPaletteSelectionMode: false,
      paletteSelectionStart: null,
      paletteSelectionCurrent: null,
      groundPaletteSelectionStart: null,
      groundPaletteSelectionCurrent: null,
      clipboard: null,
      isFillBucketMode: false,
    });
  },

  handleGridCellClick: (row, col, saveHistory = true, paintStroke = false) => {
    const {
      activeLayer,
      selectedTileId,
      groundGrid,
      collidablesGrid,
      spawnsGrid,
      decalsGrid,
      clipboard,
      isFillBucketMode,
      saveToHistory,
      pasteClipboard,
      floodFillGround,
    } = get();

    if (saveHistory) {
      saveToHistory();
    }

    if (clipboard) {
      pasteClipboard(row, col);
      return;
    }

    if (isFillBucketMode && activeLayer === "ground") {
      floodFillGround(row, col, selectedTileId);
      return;
    }

    if (activeLayer === "spawns") {
      const currentTileId = spawnsGrid[row][col];
      const newTileId = paintStroke
        ? selectedTileId
        : currentTileId === selectedTileId && selectedTileId !== 0
          ? 0
          : selectedTileId;

      const newGrid = spawnsGrid.map((r, rowIdx) =>
        r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? newTileId : cell)),
      );
      set({ spawnsGrid: newGrid });
      return;
    }

    if (activeLayer === "decals") {
      const currentTileId = decalsGrid[row][col];
      const newTileId = paintStroke
        ? selectedTileId
        : currentTileId === selectedTileId && selectedTileId !== 0
          ? 0
          : selectedTileId;

      const newGrid = decalsGrid.map((r, rowIdx) =>
        r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? newTileId : cell)),
      );
      set({ decalsGrid: newGrid });
      return;
    }

    if (activeLayer === "ground") {
      const newGrid = groundGrid.map((r, rowIdx) =>
        r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? selectedTileId : cell)),
      );
      set({ groundGrid: newGrid });
    } else {
      const currentTileId = collidablesGrid[row][col];
      const newTileId = paintStroke
        ? selectedTileId
        : currentTileId === selectedTileId && selectedTileId !== -1
          ? -1
          : selectedTileId;

      const newGrid = collidablesGrid.map((r, rowIdx) =>
        r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? newTileId : cell)),
      );
      set({ collidablesGrid: newGrid });
    }
  },

  floodFillGround: (startRow, startCol, newTileId) => {
    const { groundGrid } = get();
    const mapSize = groundGrid.length;
    const originalTileId = groundGrid[startRow]?.[startCol];

    if (originalTileId === newTileId) return;

    const newGrid = groundGrid.map((row) => [...row]);
    const queue: Position[] = [{ row: startRow, col: startCol }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const pos = queue.shift();
      if (!pos) break;

      const key = `${pos.row},${pos.col}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (pos.row < 0 || pos.row >= mapSize || pos.col < 0 || pos.col >= mapSize) {
        continue;
      }

      if (newGrid[pos.row][pos.col] !== originalTileId) {
        continue;
      }

      newGrid[pos.row][pos.col] = newTileId;

      queue.push({ row: pos.row - 1, col: pos.col });
      queue.push({ row: pos.row + 1, col: pos.col });
      queue.push({ row: pos.row, col: pos.col - 1 });
      queue.push({ row: pos.row, col: pos.col + 1 });
    }

    set({ groundGrid: newGrid });
  },

  pasteClipboard: (startRow, startCol) => {
    const { clipboard, groundGrid, collidablesGrid, spawnsGrid, decalsGrid } = get();
    if (!clipboard) return;

    const mapSize = groundGrid.length;

    if (clipboard.layer === "decals") {
      const newDecalsGrid = decalsGrid.map((row) => [...row]);

      for (let row = 0; row < clipboard.height; row++) {
        for (let col = 0; col < clipboard.width; col++) {
          const targetRow = startRow + row;
          const targetCol = startCol + col;

          if (
            targetRow < 0 ||
            targetRow >= mapSize ||
            targetCol < 0 ||
            targetCol >= mapSize
          ) {
            continue;
          }

          newDecalsGrid[targetRow][targetCol] = clipboard.tiles[row][col];
        }
      }

      set({ decalsGrid: newDecalsGrid });
      return;
    }

    if (clipboard.layer === "spawns") {
      const newSpawnsGrid = spawnsGrid.map((row) => [...row]);

      for (let row = 0; row < clipboard.height; row++) {
        for (let col = 0; col < clipboard.width; col++) {
          const targetRow = startRow + row;
          const targetCol = startCol + col;

          if (
            targetRow < 0 ||
            targetRow >= mapSize ||
            targetCol < 0 ||
            targetCol >= mapSize
          ) {
            continue;
          }

          newSpawnsGrid[targetRow][targetCol] = clipboard.tiles[row][col];
        }
      }

      set({ spawnsGrid: newSpawnsGrid });
      return;
    }

    if (clipboard.layer === "ground") {
      const newGroundGrid = groundGrid.map((row) => [...row]);

      for (let row = 0; row < clipboard.height; row++) {
        for (let col = 0; col < clipboard.width; col++) {
          const targetRow = startRow + row;
          const targetCol = startCol + col;

          if (
            targetRow < 0 ||
            targetRow >= mapSize ||
            targetCol < 0 ||
            targetCol >= mapSize
          ) {
            continue;
          }

          newGroundGrid[targetRow][targetCol] = clipboard.tiles[row][col];
        }
      }

      set({ groundGrid: newGroundGrid });
    } else {
      const newCollidablesGrid = collidablesGrid.map((row) => [...row]);

      for (let row = 0; row < clipboard.height; row++) {
        for (let col = 0; col < clipboard.width; col++) {
          const targetRow = startRow + row;
          const targetCol = startCol + col;

          if (
            targetRow < 0 ||
            targetRow >= mapSize ||
            targetCol < 0 ||
            targetCol >= mapSize
          ) {
            continue;
          }

          newCollidablesGrid[targetRow][targetCol] = clipboard.tiles[row][col];
        }
      }

      set({ collidablesGrid: newCollidablesGrid });
    }
  },
}));
