import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import type { WorldMapDialogueNpcEntry } from "@survive-the-night/game-shared/map/world-map-types";
import { getDialogueNpcLines } from "@survive-the-night/game-shared/map/world-map-types";
import { getMapSideLength, isMapCellInEditorCameraView } from "../-utils";

const sectionLabel = "text-[10px] font-medium uppercase tracking-wide text-gray-500";

export function NpcsListPanel() {
  const dialogueNpcs = useEditorStore((state) => state.dialogueNpcs);
  const groundGrid = useEditorStore((state) => state.groundGrid);
  const cameraX = useEditorStore((state) => state.cameraX);
  const cameraY = useEditorStore((state) => state.cameraY);
  const viewportWidthTiles = useEditorStore((state) => state.viewportWidthTiles);
  const viewportHeightTiles = useEditorStore((state) => state.viewportHeightTiles);
  const removeDialogueNpcAt = useEditorStore((state) => state.removeDialogueNpcAt);
  const openDialogueNpcEditor = useEditorStore((state) => state.openDialogueNpcEditor);
  const focusCameraOnMapCell = useEditorStore((state) => state.focusCameraOnMapCell);
  const dialogueNpcPlaceMode = useEditorStore((state) => state.dialogueNpcPlaceMode);
  const setDialogueNpcPlaceMode = useEditorStore((state) => state.setDialogueNpcPlaceMode);

  const sorted = useMemo(
    () => [...dialogueNpcs].sort((a, b) => a.row - b.row || a.col - b.col),
    [dialogueNpcs],
  );

  const { inView, rest } = useMemo(() => {
    const mapSize = getMapSideLength(groundGrid);
    const vp = { cameraX, cameraY, viewportWidthTiles, viewportHeightTiles, mapSize };
    const a: WorldMapDialogueNpcEntry[] = [];
    const b: WorldMapDialogueNpcEntry[] = [];
    for (const entry of sorted) {
      if (isMapCellInEditorCameraView(entry.row, entry.col, vp)) a.push(entry);
      else b.push(entry);
    }
    return { inView: a, rest: b };
  }, [sorted, groundGrid, cameraX, cameraY, viewportWidthTiles, viewportHeightTiles]);

  const renderRow = (entry: WorldMapDialogueNpcEntry) => {
    const preview = getDialogueNpcLines(entry)[0]?.slice(0, 100) ?? "";
    return (
      <li
        key={`${entry.row}-${entry.col}`}
        className="flex items-start justify-between gap-2 rounded border border-emerald-800/60 bg-gray-900/80 px-2 py-1.5"
      >
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => openDialogueNpcEditor(entry.row, entry.col)}
        >
          <p className="text-[10px] font-medium text-gray-200">
            ({entry.row}, {entry.col})
            {entry.name ? ` · ${entry.name}` : ""}
          </p>
          <p className="truncate text-[9px] text-gray-500">{preview || "…"}</p>
        </button>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
            onClick={() => focusCameraOnMapCell(entry.row, entry.col)}
          >
            Go
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
            onClick={() => removeDialogueNpcAt(entry.row, entry.col)}
          >
            Remove
          </Button>
        </div>
      </li>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 text-[11px] text-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={dialogueNpcPlaceMode ? "default" : "secondary"}
          className={`!h-7 !rounded-none !px-2 !text-[11px] ${
            dialogueNpcPlaceMode ? "bg-emerald-700 hover:bg-emerald-600" : ""
          }`}
          onClick={() => setDialogueNpcPlaceMode(!dialogueNpcPlaceMode)}
        >
          {dialogueNpcPlaceMode ? "Placing… (click map)" : "Add NPC"}
        </Button>
        <span className="text-[9px] text-gray-500">
          One click adds a dialogue NPC on an empty spawns cell; Esc cancels. You can also
          right-click the map → Add NPC.
        </span>
      </div>
      {sorted.length === 0 ? (
        <p className="text-[10px] text-gray-500">
          No dialogue NPCs yet. Use <span className="text-emerald-300">Add NPC</span> above or
          right-click the map.
        </p>
      ) : (
        <>
          <p className="text-[10px] text-gray-500">
            {sorted.length} NPC{sorted.length === 1 ? "" : "s"} ({inView.length} in view) — click a
            row to edit. <span className="text-gray-400">Go</span> moves the camera.
          </p>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <div>
              <p className={`${sectionLabel} mb-1`}>In view</p>
              {inView.length === 0 ? (
                <p className="text-[10px] text-gray-600">None in current view.</p>
              ) : (
                <ul className="space-y-1.5">{inView.map(renderRow)}</ul>
              )}
            </div>
            <div>
              <p className={`${sectionLabel} mb-1`}>Rest of map</p>
              {rest.length === 0 ? (
                <p className="text-[10px] text-gray-600">All NPCs are in view.</p>
              ) : (
                <ul className="space-y-1.5">{rest.map(renderRow)}</ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
