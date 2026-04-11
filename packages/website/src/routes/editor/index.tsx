import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useEditorStore } from "./-store";
import type { Layer, SheetDimensions } from "./-types";
import { useWorldMap, useSaveWorldMap } from "./-hooks/useEditorApi";

import { TileMapEditor } from "./-components/TileMapEditor";
import { EditorMinimap } from "./-components/EditorMinimap";
import { EditorRightOverlay } from "./-components/EditorRightOverlay";
import { NpcConfigModal } from "./-components/NpcConfigModal";
import { SpawnerMetaModal } from "./-components/SpawnerMetaModal";
import { RelocateMapBanner } from "./-components/RelocateMapBanner";
import { getConfig } from "@survive-the-night/game-shared/config";
import {
  createEmptySpawnsLayer,
  createEmptyDecalsLayer,
  reconcileDialogueNpcsWithSpawnsLayer,
} from "./-utils";
import {
  applyDialogueNpcEditorMetadataToRawDialogueNpcs,
  normalizeDialogueNpcs,
  reconcileMessageDecalsWithDecalsLayer,
  reconcileSpawnerMetaWithSpawnsLayer,
  rewriteSpawnsLayerDialogueNpcTiles,
} from "@survive-the-night/game-shared/map/world-map-types";
import { normalizeQuests } from "@survive-the-night/game-shared/map/quest-types";

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
  const setSheetImages = useEditorStore((state) => state.setSheetImages);
  const setGroundGrid = useEditorStore((state) => state.setGroundGrid);
  const setCollidablesGrid = useEditorStore((state) => state.setCollidablesGrid);
  const setDecalsGrid = useEditorStore((state) => state.setDecalsGrid);
  const setDialogueNpcs = useEditorStore((state) => state.setDialogueNpcs);
  const setMessageDecals = useEditorStore((state) => state.setMessageDecals);
  const setQuests = useEditorStore((state) => state.setQuests);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const setHistory = useEditorStore((state) => state.setHistory);
  const undo = useEditorStore((state) => state.undo);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const setSelectedTileId = useEditorStore((state) => state.setSelectedTileId);
  const clampCameraToViewport = useEditorStore((state) => state.clampCameraToViewport);

  const groundGrid = useEditorStore((state) => state.groundGrid);
  const collidablesGrid = useEditorStore((state) => state.collidablesGrid);
  const spawnsGrid = useEditorStore((state) => state.spawnsGrid);
  const decalsGrid = useEditorStore((state) => state.decalsGrid);
  const dialogueNpcs = useEditorStore((state) => state.dialogueNpcs);
  const messageDecals = useEditorStore((state) => state.messageDecals);
  const spawnerMeta = useEditorStore((state) => state.spawnerMeta);
  const quests = useEditorStore((state) => state.quests);
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
        let spawnsForDialogue = createEmptySpawnsLayer(n);
        if (
          worldMapData.spawns?.length === n &&
          worldMapData.spawns[0]?.length === n
        ) {
          spawnsForDialogue = worldMapData.spawns.map((row) => [...row]);
        }
        const dialogueWithQuestsMeta = applyDialogueNpcEditorMetadataToRawDialogueNpcs(
          worldMapData.dialogueNpcs,
          worldMapData.dialogueNpcEditorMetadata ?? [],
        );
        const dialogueNormalized = normalizeDialogueNpcs(dialogueWithQuestsMeta, n);
        rewriteSpawnsLayerDialogueNpcTiles(spawnsForDialogue, dialogueNormalized);
        useEditorStore.setState({
          spawnsGrid: spawnsForDialogue,
          spawnerMeta: reconcileSpawnerMetaWithSpawnsLayer(
            spawnsForDialogue,
            worldMapData.spawnerMeta,
          ),
        });
        setDialogueNpcs(
          reconcileDialogueNpcsWithSpawnsLayer(spawnsForDialogue, dialogueNormalized),
        );
        setQuests(normalizeQuests(worldMapData.quests ?? [], n));
        const decalsLoaded =
          worldMapData.decals?.length === n && worldMapData.decals[0]?.length === n
            ? worldMapData.decals
            : createEmptyDecalsLayer(n);
        setDecalsGrid(decalsLoaded);
        setMessageDecals(
          reconcileMessageDecalsWithDecalsLayer(
            decalsLoaded,
            worldMapData.messageDecals ?? [],
            n,
          ),
        );
        clampCameraToViewport();
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
    setDecalsGrid,
    setDialogueNpcs,
    setMessageDecals,
    setQuests,
    setSaveStatus,
    setHistory,
    clampCameraToViewport,
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
      setSheetImages(groundImg, collidablesImg);
      setSheetsLoaded(true);
    };

    loadSheetDimensions();
  }, [setGroundDimensions, setCollidablesDimensions, setSheetsLoaded, setSheetImages]);

  const saveMap = async () => {
    setSaveStatus("saving");
    try {
      await saveWorldMapMutation.mutateAsync({
        ground: groundGrid,
        collidables: collidablesGrid,
        spawns: spawnsGrid,
        decals: decalsGrid,
        dialogueNpcs,
        messageDecals,
        quests,
        spawnerMeta,
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
      <div className="map-editor-ui h-screen w-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">
          {!sheetsLoaded ? "Loading tilesheets..." : "Loading world map..."}
        </div>
      </div>
    );
  }

  return (
    <div className="map-editor-ui relative h-[100dvh] w-screen overflow-hidden bg-black">
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

      <NpcConfigModal />
      <SpawnerMetaModal />
      <RelocateMapBanner />
    </div>
  );
}
