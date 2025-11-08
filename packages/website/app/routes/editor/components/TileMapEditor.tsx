import { useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../store";
import { getConfig } from "@shared/config";
import { DECAL_REGISTRY } from "@shared/config/decals-config";

export function TileMapEditor() {
  const groundGrid = useEditorStore((state) => state.groundGrid);
  const collidablesGrid = useEditorStore((state) => state.collidablesGrid);
  const decals = useEditorStore((state) => state.decals);
  const activeLayer = useEditorStore((state) => state.activeLayer);
  const selectedTileId = useEditorStore((state) => state.selectedTileId);
  const selectedDecalId = useEditorStore((state) => state.selectedDecalId);
  const currentBiome = useEditorStore((state) => state.currentBiome);
  const currentItems = useEditorStore((state) => state.currentItems);
  const history = useEditorStore((state) => state.history);
  const clipboard = useEditorStore((state) => state.clipboard);
  const isFillBucketMode = useEditorStore((state) => state.isFillBucketMode);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);

  const setIsItemsModalOpen = useEditorStore((state) => state.setIsItemsModalOpen);
  const undo = useEditorStore((state) => state.undo);
  const clearActiveLayer = useEditorStore((state) => state.clearActiveLayer);
  const handleGridCellClick = useEditorStore((state) => state.handleGridCellClick);
  const saveToHistory = useEditorStore((state) => state.saveToHistory);
  const setIsDragging = useEditorStore((state) => state.setIsDragging);
  const setHasModifiedDuringDrag = useEditorStore((state) => state.setHasModifiedDuringDrag);
  const isDragging = useEditorStore((state) => state.isDragging);

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
      handleGridCellClick(row, col, false);
      setHasModifiedDuringDrag(true);
    }
  };

  return (
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
              <span
                className={
                  activeLayer === "ground"
                    ? "text-green-400"
                    : activeLayer === "collidables"
                      ? "text-red-400"
                      : "text-purple-400"
                }
              >
                {activeLayer === "ground"
                  ? "Ground"
                  : activeLayer === "collidables"
                    ? "Collidables"
                    : "Decals"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsItemsModalOpen(true)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white border border-gray-600"
            >
              Items ({currentItems.length})
            </Button>
            <Button
              onClick={undo}
              size="sm"
              disabled={history.length === 0}
              className={`${
                history.length > 0
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-gray-600 cursor-not-allowed"
              } text-white border border-gray-600`}
              title={`Undo (Ctrl+Z) - ${history.length} action${
                history.length !== 1 ? "s" : ""
              } available`}
            >
              Undo ({history.length})
            </Button>
            <Button
              onClick={clearActiveLayer}
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
                const decalAtPosition = decals.find(
                  (d) => d.position.x === colIdx && d.position.y === rowIdx
                );

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className="relative border border-gray-700 cursor-pointer hover:border-yellow-500 transition-colors"
                    style={{
                      width: `${getConfig().world.TILE_SIZE * 2}px`,
                      height: `${getConfig().world.TILE_SIZE * 2}px`,
                    }}
                    onClick={() => handleGridCellClick(rowIdx, colIdx, false)}
                    onMouseEnter={() => handleGridCellEnter(rowIdx, colIdx)}
                  >
                    {/* Ground layer */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: "url(/sheets/ground.png)",
                        backgroundSize: `${
                          groundDimensions.cols * getConfig().world.TILE_SIZE * 2
                        }px ${groundDimensions.rows * getConfig().world.TILE_SIZE * 2}px`,
                        backgroundPosition: `-${
                          (groundTileId % groundDimensions.cols) * getConfig().world.TILE_SIZE * 2
                        }px -${
                          Math.floor(groundTileId / groundDimensions.cols) *
                          getConfig().world.TILE_SIZE *
                          2
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
                          backgroundSize: `${
                            collidablesDimensions.cols * getConfig().world.TILE_SIZE * 2
                          }px ${collidablesDimensions.rows * getConfig().world.TILE_SIZE * 2}px`,
                          backgroundPosition: `-${
                            (collidableTileId % collidablesDimensions.cols) *
                            getConfig().world.TILE_SIZE *
                            2
                          }px -${
                            Math.floor(collidableTileId / collidablesDimensions.cols) *
                            getConfig().world.TILE_SIZE *
                            2
                          }px`,
                          imageRendering: "pixelated",
                        }}
                      />
                    )}
                    {/* Decals layer - show first frame of animation */}
                    {decalAtPosition && decalAtPosition.animation && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: "url(/sheets/ground.png)",
                          backgroundSize: `${
                            groundDimensions.cols * getConfig().world.TILE_SIZE * 2
                          }px ${groundDimensions.rows * getConfig().world.TILE_SIZE * 2}px`,
                          backgroundPosition: `-${
                            (decalAtPosition.animation.startX / getConfig().world.TILE_SIZE) *
                            getConfig().world.TILE_SIZE *
                            2
                          }px -${
                            (decalAtPosition.animation.startY / getConfig().world.TILE_SIZE) *
                            getConfig().world.TILE_SIZE *
                            2
                          }px`,
                          imageRendering: "pixelated",
                          opacity: 0.9,
                        }}
                      />
                    )}
                    {/* Highlight decal position on decals layer */}
                    {activeLayer === "decals" && decalAtPosition && (
                      <div className="absolute inset-0 bg-purple-500 bg-opacity-20 pointer-events-none border-2 border-purple-400" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-400">
          {isFillBucketMode && activeLayer === "ground" ? (
            <span className="text-orange-400 font-semibold">
              Fill Bucket Mode Active - Click a tile to flood fill with Tile #{selectedTileId}
            </span>
          ) : activeLayer === "decals" ? (
            <>
              Click to place decal • Click again to remove
              {selectedDecalId && ` • Selected: ${selectedDecalId}`}
            </>
          ) : (
            <>
              Click to place tile • Drag to paint
              {activeLayer === "collidables" && " • Click same tile to remove"}
            </>
          )}
          {clipboard && (
            <>
              <br />
              <span className="text-purple-400 font-semibold">
                Clipboard active ({clipboard.width}×{clipboard.height} {clipboard.layer}) - Click
                grid to paste
              </span>
            </>
          )}
          <br />
          Editing:{" "}
          <span
            className={
              activeLayer === "ground"
                ? "text-green-400"
                : activeLayer === "collidables"
                  ? "text-red-400"
                  : "text-purple-400"
            }
          >
            {activeLayer === "ground"
              ? "Ground"
              : activeLayer === "collidables"
                ? "Collidables"
                : "Decals"}
          </span>{" "}
          •{" "}
          {activeLayer === "decals"
            ? `Decal: ${selectedDecalId || "None"}`
            : activeLayer === "collidables" && selectedTileId === -1
              ? "Eraser (remove object)"
              : `Tile #${selectedTileId}`}
        </div>
      </div>
    </div>
  );
}
