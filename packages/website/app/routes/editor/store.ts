import { create } from "zustand";
import type {
  BiomeData,
  ClipboardData,
  Layer,
  Position,
  BiomeInfo,
  SaveStatus,
  SheetDimensions,
} from "./types";
import { createEmptyGroundLayer, createEmptyCollidablesLayer, BIOME_SIZE } from "./utils";

interface EditorState {
  // Grid state
  groundGrid: number[][];
  collidablesGrid: number[][];
  activeLayer: Layer;
  selectedTileId: number;

  // Export state
  exportText: string;

  // Drag state
  isDragging: boolean;
  hasModifiedDuringDrag: boolean;

  // Create dialog state
  isCreateDialogOpen: boolean;
  newBiomeName: string;
  isCreating: boolean;

  // Biome management
  biomes: BiomeInfo[];
  currentBiome: string | null;
  saveStatus: SaveStatus;
  isBiomesLoaded: boolean;

  // Items management
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
  history: BiomeData[];

  // Sheet dimensions
  groundDimensions: SheetDimensions;
  collidablesDimensions: SheetDimensions;
  sheetsLoaded: boolean;

  // Actions
  setGroundGrid: (grid: number[][]) => void;
  setCollidablesGrid: (grid: number[][]) => void;
  setActiveLayer: (layer: Layer) => void;
  setSelectedTileId: (id: number) => void;
  setExportText: (text: string) => void;
  setIsDragging: (dragging: boolean) => void;
  setHasModifiedDuringDrag: (modified: boolean) => void;
  setIsCreateDialogOpen: (open: boolean) => void;
  setNewBiomeName: (name: string) => void;
  setIsCreating: (creating: boolean) => void;
  setBiomes: (biomes: BiomeInfo[]) => void;
  setCurrentBiome: (biome: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setIsBiomesLoaded: (loaded: boolean) => void;
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
  setHistory: (history: BiomeData[]) => void;
  setGroundDimensions: (dimensions: SheetDimensions) => void;
  setCollidablesDimensions: (dimensions: SheetDimensions) => void;
  setSheetsLoaded: (loaded: boolean) => void;

  // Complex actions
  saveToHistory: () => void;
  undo: () => void;
  addItem: (entityType: string) => void;
  removeItem: (index: number) => void;
  clearActiveLayer: () => void;
  switchLayer: (layer: Layer) => void;
  handleGridCellClick: (row: number, col: number, saveHistory?: boolean) => void;
  floodFillGround: (startRow: number, startCol: number, newTileId: number) => void;
  pasteClipboard: (startRow: number, startCol: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  groundGrid: createEmptyGroundLayer(),
  collidablesGrid: createEmptyCollidablesLayer(),
  activeLayer: "ground",
  selectedTileId: 0,
  exportText: "",
  isDragging: false,
  hasModifiedDuringDrag: false,
  isCreateDialogOpen: false,
  newBiomeName: "",
  isCreating: false,
  biomes: [],
  currentBiome: null,
  saveStatus: "idle",
  isBiomesLoaded: false,
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

  // Simple setters
  setGroundGrid: (grid) => set({ groundGrid: grid }),
  setCollidablesGrid: (grid) => set({ collidablesGrid: grid }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  setExportText: (text) => set({ exportText: text }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setHasModifiedDuringDrag: (modified) => set({ hasModifiedDuringDrag: modified }),
  setIsCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
  setNewBiomeName: (name) => set({ newBiomeName: name }),
  setIsCreating: (creating) => set({ isCreating: creating }),
  setBiomes: (biomes) => set({ biomes }),
  setCurrentBiome: (biome) => set({ currentBiome: biome }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setIsBiomesLoaded: (loaded) => set({ isBiomesLoaded: loaded }),
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

  // Complex actions
  saveToHistory: () => {
    const { groundGrid, collidablesGrid, history } = get();
    set({
      history: [
        ...history,
        {
          ground: groundGrid.map((row) => [...row]),
          collidables: collidablesGrid.map((row) => [...row]),
        },
      ],
    });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    set({
      groundGrid: previousState.ground,
      collidablesGrid: previousState.collidables,
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
    const { activeLayer, saveToHistory } = get();
    saveToHistory();

    if (activeLayer === "ground") {
      set({ groundGrid: createEmptyGroundLayer() });
    } else {
      set({ collidablesGrid: createEmptyCollidablesLayer() });
    }
  },

  switchLayer: (layer) => {
    set({
      activeLayer: layer,
      selectedTileId: layer === "ground" ? 0 : -1,
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

  handleGridCellClick: (row, col, saveHistory = true) => {
    const {
      activeLayer,
      selectedTileId,
      groundGrid,
      collidablesGrid,
      clipboard,
      isFillBucketMode,
      saveToHistory,
      pasteClipboard,
      floodFillGround,
    } = get();

    if (saveHistory) {
      saveToHistory();
    }

    // If clipboard exists, paste it
    if (clipboard) {
      pasteClipboard(row, col);
      return;
    }

    // If fill bucket mode is active and we're on the ground layer, do flood fill
    if (isFillBucketMode && activeLayer === "ground") {
      floodFillGround(row, col, selectedTileId);
      return;
    }

    // Normal paint mode
    if (activeLayer === "ground") {
      const newGrid = groundGrid.map((r, rowIdx) =>
        r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? selectedTileId : cell))
      );
      set({ groundGrid: newGrid });
    } else {
      const currentTileId = collidablesGrid[row][col];
      const newTileId =
        currentTileId === selectedTileId && selectedTileId !== -1 ? -1 : selectedTileId;

      const newGrid = collidablesGrid.map((r, rowIdx) =>
        r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? newTileId : cell))
      );
      set({ collidablesGrid: newGrid });
    }
  },

  floodFillGround: (startRow, startCol, newTileId) => {
    const { groundGrid } = get();
    const originalTileId = groundGrid[startRow][startCol];

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

      if (pos.row < 0 || pos.row >= BIOME_SIZE || pos.col < 0 || pos.col >= BIOME_SIZE) {
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
    const { clipboard, groundGrid, collidablesGrid } = get();
    if (!clipboard) return;

    if (clipboard.layer === "ground") {
      const newGroundGrid = groundGrid.map((row) => [...row]);

      for (let row = 0; row < clipboard.height; row++) {
        for (let col = 0; col < clipboard.width; col++) {
          const targetRow = startRow + row;
          const targetCol = startCol + col;

          if (
            targetRow < 0 ||
            targetRow >= BIOME_SIZE ||
            targetCol < 0 ||
            targetCol >= BIOME_SIZE
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
            targetRow >= BIOME_SIZE ||
            targetCol < 0 ||
            targetCol >= BIOME_SIZE
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
