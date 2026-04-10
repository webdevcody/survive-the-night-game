import { create } from "zustand";
import type {
  ClipboardData,
  EditorSidebarSection,
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
  DEFAULT_EDITOR_TILE_PIXEL_SIZE,
  getFullMapTileCount,
  getMapSideLength,
} from "./-utils";
import type { DecalData } from "@survive-the-night/game-shared/config/decals-config";
import type {
  WorldMapDialogueNpcEntry,
  WorldMapMessageDecalEntry,
  WorldMapSpawnerMetaEntry,
} from "@survive-the-night/game-shared/map/world-map-types";
import {
  normalizeDialogueNpcs,
  normalizeMessageDecals,
  reconcileMessageDecalsWithDecalsLayer,
  reconcileSpawnerMetaWithSpawnsLayer,
  SPAWNER_META_RESPAWN_INTERVAL_SEC_MAX,
  SPAWNER_META_RESPAWN_INTERVAL_SEC_MIN,
} from "@survive-the-night/game-shared/map/world-map-types";
import type { WorldMapQuestDefinition } from "@survive-the-night/game-shared/map/quest-types";
import {
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
  ITEM_SPAWN_TILE_ID_MIN,
  NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID,
  SPAWNER_META_CONFIGURABLE_ENTRIES,
  SPAWN_TILE_NONE,
  isNpcDialogueSpawnTile,
  isNpcHealerDialogueSpawnTile,
} from "@survive-the-night/game-shared/map/spawn-palette";
import { reconcileDialogueNpcsWithSpawnsLayer } from "./-utils";

const MAX_UNDO_HISTORY = 20;

export const EDITOR_BRUSH_MIN = 1;
export const EDITOR_BRUSH_MAX = 5;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

const EDITOR_CAMERA_STORAGE_KEY = "mapEditorCamera";

const DEFAULT_VIEWPORT_WIDTH_TILES = 32;
const DEFAULT_VIEWPORT_HEIGHT_TILES = 24;

function readPersistedEditorCamera(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EDITOR_CAMERA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "x" in parsed &&
      "y" in parsed &&
      typeof (parsed as { x: unknown }).x === "number" &&
      typeof (parsed as { y: unknown }).y === "number" &&
      Number.isFinite((parsed as { x: number }).x) &&
      Number.isFinite((parsed as { y: number }).y)
    ) {
      return { x: (parsed as { x: number }).x, y: (parsed as { y: number }).y };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

function persistEditorCamera(x: number, y: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EDITOR_CAMERA_STORAGE_KEY, JSON.stringify({ x, y }));
  } catch {
    // ignore quota / private mode
  }
}

function getInitialCameraFromStorage(mapSize: number): { cameraX: number; cameraY: number } {
  const persisted = readPersistedEditorCamera();
  if (!persisted) {
    return { cameraX: 0, cameraY: 0 };
  }
  const maxX = Math.max(0, mapSize - DEFAULT_VIEWPORT_WIDTH_TILES);
  const maxY = Math.max(0, mapSize - DEFAULT_VIEWPORT_HEIGHT_TILES);
  return {
    cameraX: clamp(persisted.x, 0, maxX),
    cameraY: clamp(persisted.y, 0, maxY),
  };
}

const EDITOR_TILE_PIXEL_MIN = DEFAULT_EDITOR_TILE_PIXEL_SIZE * 0.25;
const EDITOR_TILE_PIXEL_MAX = DEFAULT_EDITOR_TILE_PIXEL_SIZE * 4;

function clampEditorTilePixelSize(n: number): number {
  const rounded = Math.round(n * 100) / 100;
  return clamp(rounded, EDITOR_TILE_PIXEL_MIN, EDITOR_TILE_PIXEL_MAX);
}

/** Top-left (row,col), size×size, clipped to [0, mapSize). One grid deep-copy. */
function fillRectInGrid(
  grid: number[][],
  row: number,
  col: number,
  size: number,
  value: number,
  mapSize: number,
): number[][] {
  const r0 = Math.max(0, row);
  const c0 = Math.max(0, col);
  const r1 = Math.min(mapSize, row + size);
  const c1 = Math.min(mapSize, col + size);
  const next = grid.map((r) => [...r]);
  for (let r = r0; r < r1; r++) {
    for (let c = c0; c < c1; c++) {
      next[r][c] = value;
    }
  }
  return next;
}

/** Immutable single-cell update without deep-copying every row (O(map side) instead of O(map area)). */
function replaceCellInGrid(
  grid: number[][],
  row: number,
  col: number,
  value: number,
): number[][] {
  const newRow = grid[row].map((cell, colIdx) => (colIdx === col ? value : cell));
  return grid.map((r, rowIdx) => (rowIdx === row ? newRow : r));
}

function makeDialogueNpcEntry(
  row: number,
  col: number,
  mapSide: number,
  prev?: WorldMapDialogueNpcEntry,
  spawnTileId?: number,
): WorldMapDialogueNpcEntry {
  if (
    !prev &&
    spawnTileId !== undefined &&
    isNpcHealerDialogueSpawnTile(spawnTileId)
  ) {
    const draft: WorldMapDialogueNpcEntry = {
      row,
      col,
      dialogueSessions: [
        {
          when: { type: "always" },
          lines: ["Rest here a moment. You'll feel better."],
          healOnDialogueComplete: true,
        },
      ],
    };
    const [e] = normalizeDialogueNpcs([draft], mapSide);
    return e!;
  }
  const hasSessions = prev?.dialogueSessions && prev.dialogueSessions.length > 0;
  const lines = prev?.lines?.length
    ? [...prev.lines]
    : [prev?.message?.trim() || "Hello!"];
  const draft: WorldMapDialogueNpcEntry = {
    row,
    col,
    ...(hasSessions
      ? {
          dialogueSessions: prev!.dialogueSessions!.map((s) => ({
            ...s,
            lines: [...s.lines],
          })),
        }
      : { lines }),
    ...(prev?.name ? { name: prev.name } : {}),
    ...(!hasSessions && prev?.grantQuestId !== undefined
      ? { grantQuestId: prev.grantQuestId }
      : {}),
  };
  const [e] = normalizeDialogueNpcs([draft], mapSide);
  return e!;
}

