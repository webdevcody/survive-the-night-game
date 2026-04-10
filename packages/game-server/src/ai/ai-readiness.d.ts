import { Player } from "@/entities/players/player";
import { InventoryItem } from "@shared/util/inventory";
/**
 * Supply status and combat readiness information for AI decision making
 */
export interface SupplyStatus {
    weaponScore: number;
    ammoScore: number;
    healingScore: number;
    healthScore: number;
    combatReadiness: number;
    hasAnyWeapon: boolean;
    hasGoodWeapon: boolean;
    hasRangedWithAmmo: boolean;
    hasBandage: boolean;
    bandageCount: number;
    ammoCount: number;
    isMinimallyEquipped: boolean;
    isHuntReady: boolean;
    isAggressiveReady: boolean;
    shouldAvoidCombat: boolean;
}
/**
 * Calculates combat readiness score for AI decision making
 *
 * The readiness score (0-100) determines AI behavior:
 * - < 30: Avoid combat, flee if attacked, prioritize looting
 * - 30-39: Can defend self, but prefer looting over hunting
 * - 40-69: Ready to hunt, will engage enemies
 * - 70+: Fully equipped, aggressive playstyle
 *
 * Score calculation:
 * - 35% weapon quality (none=0, knife=0.3, pistol=0.6, good=1.0)
 * - 25% ammo supply (empty=0, low=0.5, sufficient=1.0)
 * - 25% healing items (none=0, 1=0.5, 2+=1.0)
 * - 15% current health percentage
 */
export declare class CombatReadinessCalculator {
    /**
     * Calculate full supply status and combat readiness for a player
     */
    static calculate(player: Player): SupplyStatus;
    /**
     * Get weapon quality score (0-1)
     * - 0.0: No weapon
     * - 0.3: Knife only
     * - 0.6: Pistol
     * - 1.0: Good weapon (shotgun, ak47, bolt action)
     */
    private static getWeaponScore;
    /**
     * Get ammo supply score (0-1)
     * - 0.0: No ammo for current ranged weapon
     * - 0.25: Very low ammo (1-4)
     * - 0.5: Low ammo (5-14)
     * - 1.0: Sufficient ammo (15+)
     *
     * If only melee weapon, returns 0.5 (neutral)
     */
    private static getAmmoScore;
    /**
     * Get healing item score (0-1)
     * - 0.0: No bandages
     * - 0.5: 1 bandage
     * - 1.0: 2+ bandages
     */
    private static getHealingScore;
    /**
     * Check if player has any weapon
     */
    private static hasAnyWeapon;
    /**
     * Check if player has a good weapon (shotgun, ak47, bolt action)
     */
    private static hasGoodWeapon;
    /**
     * Check if player has ranged weapon with ammo
     */
    private static hasRangedWeaponWithAmmo;
    /**
     * Check if player is ready to hunt - requires:
     * - Pistol with at least 5 ammo, OR
     * - Any good ranged weapon (shotgun, ak47, bolt action) with at least 1 ammo
     */
    static isReadyToHunt(inventory: InventoryItem[]): boolean;
    /**
     * Check if player has at least one bandage
     */
    private static hasBandage;
    /**
     * Get total bandage count
     */
    private static getBandageCount;
    /**
     * Get total ammo count for all ranged weapons
     */
    private static getTotalAmmoCount;
}
