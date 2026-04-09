import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useEditorStore } from "./-store";
import type { Layer, SheetDimensions } from "./-types";
import { useWorldMap, useSaveWorldMap } from "./-hooks/useEditorApi";

import { TileMapEditor } from "./-components/TileMapEditor";
import { EditorMinimap } from "./-components/EditorMinimap";
import { EditorRightOverlay } from "./-components/EditorRightOverlay";
import { ItemsModal } from "./-components/ItemsModal";
import { getConfig } from "@survive-the-night/game-shared/config";
import { createEmptySpawnsLayer, createEmptyDecalsLayer } from "./-utils";

export const Route = createFileRoute("/editor/")({
  component: MapEditor,
});

export function meta() {
  return [
    { title: "Map Editor - Survive the Night" },
    {
      name: "description",
      content: "Edit the full world map for Survive the Night",
    },
  ];
}

function MapEditor() {
  const sheetsLoaded = useEditorStore((state) => state.sheetsLoaded);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);

  const setGroundDimensions = useEditorStore((state) => state.setGroundDimensions);
  const setCollidablesDimensions = useEditorStore((state) => state.setCollidablesDimensions);
  const setSheetsLoaded = useEditorStore((state) => state.setSheetsLoaded);
  const setGroundGrid = useEditorStore((state) => state.setGroundGrid);
  const setCollidablesGrid = useEditorStore((state) => state.setCollidablesGrid);
  const setSpawnsGrid = useEditorStore((state) => state.setSpawnsGrid);
  const setDecalsGrid = useEditorStore((state) => state.setDecalsGrid);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const setHistory = useEditorStore((state) => state.setHistory);
  const undo = useEditorStore((state) => state.undo);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const setSelectedTileId = useEditorStore((state) => state.setSelectedTileId);

  const groundGrid = useEditorStore((state) => state.groundGrid);
  const collidablesGrid = useEditorStore((state) => state.collidablesGrid);
  const spawnsGrid = useEditorStore((state) => state.spawnsGrid);
  const decalsGrid = useEditorStore((state) => state.decalsGrid);
  const saveStatus = useEditorStore((state) => state.saveStatus);

  const { data: worldMapData, isPending: isWorldMapPending } = useWorldMap();
  const saveWorldMapMutation = useSaveWorldMap();

  useEffect(() => {
    if (worldMapData) {
      const n = worldMapData.ground?.length ?? 0;
      const collidablesN = worldMapData.collidables?.length ?? 0;
      const row0 = worldMapData.ground?.[0]?.length ?? 0;
      const isSquare =
        n > 0 &&
        n === collidablesN &&
        n === row0 &&
        worldMapData.collidables?.every((row) => row.length === n);

      if (isSquare) {
        const { BIOME_SIZE } = getConfig().world;
        if (n % BIOME_SIZE !== 0) {
          console.warn(
            `World map side length ${n} is not a multiple of BIOME_SIZE (${BIOME_SIZE}); biome layout may not align.`,
          );
        }
        setGroundGrid(worldMapData.ground);
        setCollidablesGrid(worldMapData.collidables);
        if (
          worldMapData.spawns?.length === n &&
          worldMapData.spawns[0]?.length === n
        ) {
          setSpawnsGrid(worldMapData.spawns);
        } else {
          setSpawnsGrid(createEmptySpawnsLayer(n));
        }
        if (
          worldMapData.decals?.length === n &&
          worldMapData.decals[0]?.length === n
        ) {
          setDecalsGrid(worldMapData.decals);
        } else {
          setDecalsGrid(createEmptyDecalsLayer(n));
        }
      } else {
        console.warn(
          "World map must be square with matching ground and collidables dimensions; got ground",
          n,
          "×",
          row0,
          "collidables rows",
          collidablesN,
        );
      }
      setSaveStatus("idle");
      setHistory([]);
    }
  }, [
    worldMapData,
    setGroundGrid,
    setCollidablesGrid,
    setSpawnsGrid,
    setDecalsGrid,
    setSaveStatus,
    setHistory,
  ]);

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

  const saveMap = async () => {
    setSaveStatus("saving");
    try {
      await saveWorldMapMutation.mutateAsync({
        ground: groundGrid,
        collidables: collidablesGrid,
        spawns: spawnsGrid,
        decals: decalsGrid,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save world map:", error);
      setSaveStatus("error");
    }
  };

  const handleTileSelect = (row: number, col: number, layer: Layer) => {
    if (layer === "spawns" || layer === "decals") return;
    const dimensions = layer === "ground" ? groundDimensions : collidablesDimensions;
    const tileId = row * dimensions.cols + col;
    setSelectedTileId(tileId);
    setActiveLayer(layer);
  };

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

  if (!sheetsLoaded || isWorldMapPending || !worldMapData) {
    return (
      <div className="h-screen w-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">
          {!sheetsLoaded ? "Loading tilesheets..." : "Loading world map..."}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-black">
      <TileMapEditor />

      <div className="pointer-events-none fixed inset-0 z-30">
        <EditorMinimap />
      </div>

      <div className="pointer-events-none fixed inset-0 z-40 flex justify-end">
        <EditorRightOverlay
          onSaveMap={saveMap}
          saveStatus={saveStatus}
          onTileSelect={handleTileSelect}
        />
      </div>

      <ItemsModal />
    </div>
  );
}
