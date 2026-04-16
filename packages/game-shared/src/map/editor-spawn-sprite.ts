/**
 * Resolve in-game sprite sheet crops for map spawns (editor minimap / palette / canvas).
 * Paths align with {@link packages/game-client/src/managers/asset.ts} SPRITE_SHEETS.
 */
import { getConfig } from "../config";
import { CHARACTER_CONFIGS } from "../entities/character-configs";
import { ITEM_CONFIGS } from "../entities/item-configs";
import { RESOURCE_CONFIGS } from "../entities/resource-configs";
import { WEAPON_CONFIGS } from "../entities/weapon-configs";
import { ZOMBIE_CONFIGS } from "../entities/zombie-configs";
import type { EntityType } from "../types/entity";
import {
  EXTENDED_ZOMBIE_SPAWN_FIXTURES,
  SPAWN_TILE_PLAYER,
  isItemSpawnTile,
  isNpcDialogueSurvivorSpawnTile,
  isNpcHealerDialogueSpawnTile,
  spawnTileIdToItemFixtureType,
} from "./spawn-palette";

export type EditorSpawnSpriteSheetId = "items" | "characters";

export const EDITOR_SPAWN_SPRITE_SHEET_URLS: Record<EditorSpawnSpriteSheetId, string> = {
  items: "/sheets/items-sheet.png",
  characters: "/sheets/characters-sheet.png",
};

export interface EditorSpawnSpriteBlit {
  sheet: EditorSpawnSpriteSheetId;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

function tileSize(): number {
  return getConfig().world.TILE_SIZE;
}

function blitCharacterDown(frame: {
  startX: number;
  downY: number;
}): EditorSpawnSpriteBlit {
  const t = tileSize();
  return { sheet: "characters", sx: frame.startX, sy: frame.downY, sw: t, sh: t };
}

const ENEMY_TILE_TO_ZOMBIE_KEY = {
  2: "zombie",
  3: "fast_zombie",
  4: "big_zombie",
  5: "bat_zombie",
  6: "spitter_zombie",
} as const satisfies Record<number, keyof typeof ZOMBIE_CONFIGS>;

function blitForFixtureEntityType(t: EntityType): EditorSpawnSpriteBlit | null {
  const item = ITEM_CONFIGS[t];
  if (item) {
    const a = item.assets;
    const ts = tileSize();
    return {
      sheet: "items",
      sx: a.x,
      sy: a.y,
      sw: a.width ?? ts,
      sh: a.height ?? ts,
    };
  }
  const weapon = WEAPON_CONFIGS[t];
  if (weapon) {
    const d = weapon.assets.spritePositions.down;
    const ts = tileSize();
    return { sheet: "items", sx: d.x, sy: d.y, sw: ts, sh: ts };
  }
  const resource = RESOURCE_CONFIGS[t];
  if (resource) {
    const a = resource.assets;
    const ts = tileSize();
    return {
      sheet: "items",
      sx: a.x,
      sy: a.y,
      sw: a.width ?? ts,
      sh: a.height ?? ts,
    };
  }
  return null;
}

/**
 * Sprite to draw for a spawns-layer tile id, or null if unknown / no art.
 */
export function getEditorSpawnSpriteBlit(spawnTileId: number): EditorSpawnSpriteBlit | null {
  if (spawnTileId <= 0) {
    return null;
  }
  if (spawnTileId === SPAWN_TILE_PLAYER) {
    return blitCharacterDown(CHARACTER_CONFIGS.player.assets.frameLayout);
  }

  const paletteKey = ENEMY_TILE_TO_ZOMBIE_KEY[spawnTileId as keyof typeof ENEMY_TILE_TO_ZOMBIE_KEY];
  if (paletteKey) {
    const z = ZOMBIE_CONFIGS[paletteKey];
    return blitCharacterDown(z.assets.frameLayout);
  }

  const ext = EXTENDED_ZOMBIE_SPAWN_FIXTURES.find((e) => e.id === spawnTileId);
  if (ext) {
    const z = ZOMBIE_CONFIGS[ext.kind];
    if (z) {
      return blitCharacterDown(z.assets.frameLayout);
    }
  }

  if (isItemSpawnTile(spawnTileId)) {
    const t = spawnTileIdToItemFixtureType(spawnTileId);
    if (!t) {
      return null;
    }
    return blitForFixtureEntityType(t);
  }

  if (isNpcDialogueSurvivorSpawnTile(spawnTileId) || isNpcHealerDialogueSpawnTile(spawnTileId)) {
    return blitCharacterDown(CHARACTER_CONFIGS.dialogue_survivor_npc.assets.frameLayout);
  }

  return null;
}
