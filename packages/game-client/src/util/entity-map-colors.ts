import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientCarryable } from "@/extensions/carryable";
import { ClientDestructible } from "@/extensions/destructible";
import { EntityCategories } from "@shared/entities";
import { CraftingStationClient } from "@/entities/environment/crafting-station";
import { CampsiteFireClient } from "@/entities/environment/campsite-fire";
import { PlayerClient } from "@/entities/player";
import { WallClient } from "@/entities/items/wall";
import { TreeClient } from "@/entities/items/tree";
import { ClothClient } from "@/entities/items/cloth";
import { CrateClient } from "@/entities/items/crate";
import { AcidProjectileClient } from "@/entities/acid-projectile";
import { MerchantClient } from "@/entities/environment/merchant";
import { DialogueSurvivorNpcClient } from "@/entities/environment/dialogue-survivor-npc";
import { GameState } from "@/state";

export interface EntityMapIndicator {
  color: string;
  indicator: {
    shape: "circle" | "rectangle";
    size: number;
  };
}

export interface MapColorSettings {
  colors: {
    enemy: string;
    deadEnemy: string;
    player: string;
    wall: string;
    item: string;
    tree: string;
    acid: string;
    merchantNpc: string;
    dialogueNpc: string;
    craftingStation: string;
    campsiteFire: string;
  };
  indicators: {
    acid: { shape: string; size: number };
    enemy: { shape: string; size: number };
    player: { shape: string; size: number };
    wall: { shape: string; size: number };
    item: { shape: string; size: number };
    tree: { shape: string; size: number };
    npc: { shape: string; size: number };
  };
}

export interface MapColorOptions {
  gameState?: GameState;
  myPlayerId?: number;
  myPlayerIsZombie?: boolean;
}

/** POI markers that stay visible on explored-but-unseen (fogged) parts of the map. */
export function isStrategicMapPoiEntity(entity: ClientEntityBase): boolean {
  return (
    entity instanceof CraftingStationClient ||
    entity instanceof CampsiteFireClient ||
    entity instanceof MerchantClient ||
    entity instanceof DialogueSurvivorNpcClient
  );
}

function firstLetterGlyph(displayName: string, fallback: string): string {
  const s = displayName.trim();
  if (!s) return fallback;
  const cp = s.codePointAt(0);
  if (cp === undefined) return fallback;
  return String.fromCodePoint(cp).toLocaleUpperCase();
}

/** Short label drawn on crafting stations / fire on minimap and full map. */
export function getMapPoiGlyph(entity: ClientEntityBase): string | null {
  if (entity instanceof MerchantClient) {
    return "M";
  }
  if (entity instanceof DialogueSurvivorNpcClient) {
    return firstLetterGlyph(entity.displayName, "?");
  }
  if (entity instanceof CampsiteFireClient) {
    return "\u25B3";
  }
  if (entity instanceof CraftingStationClient) {
    switch (entity.getType()) {
      case "workbench":
        return "W";
      case "chemistry_table":
        return "C";
      case "forge":
        return "F";
      case "locker":
        return "L";
      case "auction_house":
        return "A";
      default:
        return "T";
    }
  }
  return null;
}

/**
 * Determines the color and indicator settings for an entity on the map.
 * This function centralizes the logic for entity coloring so it can be reused
 * across minimap and fullscreen map implementations.
 */
export function getEntityMapColor(
  entity: ClientEntityBase,
  settings: MapColorSettings,
  options?: MapColorOptions
): EntityMapIndicator | null {
  const category = entity.getCategory();

  // Helper to convert indicator shape
  const convertIndicator = (indicator: {
    shape: string;
    size: number;
  }): EntityMapIndicator["indicator"] => ({
    shape: indicator.shape as "circle" | "rectangle",
    size: indicator.size,
  });

  // Zombies
  if (category === EntityCategories.ZOMBIE) {
    const isDead = entity.hasExt(ClientDestructible) && entity.getExt(ClientDestructible).isDead();
    return {
      color: isDead ? settings.colors.deadEnemy : settings.colors.enemy,
      indicator: convertIndicator(settings.indicators.enemy),
    };
  }

  // Players
  if (entity instanceof PlayerClient) {
    return {
      color: settings.colors.player,
      indicator: convertIndicator(settings.indicators.player),
    };
  }

  // Shop + dialogue NPCs (before generic carryable)
  if (entity instanceof MerchantClient) {
    return {
      color: settings.colors.merchantNpc,
      indicator: convertIndicator(settings.indicators.npc),
    };
  }
  if (entity instanceof DialogueSurvivorNpcClient) {
    return {
      color: settings.colors.dialogueNpc,
      indicator: convertIndicator(settings.indicators.npc),
    };
  }

  if (entity instanceof CraftingStationClient) {
    return {
      color: settings.colors.craftingStation,
      indicator: convertIndicator(settings.indicators.npc),
    };
  }

  if (entity instanceof CampsiteFireClient) {
    return {
      color: settings.colors.campsiteFire,
      indicator: convertIndicator(settings.indicators.npc),
    };
  }

  // Walls
  if (entity instanceof WallClient) {
    return {
      color: settings.colors.wall,
      indicator: convertIndicator(settings.indicators.wall),
    };
  }

  // Trees and Wood items
  if (entity instanceof TreeClient) {
    // Check if it's wood (carryable) or a tree (environment)
    if (entity.hasExt(ClientCarryable)) {
      // Wood item - orange
      return {
        color: "orange",
        indicator: convertIndicator(settings.indicators.item),
      };
    } else {
      // Tree in environment - brown circle
      return {
        color: "#8B4513", // Brown color
        indicator: convertIndicator(settings.indicators.item), // Circle shape
      };
    }
  }

  // Cloth items - white
  if (entity instanceof ClothClient) {
    return {
      color: "white",
      indicator: convertIndicator(settings.indicators.item),
    };
  }

  // Crates - skip (rendered separately)
  if (entity instanceof CrateClient) {
    return null;
  }

  // Other carryable items
  if (entity.hasExt(ClientCarryable)) {
    return {
      color: settings.colors.item,
      indicator: convertIndicator(settings.indicators.item),
    };
  }

  // Acid projectiles
  if (entity instanceof AcidProjectileClient) {
    return {
      color: settings.colors.acid,
      indicator: convertIndicator(settings.indicators.acid),
    };
  }

  // Unknown entity type - skip
  return null;
}
