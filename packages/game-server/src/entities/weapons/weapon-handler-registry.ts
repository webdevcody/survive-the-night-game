import { Entity } from "@/entities/entity";
import { Weapon } from "./weapon";
import { ItemType } from "@shared/util/inventory";
import { Direction } from "@shared/util/direction";
import { Cooldown } from "@/entities/util/cooldown";

/**
 * Handler function for weapon attacks/usage
 */
export type WeaponHandler = (
  weaponEntity: Entity,
  playerId: string,
  position: { x: number; y: number },
  facing: Direction,
  aimAngle: number | undefined,
  inventoryIndex: number
) => void;

/**
 * Configuration for weapon behavior
 */
export interface WeaponHandlerConfig {
  /**
   * Handler function that executes the weapon attack/use
   */
  handler: WeaponHandler;
  /**
   * Cooldown duration in seconds
   */
  cooldown: number;
}

/**
 * Registry for weapon handlers
 * This allows extensible weapon behavior without hardcoding instanceof checks
 */
class WeaponHandlerRegistry {
  private handlers = new Map<ItemType, WeaponHandlerConfig>();

  /**
   * Register a handler for a specific weapon type
   */
  register(weaponType: ItemType, config: WeaponHandlerConfig): void {
    this.handlers.set(weaponType, config);
  }

  /**
   * Get handler config for a weapon type
   */
  get(weaponType: ItemType): WeaponHandlerConfig | undefined {
    return this.handlers.get(weaponType);
  }

  /**
   * Check if a weapon type has a registered handler
   */
  has(weaponType: ItemType): boolean {
    return this.handlers.has(weaponType);
  }
}

export const weaponHandlerRegistry = new WeaponHandlerRegistry();

/**
 * Registry for weapon handlers that need custom behavior
 *
 * Most weapons extend Weapon class and use the standard attack() method.
 * Only register handlers here for weapons that can't extend Weapon class
 * or need completely custom behavior that can't be handled via attack()
 *
 * Usage:
 *   weaponHandlerRegistry.register("weapon_type", {
 *     cooldown: 0.5,
 *     handler: (weaponEntity, playerId, position, facing, aimAngle, inventoryIndex) => {
 *       // custom behavior
 *     }
 *   });
 */
