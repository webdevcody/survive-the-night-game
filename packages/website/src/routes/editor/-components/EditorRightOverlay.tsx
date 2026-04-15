import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { TilePalette } from "./TilePalette";
import { ExpandMapDialog } from "./ExpandMapDialog";
import { QuestsEditorPanel } from "./QuestsEditorPanel";
import { NpcsListPanel } from "./NpcsListPanel";
import { SpawnersListPanel } from "./SpawnersListPanel";
import { MerchantsListPanel } from "./MerchantsListPanel";
import type { EditorSidebarSection, Layer, SaveStatus } from "../-types";
import { getConfig } from "@survive-the-night/game-shared/config";
import { useEffect, useState } from "react";

interface EditorRightOverlayProps {
  onSaveMap: () => void;
  saveStatus: SaveStatus;
  onTileSelect: (row: number, col: number, layer: Layer) => void;
}

const btnSquare = "!rounded-none text-xs h-7 px-2";
const sectionLabel = "text-[10px] font-medium uppercase tracking-wide text-gray-500";

const sidebarTabs: { id: EditorSidebarSection; label: string }[] = [
  { id: "tiles", label: "Tiles" },
  { id: "npcs", label: "NPCs" },
  { id: "spawners", label: "Spawners" },
  { id: "merchants", label: "Merchants" },
  { id: "quests", label: "Quests" },
];

export function EditorRightOverlay({
  onSaveMap,
  saveStatus,
  onTileSelect,
}: EditorRightOverlayProps) {
  const history = useEditorStore((state) => state.history);
  const sidebarSection = useEditorStore((state) => state.sidebarSection);
  const setSidebarSection = useEditorStore((state) => state.setSidebarSection);
  const activeLayer = useEditorStore((state) => state.activeLayer);
  const switchLayer = useEditorStore((state) => state.switchLayer);

  const undo = useEditorStore((state) => state.undo);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);

  const tilePx = getConfig().world.TILE_SIZE * 2;
  const sheetWidthPx = Math.max(
    groundDimensions.cols * tilePx,
    collidablesDimensions.cols * tilePx,
  );
  const panelWidthPx = sheetWidthPx + 10;

  const [expandMapOpen, setExpandMapOpen] = useState(false);

  useEffect(() => {
    if (sidebarSection === "tiles" && activeLayer === "spawns") {
      switchLayer("ground");
    }
  }, [sidebarSection, activeLayer, switchLayer]);

  return (
    <div
      className="pointer-events-auto mr-[5px] box-border flex h-full max-h-screen min-w-0 flex-col rounded-none bg-gray-900/95 text-white shadow-2xl ring-1 ring-gray-700/90 backdrop-blur-md"
      style={{ width: `min(${panelWidthPx}px, calc(100vw - 10px))` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 border-b border-gray-700 px-[5px] py-2 space-y-2">
        <div>
          <p className={`${sectionLabel} mb-1`}>Map file</p>
          <div className="flex flex-wrap gap-1">
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
              onClick={undo}
              disabled={history.length === 0}
              className={`${btnSquare} text-white border border-gray-600 ${
                history.length === 0 ? "cursor-not-allowed opacity-60" : ""
              }`}
              title="Ctrl+Z"
            >
              Undo ({history.length})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setExpandMapOpen(true)}
              className={`${btnSquare} text-white border border-gray-600`}
            >
              Expand map
            </Button>
          </div>
        </div>

        <div>
          <p className={`${sectionLabel} mb-1`}>Sidebar</p>
          <div className="flex flex-wrap items-stretch gap-1">
            <div
              className="grid min-w-0 flex-1 grid-cols-2 gap-0.5 rounded border border-gray-600 bg-gray-950/60 p-0.5 sm:grid-cols-3 lg:grid-cols-5"
              role="radiogroup"
              aria-label="Sidebar section"
            >
              {sidebarTabs.map(({ id, label }) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  role="radio"
                  aria-checked={sidebarSection === id}
                  onClick={() => setSidebarSection(id)}
                  className={`${btnSquare} min-w-0 border-0 shadow-none ${
                    sidebarSection === id
                      ? "bg-slate-600 text-white hover:bg-slate-500"
                      : "bg-transparent text-gray-400 hover:bg-gray-800/80 hover:text-gray-200"
                  }`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-[5px] py-2">
        {sidebarSection === "tiles" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <TilePalette onTileSelect={onTileSelect} />
          </div>
        ) : null}
        {sidebarSection === "npcs" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <NpcsListPanel />
          </div>
        ) : null}
        {sidebarSection === "spawners" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <SpawnersListPanel />
          </div>
        ) : null}
        {sidebarSection === "merchants" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <MerchantsListPanel />
          </div>
        ) : null}
        {sidebarSection === "quests" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <QuestsEditorPanel />
          </div>
        ) : null}
      </div>

      <ExpandMapDialog open={expandMapOpen} onOpenChange={setExpandMapOpen} />
    </div>
  );
}
