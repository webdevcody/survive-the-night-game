import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import type { Layer } from "../-types";
import { getConfig } from "@survive-the-night/game-shared/config";
import {
  ITEM_SPAWN_PALETTE_ENTRIES,
  NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID,
  SPAWN_BASE_PALETTE_ENTRIES,
} from "@survive-the-night/game-shared/map/spawn-palette";
import { DECAL_PALETTE_ENTRIES } from "@survive-the-night/game-shared/map/decal-palette";
import { DialogueNpcsPanel } from "./DialogueNpcsPanel";

interface TilePaletteProps {
  onTileSelect: (row: number, col: number, layer: Layer) => void;
}

const tabBtn = "flex-1 !rounded-none text-xs h-7 px-2 py-0 font-medium";
const toolBtn = "!rounded-none text-xs h-7 px-2 gap-1 border border-gray-600";

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
    if (!isPaletteSelectionMode) {
      setIsFillBucketMode(false);
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex flex-wrap border border-gray-600 divide-x divide-gray-600">
        <Button
          size="sm"
          onClick={() => switchLayer("ground")}
          className={`${tabBtn} ${
            activeLayer === "ground"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-700 hover:bg-gray-600"
          } text-white border-0`}
        >
          Ground
        </Button>
        <Button
          size="sm"
          onClick={() => switchLayer("collidables")}
          className={`${tabBtn} ${
            activeLayer === "collidables"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-700 hover:bg-gray-600"
          } text-white border-0`}
        >
          Collidables
        </Button>
        <Button
          size="sm"
          onClick={() => switchLayer("spawns")}
          className={`${tabBtn} ${
            activeLayer === "spawns"
              ? "bg-violet-600 hover:bg-violet-700"
              : "bg-gray-700 hover:bg-gray-600"
          } text-white border-0`}
        >
          Spawns
        </Button>
        <Button
          size="sm"
          onClick={() => switchLayer("decals")}
          className={`${tabBtn} ${
            activeLayer === "decals"
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-gray-700 hover:bg-gray-600"
          } text-white border-0`}
        >
          Decals
        </Button>
      </div>

      {activeLayer === "ground" && (
        <div className="border border-green-600 bg-gray-800 py-2 px-0">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-1 px-2">
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
              className={`${toolBtn} ${
                isFillBucketMode
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              title="Flood fill"
            >
              Fill
            </Button>
            <Button
              onClick={toggleGroundPaletteSelectionMode}
              size="sm"
              className={`${toolBtn} ${
                isGroundPaletteSelectionMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              title="Rectangle select"
            >
              {isGroundPaletteSelectionMode ? "Exit multi" : "Multi"}
            </Button>
            {clipboard && clipboard.layer === "ground" && (
              <Button
                onClick={() => setClipboard(null)}
                size="sm"
                className={`${toolBtn} bg-purple-600 hover:bg-purple-700 text-white border-purple-500`}
                title="Clear clipboard"
              >
                Clear ({clipboard.width}×{clipboard.height})
              </Button>
            )}
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
        </div>
      )}

      {activeLayer === "collidables" && (
        <div className="border border-red-600 bg-gray-800 py-2 px-0">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-1 px-2">
            <Button
              onClick={() => {
                setIsFillBucketMode(!isFillBucketMode);
                if (!isFillBucketMode) {
                  setIsPaletteSelectionMode(false);
                  setPaletteSelectionStart(null);
                  setPaletteSelectionCurrent(null);
                }
              }}
              size="sm"
              className={`${toolBtn} ${
                isFillBucketMode
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              title="Flood fill"
            >
              Fill
            </Button>
            <Button
              onClick={togglePaletteSelectionMode}
              size="sm"
              className={`${toolBtn} ${
                isPaletteSelectionMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              title="Rectangle select"
            >
              {isPaletteSelectionMode ? "Exit multi" : "Multi"}
            </Button>
            {clipboard && clipboard.layer === "collidables" && (
              <Button
                onClick={() => setClipboard(null)}
                size="sm"
                className={`${toolBtn} bg-purple-600 hover:bg-purple-700 text-white border-purple-500`}
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
              className={`${toolBtn} ${
                selectedTileId === -1 && activeLayer === "collidables"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
            >
              Eraser
            </Button>
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
        </div>
      )}

      {activeLayer === "spawns" && (
        <div className="border border-violet-600 bg-gray-800 py-2 px-2">
          <p className="mb-2 text-[10px] leading-tight text-gray-400">
            Player, enemy, and item respawn fixtures. Uses world-map spawns layer (no procedural
            fallback when empty). Item tiles respawn pickups on an interval per type.
          </p>
          <p className="mb-1 text-[10px] font-medium text-gray-300">Player &amp; zombies</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {SPAWN_BASE_PALETTE_ENTRIES.map((entry) => {
              const isSelected = selectedTileId === entry.id && activeLayer === "spawns";
              return (
                <Button
                  key={entry.id}
                  size="sm"
                  onClick={() => {
                    setSelectedTileId(entry.id);
                    setActiveLayer("spawns");
                  }}
                  className={`!rounded-none text-xs h-8 min-w-[4.5rem] px-2 border text-white ${
                    isSelected
                      ? "border-white ring-1 ring-white"
                      : "border-gray-600"
                  }`}
                  style={{
                    backgroundColor: entry.id === 0 ? "rgb(55 65 81)" : entry.color,
                  }}
                  title={entry.label}
                >
                  {entry.label}
                </Button>
              );
            })}
          </div>
          <p className="mb-1 text-[10px] font-medium text-gray-300">Item / ammo / weapon spawners</p>
          <div className="max-h-48 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-1">
              {ITEM_SPAWN_PALETTE_ENTRIES.map((entry) => {
                const isSelected = selectedTileId === entry.id && activeLayer === "spawns";
                return (
                  <Button
                    key={entry.id}
                    size="sm"
                    onClick={() => {
                      setSelectedTileId(entry.id);
                      setActiveLayer("spawns");
                    }}
                    className={`!rounded-none text-xs h-8 min-w-[4.5rem] px-2 border text-white ${
                      isSelected
                        ? "border-white ring-1 ring-white"
                        : "border-gray-600"
                    }`}
                    style={{
                      backgroundColor: entry.color,
                    }}
                    title={entry.label}
                  >
                    {entry.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <p className="mb-1 mt-2 text-[10px] font-medium text-gray-300">Dialogue NPC (survivor)</p>
          <div className="mb-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedTileId(NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID);
                setActiveLayer("spawns");
              }}
              className={`!rounded-none text-xs h-8 min-w-[4.5rem] px-2 border text-white ${
                selectedTileId === NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID && activeLayer === "spawns"
                  ? "border-white ring-1 ring-white"
                  : "border-gray-600"
              }`}
              style={{
                backgroundColor: "rgba(52,211,153,0.55)",
              }}
              title="Static NPC with survivor sprite; set dialogue below."
            >
              Dialogue NPC
            </Button>
          </div>
          <p className="mb-1 text-[10px] font-medium text-gray-300">Dialogue text</p>
          <DialogueNpcsPanel />
        </div>
      )}

      {activeLayer === "decals" && (
        <div className="border border-amber-600 bg-gray-800 py-2 px-2">
          <p className="mb-2 text-[10px] leading-tight text-gray-400">
            Overlays on the ground layer (saved in world-map{" "}
            <code className="text-gray-300">decals</code>). The Campsite decal is where the
            campfire entity spawns in-game. Use the Spawns tab for player/enemy markers — separate
            from Campsite decals.
          </p>
          <div className="flex flex-wrap gap-1">
            {DECAL_PALETTE_ENTRIES.map((entry) => {
              const isSelected = selectedTileId === entry.id && activeLayer === "decals";
              return (
                <Button
                  key={entry.id}
                  size="sm"
                  onClick={() => {
                    setSelectedTileId(entry.id);
                    setActiveLayer("decals");
                  }}
                  className={`!rounded-none text-xs h-8 min-w-[4.5rem] px-2 border text-white ${
                    isSelected
                      ? "border-white ring-1 ring-white"
                      : "border-gray-600"
                  }`}
                  style={{
                    backgroundColor: entry.id === 0 ? "rgb(55 65 81)" : entry.color,
                  }}
                  title={entry.label}
                >
                  {entry.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