interface EditorState {
  // Grid state
  groundGrid: number[][];
  collidablesGrid: number[][];
  spawnsGrid: number[][];
  decalsGrid: number[][];
  /** Dialogue NPC messages keyed by spawns-layer dialogue NPC tile ids (survivor + healer). */
  dialogueNpcs: WorldMapDialogueNpcEntry[];
  /** Message text for decals-layer `DECAL_TILE_MESSAGE` cells. */
  messageDecals: WorldMapMessageDecalEntry[];
  /** Optional display names for non-dialogue spawner tiles. */
  spawnerMeta: WorldMapSpawnerMetaEntry[];
  /** Authored quests saved in world-map.json. */
  quests: WorldMapQuestDefinition[];
  activeLayer: Layer;
  selectedTileId: number;
  /** Spawn layer: selected tile for inspector (row/col in full map). */
  selectedSpawnCell: { row: number; col: number } | null;

  // Export state
  exportText: string;

  // Drag state
  isDragging: boolean;
  hasModifiedDuringDrag: boolean;

  saveStatus: SaveStatus;

  /** Configure dialogue NPC in a modal (e.g. canvas context menu). */
  npcConfigModal: { row: number; col: number } | null;
  /** When set, next map click (empty spawns cell) moves the dialogue NPC from this tile. */
  dialogueNpcRelocateFrom: { row: number; col: number } | null;
  /** Configure spawner label (sidebar / list). */
  spawnerConfigModal: { row: number; col: number } | null;
  /** When set, next map click (empty spawns cell) moves this non-dialogue spawner tile + label. */
  spawnerRelocateFrom: { row: number; col: number } | null;
  /** Right overlay: tiles palette vs lists vs quests. */
  sidebarSection: EditorSidebarSection;

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
  /** Loaded tilesheet images for canvas rendering (set when dimensions load). */
  groundSheetImage: HTMLImageElement | null;
  collidablesSheetImage: HTMLImageElement | null;

  // Decals
  selectedDecalId: string | null;
  decals: DecalData[];

  // Viewport camera (top-left tile visible)
  cameraX: number;
  cameraY: number;
  viewportWidthTiles: number;
  viewportHeightTiles: number;

  /** On-screen tile size (CSS px) for the main map canvas; pinch zoom adjusts this. */
  editorTilePixelSize: number;
  setEditorTilePixelSize: (n: number) => void;
  /** `deltaY` in CSS pixels (after deltaMode normalization). Negative = zoom in (larger tiles). */
  adjustEditorTilePixelSizeFromWheelPixelDelta: (deltaY: number) => void;

  /** Square paint brush: 1–5 tiles (top-left anchored). */
  brushSize: number;
  incrementBrushSize: () => void;
  decrementBrushSize: () => void;

