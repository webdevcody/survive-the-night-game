import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientCarryable } from "@/extensions/carryable";
import { ClientDestructible } from "@/extensions/destructible";
import { EntityCategories } from "@shared/entities";
import { PlayerClient } from "@/entities/player";
import { WallClient } from "@/entities/items/wall";
import { TreeClient } from "@/entities/items/tree";
import { ClothClient } from "@/entities/items/cloth";
import { CrateClient } from "@/entities/items/crate";
import { AcidProjectileClient } from "@/entities/acid-projectile";

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
  };
  indicators: {
    acid: { shape: string; size: number };
    enemy: { shape: string; size: number };
    player: { shape: string; size: number };
    wall: { shape: string; size: number };
    item: { shape: string; size: number };
    tree: { shape: string; size: number };
  };
}

/**
 * Determines the color and indicator settings for an entity on the map.
 * This function centralizes the logic for entity coloring so it can be reused
 * across minimap and fullscreen map implementations.
 *
 * @param entity - The entity to determine color for
 * @param settings - Map color settings containing colors and indicators
 * @returns EntityMapIndicator with color and indicator, or null if entity should be skipped
 */
export function getEntityMapColor(
  entity: ClientEntityBase,
  settings: MapColorSettings
): EntityMapIndicator | null {
  const category = entity.getCategory();

  // Helper to convert indicator shape
  const convertIndicator = (indicator: { shape: string; size: number }): EntityMapIndicator["indicator"] => ({
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

