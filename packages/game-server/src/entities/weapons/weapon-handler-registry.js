/**
 * Registry for weapon handlers
 * This allows extensible weapon behavior without hardcoding instanceof checks
 */
class WeaponHandlerRegistry {
    constructor() {
        this.handlers = new Map();
    }
    /**
     * Register a handler for a specific weapon type
     */
    register(weaponType, config) {
        this.handlers.set(weaponType, config);
    }
    /**
     * Get handler config for a weapon type
     */
    get(weaponType) {
        return this.handlers.get(weaponType);
    }
    /**
     * Check if a weapon type has a registered handler
     */
    has(weaponType) {
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