  // Actions
  setGroundGrid: (grid: number[][]) => void;
  setCollidablesGrid: (grid: number[][]) => void;
  setSpawnsGrid: (grid: number[][]) => void;
  setDecalsGrid: (grid: number[][]) => void;
  setDialogueNpcs: (entries: WorldMapDialogueNpcEntry[]) => void;
  setMessageDecals: (entries: WorldMapMessageDecalEntry[]) => void;
  setSpawnerMeta: (entries: WorldMapSpawnerMetaEntry[]) => void;
  setQuests: (quests: WorldMapQuestDefinition[]) => void;
  updateDialogueNpcMessage: (row: number, col: number, message: string) => void;
  updateDialogueNpcEntry: (
    row: number,
    col: number,
    patch: Partial<
      Pick<
        WorldMapDialogueNpcEntry,
        "name" | "lines" | "grantQuestId" | "dialogueSessions"
      >
    >,
  ) => void;
  removeDialogueNpcAt: (row: number, col: number) => void;
  updateMessageDecalEntry: (
    row: number,
    col: number,
    patch: Partial<Pick<WorldMapMessageDecalEntry, "lines" | "message">>,
  ) => void;
  removeMessageDecalAt: (row: number, col: number) => void;
  setSelectedSpawnCell: (cell: { row: number; col: number } | null) => void;
  setActiveLayer: (layer: Layer) => void;
  setSelectedTileId: (id: number) => void;
  setExportText: (text: string) => void;
  setIsDragging: (dragging: boolean) => void;
  setHasModifiedDuringDrag: (modified: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setNpcConfigModal: (cell: { row: number; col: number } | null) => void;
  startDialogueNpcRelocate: (row: number, col: number) => void;
  cancelDialogueNpcRelocate: () => void;
  setSpawnerConfigModal: (cell: { row: number; col: number } | null) => void;
  startSpawnerRelocate: (row: number, col: number) => void;
  cancelSpawnerRelocate: () => void;
  updateSpawnerMetaAt: (row: number, col: number, name: string) => void;
  /** Whole seconds between respawns; `null` clears override (use map defaults). */
  updateSpawnerRespawnIntervalSecAt: (row: number, col: number, sec: number | null) => void;
  /** Change spawns-layer tile id for this cell (player / zombie / item fixture). No-op if invalid. */
  setSpawnerSpawnTypeAt: (row: number, col: number, newTileId: number) => void;
  /** Clear a non-dialogue spawner tile; no-op if empty or dialogue NPC tile. */
  removeSpawnerAt: (row: number, col: number) => void;
  /** Center the editor camera on a map tile (clamped to viewport). */
  focusCameraOnMapCell: (row: number, col: number) => void;
  addDialogueNpcAtTile: (row: number, col: number) => void;
  addItemSpawnerAtTile: (row: number, col: number) => void;
  /** Select spawns layer and open NPC modal (no grid change). */
  openDialogueNpcEditor: (row: number, col: number) => void;
  /** Open spawner metadata modal and spawns sidebar (no grid change). */
  openSpawnerMetaEditor: (row: number, col: number) => void;
  setSidebarSection: (section: EditorSidebarSection) => void;
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
  setSheetImages: (ground: HTMLImageElement, collidables: HTMLImageElement) => void;
  setSelectedDecalId: (id: string) => void;
  removeDecal: (index: number) => void;

  setCamera: (x: number, y: number) => void;
  panCamera: (dx: number, dy: number) => void;
  setViewportSize: (widthTiles: number, heightTiles: number) => void;
  clampCameraToViewport: () => void;

  // Complex actions
  saveToHistory: () => void;
  undo: () => void;
  clearActiveLayer: () => void;
  switchLayer: (layer: Layer) => void;
  handleGridCellClick: (
    row: number,
    col: number,
    saveHistory?: boolean,
    /** When true (e.g. drag stroke), always paint selected tile — no toggle on matching cells. */
    paintStroke?: boolean,
    opts?: { skipClipboard?: boolean; skipFillBucket?: boolean },
  ) => void;
  /** Clear the hovered cell for the active layer (ground 0, collidable -1, spawn/decal 0). */
  eraseGridCell: (row: number, col: number) => void;
  /** Erase a brush-sized rectangle (uses `brushSize`); delegates to `eraseGridCell` when size is 1. */
  eraseGridBrush: (row: number, col: number) => void;
  floodFillGround: (startRow: number, startCol: number, newTileId: number) => void;
  floodFillCollidables: (startRow: number, startCol: number, newTileId: number) => void;
  pasteClipboard: (startRow: number, startCol: number) => void;
}

function applyDialogueNpcSpawnAtCell(
  spawnsGrid: number[][],
  dialogueNpcs: WorldMapDialogueNpcEntry[],
  row: number,
  col: number,
  mapSize: number,
): { spawnsGrid: number[][]; dialogueNpcs: WorldMapDialogueNpcEntry[] } {
  const prevEntry = dialogueNpcs.find((e) => e.row === row && e.col === col);
  const newGrid = replaceCellInGrid(spawnsGrid, row, col, NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID);
  let nextDialogue = dialogueNpcs.filter((e) => !(e.row === row && e.col === col));
  nextDialogue = [
    ...nextDialogue,
    makeDialogueNpcEntry(
      row,
      col,
      mapSize,
      prevEntry,
      NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID,
    ),
  ];
  return { spawnsGrid: newGrid, dialogueNpcs: nextDialogue };
}

const initialSize = getFullMapTileCount();
const initialCamera = getInitialCameraFromStorage(initialSize);

export const useEditorStore = create<EditorState>((set, get) => ({
  groundGrid: createEmptyGroundLayer(initialSize),
  collidablesGrid: createEmptyCollidablesLayer(initialSize),
  spawnsGrid: createEmptySpawnsLayer(initialSize),
  decalsGrid: createEmptyDecalsLayer(initialSize),
  dialogueNpcs: [],
  messageDecals: [],
  spawnerMeta: [],
  quests: [],
  activeLayer: "ground",
  selectedTileId: 0,
  selectedSpawnCell: null,
  exportText: "",
  isDragging: false,
  hasModifiedDuringDrag: false,
  saveStatus: "idle",
  npcConfigModal: null,
  dialogueNpcRelocateFrom: null,
  spawnerConfigModal: null,
  spawnerRelocateFrom: null,
  sidebarSection: "tiles",
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
  groundSheetImage: null,
  collidablesSheetImage: null,
  selectedDecalId: null,
  decals: [],
  cameraX: initialCamera.cameraX,
  cameraY: initialCamera.cameraY,
  viewportWidthTiles: DEFAULT_VIEWPORT_WIDTH_TILES,
  viewportHeightTiles: DEFAULT_VIEWPORT_HEIGHT_TILES,
  editorTilePixelSize: DEFAULT_EDITOR_TILE_PIXEL_SIZE,
  setEditorTilePixelSize: (n) => {
    const next = clampEditorTilePixelSize(n);
    set({ editorTilePixelSize: next });
  },
  adjustEditorTilePixelSizeFromWheelPixelDelta: (deltaY) => {
    const { editorTilePixelSize } = get();
    const next = clampEditorTilePixelSize(editorTilePixelSize - deltaY * 0.015);
    if (next === editorTilePixelSize) return;
    set({ editorTilePixelSize: next });
  },
  brushSize: EDITOR_BRUSH_MIN,

  incrementBrushSize: () =>
    set((s) => ({ brushSize: clamp(s.brushSize + 1, EDITOR_BRUSH_MIN, EDITOR_BRUSH_MAX) })),
  decrementBrushSize: () =>
    set((s) => ({ brushSize: clamp(s.brushSize - 1, EDITOR_BRUSH_MIN, EDITOR_BRUSH_MAX) })),

  setGroundGrid: (grid) => set({ groundGrid: grid }),
  setCollidablesGrid: (grid) => set({ collidablesGrid: grid }),
  setSpawnsGrid: (grid) =>
    set((s) => ({
      spawnsGrid: grid,
      spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(grid, s.spawnerMeta),
    })),
  setDecalsGrid: (grid) => set({ decalsGrid: grid }),
  setDialogueNpcs: (entries) => set({ dialogueNpcs: entries }),
  setMessageDecals: (entries) => set({ messageDecals: entries }),
  setSpawnerMeta: (entries) => set({ spawnerMeta: entries }),
  setQuests: (quests) => set({ quests }),
  updateDialogueNpcMessage: (row, col, message) => {
    const clamped = message.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH);
    set((state) => {
      const mapSide = getMapSideLength(state.groundGrid);
      return {
        dialogueNpcs: state.dialogueNpcs.map((e) => {
          if (e.row !== row || e.col !== col) return e;
          const lines = [clamped];
          const [norm] = normalizeDialogueNpcs([{ ...e, row, col, lines }], mapSide);
          return norm ?? e;
        }),
      };
    });
  },
  updateDialogueNpcEntry: (row, col, patch) => {
    set((state) => {
      const mapSide = getMapSideLength(state.groundGrid);
      return {
        dialogueNpcs: state.dialogueNpcs.map((e) => {
          if (e.row !== row || e.col !== col) return e;
          const next = { ...e, ...patch };
          const [norm] = normalizeDialogueNpcs([next], mapSide);
          return norm ?? next;
        }),
      };
    });
  },
  updateMessageDecalEntry: (row, col, patch) => {
    set((state) => {
      const mapSide = getMapSideLength(state.groundGrid);
      return {
        messageDecals: state.messageDecals.map((e) => {
          if (e.row !== row || e.col !== col) return e;
          const next = { ...e, ...patch };
          const [norm] = normalizeMessageDecals([next], mapSide);
          return norm ?? next;
        }),
      };
    });
  },
  removeMessageDecalAt: (row, col) => {
    const { saveToHistory, decalsGrid, messageDecals, groundGrid } = get();
    saveToHistory();
    const mapSize = getMapSideLength(groundGrid);
    const newGrid = replaceCellInGrid(decalsGrid, row, col, 0);
    set({
      decalsGrid: newGrid,
      messageDecals: reconcileMessageDecalsWithDecalsLayer(newGrid, messageDecals, mapSize),
    });
  },
  removeDialogueNpcAt: (row, col) => {
    const {
      saveToHistory,
      spawnsGrid,
      dialogueNpcs,
      selectedSpawnCell,
      npcConfigModal,
      spawnerConfigModal,
      spawnerMeta,
      dialogueNpcRelocateFrom,
    } = get();
    saveToHistory();
    const newGrid = spawnsGrid.map((r, rowIdx) =>
      r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? 0 : cell)),
    );
    const nextRelocate =
      dialogueNpcRelocateFrom?.row === row && dialogueNpcRelocateFrom?.col === col
        ? null
        : dialogueNpcRelocateFrom;
    set({
      spawnsGrid: newGrid,
      spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newGrid, spawnerMeta),
      dialogueNpcs: dialogueNpcs.filter((e) => !(e.row === row && e.col === col)),
      dialogueNpcRelocateFrom: nextRelocate,
      selectedSpawnCell:
        selectedSpawnCell?.row === row && selectedSpawnCell?.col === col
          ? null
          : selectedSpawnCell,
      npcConfigModal:
        npcConfigModal?.row === row && npcConfigModal?.col === col ? null : npcConfigModal,
      spawnerConfigModal:
        spawnerConfigModal?.row === row && spawnerConfigModal?.col === col
          ? null
          : spawnerConfigModal,
    });
  },
  setSelectedSpawnCell: (cell) => set({ selectedSpawnCell: cell }),
  setActiveLayer: (layer) =>
    set({
      activeLayer: layer,
      selectedSpawnCell: layer === "spawns" ? get().selectedSpawnCell : null,
      ...(layer !== "spawns"
        ? { dialogueNpcRelocateFrom: null, spawnerRelocateFrom: null }
        : {}),
    }),
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  setExportText: (text) => set({ exportText: text }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setHasModifiedDuringDrag: (modified) => set({ hasModifiedDuringDrag: modified }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setNpcConfigModal: (cell) =>
    set({
      npcConfigModal: cell,
      ...(cell === null ? { dialogueNpcRelocateFrom: null } : {}),
    }),
  startDialogueNpcRelocate: (row, col) => {
    const sourceId = get().spawnsGrid[row]?.[col] ?? 0;
    const selectedTileId = isNpcDialogueSpawnTile(sourceId)
      ? sourceId
      : NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID;
    set({
      dialogueNpcRelocateFrom: { row, col },
      npcConfigModal: null,
      spawnerRelocateFrom: null,
      activeLayer: "spawns",
      selectedTileId,
    });
  },
  cancelDialogueNpcRelocate: () => {
    const from = get().dialogueNpcRelocateFrom;
    set({
      dialogueNpcRelocateFrom: null,
      ...(from ? { npcConfigModal: { row: from.row, col: from.col } } : {}),
    });
  },
  setSpawnerConfigModal: (cell) =>
    set({
      spawnerConfigModal: cell,
      ...(cell === null ? { spawnerRelocateFrom: null } : {}),
    }),
  startSpawnerRelocate: (row, col) => {
    const id = get().spawnsGrid[row]?.[col] ?? 0;
    if (id <= 0 || isNpcDialogueSpawnTile(id)) return;
    set({
      spawnerRelocateFrom: { row, col },
      spawnerConfigModal: null,
      dialogueNpcRelocateFrom: null,
      activeLayer: "spawns",
      selectedTileId: id,
      sidebarSection: "spawners",
    });
  },
  cancelSpawnerRelocate: () => {
    const from = get().spawnerRelocateFrom;
    set({
      spawnerRelocateFrom: null,
      ...(from ? { spawnerConfigModal: { row: from.row, col: from.col } } : {}),
    });
  },
  setSidebarSection: (section) => set({ sidebarSection: section }),
  updateSpawnerMetaAt: (row, col, name) => {
    const trimmed = name.trim();
    set((state) => {
      const id = state.spawnsGrid[row]?.[col] ?? 0;
      if (id <= 0 || isNpcDialogueSpawnTile(id)) {
        return {};
      }
      const prev = state.spawnerMeta.find((e) => e.row === row && e.col === col);
      const rest = state.spawnerMeta.filter((e) => !(e.row === row && e.col === col));
      const respawn = prev?.respawnIntervalSec;
      if (!trimmed && respawn === undefined) {
        return { spawnerMeta: rest };
      }
      const entry: WorldMapSpawnerMetaEntry = { row, col };
      if (trimmed) {
        entry.name = trimmed.slice(0, 48);
      }
      if (respawn !== undefined) {
        entry.respawnIntervalSec = respawn;
      }
      return { spawnerMeta: [...rest, entry] };
    });
  },
  updateSpawnerRespawnIntervalSecAt: (row, col, sec) => {
    set((state) => {
      const id = state.spawnsGrid[row]?.[col] ?? 0;
      if (id <= 0 || isNpcDialogueSpawnTile(id)) {
        return {};
      }
      const prev = state.spawnerMeta.find((e) => e.row === row && e.col === col);
      const rest = state.spawnerMeta.filter((e) => !(e.row === row && e.col === col));
      const name = prev?.name?.trim();
      if (sec === null) {
        if (!name) {
          return { spawnerMeta: rest };
        }
        return { spawnerMeta: [...rest, { row, col, name: name.slice(0, 48) }] };
      }
      const clamped = Math.round(sec);
      if (
        clamped < SPAWNER_META_RESPAWN_INTERVAL_SEC_MIN ||
        clamped > SPAWNER_META_RESPAWN_INTERVAL_SEC_MAX
      ) {
        return {};
      }
      const entry: WorldMapSpawnerMetaEntry = { row, col, respawnIntervalSec: clamped };
      if (name) {
        entry.name = name.slice(0, 48);
      }
      return { spawnerMeta: [...rest, entry] };
    });
  },
  setSpawnerSpawnTypeAt: (row, col, newTileId) => {
    const { saveToHistory, spawnsGrid, dialogueNpcs, selectedSpawnCell } = get();
    const currentId = spawnsGrid[row]?.[col] ?? 0;
    if (currentId <= 0 || isNpcDialogueSpawnTile(currentId)) return;
    if (
      newTileId === SPAWN_TILE_NONE ||
      isNpcDialogueSpawnTile(newTileId) ||
      !SPAWNER_META_CONFIGURABLE_ENTRIES.some((e) => e.id === newTileId)
    ) {
      return;
    }
    if (newTileId === currentId) return;
    saveToHistory();
    const newGrid = replaceCellInGrid(spawnsGrid, row, col, newTileId);
    const nextDialogue = dialogueNpcs.filter((e) => !(e.row === row && e.col === col));
    set((s) => ({
      spawnsGrid: newGrid,
      dialogueNpcs: nextDialogue,
      spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newGrid, s.spawnerMeta),
      ...(selectedSpawnCell?.row === row && selectedSpawnCell.col === col
        ? { selectedTileId: newTileId }
        : {}),
    }));
  },
  removeSpawnerAt: (row, col) => {
    const {
      saveToHistory,
      spawnsGrid,
      selectedSpawnCell,
      spawnerConfigModal,
      spawnerRelocateFrom,
    } = get();
    const id = spawnsGrid[row]?.[col] ?? 0;
    if (id <= 0 || isNpcDialogueSpawnTile(id)) return;
    saveToHistory();
    const newGrid = replaceCellInGrid(spawnsGrid, row, col, 0);
    const nextRelocate =
      spawnerRelocateFrom?.row === row && spawnerRelocateFrom?.col === col
        ? null
        : spawnerRelocateFrom;
    set((s) => ({
      spawnsGrid: newGrid,
      spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newGrid, s.spawnerMeta),
      spawnerRelocateFrom: nextRelocate,
      selectedSpawnCell:
        selectedSpawnCell?.row === row && selectedSpawnCell?.col === col
          ? null
          : selectedSpawnCell,
      spawnerConfigModal:
        spawnerConfigModal?.row === row && spawnerConfigModal?.col === col
          ? null
          : spawnerConfigModal,
    }));
  },
  focusCameraOnMapCell: (row, col) => {
    const { viewportWidthTiles, viewportHeightTiles, groundGrid } = get();
    const mapSize = getMapSideLength(groundGrid);
    const x = Math.round(col - viewportWidthTiles / 2);
    const y = Math.round(row - viewportHeightTiles / 2);
    const maxX = Math.max(0, mapSize - viewportWidthTiles);
    const maxY = Math.max(0, mapSize - viewportHeightTiles);
    get().setCamera(clamp(x, 0, maxX), clamp(y, 0, maxY));
  },
  openDialogueNpcEditor: (row, col) => {
    const spawnId = get().spawnsGrid[row]?.[col] ?? 0;
    const selectedTileId = isNpcDialogueSpawnTile(spawnId)
      ? spawnId
      : NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID;
    set({
      activeLayer: "spawns",
      selectedTileId,
      selectedSpawnCell: { row, col },
      npcConfigModal: { row, col },
      spawnerConfigModal: null,
      spawnerRelocateFrom: null,
      sidebarSection: "npcs",
    });
  },
  openSpawnerMetaEditor: (row, col) => {
    set((s) => {
      const id = s.spawnsGrid[row]?.[col] ?? 0;
      return {
        activeLayer: "spawns",
        selectedSpawnCell: { row, col },
        spawnerConfigModal: { row, col },
        npcConfigModal: null,
        dialogueNpcRelocateFrom: null,
        spawnerRelocateFrom: null,
        sidebarSection: "spawners" as const,
        ...(id > 0 ? { selectedTileId: id } : {}),
      };
    });
  },
  addDialogueNpcAtTile: (row, col) => {
    const { spawnsGrid, dialogueNpcs, groundGrid, saveToHistory } = get();
    const currentId = spawnsGrid[row]?.[col] ?? 0;
    const mapSize = getMapSideLength(groundGrid);

    if (isNpcDialogueSpawnTile(currentId)) {
      set({
        activeLayer: "spawns",
        selectedTileId: currentId,
        selectedSpawnCell: { row, col },
        npcConfigModal: { row, col },
        spawnerConfigModal: null,
        sidebarSection: "npcs",
      });
      return;
    }

    saveToHistory();
    const next = applyDialogueNpcSpawnAtCell(spawnsGrid, dialogueNpcs, row, col, mapSize);
    set((s) => ({
      ...next,
      spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(next.spawnsGrid, s.spawnerMeta),
      activeLayer: "spawns",
      selectedTileId: NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID,
      selectedSpawnCell: { row, col },
      npcConfigModal: { row, col },
      spawnerConfigModal: null,
      spawnerRelocateFrom: null,
      sidebarSection: "npcs",
    }));
  },
  addItemSpawnerAtTile: (row, col) => {
    const targetId = ITEM_SPAWN_TILE_ID_MIN;
    const { spawnsGrid, dialogueNpcs, saveToHistory } = get();
    const currentId = spawnsGrid[row]?.[col] ?? 0;
    if (currentId === targetId) {
      set({
        activeLayer: "spawns",
        selectedTileId: targetId,
        selectedSpawnCell: { row, col },
        spawnerConfigModal: { row, col },
        npcConfigModal: null,
        dialogueNpcRelocateFrom: null,
        spawnerRelocateFrom: null,
        sidebarSection: "spawners",
      });
      return;
    }
    saveToHistory();
    const newGrid = replaceCellInGrid(spawnsGrid, row, col, targetId);
    const nextDialogue = dialogueNpcs.filter((e) => !(e.row === row && e.col === col));
    set((s) => ({
      spawnsGrid: newGrid,
      spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newGrid, s.spawnerMeta),
      dialogueNpcs: nextDialogue,
      activeLayer: "spawns",
      selectedTileId: targetId,
      selectedSpawnCell: { row, col },
      spawnerConfigModal: { row, col },
      npcConfigModal: null,
      dialogueNpcRelocateFrom: null,
      spawnerRelocateFrom: null,
      sidebarSection: "spawners",
    }));
  },
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
  setSheetImages: (ground, collidables) =>
    set({ groundSheetImage: ground, collidablesSheetImage: collidables }),
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
    const cameraX = clamp(x, 0, maxX);
    const cameraY = clamp(y, 0, maxY);
    set({ cameraX, cameraY });
    persistEditorCamera(cameraX, cameraY);
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
    const nextX = clamp(cameraX, 0, maxX);
    const nextY = clamp(cameraY, 0, maxY);
    set({
      cameraX: nextX,
      cameraY: nextY,
    });
    persistEditorCamera(nextX, nextY);
  },

  saveToHistory: () => {
    const {
      groundGrid,
      collidablesGrid,
      spawnsGrid,
      decalsGrid,
      dialogueNpcs,
      messageDecals,
      spawnerMeta,
      quests,
      history,
    } = get();
    const snapshot: MapLayerSnapshot = {
      ground: groundGrid.map((row) => [...row]),
      collidables: collidablesGrid.map((row) => [...row]),
      spawns: spawnsGrid.map((row) => [...row]),
      decals: decalsGrid.map((row) => [...row]),
      dialogueNpcs: dialogueNpcs.map((e) => ({ ...e })),
      messageDecals: messageDecals.map((e) => ({ ...e })),
      spawnerMeta: spawnerMeta.map((e) => ({ ...e })),
      quests: quests.map((q) => ({
        ...q,
        steps: q.steps.map((s) => ({ ...s })),
        rewards: q.rewards.map((r) => ({ ...r })),
        startRewards: (q.startRewards ?? []).map((r) => ({ ...r })),
      })),
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
    const mapSide = previousState.ground.length;
    const restoredMessageDecals =
      previousState.messageDecals !== undefined
        ? previousState.messageDecals.map((e) => ({ ...e }))
        : reconcileMessageDecalsWithDecalsLayer(previousState.decals, [], mapSide);
    set({
      groundGrid: previousState.ground,
      collidablesGrid: previousState.collidables,
      spawnsGrid: previousState.spawns,
      decalsGrid: previousState.decals,
      dialogueNpcs: (previousState.dialogueNpcs ?? []).map((e) => ({ ...e })),
      messageDecals: restoredMessageDecals,
      spawnerMeta: (previousState.spawnerMeta ?? []).map((e) => ({ ...e })),
      quests: (previousState.quests ?? []).map((q) => ({
        ...q,
        steps: q.steps.map((s) => ({ ...s })),
        rewards: q.rewards.map((r) => ({ ...r })),
        startRewards: (q.startRewards ?? []).map((r) => ({ ...r })),
      })),
      history: history.slice(0, -1),
    });
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
      set({
        spawnsGrid: createEmptySpawnsLayer(n),
        dialogueNpcs: [],
        spawnerMeta: [],
        selectedSpawnCell: null,
        spawnerConfigModal: null,
        dialogueNpcRelocateFrom: null,
        spawnerRelocateFrom: null,
      });
    } else {
      set({ decalsGrid: createEmptyDecalsLayer(n), messageDecals: [] });
    }
  },

  switchLayer: (layer) => {
    set({
      activeLayer: layer,
      selectedTileId:
        layer === "ground" ? 0 : layer === "spawns" || layer === "decals" ? 0 : -1,
      selectedSpawnCell: layer === "spawns" ? get().selectedSpawnCell : null,
      isPaletteSelectionMode: false,
      isGroundPaletteSelectionMode: false,
      paletteSelectionStart: null,
      paletteSelectionCurrent: null,
      groundPaletteSelectionStart: null,
      groundPaletteSelectionCurrent: null,
      clipboard: null,
      isFillBucketMode: false,
      dialogueNpcRelocateFrom: null,
      spawnerRelocateFrom: null,
    });
  },

  handleGridCellClick: (row, col, saveHistory = true, paintStroke = false, opts) => {
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
      floodFillCollidables,
      dialogueNpcRelocateFrom,
      dialogueNpcs,
      spawnerRelocateFrom,
      spawnerMeta,
    } = get();

    if (dialogueNpcRelocateFrom) {
      if (paintStroke) return;
      const { row: fr, col: fc } = dialogueNpcRelocateFrom;
      if (row === fr && col === fc) {
        set({ dialogueNpcRelocateFrom: null });
        return;
      }
      const destId = spawnsGrid[row]?.[col] ?? 0;
      if (destId > 0) return;
      const entry = dialogueNpcs.find((e) => e.row === fr && e.col === fc);
      if (!entry) {
        set({ dialogueNpcRelocateFrom: null });
        return;
      }
      const sourceTileId = spawnsGrid[fr]?.[fc] ?? 0;
      if (!isNpcDialogueSpawnTile(sourceTileId)) {
        set({ dialogueNpcRelocateFrom: null });
        return;
      }
      saveToHistory();
      const mapSize = getMapSideLength(groundGrid);
      let newGrid = replaceCellInGrid(spawnsGrid, fr, fc, 0);
      newGrid = replaceCellInGrid(newGrid, row, col, sourceTileId);
      const normalized = normalizeDialogueNpcs([{ ...entry, row, col }], mapSize);
      const movedEntry =
        normalized[0] ?? makeDialogueNpcEntry(row, col, mapSize, entry, sourceTileId);
      const nextDialogue = [
        ...dialogueNpcs.filter((e) => !(e.row === fr && e.col === fc)),
        movedEntry,
      ];
      set((s) => ({
        spawnsGrid: newGrid,
        dialogueNpcs: nextDialogue,
        spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newGrid, s.spawnerMeta),
        selectedSpawnCell: { row, col },
        npcConfigModal: { row, col },
        dialogueNpcRelocateFrom: null,
      }));
      return;
    }

    if (spawnerRelocateFrom) {
      if (paintStroke) return;
      const { row: fr, col: fc } = spawnerRelocateFrom;
      if (row === fr && col === fc) {
        set({ spawnerRelocateFrom: null });
        return;
      }
      const destId = spawnsGrid[row]?.[col] ?? 0;
      if (destId > 0) return;
      const sourceId = spawnsGrid[fr]?.[fc] ?? 0;
      if (sourceId <= 0 || isNpcDialogueSpawnTile(sourceId)) {
        set({ spawnerRelocateFrom: null });
        return;
      }
      saveToHistory();
      let newGrid = replaceCellInGrid(spawnsGrid, fr, fc, 0);
      newGrid = replaceCellInGrid(newGrid, row, col, sourceId);
      const metaAtSource = spawnerMeta.find((e) => e.row === fr && e.col === fc);
      const restMeta = spawnerMeta.filter(
        (e) => !((e.row === fr && e.col === fc) || (e.row === row && e.col === col)),
      );
      const movedName = metaAtSource?.name?.trim();
      const hasMovedMeta =
        !!metaAtSource &&
        (!!movedName || metaAtSource.respawnIntervalSec !== undefined);
      const nextSpawnerMetaRaw = hasMovedMeta
        ? [
            ...restMeta,
            {
              row,
              col,
              ...(movedName ? { name: movedName.slice(0, 48) } : {}),
              ...(metaAtSource!.respawnIntervalSec !== undefined
                ? { respawnIntervalSec: metaAtSource!.respawnIntervalSec }
                : {}),
            },
          ]
        : restMeta;
      const nextDialogue = dialogueNpcs.filter(
        (e) => !((e.row === fr && e.col === fc) || (e.row === row && e.col === col)),
      );
      set((s) => ({
        spawnsGrid: newGrid,
        dialogueNpcs: nextDialogue,
        spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newGrid, nextSpawnerMetaRaw),
        selectedSpawnCell: { row, col },
        spawnerConfigModal: { row, col },
        spawnerRelocateFrom: null,
        selectedTileId: sourceId,
      }));
      return;
    }

    if (!paintStroke) {
      const cur = spawnsGrid[row]?.[col] ?? 0;
      if (cur > 0) {
        if (isNpcDialogueSpawnTile(cur)) {
          set({
            selectedSpawnCell: { row, col },
            npcConfigModal: { row, col },
          });
        } else {
          get().openSpawnerMetaEditor(row, col);
        }
        return;
      }
      set({ selectedSpawnCell: null });
    }

    if (get().sidebarSection !== "tiles") {
      return;
    }

    if (saveHistory) {
      saveToHistory();
    }

    if (clipboard && !opts?.skipClipboard) {
      pasteClipboard(row, col);
      return;
    }

    if (!opts?.skipFillBucket && isFillBucketMode && activeLayer === "ground") {
      floodFillGround(row, col, selectedTileId);
      return;
    }

    if (!opts?.skipFillBucket && isFillBucketMode && activeLayer === "collidables") {
      floodFillCollidables(row, col, selectedTileId);
      return;
    }

    const { brushSize } = get();
    if (brushSize > 1) {
      const mapSize = getMapSideLength(groundGrid);
      const r0 = Math.max(0, row);
      const c0 = Math.max(0, col);
      const r1 = Math.min(mapSize, row + brushSize);
      const c1 = Math.min(mapSize, col + brushSize);
      if (r0 >= r1 || c0 >= c1) return;

      if (activeLayer === "ground") {
        set({
          groundGrid: fillRectInGrid(groundGrid, row, col, brushSize, selectedTileId, mapSize),
        });
        return;
      }

      if (activeLayer === "collidables") {
        set({
          collidablesGrid: fillRectInGrid(
            collidablesGrid,
            row,
            col,
            brushSize,
            selectedTileId,
            mapSize,
          ),
        });
        return;
      }

      if (activeLayer === "decals") {
        const newDecals = fillRectInGrid(decalsGrid, row, col, brushSize, selectedTileId, mapSize);
        set((s) => ({
          decalsGrid: newDecals,
          messageDecals: reconcileMessageDecalsWithDecalsLayer(
            newDecals,
            s.messageDecals,
            mapSize,
          ),
        }));
        return;
      }

      if (activeLayer === "spawns") {
        const dialogueBefore = get().dialogueNpcs;
        const prevMap = new Map(
          dialogueBefore.map((e) => [`${e.row},${e.col}`, e] as const),
        );
        let nextDialogue = dialogueBefore.filter(
          (e) => !(e.row >= r0 && e.row < r1 && e.col >= c0 && e.col < c1),
        );
        const newSpawns = spawnsGrid.map((rowArr) => [...rowArr]);
        for (let r = r0; r < r1; r++) {
          for (let c = c0; c < c1; c++) {
            newSpawns[r][c] = selectedTileId;
          }
        }
        if (isNpcDialogueSpawnTile(selectedTileId)) {
          for (let r = r0; r < r1; r++) {
            for (let c = c0; c < c1; c++) {
              const prev = prevMap.get(`${r},${c}`);
              nextDialogue = [
                ...nextDialogue,
                makeDialogueNpcEntry(r, c, mapSize, prev, selectedTileId),
              ];
            }
          }
        }
        set((s) => ({
          spawnsGrid: newSpawns,
          dialogueNpcs: nextDialogue,
          spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newSpawns, s.spawnerMeta),
        }));
        return;
      }
    }

    if (activeLayer === "spawns") {
      const currentTileId = spawnsGrid[row][col];
      const newTileId = paintStroke
        ? selectedTileId
        : currentTileId === selectedTileId && selectedTileId !== 0
          ? 0
          : selectedTileId;

      const newGrid = replaceCellInGrid(spawnsGrid, row, col, newTileId);

      const { dialogueNpcs } = get();
      const mapSize = getMapSideLength(groundGrid);
      const prevEntry = dialogueNpcs.find((e) => e.row === row && e.col === col);
      let nextDialogue = dialogueNpcs.filter((e) => !(e.row === row && e.col === col));
      if (isNpcDialogueSpawnTile(newTileId)) {
        nextDialogue = [
          ...nextDialogue,
          makeDialogueNpcEntry(row, col, mapSize, prevEntry, newTileId),
        ];
      }
      set((s) => ({
        spawnsGrid: newGrid,
        dialogueNpcs: nextDialogue,
        spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newGrid, s.spawnerMeta),
        spawnerConfigModal:
          s.spawnerConfigModal?.row === row && s.spawnerConfigModal?.col === col &&
          (newTileId === 0 || isNpcDialogueSpawnTile(newTileId))
            ? null
            : s.spawnerConfigModal,
      }));
      return;
    }

    if (activeLayer === "decals") {
      const currentTileId = decalsGrid[row][col];
      const newTileId = paintStroke
        ? selectedTileId
        : currentTileId === selectedTileId && selectedTileId !== 0
          ? 0
          : selectedTileId;

      const newGrid = replaceCellInGrid(decalsGrid, row, col, newTileId);
      const mapSize = getMapSideLength(groundGrid);
      set((s) => ({
        decalsGrid: newGrid,
        messageDecals: reconcileMessageDecalsWithDecalsLayer(
          newGrid,
          s.messageDecals,
          mapSize,
        ),
      }));
      return;
    }

    if (activeLayer === "ground") {
      const newGrid = replaceCellInGrid(groundGrid, row, col, selectedTileId);
      set({ groundGrid: newGrid });
    } else {
      const currentTileId = collidablesGrid[row][col];
      const newTileId = paintStroke
        ? selectedTileId
        : currentTileId === selectedTileId && selectedTileId !== -1
          ? -1
          : selectedTileId;

      const newGrid = replaceCellInGrid(collidablesGrid, row, col, newTileId);
      set({ collidablesGrid: newGrid });
    }
  },

  eraseGridCell: (row, col) => {
    const {
      saveToHistory,
      activeLayer,
      groundGrid,
      collidablesGrid,
      spawnsGrid,
      decalsGrid,
      dialogueNpcs,
    } = get();
    saveToHistory();
    if (activeLayer === "ground") {
      set({ groundGrid: replaceCellInGrid(groundGrid, row, col, 0) });
      return;
    }
    if (activeLayer === "collidables") {
      set({ collidablesGrid: replaceCellInGrid(collidablesGrid, row, col, -1) });
      return;
    }
    if (activeLayer === "spawns") {
      const newGrid = replaceCellInGrid(spawnsGrid, row, col, 0);
      const nextDialogue = dialogueNpcs.filter((e) => !(e.row === row && e.col === col));
      const sr = get().spawnerRelocateFrom;
      const nextSpawnerRelocate =
        sr?.row === row && sr?.col === col ? null : sr;
      set((s) => ({
        spawnsGrid: newGrid,
        dialogueNpcs: nextDialogue,
        spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newGrid, s.spawnerMeta),
        spawnerConfigModal:
          s.spawnerConfigModal?.row === row && s.spawnerConfigModal?.col === col
            ? null
            : s.spawnerConfigModal,
        spawnerRelocateFrom: nextSpawnerRelocate,
      }));
      return;
    }
    if (activeLayer === "decals") {
      const newGrid = replaceCellInGrid(decalsGrid, row, col, 0);
      const mapSize = getMapSideLength(groundGrid);
      set((s) => ({
        decalsGrid: newGrid,
        messageDecals: reconcileMessageDecalsWithDecalsLayer(
          newGrid,
          s.messageDecals,
          mapSize,
        ),
      }));
    }
  },

  eraseGridBrush: (row, col) => {
    const { brushSize } = get();
    if (brushSize <= 1) {
      get().eraseGridCell(row, col);
      return;
    }

    const {
      saveToHistory,
      activeLayer,
      groundGrid,
      collidablesGrid,
      spawnsGrid,
      decalsGrid,
      dialogueNpcs,
    } = get();
    saveToHistory();
    const mapSize = getMapSideLength(groundGrid);
    const r0 = Math.max(0, row);
    const c0 = Math.max(0, col);
    const r1 = Math.min(mapSize, row + brushSize);
    const c1 = Math.min(mapSize, col + brushSize);
    if (r0 >= r1 || c0 >= c1) return;

    if (activeLayer === "ground") {
      set({ groundGrid: fillRectInGrid(groundGrid, row, col, brushSize, 0, mapSize) });
      return;
    }
    if (activeLayer === "collidables") {
      set({
        collidablesGrid: fillRectInGrid(collidablesGrid, row, col, brushSize, -1, mapSize),
      });
      return;
    }
    if (activeLayer === "spawns") {
      const nextDialogue = dialogueNpcs.filter(
        (e) => !(e.row >= r0 && e.row < r1 && e.col >= c0 && e.col < c1),
      );
      const newSpawns = spawnsGrid.map((rowArr) => [...rowArr]);
      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          newSpawns[r][c] = 0;
        }
      }
      set((s) => {
        const rel = s.spawnerRelocateFrom;
        const clearRelocate =
          rel &&
          rel.row >= r0 &&
          rel.row < r1 &&
          rel.col >= c0 &&
          rel.col < c1;
        return {
          spawnsGrid: newSpawns,
          dialogueNpcs: nextDialogue,
          spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newSpawns, s.spawnerMeta),
          spawnerConfigModal:
            s.spawnerConfigModal &&
            s.spawnerConfigModal.row >= r0 &&
            s.spawnerConfigModal.row < r1 &&
            s.spawnerConfigModal.col >= c0 &&
            s.spawnerConfigModal.col < c1
              ? null
              : s.spawnerConfigModal,
          spawnerRelocateFrom: clearRelocate ? null : s.spawnerRelocateFrom,
        };
      });
      return;
    }
    if (activeLayer === "decals") {
      const newDecals = fillRectInGrid(decalsGrid, row, col, brushSize, 0, mapSize);
      set((s) => ({
        decalsGrid: newDecals,
        messageDecals: reconcileMessageDecalsWithDecalsLayer(
          newDecals,
          s.messageDecals,
          mapSize,
        ),
      }));
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

  floodFillCollidables: (startRow, startCol, newTileId) => {
    const { collidablesGrid } = get();
    const mapSize = collidablesGrid.length;
    const originalTileId = collidablesGrid[startRow]?.[startCol];

    if (originalTileId === newTileId) return;

    const newGrid = collidablesGrid.map((row) => [...row]);
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

    set({ collidablesGrid: newGrid });
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

      set((s) => ({
        decalsGrid: newDecalsGrid,
        messageDecals: reconcileMessageDecalsWithDecalsLayer(
          newDecalsGrid,
          s.messageDecals,
          mapSize,
        ),
      }));
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

      const { dialogueNpcs } = get();
      set((s) => ({
        spawnsGrid: newSpawnsGrid,
        dialogueNpcs: reconcileDialogueNpcsWithSpawnsLayer(newSpawnsGrid, dialogueNpcs),
        spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(newSpawnsGrid, s.spawnerMeta),
      }));
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
