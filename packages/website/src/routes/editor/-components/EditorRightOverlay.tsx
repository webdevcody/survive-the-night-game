import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { TilePalette } from "./TilePalette";
import { MarkersPanel } from "./MarkersPanel";
import { QuestsEditorPanel } from "./QuestsEditorPanel";
import { NpcsListPanel } from "./NpcsListPanel";
import { SpawnersListPanel } from "./SpawnersListPanel";
import { MerchantsListPanel } from "./MerchantsListPanel";
import { ScavengeListPanel } from "./ScavengeListPanel";
import type { Layer } from "../-types";
import { EDITOR_SIDEBAR_TAB_ORDER } from "../-sidebar-tabs";
import { getConfig } from "@survive-the-night/game-shared/config";
import { useEffect } from "react";

interface EditorRightOverlayProps {
  onTileSelect: (row: number, col: number, layer: Layer) => void;
}

const iconTabBtn =
  "relative !h-8 !w-8 !min-w-0 shrink-0 !rounded-none !p-0 text-white [&_svg]:size-[18px]";

const ICON_RAIL_PX = 44;

export function EditorRightOverlay({ onTileSelect }: EditorRightOverlayProps) {
  const sidebarSection = useEditorStore((state) => state.sidebarSection);
  const setSidebarSection = useEditorStore((state) => state.setSidebarSection);
  const activeLayer = useEditorStore((state) => state.activeLayer);
  const switchLayer = useEditorStore((state) => state.switchLayer);

  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);

  const tilePx = getConfig().world.TILE_SIZE * 2;
  const sheetWidthPx = Math.max(
    groundDimensions.cols * tilePx,
    collidablesDimensions.cols * tilePx,
  );
  const panelWidthPx = sheetWidthPx + 10 + ICON_RAIL_PX;

  useEffect(() => {
    if (sidebarSection === "cursor") {
      switchLayer("ground");
    }
  }, [sidebarSection, switchLayer]);

  useEffect(() => {
    if (sidebarSection === "tiles" && (activeLayer === "spawns" || activeLayer === "decals")) {
      switchLayer("ground");
    }
  }, [sidebarSection, activeLayer, switchLayer]);

  useEffect(() => {
    if (sidebarSection === "markers" && activeLayer !== "decals") {
      switchLayer("decals");
    }
  }, [sidebarSection, activeLayer, switchLayer]);

  return (
    <div
      className="pointer-events-auto mr-[5px] box-border flex h-full max-h-screen min-w-0 flex-row rounded-none bg-gray-900/95 text-white shadow-2xl ring-1 ring-gray-700/90 backdrop-blur-md"
      style={{ width: `min(${panelWidthPx}px, calc(100vw - 10px))` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-[5px] py-2">
        {sidebarSection === "cursor" ? (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-2 py-4 text-center">
            <p className="text-[11px] leading-snug text-gray-300">
              Click the map to open spawners, NPC dialogue, merchants, scavenge piles, and other
              interactables. Right-click still adds an NPC at a tile.
            </p>
            <p className="mt-3 text-[10px] leading-snug text-gray-500">
              Use the Tiles and Markers tabs to paint ground, collidables, and decals.
            </p>
          </div>
        ) : null}
        {sidebarSection === "tiles" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <TilePalette onTileSelect={onTileSelect} />
          </div>
        ) : null}
        {sidebarSection === "markers" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <MarkersPanel />
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
        {sidebarSection === "scavenge" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ScavengeListPanel />
          </div>
        ) : null}
        {sidebarSection === "quests" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <QuestsEditorPanel />
          </div>
        ) : null}
      </div>

      <div
        className="flex w-[44px] shrink-0 flex-col items-center gap-0.5 border-l border-gray-700 bg-gray-950/80 py-1.5 pl-1 pr-0.5"
        role="radiogroup"
        aria-label="Sidebar section"
      >
        {EDITOR_SIDEBAR_TAB_ORDER.map(({ id, label, hotkey, Icon }) => (
          <Button
            key={id}
            type="button"
            size="icon"
            variant="secondary"
            role="radio"
            aria-checked={sidebarSection === id}
            aria-label={`${label}, shortcut ${hotkey}`}
            aria-keyshortcuts={hotkey}
            title={`${label} (${hotkey})`}
            onClick={() => setSidebarSection(id)}
            className={`${iconTabBtn} border shadow-none ${
              sidebarSection === id
                ? "border-slate-500 bg-slate-600 text-white hover:bg-slate-500"
                : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <Icon aria-hidden />
            <span
              className={`pointer-events-none absolute bottom-0.5 right-0.5 z-10 text-[8px] font-semibold leading-none tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)] ${
                sidebarSection === id ? "text-white/90" : "text-gray-400"
              }`}
              aria-hidden
            >
              {hotkey}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
