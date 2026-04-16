import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { getConfig } from "@survive-the-night/game-shared/config";
import { ENVIRONMENT_CONFIGS } from "@survive-the-night/game-shared/entities/environment-configs";
import { ITEM_CONFIGS } from "@survive-the-night/game-shared/entities/item-configs";
import { COLLIDABLE_TILE_MERCHANT } from "@survive-the-night/game-shared/map/collidable-tile-ids";
import {
  DECAL_PALETTE_ENTRIES,
  DECAL_TILE_AUCTION_HOUSE,
  DECAL_TILE_CAMPSITE,
  DECAL_TILE_CHEMISTRY_TABLE,
  DECAL_TILE_FORGE,
  DECAL_TILE_LIGHT,
  DECAL_TILE_LOCKER,
  DECAL_TILE_MESSAGE,
  DECAL_TILE_NONE,
  DECAL_TILE_SCAVENGE,
  DECAL_TILE_SHOPKEEPER,
  DECAL_TILE_WORKBENCH,
} from "@survive-the-night/game-shared/map/decal-palette";
import { useEditorStore } from "../-store";

/** Paintable decals only (no “empty / erase via palette” row — use list toggle-off or Delete). */
const MARKER_PALETTE_ENTRIES = DECAL_PALETTE_ENTRIES.filter((e) => e.id !== DECAL_TILE_NONE);

const ITEMS_SHEET_PX = { w: 160, h: 256 } as const;
const LOCKER_SHEET_PX = { w: 32, h: 16 } as const;
const SPRITE_ZOOM = 2;

function PixelSpriteIcon(props: {
  url: string;
  sheetPxW: number;
  sheetPxH: number;
  srcXPx: number;
  srcYPx: number;
  className?: string;
}) {
  const TILE = getConfig().world.TILE_SIZE;
  const { url, sheetPxW, sheetPxH, srcXPx, srcYPx, className } = props;
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded border border-gray-600 bg-gray-950",
        className,
      )}
      style={{
        width: TILE * SPRITE_ZOOM,
        height: TILE * SPRITE_ZOOM,
        backgroundImage: `url(${url})`,
        backgroundSize: `${sheetPxW * SPRITE_ZOOM}px ${sheetPxH * SPRITE_ZOOM}px`,
        backgroundPosition: `-${srcXPx * SPRITE_ZOOM}px -${srcYPx * SPRITE_ZOOM}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

function DecalMarkerIcon({
  decalId,
  groundCols,
  groundRows,
  collidablesCols,
  collidablesRows,
}: {
  decalId: number;
  groundCols: number;
  groundRows: number;
  collidablesCols: number;
  collidablesRows: number;
}) {
  const TILE = getConfig().world.TILE_SIZE;
  const groundSheetPxW = groundCols * TILE;
  const groundSheetPxH = groundRows * TILE;

  if (decalId === DECAL_TILE_CAMPSITE) {
    const a = ENVIRONMENT_CONFIGS.campsite_fire.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/ground.png"
        sheetPxW={groundSheetPxW}
        sheetPxH={groundSheetPxH}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  if (decalId === DECAL_TILE_LIGHT) {
    const a = ITEM_CONFIGS.torch.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/items-sheet.png"
        sheetPxW={ITEMS_SHEET_PX.w}
        sheetPxH={ITEMS_SHEET_PX.h}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  if (decalId === DECAL_TILE_MESSAGE) {
    const a = ITEM_CONFIGS.sign.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/items-sheet.png"
        sheetPxW={ITEMS_SHEET_PX.w}
        sheetPxH={ITEMS_SHEET_PX.h}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  if (decalId === DECAL_TILE_WORKBENCH) {
    const a = ENVIRONMENT_CONFIGS.workbench.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/items-sheet.png"
        sheetPxW={ITEMS_SHEET_PX.w}
        sheetPxH={ITEMS_SHEET_PX.h}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  if (decalId === DECAL_TILE_FORGE) {
    const a = ENVIRONMENT_CONFIGS.forge.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/items-sheet.png"
        sheetPxW={ITEMS_SHEET_PX.w}
        sheetPxH={ITEMS_SHEET_PX.h}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  if (decalId === DECAL_TILE_CHEMISTRY_TABLE) {
    const a = ENVIRONMENT_CONFIGS.chemistry_table.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/items-sheet.png"
        sheetPxW={ITEMS_SHEET_PX.w}
        sheetPxH={ITEMS_SHEET_PX.h}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  if (decalId === DECAL_TILE_LOCKER) {
    const a = ENVIRONMENT_CONFIGS.locker.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/locker.png"
        sheetPxW={LOCKER_SHEET_PX.w}
        sheetPxH={LOCKER_SHEET_PX.h}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  if (decalId === DECAL_TILE_SHOPKEEPER) {
    const cols = collidablesCols;
    const tileId = COLLIDABLE_TILE_MERCHANT;
    const c = tileId % cols;
    const r = Math.floor(tileId / cols);
    const sheetPxW = cols * TILE;
    const sheetPxH = collidablesRows * TILE;
    return (
      <PixelSpriteIcon
        url="/sheets/collidables.png"
        sheetPxW={sheetPxW}
        sheetPxH={sheetPxH}
        srcXPx={c * TILE}
        srcYPx={r * TILE}
      />
    );
  }

  if (decalId === DECAL_TILE_AUCTION_HOUSE) {
    const a = ENVIRONMENT_CONFIGS.auction_house.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/locker.png"
        sheetPxW={LOCKER_SHEET_PX.w}
        sheetPxH={LOCKER_SHEET_PX.h}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  if (decalId === DECAL_TILE_SCAVENGE) {
    const a = ENVIRONMENT_CONFIGS.scavenge_decal.assets;
    return (
      <PixelSpriteIcon
        url="/sheets/ground.png"
        sheetPxW={groundSheetPxW}
        sheetPxH={groundSheetPxH}
        srcXPx={a.x}
        srcYPx={a.y}
      />
    );
  }

  return (
    <span
      className="inline-block h-8 w-8 shrink-0 rounded border border-gray-600 bg-gray-900"
      aria-hidden
    />
  );
}

export function MarkersPanel() {
  const activeLayer = useEditorStore((state) => state.activeLayer);
  const selectedTileId = useEditorStore((state) => state.selectedTileId);
  const setSelectedTileId = useEditorStore((state) => state.setSelectedTileId);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-1">
        {MARKER_PALETTE_ENTRIES.map((entry) => {
          const isSelected = selectedTileId === entry.id && activeLayer === "decals";
          return (
            <Button
              key={entry.id}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (isSelected) {
                  setSelectedTileId(0);
                } else {
                  setSelectedTileId(entry.id);
                  setActiveLayer("decals");
                }
              }}
              className={cn(
                "!rounded-none h-auto min-h-9 w-full justify-start gap-2 border border-gray-600 bg-gray-800/90 px-2 py-1.5 text-xs text-white hover:bg-gray-700/80",
                isSelected ? "border-white ring-1 ring-white" : "",
              )}
              style={{
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${entry.color} 35%, transparent)`,
              }}
              title={entry.label}
            >
              <DecalMarkerIcon
                decalId={entry.id}
                groundCols={groundDimensions.cols}
                groundRows={groundDimensions.rows}
                collidablesCols={collidablesDimensions.cols}
                collidablesRows={collidablesDimensions.rows}
              />
              <span className="min-w-0 flex-1 text-left font-medium leading-tight">{entry.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
