/**
 * Resolve sprite crops for decals-layer markers on the map editor canvas.
 * Logic mirrors {@link MarkersPanel} / `DecalMarkerIcon` in the website editor.
 */
import { getConfig } from "../config";
import { ENVIRONMENT_CONFIGS } from "../entities/environment-configs";
import { ITEM_CONFIGS } from "../entities/item-configs";
import { COLLIDABLE_TILE_MERCHANT } from "./collidable-tile-ids";
import {
  DECAL_TILE_AUCTION_HOUSE,
  DECAL_TILE_CAMPSITE,
  DECAL_TILE_CHEMISTRY_TABLE,
  DECAL_TILE_FORGE,
  DECAL_TILE_LIGHT,
  DECAL_TILE_LOCKER,
  DECAL_TILE_MESSAGE,
  DECAL_TILE_SCAVENGE,
  DECAL_TILE_SHOPKEEPER,
  DECAL_TILE_WORKBENCH,
} from "./decal-palette";

export type EditorDecalSpriteSheetId = "items" | "ground" | "collidables" | "locker";

export const EDITOR_DECAL_SPRITE_SHEET_URLS: Record<EditorDecalSpriteSheetId, string> = {
  items: "/sheets/items-sheet.png",
  ground: "/sheets/ground.png",
  collidables: "/sheets/collidables.png",
  locker: "/sheets/locker.png",
};

export interface EditorDecalSpriteBlit {
  sheet: EditorDecalSpriteSheetId;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface EditorDecalSpriteMapDimensions {
  groundCols: number;
  groundRows: number;
  collidablesCols: number;
  collidablesRows: number;
}

function tileSize(): number {
  return getConfig().world.TILE_SIZE;
}

/**
 * Sprite to draw for a decals-layer tile id, or null if unknown / no art.
 */
export function getEditorDecalSpriteBlit(
  decalTileId: number,
  map: EditorDecalSpriteMapDimensions,
): EditorDecalSpriteBlit | null {
  const t = tileSize();
  switch (decalTileId) {
    case DECAL_TILE_CAMPSITE: {
      const a = ENVIRONMENT_CONFIGS.campsite_fire.assets;
      return { sheet: "ground", sx: a.x, sy: a.y, sw: t, sh: t };
    }
    case DECAL_TILE_LIGHT: {
      const a = ITEM_CONFIGS.torch.assets;
      return {
        sheet: "items",
        sx: a.x,
        sy: a.y,
        sw: a.width ?? t,
        sh: a.height ?? t,
      };
    }
    case DECAL_TILE_MESSAGE: {
      const a = ITEM_CONFIGS.sign.assets;
      return {
        sheet: "items",
        sx: a.x,
        sy: a.y,
        sw: a.width ?? t,
        sh: a.height ?? t,
      };
    }
    case DECAL_TILE_WORKBENCH: {
      const a = ENVIRONMENT_CONFIGS.workbench.assets;
      return { sheet: "items", sx: a.x, sy: a.y, sw: t, sh: t };
    }
    case DECAL_TILE_FORGE: {
      const a = ENVIRONMENT_CONFIGS.forge.assets;
      return { sheet: "items", sx: a.x, sy: a.y, sw: t, sh: t };
    }
    case DECAL_TILE_CHEMISTRY_TABLE: {
      const a = ENVIRONMENT_CONFIGS.chemistry_table.assets;
      return { sheet: "items", sx: a.x, sy: a.y, sw: t, sh: t };
    }
    case DECAL_TILE_LOCKER: {
      const a = ENVIRONMENT_CONFIGS.locker.assets;
      return {
        sheet: "locker",
        sx: a.x,
        sy: a.y,
        sw: a.width ?? t,
        sh: a.height ?? t,
      };
    }
    case DECAL_TILE_SHOPKEEPER: {
      const cols = map.collidablesCols;
      const tileId = COLLIDABLE_TILE_MERCHANT;
      const c = tileId % cols;
      const r = Math.floor(tileId / cols);
      return { sheet: "collidables", sx: c * t, sy: r * t, sw: t, sh: t };
    }
    case DECAL_TILE_AUCTION_HOUSE: {
      const a = ENVIRONMENT_CONFIGS.auction_house.assets;
      return { sheet: "locker", sx: a.x, sy: a.y, sw: t, sh: t };
    }
    case DECAL_TILE_SCAVENGE: {
      const a = ENVIRONMENT_CONFIGS.scavenge_decal.assets;
      return { sheet: "ground", sx: a.x, sy: a.y, sw: t, sh: t };
    }
    default:
      return null;
  }
}
