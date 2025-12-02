import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import type { Layer } from "../-types";
import { getConfig } from "@survive-the-night/game-shared/config";

interface TilePaletteProps {
  onTileSelect: (row: number, col: number, layer: Layer) => void;
}

export function TilePalette({ onTileSelect }: TilePaletteProps) {
  const activeLayer = useEditorStore((state) => state.activeLayer);
  const selectedTileId = useEditorStore((state) => state.selectedTileId);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);
  const clipboard = useEditorStore((state) => state.clipboard);
  const setClipboard = useEditorStore((state) => state.setClipboard);
  const switchLayer = useEditorStore((state) => state.switchLayer);
  const setSelectedTileId = useEditorStore((state) => state.setSelectedTileId);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);

  // Ground palette selection state
  const isGroundPaletteSelectionMode = useEditorStore(
    (state) => state.isGroundPaletteSelectionMode,
  );
  const setIsGroundPaletteSelectionMode = useEditorStore(
    (state) => state.setIsGroundPaletteSelectionMode,
  );
  const groundPaletteSelectionStart = useEditorStore((state) => state.groundPaletteSelectionStart);
  const setGroundPaletteSelectionStart = useEditorStore(
    (state) => state.setGroundPaletteSelectionStart,
  );
  const groundPaletteSelectionCurrent = useEditorStore(
    (state) => state.groundPaletteSelectionCurrent,
  );
  const setGroundPaletteSelectionCurrent = useEditorStore(
    (state) => state.setGroundPaletteSelectionCurrent,
  );
  const isFillBucketMode = useEditorStore((state) => state.isFillBucketMode);
  const setIsFillBucketMode = useEditorStore((state) => state.setIsFillBucketMode);

  // Collidables palette selection state
  const isPaletteSelectionMode = useEditorStore((state) => state.isPaletteSelectionMode);
  const setIsPaletteSelectionMode = useEditorStore((state) => state.setIsPaletteSelectionMode);
  const paletteSelectionStart = useEditorStore((state) => state.paletteSelectionStart);
  const setPaletteSelectionStart = useEditorStore((state) => state.setPaletteSelectionStart);
  const paletteSelectionCurrent = useEditorStore((state) => state.paletteSelectionCurrent);
  const setPaletteSelectionCurrent = useEditorStore((state) => state.setPaletteSelectionCurrent);

  // Ground palette handlers
  const getGroundPaletteSelectionBounds = () => {
    if (!groundPaletteSelectionStart || !groundPaletteSelectionCurrent) return null;

    const minRow = Math.min(groundPaletteSelectionStart.row, groundPaletteSelectionCurrent.row);
    const maxRow = Math.max(groundPaletteSelectionStart.row, groundPaletteSelectionCurrent.row);
    const minCol = Math.min(groundPaletteSelectionStart.col, groundPaletteSelectionCurrent.col);
    const maxCol = Math.max(groundPaletteSelectionStart.col, groundPaletteSelectionCurrent.col);

    return { minRow, maxRow, minCol, maxCol };
  };

  const captureGroundPaletteSelection = () => {
    const bounds = getGroundPaletteSelectionBounds();
    if (!bounds) return;

    const { minRow, maxRow, minCol, maxCol } = bounds;
    const height = maxRow - minRow + 1;
    const width = maxCol - minCol + 1;

    const tiles: number[][] = [];

    for (let row = minRow; row <= maxRow; row++) {
      const tileRow: number[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        const tileId = row * groundDimensions.cols + col;
        tileRow.push(tileId);
      }
      tiles.push(tileRow);
    }

    setClipboard({
      tiles,
      width,
      height,
      layer: "ground",
    });
  };

  const handleGroundPaletteSelectionMouseDown = (row: number, col: number) => {
    setGroundPaletteSelectionStart({ row, col });
    setGroundPaletteSelectionCurrent({ row, col });
  };

  const handleGroundPaletteSelectionMouseMove = (row: number, col: number) => {
    if (groundPaletteSelectionStart) {
      setGroundPaletteSelectionCurrent({ row, col });
    }
  };

  const handleGroundPaletteSelectionMouseUp = () => {
    if (groundPaletteSelectionStart && groundPaletteSelectionCurrent) {
      captureGroundPaletteSelection();
    }
    setGroundPaletteSelectionStart(null);
    setGroundPaletteSelectionCurrent(null);
  };

  const toggleGroundPaletteSelectionMode = () => {
    setIsGroundPaletteSelectionMode(!isGroundPaletteSelectionMode);
    setGroundPaletteSelectionStart(null);
    setGroundPaletteSelectionCurrent(null);
    // Disable fill bucket mode when entering multi-select
    if (!isGroundPaletteSelectionMode) {
      setIsFillBucketMode(false);
    }
  };

  // Collidables palette handlers
  const getPaletteSelectionBounds = () => {
    if (!paletteSelectionStart || !paletteSelectionCurrent) return null;

    const minRow = Math.min(paletteSelectionStart.row, paletteSelectionCurrent.row);
    const maxRow = Math.max(paletteSelectionStart.row, paletteSelectionCurrent.row);
    const minCol = Math.min(paletteSelectionStart.col, paletteSelectionCurrent.col);
    const maxCol = Math.max(paletteSelectionStart.col, paletteSelectionCurrent.col);

    return { minRow, maxRow, minCol, maxCol };
  };

  const capturePaletteSelection = () => {
    const bounds = getPaletteSelectionBounds();
    if (!bounds) return;

    const { minRow, maxRow, minCol, maxCol } = bounds;
    const height = maxRow - minRow + 1;
    const width = maxCol - minCol + 1;

    const tiles: number[][] = [];

    for (let row = minRow; row <= maxRow; row++) {
      const tileRow: number[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        const tileId = row * collidablesDimensions.cols + col;
        tileRow.push(tileId);
      }
      tiles.push(tileRow);
    }

    setClipboard({
      tiles,
      width,
      height,
      layer: "collidables",
    });
  };

  const handlePaletteSelectionMouseDown = (row: number, col: number) => {
    setPaletteSelectionStart({ row, col });
    setPaletteSelectionCurrent({ row, col });
  };

  const handlePaletteSelectionMouseMove = (row: number, col: number) => {
    if (paletteSelectionStart) {
      setPaletteSelectionCurrent({ row, col });
    }
  };

  const handlePaletteSelectionMouseUp = () => {
    if (paletteSelectionStart && paletteSelectionCurrent) {
      capturePaletteSelection();
    }
    setPaletteSelectionStart(null);
    setPaletteSelectionCurrent(null);
  };

  const togglePaletteSelectionMode = () => {
    setIsPaletteSelectionMode(!isPaletteSelectionMode);
    setPaletteSelectionStart(null);
    setPaletteSelectionCurrent(null);
  };

  return (
    <div className="w-[400px]">
      {/* Layer Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => switchLayer("ground")}
          className={`flex-1 ${
            activeLayer === "ground"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-700 hover:bg-gray-600"
          } text-white px-4 py-2`}
        >
          Ground
        </Button>
        <Button
          onClick={() => switchLayer("collidables")}
          className={`flex-1 ${
            activeLayer === "collidables"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-700 hover:bg-gray-600"
          } text-white px-4 py-2`}
        >
          Collidables
        </Button>
      </div>

      {/* Ground Palette */}
      {activeLayer === "ground" && (
        <div className="bg-gray-800 p-4 rounded-lg border-2 border-green-500">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-medium text-green-400">Ground Tiles</div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsFillBucketMode(!isFillBucketMode);
                  if (!isFillBucketMode) {
                    setIsGroundPaletteSelectionMode(false);
                    setGroundPaletteSelectionStart(null);
                    setGroundPaletteSelectionCurrent(null);
                  }
                }}
                size="sm"
                className={`${
                  isFillBucketMode
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-gray-700 hover:bg-gray-600"
                } text-white border border-gray-600`}
                title="Fill bucket tool - flood fill connected tiles"
              >
                Fill Bucket
              </Button>
              <Button
                onClick={toggleGroundPaletteSelectionMode}
                size="sm"
                className={`${
                  isGroundPaletteSelectionMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-700 hover:bg-gray-600"
                } text-white border border-gray-600`}
              >
                {isGroundPaletteSelectionMode ? "Exit Multi-Select" : "Multi-Select"}
              </Button>
              {clipboard && clipboard.layer === "ground" && (
                <Button
                  onClick={() => setClipboard(null)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500"
                  title="Clear clipboard"
                >
                  Clear ({clipboard.width}×{clipboard.height})
                </Button>
              )}
            </div>
          </div>

          <div
            className="inline-block border-2 border-gray-600 bg-gray-900"
            onMouseDown={(e) => {
              if (isGroundPaletteSelectionMode) {
                e.preventDefault();
              }
            }}
            onMouseUp={() => {
              if (isGroundPaletteSelectionMode) {
                handleGroundPaletteSelectionMouseUp();
              }
            }}
            onMouseLeave={() => {
              if (isGroundPaletteSelectionMode) {
                handleGroundPaletteSelectionMouseUp();
              }
            }}
          >
            {Array.from({ length: groundDimensions.rows }, (_, rowIdx) => (
              <div key={rowIdx} className="flex">
                {Array.from({ length: groundDimensions.cols }, (_, colIdx) => {
                  const tileId = rowIdx * groundDimensions.cols + colIdx;
                  const isSelected = tileId === selectedTileId && activeLayer === "ground";

                  const bounds = getGroundPaletteSelectionBounds();
                  const isInSelection =
                    bounds &&
                    rowIdx >= bounds.minRow &&
                    rowIdx <= bounds.maxRow &&
                    colIdx >= bounds.minCol &&
                    colIdx <= bounds.maxCol;

                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className={`relative border cursor-pointer transition-all ${
                        isSelected
                          ? "border-green-400 border-2"
                          : "border-gray-700 hover:border-green-500"
                      }`}
                      style={{
                        width: `${getConfig().world.TILE_SIZE * 2}px`,
                        height: `${getConfig().world.TILE_SIZE * 2}px`,
                        backgroundImage: "url(/sheets/ground.png)",
                        backgroundSize: `${
                          groundDimensions.cols * getConfig().world.TILE_SIZE * 2
                        }px ${groundDimensions.rows * getConfig().world.TILE_SIZE * 2}px`,
                        backgroundPosition: `-${colIdx * getConfig().world.TILE_SIZE * 2}px -${
                          rowIdx * getConfig().world.TILE_SIZE * 2
                        }px`,
                        imageRendering: "pixelated",
                      }}
                      onClick={() => {
                        if (!isGroundPaletteSelectionMode) {
                          onTileSelect(rowIdx, colIdx, "ground");
                        }
                      }}
                      onMouseDown={() => {
                        if (isGroundPaletteSelectionMode) {
                          handleGroundPaletteSelectionMouseDown(rowIdx, colIdx);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isGroundPaletteSelectionMode) {
                          handleGroundPaletteSelectionMouseMove(rowIdx, colIdx);
                        }
                      }}
                      title={`Ground Tile ID: ${tileId}`}
                    >
                      {isInSelection && (
                        <div
                          className="absolute inset-0 border-2 border-blue-400 bg-blue-400 bg-opacity-30 pointer-events-none"
                          style={{ zIndex: 10 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-green-400">
            {isGroundPaletteSelectionMode ? (
              <span className="text-blue-400 font-semibold">
                MULTI-SELECT MODE: Drag to select rectangle
              </span>
            ) : isFillBucketMode ? (
              <span className="text-orange-400 font-semibold">
                FILL BUCKET MODE: Selected Tile #{selectedTileId}
              </span>
            ) : (
              <>Selected: Tile #{selectedTileId}</>
            )}
          </div>
        </div>
      )}

      {/* Collidables Palette */}
      {activeLayer === "collidables" && (
        <div className="bg-gray-800 p-4 rounded-lg border-2 border-red-500">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-medium text-red-400">Collidable Objects</div>
            <div className="flex gap-2">
              <Button
                onClick={togglePaletteSelectionMode}
                size="sm"
                className={`${
                  isPaletteSelectionMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-700 hover:bg-gray-600"
                } text-white border border-gray-600`}
              >
                {isPaletteSelectionMode ? "Exit Multi-Select" : "Multi-Select"}
              </Button>
              {clipboard && clipboard.layer === "collidables" && (
                <Button
                  onClick={() => setClipboard(null)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500"
                  title="Clear clipboard"
                >
                  Clear ({clipboard.width}×{clipboard.height})
                </Button>
              )}
              <Button
                onClick={() => {
                  setSelectedTileId(-1);
                  setActiveLayer("collidables");
                  setIsPaletteSelectionMode(false);
                }}
                size="sm"
                className={`${
                  selectedTileId === -1 && activeLayer === "collidables"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-700 hover:bg-gray-600"
                } text-white border border-gray-600`}
              >
                Eraser
              </Button>
            </div>
          </div>

          <div
            className="inline-block border-2 border-gray-600 bg-gray-900"
            onMouseDown={(e) => {
              if (isPaletteSelectionMode) {
                e.preventDefault();
              }
            }}
            onMouseUp={() => {
              if (isPaletteSelectionMode) {
                handlePaletteSelectionMouseUp();
              }
            }}
            onMouseLeave={() => {
              if (isPaletteSelectionMode) {
                handlePaletteSelectionMouseUp();
              }
            }}
          >
            {Array.from({ length: collidablesDimensions.rows }, (_, rowIdx) => (
              <div key={rowIdx} className="flex">
                {Array.from({ length: collidablesDimensions.cols }, (_, colIdx) => {
                  const tileId = rowIdx * collidablesDimensions.cols + colIdx;
                  const isSelected = tileId === selectedTileId && activeLayer === "collidables";

                  const bounds = getPaletteSelectionBounds();
                  const isInSelection =
                    bounds &&
                    rowIdx >= bounds.minRow &&
                    rowIdx <= bounds.maxRow &&
                    colIdx >= bounds.minCol &&
                    colIdx <= bounds.maxCol;

                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className={`relative border cursor-pointer transition-all ${
                        isSelected
                          ? "border-red-400 border-2"
                          : "border-gray-700 hover:border-red-500"
                      }`}
                      style={{
                        width: `${getConfig().world.TILE_SIZE * 2}px`,
                        height: `${getConfig().world.TILE_SIZE * 2}px`,
                        backgroundImage: "url(/sheets/collidables.png)",
                        backgroundSize: `${
                          collidablesDimensions.cols * getConfig().world.TILE_SIZE * 2
                        }px ${collidablesDimensions.rows * getConfig().world.TILE_SIZE * 2}px`,
                        backgroundPosition: `-${colIdx * getConfig().world.TILE_SIZE * 2}px -${
                          rowIdx * getConfig().world.TILE_SIZE * 2
                        }px`,
                        imageRendering: "pixelated",
                      }}
                      onClick={() => {
                        if (!isPaletteSelectionMode) {
                          onTileSelect(rowIdx, colIdx, "collidables");
                        }
                      }}
                      onMouseDown={() => {
                        if (isPaletteSelectionMode) {
                          handlePaletteSelectionMouseDown(rowIdx, colIdx);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isPaletteSelectionMode) {
                          handlePaletteSelectionMouseMove(rowIdx, colIdx);
                        }
                      }}
                      title={`Collidable Tile ID: ${tileId}`}
                    >
                      {isInSelection && (
                        <div
                          className="absolute inset-0 border-2 border-blue-400 bg-blue-400 bg-opacity-30 pointer-events-none"
                          style={{ zIndex: 10 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-red-400">
            {isPaletteSelectionMode ? (
              <span className="text-blue-400 font-semibold">
                MULTI-SELECT MODE: Drag to select rectangle
              </span>
            ) : (
              <>
                Selected:{" "}
                {selectedTileId === -1 ? "Eraser (remove object)" : `Tile #${selectedTileId}`}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
