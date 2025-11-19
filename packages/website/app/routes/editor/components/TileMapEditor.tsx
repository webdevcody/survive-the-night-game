import { useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../store";
import { getConfig } from "@shared/config";

export function TileMapEditor() {
  const groundGrid = useEditorStore((state) => state.groundGrid);
  const collidablesGrid = useEditorStore((state) => state.collidablesGrid);
  const activeLayer = useEditorStore((state) => state.activeLayer);
  const selectedTileId = useEditorStore((state) => state.selectedTileId);
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
                    : ""}
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
            className=            {
              activeLayer === "ground"
                ? "text-green-400"
                : "text-red-400"
            }
          >
            {activeLayer === "ground"
              ? "Ground"
              : "Collidables"}
          </span>{" "}
          •{" "}
          {activeLayer === "collidables" && selectedTileId === -1
            ? "Eraser (remove object)"
            : `Tile #${selectedTileId}`}
        </div>
      </div>
    </div>
  );
}
