import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useEditorStore } from "./-store";
import { toKebabCase } from "./-utils";
import type { Layer, SheetDimensions } from "./-types";
import { useBiomes, useBiome, useSaveBiome, useCreateBiome } from "./-hooks/useEditorApi";

// Components
import { ToolBar } from "./-components/ToolBar";
import { BiomePanel } from "./-components/BiomePanel";
import { TileMapEditor } from "./-components/TileMapEditor";
import { TilePalette } from "./-components/TilePalette";
import { ItemsModal } from "./-components/ItemsModal";
import { CreateBiomeDialog } from "./-components/CreateBiomeDialog";
import { getConfig } from "@survive-the-night/game-shared/config";

export const Route = createFileRoute("/editor/")({
  component: BiomeEditor,
});

export function meta() {
  return [
    { title: "Biome Editor - Survive the Night" },
    {
      name: "description",
      content: "Edit and manage biomes for Survive the Night game",
    },
  ];
}

function BiomeEditor() {
  // Store state
  const sheetsLoaded = useEditorStore((state) => state.sheetsLoaded);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);

  // Store actions
  const setGroundDimensions = useEditorStore((state) => state.setGroundDimensions);
  const setCollidablesDimensions = useEditorStore((state) => state.setCollidablesDimensions);
  const setSheetsLoaded = useEditorStore((state) => state.setSheetsLoaded);
  const setBiomes = useEditorStore((state) => state.setBiomes);
  const setGroundGrid = useEditorStore((state) => state.setGroundGrid);
  const setCollidablesGrid = useEditorStore((state) => state.setCollidablesGrid);
  const setCurrentItems = useEditorStore((state) => state.setCurrentItems);
  const setCurrentBiome = useEditorStore((state) => state.setCurrentBiome);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const setHistory = useEditorStore((state) => state.setHistory);
  const undo = useEditorStore((state) => state.undo);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const setSelectedTileId = useEditorStore((state) => state.setSelectedTileId);
  const setIsCreateDialogOpen = useEditorStore((state) => state.setIsCreateDialogOpen);
  const setNewBiomeName = useEditorStore((state) => state.setNewBiomeName);

  // Get state needed for operations
  const currentBiome = useEditorStore((state) => state.currentBiome);
  const groundGrid = useEditorStore((state) => state.groundGrid);
  const collidablesGrid = useEditorStore((state) => state.collidablesGrid);
  const currentItems = useEditorStore((state) => state.currentItems);
  const newBiomeName = useEditorStore((state) => state.newBiomeName);

  // API Hooks
  const { data: biomes, isSuccess: isBiomesLoaded } = useBiomes();
  const { data: biomeData } = useBiome(currentBiome);
  const saveBiomeMutation = useSaveBiome();
  const createBiomeMutation = useCreateBiome();

  // Sync biomes from query to store and auto-select first biome
  useEffect(() => {
    if (biomes) {
      setBiomes(biomes);

      // Auto-select first biome if none is selected
      if (biomes.length > 0 && !currentBiome) {
        setCurrentBiome(biomes[0].name);
      }
    }
  }, [biomes, setBiomes, currentBiome, setCurrentBiome]);

  // Sync biome data from query to store when it changes
  useEffect(() => {
    if (biomeData && currentBiome) {
      setGroundGrid(biomeData.ground);
      setCollidablesGrid(biomeData.collidables);
      setCurrentItems(biomeData.items || []);
      setSaveStatus("idle");
      setHistory([]);
    }
  }, [
    biomeData,
    currentBiome,
    setGroundGrid,
    setCollidablesGrid,
    setCurrentItems,
    setSaveStatus,
    setHistory,
  ]);

  // Load and detect tilesheet dimensions
  useEffect(() => {
    const loadSheetDimensions = async () => {
      const groundImg = new Image();
      const collidablesImg = new Image();

      const groundPromise = new Promise<SheetDimensions>((resolve) => {
        groundImg.onload = () => {
          const cols = Math.floor(groundImg.width / getConfig().world.TILE_SIZE);
          const rows = Math.floor(groundImg.height / getConfig().world.TILE_SIZE);
          resolve({ cols, rows, totalTiles: cols * rows });
        };
        groundImg.src = "/sheets/ground.png";
      });

      const collidablesPromise = new Promise<SheetDimensions>((resolve) => {
        collidablesImg.onload = () => {
          const cols = Math.floor(collidablesImg.width / getConfig().world.TILE_SIZE);
          const rows = Math.floor(collidablesImg.height / getConfig().world.TILE_SIZE);
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
  }, [setGroundDimensions, setCollidablesDimensions, setSheetsLoaded]);

  // Load biome data by changing current biome
  const loadBiome = (biomeName: string) => {
    setCurrentBiome(biomeName);
  };

  // Save current biome to API
  const saveBiome = async () => {
    if (!currentBiome) return;

    setSaveStatus("saving");
    try {
      await saveBiomeMutation.mutateAsync({
        biomeName: currentBiome,
        ground: groundGrid,
        collidables: collidablesGrid,
        items: currentItems,
      });

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error(`Failed to save biome ${currentBiome}:`, error);
      setSaveStatus("error");
    }
  };

  // Create new biome
  const handleCreateBiome = async () => {
    if (!newBiomeName.trim()) return;

    const kebabName = toKebabCase(newBiomeName);
    if (!kebabName) return;

    try {
      await createBiomeMutation.mutateAsync({ name: kebabName });

      // Load the newly created biome
      setCurrentBiome(kebabName);

      // Close dialog and reset
      setIsCreateDialogOpen(false);
      setNewBiomeName("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to create biome: ${errorMessage}`);
    }
  };

  // Handle tile selection from palette
  const handleTileSelect = (row: number, col: number, layer: Layer) => {
    const dimensions = layer === "ground" ? groundDimensions : collidablesDimensions;
    const tileId = row * dimensions.cols + col;
    setSelectedTileId(tileId);
    setActiveLayer(layer);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Show loading state while detecting tilesheet dimensions or biomes
  if (!sheetsLoaded || !isBiomesLoaded || !biomes) {
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
        <ToolBar onSave={saveBiome} />

        <BiomePanel onLoadBiome={loadBiome} />

        {/* Main Editor */}
        <div className="flex gap-6 mb-6">
          <TileMapEditor />
          <TilePalette onTileSelect={handleTileSelect} />
        </div>

        {/* Modals */}
        <ItemsModal />
        <CreateBiomeDialog onCreateBiome={handleCreateBiome} />
      </div>
    </div>
  );
}
