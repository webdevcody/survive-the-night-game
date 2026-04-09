import { useEffect, useRef } from "react";
import { useEditorStore } from "../-store";
import { getConfig } from "@survive-the-night/game-shared/config";
import { getMapSideLength, getTilePixelSize } from "../-utils";
import { SPAWN_PALETTE_ENTRIES } from "@survive-the-night/game-shared/map/spawn-palette";
import { DECAL_PALETTE_ENTRIES } from "@survive-the-night/game-shared/map/decal-palette";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

/** Full-viewport map canvas only — UI lives in overlay panels. */
export function TileMapEditor() {
  const groundGrid = useEditorStore((state) => state.groundGrid);
  const collidablesGrid = useEditorStore((state) => state.collidablesGrid);
  const spawnsGrid = useEditorStore((state) => state.spawnsGrid);
  const decalsGrid = useEditorStore((state) => state.decalsGrid);
  const activeLayer = useEditorStore((state) => state.activeLayer);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);
  const cameraX = useEditorStore((state) => state.cameraX);
  const cameraY = useEditorStore((state) => state.cameraY);
  const viewportWidthTiles = useEditorStore((state) => state.viewportWidthTiles);
  const viewportHeightTiles = useEditorStore((state) => state.viewportHeightTiles);

  const handleGridCellClick = useEditorStore((state) => state.handleGridCellClick);
  const saveToHistory = useEditorStore((state) => state.saveToHistory);
  const setIsDragging = useEditorStore((state) => state.setIsDragging);
  const setHasModifiedDuringDrag = useEditorStore((state) => state.setHasModifiedDuringDrag);
  const isDragging = useEditorStore((state) => state.isDragging);
  const panCamera = useEditorStore((state) => state.panCamera);
  const setViewportSize = useEditorStore((state) => state.setViewportSize);

  const containerRef = useRef<HTMLDivElement>(null);

  const mapSize = getMapSideLength(groundGrid);
  const tilePx = getTilePixelSize();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const cols = Math.max(1, Math.floor(w / tilePx));
      const rows = Math.max(1, Math.floor(h / tilePx));
      setViewportSize(cols, rows);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setViewportSize, tilePx]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k !== "w" && k !== "a" && k !== "s" && k !== "d") return;
      e.preventDefault();
      const step = e.shiftKey ? 8 : 2;
      if (k === "w") panCamera(0, -step);
      if (k === "s") panCamera(0, step);
      if (k === "a") panCamera(-step, 0);
      if (k === "d") panCamera(step, 0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panCamera]);

  const handleDragStart = () => {
    saveToHistory();
    setIsDragging(true);
    setHasModifiedDuringDrag(false);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setHasModifiedDuringDrag(false);
  };

  const handleGridCellEnter = (row: number, col: number) => {
    if (isDragging) {
      handleGridCellClick(row, col, false, true);
      setHasModifiedDuringDrag(true);
    }
  };

  const endRow = Math.min(cameraY + viewportHeightTiles, mapSize);
  const endCol = Math.min(cameraX + viewportWidthTiles, mapSize);
  const visibleRowCount = Math.max(0, endRow - cameraY);
  const visibleColCount = Math.max(0, endCol - cameraX);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 h-full w-full overflow-hidden bg-gray-950"
    >
      <div className="absolute inset-0 overflow-auto flex items-start justify-start">
        <div
          className="inline-block border-2 border-gray-700 bg-black shrink-0 m-0"
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {Array.from({ length: visibleRowCount }, (_, vi) => {
            const rowIdx = cameraY + vi;
            return (
              <div key={rowIdx} className="flex">
                {Array.from({ length: visibleColCount }, (_, vj) => {
                  const colIdx = cameraX + vj;
                  const groundTileId = groundGrid[rowIdx]?.[colIdx] ?? 0;
                  const collidableTileId = collidablesGrid[rowIdx]?.[colIdx] ?? -1;
                  const spawnTileId = spawnsGrid[rowIdx]?.[colIdx] ?? 0;
                  const spawnEntry =
                    spawnTileId > 0
                      ? SPAWN_PALETTE_ENTRIES.find((e) => e.id === spawnTileId)
                      : undefined;
                  const decalTileId = decalsGrid[rowIdx]?.[colIdx] ?? 0;
                  const decalEntry =
                    decalTileId > 0
                      ? DECAL_PALETTE_ENTRIES.find((e) => e.id === decalTileId)
                      : undefined;

                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className="relative border border-gray-800 cursor-crosshair hover:border-yellow-500/80 transition-colors"
                      style={{
                        width: `${tilePx}px`,
                        height: `${tilePx}px`,
                      }}
                      onClick={() => handleGridCellClick(rowIdx, colIdx, false)}
                      onMouseEnter={() => handleGridCellEnter(rowIdx, colIdx)}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: "url(/sheets/ground.png)",
                          backgroundSize: `${groundDimensions.cols * getConfig().world.TILE_SIZE * 2}px ${groundDimensions.rows * getConfig().world.TILE_SIZE * 2}px`,
                          backgroundPosition: `-${(groundTileId % groundDimensions.cols) * getConfig().world.TILE_SIZE * 2}px -${Math.floor(groundTileId / groundDimensions.cols) * getConfig().world.TILE_SIZE * 2}px`,
                          imageRendering: "pixelated",
                        }}
                      />
                      {collidableTileId !== -1 && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: "url(/sheets/collidables.png)",
                            backgroundSize: `${collidablesDimensions.cols * getConfig().world.TILE_SIZE * 2}px ${collidablesDimensions.rows * getConfig().world.TILE_SIZE * 2}px`,
                            backgroundPosition: `-${(collidableTileId % collidablesDimensions.cols) * getConfig().world.TILE_SIZE * 2}px -${Math.floor(collidableTileId / collidablesDimensions.cols) * getConfig().world.TILE_SIZE * 2}px`,
                            imageRendering: "pixelated",
                          }}
                        />
                      )}
                      {spawnEntry && spawnEntry.id !== 0 && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundColor: spawnEntry.color,
                            opacity: activeLayer === "spawns" ? 0.65 : 0.28,
                          }}
                        />
                      )}
                      {decalEntry && decalEntry.id !== 0 && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundColor: decalEntry.color,
                            mixBlendMode: "screen",
                            opacity: activeLayer === "decals" ? 0.55 : 0.22,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
