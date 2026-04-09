import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { TilePalette } from "./TilePalette";
import { ExpandMapDialog } from "./ExpandMapDialog";
import type { Layer, SaveStatus } from "../-types";
import { getConfig } from "@survive-the-night/game-shared/config";

interface EditorRightOverlayProps {
  onSaveMap: () => void;
  saveStatus: SaveStatus;
  onTileSelect: (row: number, col: number, layer: Layer) => void;
}

const btnSquare = "!rounded-none text-xs h-7 px-2";

export function EditorRightOverlay({
  onSaveMap,
  saveStatus,
  onTileSelect,
}: EditorRightOverlayProps) {
  const currentItems = useEditorStore((state) => state.currentItems);
  const history = useEditorStore((state) => state.history);

  const setIsItemsModalOpen = useEditorStore((state) => state.setIsItemsModalOpen);
  const undo = useEditorStore((state) => state.undo);
  const clearActiveLayer = useEditorStore((state) => state.clearActiveLayer);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);

  const tilePx = getConfig().world.TILE_SIZE * 2;
  const sheetWidthPx = Math.max(
    groundDimensions.cols * tilePx,
    collidablesDimensions.cols * tilePx,
  );
  const panelWidthPx = sheetWidthPx + 10;

  const [expandMapOpen, setExpandMapOpen] = useState(false);

  return (
    <div
      className="pointer-events-auto mr-[5px] box-border flex h-full max-h-screen min-w-0 flex-col rounded-none bg-gray-900/95 text-white shadow-2xl ring-1 ring-gray-700/90 backdrop-blur-md"
      style={{ width: `min(${panelWidthPx}px, calc(100vw - 10px))` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 flex flex-wrap gap-1 border-b border-gray-700 px-[5px] py-2">
        <Button
          size="sm"
          onClick={onSaveMap}
          disabled={saveStatus === "saving"}
          className={`${btnSquare} ${
            saveStatus === "saved"
              ? "bg-green-600 hover:bg-green-700 text-white"
              : saveStatus === "error"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved!"
              : saveStatus === "error"
                ? "Error"
                : "Save"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setExpandMapOpen(true)}
          className={`${btnSquare} text-white border border-gray-600`}
        >
          Expand map
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsItemsModalOpen(true)}
          className={`${btnSquare} text-white border border-gray-600`}
        >
          Items ({currentItems.length})
        </Button>
        <Button
          size="sm"
          onClick={undo}
          disabled={history.length === 0}
          className={`${btnSquare} ${
            history.length > 0
              ? "bg-yellow-600 hover:bg-yellow-700 text-white"
              : "bg-gray-600 text-white cursor-not-allowed"
          }`}
          title="Ctrl+Z"
        >
          Undo ({history.length})
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={clearActiveLayer}
          className={`${btnSquare} text-white border border-gray-600`}
        >
          Clear
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[5px] py-2">
        <TilePalette onTileSelect={onTileSelect} />
      </div>

      <ExpandMapDialog open={expandMapOpen} onOpenChange={setExpandMapOpen} />
    </div>
  );
}
