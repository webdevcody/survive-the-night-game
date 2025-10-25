import { useState, useEffect, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

// Constants
const TILE_SIZE = 16;
const BIOME_SIZE = 16;

type Layer = "ground" | "collidables";

interface BiomeData {
  ground: number[][];
  collidables: number[][];
}

interface SheetDimensions {
  cols: number;
  rows: number;
  totalTiles: number;
}

// Initialize empty ground layer (16x16 grid of zeros)
const createEmptyGroundLayer = (): number[][] => {
  return Array(BIOME_SIZE)
    .fill(0)
    .map(() => Array(BIOME_SIZE).fill(0));
};

// Initialize empty collidables layer (16x16 grid of -1, meaning no collision)
const createEmptyCollidablesLayer = (): number[][] => {
  return Array(BIOME_SIZE)
    .fill(0)
    .map(() => Array(BIOME_SIZE).fill(-1));
};

interface ClipboardData {
  tiles: number[][];  // Tile IDs in the selected rectangle
  width: number;
  height: number;
  layer: Layer;  // Which layer the clipboard is from
}

interface Position {
  row: number;
  col: number;
}

export default function BiomeEditor() {
  const [groundGrid, setGroundGrid] = useState<number[][]>(createEmptyGroundLayer());
  const [collidablesGrid, setCollidablesGrid] = useState<number[][]>(createEmptyCollidablesLayer());
  const [activeLayer, setActiveLayer] = useState<Layer>("ground");
  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [exportText, setExportText] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasModifiedDuringDrag, setHasModifiedDuringDrag] = useState<boolean>(false);

  // Create new biome dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [newBiomeName, setNewBiomeName] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Biome management state
  const [biomes, setBiomes] = useState<Array<{ name: string; fileName: string; constantName: string }>>([]);
  const [currentBiome, setCurrentBiome] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isBiomesLoaded, setIsBiomesLoaded] = useState<boolean>(false);

  // Items management state
  const [spawnableEntities, setSpawnableEntities] = useState<string[]>([]);
  const [currentItems, setCurrentItems] = useState<string[]>([]);

  // Palette selection state for collidables
  const [isPaletteSelectionMode, setIsPaletteSelectionMode] = useState<boolean>(false);
  const [paletteSelectionStart, setPaletteSelectionStart] = useState<Position | null>(null);
  const [paletteSelectionCurrent, setPaletteSelectionCurrent] = useState<Position | null>(null);

  // Palette selection state for ground
  const [isGroundPaletteSelectionMode, setIsGroundPaletteSelectionMode] = useState<boolean>(false);
  const [groundPaletteSelectionStart, setGroundPaletteSelectionStart] = useState<Position | null>(null);
  const [groundPaletteSelectionCurrent, setGroundPaletteSelectionCurrent] = useState<Position | null>(null);

  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  // History stack for undo functionality
  const [history, setHistory] = useState<BiomeData[]>([]);

  // Dynamically detected tilesheet dimensions
  const [groundDimensions, setGroundDimensions] = useState<SheetDimensions>({
    cols: 10,
    rows: 3,
    totalTiles: 30,
  });
  const [collidablesDimensions, setCollidablesDimensions] = useState<SheetDimensions>({
    cols: 10,
    rows: 3,
    totalTiles: 30,
  });
  const [sheetsLoaded, setSheetsLoaded] = useState(false);

  // Load and detect tilesheet dimensions
  useEffect(() => {
    const loadSheetDimensions = async () => {
      const groundImg = new Image();
      const collidablesImg = new Image();

      const groundPromise = new Promise<SheetDimensions>((resolve) => {
        groundImg.onload = () => {
          const cols = Math.floor(groundImg.width / TILE_SIZE);
          const rows = Math.floor(groundImg.height / TILE_SIZE);
          resolve({ cols, rows, totalTiles: cols * rows });
        };
        groundImg.src = "/sheets/ground.png";
      });

      const collidablesPromise = new Promise<SheetDimensions>((resolve) => {
        collidablesImg.onload = () => {
          const cols = Math.floor(collidablesImg.width / TILE_SIZE);
          const rows = Math.floor(collidablesImg.height / TILE_SIZE);
          resolve({ cols, rows, totalTiles: cols * rows });
        };
        collidablesImg.src = "/sheets/collidables.png";
      });

      const [groundDims, collidablesDims] = await Promise.all([groundPromise, collidablesPromise]);

      setGroundDimensions(groundDims);
      setCollidablesDimensions(collidablesDims);
      setSheetsLoaded(true);
    };

    loadSheetDimensions();
  }, []);

  // Get the appropriate tilesheet image URL for the active layer
  const getLayerImage = (layer: Layer) => {
    return layer === "ground" ? "/sheets/ground.png" : "/sheets/collidables.png";
  };

  // Save current state to history before making changes
  const saveToHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev,
      {
        ground: groundGrid.map((row) => [...row]),
        collidables: collidablesGrid.map((row) => [...row]),
      },
    ]);
  }, [groundGrid, collidablesGrid]);

  // Undo the last change
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;

      const previousState = prev[prev.length - 1];
      setGroundGrid(previousState.ground);
      setCollidablesGrid(previousState.collidables);
      return prev.slice(0, -1);
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo]);

  // Fetch spawnable entities on mount
  useEffect(() => {
    const fetchSpawnableEntities = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/entities/spawnable");
        const data = await response.json();
        setSpawnableEntities(data.entities);
      } catch (error) {
        console.error("Failed to fetch spawnable entities:", error);
      }
    };

    fetchSpawnableEntities();
  }, []);

  // Fetch biomes list on mount
  useEffect(() => {
    const fetchBiomes = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/biomes");
        const data = await response.json();
        setBiomes(data.biomes);
        setIsBiomesLoaded(true);

        // Auto-select first biome
        if (data.biomes.length > 0) {
          loadBiome(data.biomes[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch biomes:", error);
      }
    };

    fetchBiomes();
  }, []);

  // Load biome data from API
  const loadBiome = async (biomeName: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/biomes/${biomeName}`);
      const data = await response.json();

      saveToHistory(); // Save current state before loading new biome
      setGroundGrid(data.ground);
      setCollidablesGrid(data.collidables);
      setCurrentItems(data.items || []);
      setCurrentBiome(biomeName);
      setSaveStatus("idle");
    } catch (error) {
      console.error(`Failed to load biome ${biomeName}:`, error);
    }
  };

  // Save current biome to API
  const saveBiome = async () => {
    if (!currentBiome) return;

    setSaveStatus("saving");
    try {
      const response = await fetch(`http://localhost:3001/api/biomes/${currentBiome}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ground: groundGrid,
          collidables: collidablesGrid,
          items: currentItems,
        }),
      });

      if (response.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error(`Failed to save biome ${currentBiome}:`, error);
      setSaveStatus("error");
    }
  };

  // Add an item to the current biome
  const addItem = (entityType: string) => {
    setCurrentItems([...currentItems, `Entities.${entityType.toUpperCase()}`]);
  };

  // Remove an item from the current biome
  const removeItem = (index: number) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index));
  };

  // Handle tile selection from palette
  const handleTileSelect = (row: number, col: number, layer: Layer) => {
    const dimensions = layer === "ground" ? groundDimensions : collidablesDimensions;
    const tileId = row * dimensions.cols + col;
    setSelectedTileId(tileId);
    setActiveLayer(layer);
  };

  // Handle placing tile in biome grid
  const handleGridCellClick = (row: number, col: number, saveHistory = true) => {
    // Save state before making changes (only for non-drag operations)
    if (saveHistory) {
      saveToHistory();
    }

    // If clipboard exists, paste it
    if (clipboard) {
      pasteClipboard(row, col);
      return;
    }

    // Normal paint mode
    if (activeLayer === "ground") {
      const newGrid = groundGrid.map((r, rowIdx) =>
        r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? selectedTileId : cell))
      );
      setGroundGrid(newGrid);
    } else {
      // For collidables: toggle behavior - if clicking the same tile ID, remove it (set to -1)
      const currentTileId = collidablesGrid[row][col];
      const newTileId =
        currentTileId === selectedTileId && selectedTileId !== -1 ? -1 : selectedTileId;

      const newGrid = collidablesGrid.map((r, rowIdx) =>
        r.map((cell, colIdx) => (rowIdx === row && colIdx === col ? newTileId : cell))
      );
      setCollidablesGrid(newGrid);
    }
  };

  // Handle starting a drag operation
  const handleDragStart = () => {
    saveToHistory();
    setIsDragging(true);
    setHasModifiedDuringDrag(false);
  };

  // Handle ending a drag operation
  const handleDragEnd = () => {
    setIsDragging(false);
    setHasModifiedDuringDrag(false);
  };

  // Handle drag painting
  const handleGridCellEnter = (row: number, col: number) => {
    if (isDragging) {
      handleGridCellClick(row, col, false); // Don't save history during drag
      setHasModifiedDuringDrag(true);
    }
  };

  // Convert name to kebab-case
  const toKebabCase = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  // Create new biome
  const handleCreateBiome = async () => {
    if (!newBiomeName.trim()) return;

    const kebabName = toKebabCase(newBiomeName);
    if (!kebabName) return;

    setIsCreating(true);
    try {
      const response = await fetch("http://localhost:3001/api/biomes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: kebabName }),
      });

      if (response.ok) {
        // Refresh biomes list
        const biomesResponse = await fetch("http://localhost:3001/api/biomes");
        const data = await biomesResponse.json();
        setBiomes(data.biomes);

        // Load the newly created biome
        await loadBiome(kebabName);

        // Close dialog and reset
        setIsCreateDialogOpen(false);
        setNewBiomeName("");
      } else {
        const error = await response.json();
        alert(`Failed to create biome: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to create biome:", error);
      alert("Failed to create biome");
    } finally {
      setIsCreating(false);
    }
  };

  // Export biome to JSON
  const handleExport = () => {
    const biomeData: BiomeData = {
      ground: groundGrid,
      collidables: collidablesGrid,
    };
    const json = JSON.stringify(biomeData, null, 2);
    setExportText(json);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
    } catch (error) {
      // Silently fail
    }
  };

  // Clear active layer
  const handleClear = () => {
    saveToHistory();
    if (activeLayer === "ground") {
      setGroundGrid(createEmptyGroundLayer());
    } else {
      setCollidablesGrid(createEmptyCollidablesLayer());
    }
  };

  // Fill active layer with selected tile
  const handleFill = () => {
    saveToHistory();
    const newGrid = Array(BIOME_SIZE)
      .fill(0)
      .map(() => Array(BIOME_SIZE).fill(selectedTileId));
    if (activeLayer === "ground") {
      setGroundGrid(newGrid);
    } else {
      setCollidablesGrid(newGrid);
    }
  };

  // Get normalized palette selection bounds (top-left to bottom-right)
  const getPaletteSelectionBounds = () => {
    if (!paletteSelectionStart || !paletteSelectionCurrent) return null;

    const minRow = Math.min(paletteSelectionStart.row, paletteSelectionCurrent.row);
    const maxRow = Math.max(paletteSelectionStart.row, paletteSelectionCurrent.row);
    const minCol = Math.min(paletteSelectionStart.col, paletteSelectionCurrent.col);
    const maxCol = Math.max(paletteSelectionStart.col, paletteSelectionCurrent.col);

    return { minRow, maxRow, minCol, maxCol };
  };

  // Capture selected tiles from collidables palette to clipboard
  const capturePaletteSelection = () => {
    const bounds = getPaletteSelectionBounds();
    if (!bounds) return;

    const { minRow, maxRow, minCol, maxCol } = bounds;
    const height = maxRow - minRow + 1;
    const width = maxCol - minCol + 1;

    const tiles: number[][] = [];

    for (let row = minRow; row <= maxRow; row++) {
      const tileRow: number[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        const tileId = row * collidablesDimensions.cols + col;
        tileRow.push(tileId);
      }
      tiles.push(tileRow);
    }

    setClipboard({
      tiles,
      width,
      height,
      layer: "collidables",
    });
  };

  // Paste clipboard tiles to the appropriate layer at the specified position (top-left corner)
  const pasteClipboard = (startRow: number, startCol: number) => {
    if (!clipboard) return;

    if (clipboard.layer === "ground") {
      const newGroundGrid = groundGrid.map((row) => [...row]);

      for (let row = 0; row < clipboard.height; row++) {
        for (let col = 0; col < clipboard.width; col++) {
          const targetRow = startRow + row;
          const targetCol = startCol + col;

          // Skip if out of bounds
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

      setGroundGrid(newGroundGrid);
    } else {
      const newCollidablesGrid = collidablesGrid.map((row) => [...row]);

      for (let row = 0; row < clipboard.height; row++) {
        for (let col = 0; col < clipboard.width; col++) {
          const targetRow = startRow + row;
          const targetCol = startCol + col;

          // Skip if out of bounds
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

      setCollidablesGrid(newCollidablesGrid);
    }
  };

  // Handle palette selection mouse down
  const handlePaletteSelectionMouseDown = (row: number, col: number) => {
    setPaletteSelectionStart({ row, col });
    setPaletteSelectionCurrent({ row, col });
  };

  // Handle palette selection mouse move
  const handlePaletteSelectionMouseMove = (row: number, col: number) => {
    if (paletteSelectionStart) {
      setPaletteSelectionCurrent({ row, col });
    }
  };

  // Handle palette selection mouse up
  const handlePaletteSelectionMouseUp = () => {
    if (paletteSelectionStart && paletteSelectionCurrent) {
      capturePaletteSelection();
    }
    setPaletteSelectionStart(null);
    setPaletteSelectionCurrent(null);
  };

  // Toggle palette selection mode and clear selection state
  const togglePaletteSelectionMode = () => {
    setIsPaletteSelectionMode(!isPaletteSelectionMode);
    setPaletteSelectionStart(null);
    setPaletteSelectionCurrent(null);
  };

  // Switch active layer and reset all selection states
  const switchLayer = (layer: Layer) => {
    setActiveLayer(layer);
    // Reset selected tile to default for each layer
    setSelectedTileId(layer === "ground" ? 0 : -1);
    // Clear all multi-select modes
    setIsPaletteSelectionMode(false);
    setIsGroundPaletteSelectionMode(false);
    // Clear all selection bounds
    setPaletteSelectionStart(null);
    setPaletteSelectionCurrent(null);
    setGroundPaletteSelectionStart(null);
    setGroundPaletteSelectionCurrent(null);
    // Clear clipboard
    setClipboard(null);
  };

  // Ground palette selection handlers
  const getGroundPaletteSelectionBounds = () => {
    if (!groundPaletteSelectionStart || !groundPaletteSelectionCurrent) return null;

    const minRow = Math.min(groundPaletteSelectionStart.row, groundPaletteSelectionCurrent.row);
    const maxRow = Math.max(groundPaletteSelectionStart.row, groundPaletteSelectionCurrent.row);
    const minCol = Math.min(groundPaletteSelectionStart.col, groundPaletteSelectionCurrent.col);
    const maxCol = Math.max(groundPaletteSelectionStart.col, groundPaletteSelectionCurrent.col);

    return { minRow, maxRow, minCol, maxCol };
  };

  const captureGroundPaletteSelection = () => {
    const bounds = getGroundPaletteSelectionBounds();
    if (!bounds) return;

    const { minRow, maxRow, minCol, maxCol } = bounds;
    const height = maxRow - minRow + 1;
    const width = maxCol - minCol + 1;

    const tiles: number[][] = [];

    for (let row = minRow; row <= maxRow; row++) {
      const tileRow: number[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        const tileId = row * groundDimensions.cols + col;
        tileRow.push(tileId);
      }
      tiles.push(tileRow);
    }

    setClipboard({
      tiles,
      width,
      height,
      layer: "ground",
    });
  };

  const handleGroundPaletteSelectionMouseDown = (row: number, col: number) => {
    setGroundPaletteSelectionStart({ row, col });
    setGroundPaletteSelectionCurrent({ row, col });
  };

  const handleGroundPaletteSelectionMouseMove = (row: number, col: number) => {
    if (groundPaletteSelectionStart) {
      setGroundPaletteSelectionCurrent({ row, col });
    }
  };

  const handleGroundPaletteSelectionMouseUp = () => {
    if (groundPaletteSelectionStart && groundPaletteSelectionCurrent) {
      captureGroundPaletteSelection();
    }
    setGroundPaletteSelectionStart(null);
    setGroundPaletteSelectionCurrent(null);
  };

  const toggleGroundPaletteSelectionMode = () => {
    setIsGroundPaletteSelectionMode(!isGroundPaletteSelectionMode);
    setGroundPaletteSelectionStart(null);
    setGroundPaletteSelectionCurrent(null);
  };

  // Show loading state while detecting tilesheet dimensions or biomes
  if (!sheetsLoaded || !isBiomesLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-xl">
          {!sheetsLoaded ? "Loading tilesheets..." : "Loading biomes..."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            Biome Editor
            <span className="text-sm text-gray-400 ml-4">
              Ground: {groundDimensions.cols}×{groundDimensions.rows} ({groundDimensions.totalTiles}{" "}
              tiles) | Collidables: {collidablesDimensions.cols}×{collidablesDimensions.rows} (
              {collidablesDimensions.totalTiles} tiles)
            </span>
          </h1>

          <div className="flex gap-3">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-lg"
            >
              Create New Biome
            </Button>
            <Button
              onClick={saveBiome}
              disabled={!currentBiome || saveStatus === "saving"}
              className={`${
                saveStatus === "saved"
                  ? "bg-green-600 hover:bg-green-700"
                  : saveStatus === "error"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
              } text-white px-6 py-2 text-lg`}
            >
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                  ? "Saved!"
                  : saveStatus === "error"
                    ? "Error!"
                    : "Save Biome"}
            </Button>
          </div>
        </div>

        {/* Biome Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {biomes.map((biome) => (
            <Button
              key={biome.name}
              onClick={() => loadBiome(biome.name)}
              className={`${
                currentBiome === biome.name
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-700 hover:bg-gray-600"
              } text-white px-4 py-2 whitespace-nowrap`}
            >
              {biome.constantName.replace(/_/g, " ")}
            </Button>
          ))}
        </div>


        {/* Main Editor */}
        <div className="flex gap-6 mb-6">
          {/* Biome Grid Editor */}
          <div className="flex-1">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-lg font-medium">
                    Biome Grid (16×16)
                    {currentBiome && (
                      <span className="text-blue-400 ml-2">
                        - {currentBiome.toUpperCase().replace(/-/g, " ")}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Active Layer:{" "}
                    <span className={activeLayer === "ground" ? "text-green-400" : "text-red-400"}>
                      {activeLayer === "ground" ? "Ground" : "Collidables"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={undo}
                    size="sm"
                    disabled={history.length === 0}
                    className={`${
                      history.length > 0
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-gray-600 cursor-not-allowed"
                    } text-white border border-gray-600`}
                    title={`Undo (Ctrl+Z) - ${history.length} action${history.length !== 1 ? "s" : ""} available`}
                  >
                    Undo ({history.length})
                  </Button>
                  <Button
                    onClick={handleFill}
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    Fill Layer
                  </Button>
                  <Button
                    onClick={handleClear}
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  >
                    Clear Layer
                  </Button>
                </div>
              </div>

              <div
                className="inline-block border-2 border-gray-600 bg-gray-900"
                onMouseDown={handleDragStart}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {groundGrid.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex">
                    {row.map((groundTileId, colIdx) => {
                      const collidableTileId = collidablesGrid[rowIdx][colIdx];

                      return (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className="relative border border-gray-700 cursor-pointer hover:border-yellow-500 transition-colors"
                          style={{
                            width: `${TILE_SIZE * 2}px`,
                            height: `${TILE_SIZE * 2}px`,
                          }}
                          onClick={() => handleGridCellClick(rowIdx, colIdx)}
                          onMouseEnter={() => handleGridCellEnter(rowIdx, colIdx)}
                        >
                          {/* Ground layer */}
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: "url(/sheets/ground.png)",
                              backgroundSize: `${groundDimensions.cols * TILE_SIZE * 2}px ${
                                groundDimensions.rows * TILE_SIZE * 2
                              }px`,
                              backgroundPosition: `-${
                                (groundTileId % groundDimensions.cols) * TILE_SIZE * 2
                              }px -${
                                Math.floor(groundTileId / groundDimensions.cols) * TILE_SIZE * 2
                              }px`,
                              imageRendering: "pixelated",
                            }}
                          />
                          {/* Collidables layer (only if not -1, which means empty) */}
                          {collidableTileId !== -1 && (
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage: "url(/sheets/collidables.png)",
                                backgroundSize: `${collidablesDimensions.cols * TILE_SIZE * 2}px ${
                                  collidablesDimensions.rows * TILE_SIZE * 2
                                }px`,
                                backgroundPosition: `-${
                                  (collidableTileId % collidablesDimensions.cols) * TILE_SIZE * 2
                                }px -${
                                  Math.floor(collidableTileId / collidablesDimensions.cols) *
                                  TILE_SIZE *
                                  2
                                }px`,
                                imageRendering: "pixelated",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-400">
                Click to place tile • Drag to paint
                {activeLayer === "collidables" && " • Click same tile to remove"}
                {clipboard && (
                  <>
                    <br />
                    <span className="text-purple-400 font-semibold">
                      Clipboard active ({clipboard.width}×{clipboard.height} {clipboard.layer}) - Click grid to paste
                    </span>
                  </>
                )}
                <br />
                Editing:{" "}
                <span className={activeLayer === "ground" ? "text-green-400" : "text-red-400"}>
                  {activeLayer === "ground" ? "Ground" : "Collidables"}
                </span>{" "}
                •{" "}
                {activeLayer === "collidables" && selectedTileId === -1
                  ? "Eraser (remove object)"
                  : `Tile #${selectedTileId}`}
              </div>
            </div>
          </div>

          {/* Tile Palettes */}
          <div className="w-[400px]">
            {/* Layer Tabs */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => switchLayer("ground")}
                className={`flex-1 ${
                  activeLayer === "ground"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-700 hover:bg-gray-600"
                } text-white px-4 py-2`}
              >
                Ground Tiles
              </Button>
              <Button
                onClick={() => switchLayer("collidables")}
                className={`flex-1 ${
                  activeLayer === "collidables"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-700 hover:bg-gray-600"
                } text-white px-4 py-2`}
              >
                Collidables
              </Button>
            </div>

            {/* Ground Palette */}
            {activeLayer === "ground" && (
              <div className="bg-gray-800 p-4 rounded-lg border-2 border-green-500">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-lg text-green-400">Ground Tiles</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={toggleGroundPaletteSelectionMode}
                    size="sm"
                    className={`${
                      isGroundPaletteSelectionMode
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-700 hover:bg-gray-600"
                    } text-white border border-gray-600`}
                  >
                    {isGroundPaletteSelectionMode ? "Exit Multi-Select" : "Multi-Select"}
                  </Button>
                  {clipboard && clipboard.layer === "ground" && (
                    <Button
                      onClick={() => setClipboard(null)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500"
                      title="Clear clipboard"
                    >
                      Clear ({clipboard.width}×{clipboard.height})
                    </Button>
                  )}
                </div>
              </div>

              <div
                className="inline-block border-2 border-gray-600 bg-gray-900"
                onMouseDown={(e) => {
                  if (isGroundPaletteSelectionMode) {
                    e.preventDefault();
                  }
                }}
                onMouseUp={() => {
                  if (isGroundPaletteSelectionMode) {
                    handleGroundPaletteSelectionMouseUp();
                  }
                }}
                onMouseLeave={() => {
                  if (isGroundPaletteSelectionMode) {
                    handleGroundPaletteSelectionMouseUp();
                  }
                }}
              >
                {Array.from({ length: groundDimensions.rows }, (_, rowIdx) => (
                  <div key={rowIdx} className="flex">
                    {Array.from({ length: groundDimensions.cols }, (_, colIdx) => {
                      const tileId = rowIdx * groundDimensions.cols + colIdx;
                      const isSelected = tileId === selectedTileId && activeLayer === "ground";

                      // Check if this tile is in the palette selection
                      const bounds = getGroundPaletteSelectionBounds();
                      const isInSelection =
                        bounds &&
                        rowIdx >= bounds.minRow &&
                        rowIdx <= bounds.maxRow &&
                        colIdx >= bounds.minCol &&
                        colIdx <= bounds.maxCol;

                      return (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className={`relative border cursor-pointer transition-all ${
                            isSelected
                              ? "border-green-400 border-2"
                              : "border-gray-700 hover:border-green-500"
                          }`}
                          style={{
                            width: `${TILE_SIZE * 2}px`,
                            height: `${TILE_SIZE * 2}px`,
                            backgroundImage: "url(/sheets/ground.png)",
                            backgroundSize: `${groundDimensions.cols * TILE_SIZE * 2}px ${
                              groundDimensions.rows * TILE_SIZE * 2
                            }px`,
                            backgroundPosition: `-${colIdx * TILE_SIZE * 2}px -${
                              rowIdx * TILE_SIZE * 2
                            }px`,
                            imageRendering: "pixelated",
                          }}
                          onClick={() => {
                            if (!isGroundPaletteSelectionMode) {
                              handleTileSelect(rowIdx, colIdx, "ground");
                            }
                          }}
                          onMouseDown={() => {
                            if (isGroundPaletteSelectionMode) {
                              handleGroundPaletteSelectionMouseDown(rowIdx, colIdx);
                            }
                          }}
                          onMouseEnter={() => {
                            if (isGroundPaletteSelectionMode) {
                              handleGroundPaletteSelectionMouseMove(rowIdx, colIdx);
                            }
                          }}
                          title={`Ground Tile ID: ${tileId}`}
                        >
                          {/* Selection overlay */}
                          {isInSelection && (
                            <div
                              className="absolute inset-0 border-2 border-blue-400 bg-blue-400 bg-opacity-30 pointer-events-none"
                              style={{ zIndex: 10 }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-green-400">
                {isGroundPaletteSelectionMode ? (
                  <span className="text-blue-400 font-semibold">
                    MULTI-SELECT MODE: Drag to select rectangle
                  </span>
                ) : (
                  <>Selected: Tile #{selectedTileId}</>
                )}
              </div>
              </div>
            )}

            {/* Collidables Palette */}
            {activeLayer === "collidables" && (
              <div className="bg-gray-800 p-4 rounded-lg border-2 border-red-500">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-lg text-red-400">Collidable Objects</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={togglePaletteSelectionMode}
                    size="sm"
                    className={`${
                      isPaletteSelectionMode
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-700 hover:bg-gray-600"
                    } text-white border border-gray-600`}
                  >
                    {isPaletteSelectionMode ? "Exit Multi-Select" : "Multi-Select"}
                  </Button>
                  {clipboard && clipboard.layer === "collidables" && (
                    <Button
                      onClick={() => setClipboard(null)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500"
                      title="Clear clipboard"
                    >
                      Clear ({clipboard.width}×{clipboard.height})
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setSelectedTileId(-1);
                      setActiveLayer("collidables");
                      setIsPaletteSelectionMode(false);
                    }}
                    size="sm"
                    className={`${
                      selectedTileId === -1 && activeLayer === "collidables"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-gray-700 hover:bg-gray-600"
                    } text-white border border-gray-600`}
                  >
                    Eraser
                  </Button>
                </div>
              </div>

              <div
                className="inline-block border-2 border-gray-600 bg-gray-900"
                onMouseDown={(e) => {
                  if (isPaletteSelectionMode) {
                    e.preventDefault();
                  }
                }}
                onMouseUp={() => {
                  if (isPaletteSelectionMode) {
                    handlePaletteSelectionMouseUp();
                  }
                }}
                onMouseLeave={() => {
                  if (isPaletteSelectionMode) {
                    handlePaletteSelectionMouseUp();
                  }
                }}
              >
                {Array.from({ length: collidablesDimensions.rows }, (_, rowIdx) => (
                  <div key={rowIdx} className="flex">
                    {Array.from({ length: collidablesDimensions.cols }, (_, colIdx) => {
                      const tileId = rowIdx * collidablesDimensions.cols + colIdx;
                      const isSelected = tileId === selectedTileId && activeLayer === "collidables";

                      // Check if this tile is in the palette selection
                      const bounds = getPaletteSelectionBounds();
                      const isInSelection =
                        bounds &&
                        rowIdx >= bounds.minRow &&
                        rowIdx <= bounds.maxRow &&
                        colIdx >= bounds.minCol &&
                        colIdx <= bounds.maxCol;

                      return (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className={`relative border cursor-pointer transition-all ${
                            isSelected
                              ? "border-red-400 border-2"
                              : "border-gray-700 hover:border-red-500"
                          }`}
                          style={{
                            width: `${TILE_SIZE * 2}px`,
                            height: `${TILE_SIZE * 2}px`,
                            backgroundImage: "url(/sheets/collidables.png)",
                            backgroundSize: `${collidablesDimensions.cols * TILE_SIZE * 2}px ${
                              collidablesDimensions.rows * TILE_SIZE * 2
                            }px`,
                            backgroundPosition: `-${colIdx * TILE_SIZE * 2}px -${
                              rowIdx * TILE_SIZE * 2
                            }px`,
                            imageRendering: "pixelated",
                          }}
                          onClick={() => {
                            if (!isPaletteSelectionMode) {
                              handleTileSelect(rowIdx, colIdx, "collidables");
                            }
                          }}
                          onMouseDown={() => {
                            if (isPaletteSelectionMode) {
                              handlePaletteSelectionMouseDown(rowIdx, colIdx);
                            }
                          }}
                          onMouseEnter={() => {
                            if (isPaletteSelectionMode) {
                              handlePaletteSelectionMouseMove(rowIdx, colIdx);
                            }
                          }}
                          title={`Collidable Tile ID: ${tileId}`}
                        >
                          {/* Selection overlay */}
                          {isInSelection && (
                            <div
                              className="absolute inset-0 border-2 border-blue-400 bg-blue-400 bg-opacity-30 pointer-events-none"
                              style={{ zIndex: 10 }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-red-400">
                {isPaletteSelectionMode ? (
                  <span className="text-blue-400 font-semibold">
                    MULTI-SELECT MODE: Drag to select rectangle
                  </span>
                ) : (
                  <>
                    Selected:{" "}
                    {selectedTileId === -1 ? "Eraser (remove object)" : `Tile #${selectedTileId}`}
                  </>
                )}
              </div>
              </div>
            )}
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="export-textarea">Export Biome (Copy JSON)</Label>
            <div className="flex gap-2">
              <Button
                onClick={handleExport}
                className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
              >
                Generate JSON
              </Button>
              {exportText && (
                <Button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Copy to Clipboard
                </Button>
              )}
            </div>
          </div>

          {exportText && (
            <textarea
              id="export-textarea"
              className="w-full h-48 bg-gray-700 text-white p-2 rounded font-mono text-sm"
              value={exportText}
              readOnly
            />
          )}
        </div>

        {/* Items Management Section */}
        <div className="bg-gray-800 p-4 rounded-lg mt-6">
          <div className="text-lg font-medium mb-4">
            Item Spawns for {currentBiome && currentBiome.toUpperCase().replace(/-/g, " ")}
          </div>

          {/* Current Items */}
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-2">
              Current Items ({currentItems.length}):
            </div>
            <div className="flex flex-wrap gap-2 min-h-[60px] bg-gray-900 p-3 rounded">
              {currentItems.length === 0 ? (
                <div className="text-gray-500 text-sm">No items added yet. Click on entities below to add them.</div>
              ) : (
                currentItems.map((item, index) => {
                  const displayName = item.replace("Entities.", "").toLowerCase().replace(/_/g, " ");
                  return (
                    <button
                      key={`${item}-${index}`}
                      onClick={() => removeItem(index)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer"
                      title="Click to remove"
                    >
                      {displayName} ✕
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Available Entities */}
          <div>
            <div className="text-sm text-gray-400 mb-2">
              Available Entities (Click to add):
            </div>
            <div className="flex flex-wrap gap-2 bg-gray-900 p-3 rounded max-h-[300px] overflow-y-auto">
              {spawnableEntities.map((entity) => {
                const displayName = entity.replace(/_/g, " ");
                return (
                  <button
                    key={entity}
                    onClick={() => addItem(entity)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors cursor-pointer"
                    title={`Add ${displayName}`}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Create New Biome Dialog */}
        {isCreateDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">Create New Biome</h2>

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Biome Name
                </label>
                <input
                  type="text"
                  value={newBiomeName}
                  onChange={(e) => setNewBiomeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBiomeName.trim()) {
                      handleCreateBiome();
                    }
                  }}
                  placeholder="e.g., Desert Ruins, Ice Cave, etc."
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              {newBiomeName.trim() && (
                <div className="mb-4 text-sm">
                  <span className="text-gray-400">File name: </span>
                  <span className="text-purple-400 font-mono">
                    {toKebabCase(newBiomeName)}.ts
                  </span>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setNewBiomeName("");
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBiome}
                  disabled={!newBiomeName.trim() || isCreating}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
