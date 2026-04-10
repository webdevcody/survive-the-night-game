import { Entity } from "@/entities/entity";
import { ItemType } from "@shared/util/inventory";
import { Direction } from "@shared/util/direction";
/**
 * Handler function for weapon attacks/usage
 */
export type WeaponHandler = (weaponEntity: Entity, playerId: number, position: {
    x: number;
    y: number;
}, facing: Direction, aimAngle: number | undefined, inventoryIndex: number) => void;
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
declare class WeaponHandlerRegistry {
    private handlers;
    /**
     * Register a handler for a specific weapon type
     */
    register(weaponType: ItemType, config: WeaponHandlerConfig): void;
    /**
     * Get handler config for a weapon type
     */
    get(weaponType: ItemType): WeaponHandlerConfig | undefined;
    /**
     * Check if a weapon type has a registered handler
     */
    has(weaponType: ItemType): boolean;
}
export declare const weaponHandlerRegistry: WeaponHandlerRegistry;
export {};
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
