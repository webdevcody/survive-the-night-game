import { Player } from "@/entities/players/player";
import { InventoryItem } from "@shared/util/inventory";
import { AI_CONFIG, GOOD_WEAPONS, WEAPON_AMMO_MAP } from "./ai-config";

/**
 * Supply status and combat readiness information for AI decision making
 */
export interface SupplyStatus {
  // Individual scores (0-1)
  weaponScore: number;
  ammoScore: number;
  healingScore: number;
  healthScore: number;

  // Combined readiness score (0-100)
  combatReadiness: number;

  // Inventory checks
  hasAnyWeapon: boolean;
  hasGoodWeapon: boolean;
  hasRangedWithAmmo: boolean;
  hasBandage: boolean;
  bandageCount: number;
  ammoCount: number;

  // Readiness level flags
  isMinimallyEquipped: boolean; // readiness >= 30 - can defend self
  isHuntReady: boolean; // readiness >= 40 - can actively hunt
  isAggressiveReady: boolean; // readiness >= 70 - fully equipped
  shouldAvoidCombat: boolean; // readiness < 30 - should flee/avoid
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
export class CombatReadinessCalculator {
  /**
   * Calculate full supply status and combat readiness for a player
   */
  static calculate(player: Player): SupplyStatus {
    const inventory = player.getInventory();
    const healthPercent = player.getHealth() / player.getMaxHealth();

    // Calculate individual scores
    const weaponScore = this.getWeaponScore(inventory);
    const ammoScore = this.getAmmoScore(inventory);
    const healingScore = this.getHealingScore(inventory);
    const healthScore = healthPercent;

    // Calculate combined readiness (0-100)
    const combatReadiness = Math.round(
      weaponScore * AI_CONFIG.READINESS_WEIGHT_WEAPON +
        ammoScore * AI_CONFIG.READINESS_WEIGHT_AMMO +
        healingScore * AI_CONFIG.READINESS_WEIGHT_HEALING +
        healthScore * AI_CONFIG.READINESS_WEIGHT_HEALTH
    );

    // Inventory checks
    const hasAnyWeapon = this.hasAnyWeapon(inventory);
    const hasGoodWeapon = this.hasGoodWeapon(inventory);
    const hasRangedWithAmmo = this.hasRangedWeaponWithAmmo(inventory);
    const hasBandage = this.hasBandage(inventory);
    const bandageCount = this.getBandageCount(inventory);
    const ammoCount = this.getTotalAmmoCount(inventory);

    // Use the stricter hunt readiness check: pistol+5 ammo OR good weapon with any ammo
    const isHuntReady = this.isReadyToHunt(inventory);

    return {
      weaponScore,
      ammoScore,
      healingScore,
      healthScore,
      combatReadiness,
      hasAnyWeapon,
      hasGoodWeapon,
      hasRangedWithAmmo,
      hasBandage,
      bandageCount,
      ammoCount,
      isMinimallyEquipped: combatReadiness >= AI_CONFIG.READINESS_MINIMAL,
      isHuntReady,
      isAggressiveReady: combatReadiness >= AI_CONFIG.READINESS_AGGRESSIVE,
      shouldAvoidCombat: combatReadiness < AI_CONFIG.READINESS_MINIMAL,
    };
  }

  /**
   * Get weapon quality score (0-1)
   * - 0.0: No weapon
   * - 0.3: Knife only
   * - 0.6: Pistol
   * - 1.0: Good weapon (shotgun, ak47, bolt action)
   */
  private static getWeaponScore(inventory: InventoryItem[]): number {
    // Check for good weapons first (highest score)
    for (const item of inventory) {
      if (item && (GOOD_WEAPONS as readonly string[]).includes(item.itemType)) {
        return 1.0;
      }
    }

    // Check for pistol (medium score)
    if (inventory.some((item) => item?.itemType === "pistol")) {
      return 0.6;
    }

    // Check for knife (low score)
    if (inventory.some((item) => item?.itemType === "knife")) {
      return 0.3;
    }

    return 0.0;
  }

  /**
   * Get ammo supply score (0-1)
   * - 0.0: No ammo for current ranged weapon
   * - 0.25: Very low ammo (1-4)
   * - 0.5: Low ammo (5-14)
   * - 1.0: Sufficient ammo (15+)
   *
   * If only melee weapon, returns 0.5 (neutral)
   */
  private static getAmmoScore(inventory: InventoryItem[]): number {
    // Find the best ranged weapon the player has
    const rangedWeapon = inventory.find(
      (item) => item && Object.keys(WEAPON_AMMO_MAP).includes(item.itemType)
    );

    // If no ranged weapon, return neutral score (melee only)
    if (!rangedWeapon) {
      return 0.5;
    }

    // Get ammo type for this weapon
    const ammoType = WEAPON_AMMO_MAP[rangedWeapon.itemType];
    const ammo = inventory.find((item) => item?.itemType === ammoType);
    const count = ammo?.state?.count ?? 0;

    if (count >= AI_CONFIG.AMMO_SUFFICIENT_THRESHOLD) {
      return 1.0;
    }
    if (count >= AI_CONFIG.AMMO_LOW_THRESHOLD) {
      return 0.5;
    }
    if (count > 0) {
      return 0.25;
    }
    return 0.0;
  }

  /**
   * Get healing item score (0-1)
   * - 0.0: No bandages
   * - 0.5: 1 bandage
   * - 1.0: 2+ bandages
   */
  private static getHealingScore(inventory: InventoryItem[]): number {
    const bandageCount = this.getBandageCount(inventory);

    if (bandageCount >= AI_CONFIG.BANDAGE_SUFFICIENT_COUNT) {
      return 1.0;
    }
    if (bandageCount >= 1) {
      return 0.5;
    }
    return 0.0;
  }

  /**
   * Check if player has any weapon
   */
  private static hasAnyWeapon(inventory: InventoryItem[]): boolean {
    const weaponTypes = ["pistol", "shotgun", "ak47", "bolt_action_rifle", "knife"];
    return inventory.some((item) => item && weaponTypes.includes(item.itemType));
  }

  /**
   * Check if player has a good weapon (shotgun, ak47, bolt action)
   */
  private static hasGoodWeapon(inventory: InventoryItem[]): boolean {
    return inventory.some(
      (item) => item && (GOOD_WEAPONS as readonly string[]).includes(item.itemType)
    );
  }

  /**
   * Check if player has ranged weapon with ammo
   */
  private static hasRangedWeaponWithAmmo(inventory: InventoryItem[]): boolean {
    const rangedWeapons = ["pistol", "shotgun", "ak47", "bolt_action_rifle"];

    for (const weaponType of rangedWeapons) {
      const hasWeapon = inventory.some((item) => item?.itemType === weaponType);
      if (!hasWeapon) continue;

      const ammoType = WEAPON_AMMO_MAP[weaponType];
      const ammo = inventory.find((item) => item?.itemType === ammoType);
      if (ammo && (ammo.state?.count ?? 0) > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if player is ready to hunt - requires:
   * - Pistol with at least 5 ammo, OR
   * - Any good ranged weapon (shotgun, ak47, bolt action) with at least 1 ammo
   */
  static isReadyToHunt(inventory: InventoryItem[]): boolean {
    // Check for good ranged weapons first (shotgun, ak47, bolt action) - need any ammo
    for (const weaponType of GOOD_WEAPONS) {
      const hasWeapon = inventory.some((item) => item?.itemType === weaponType);
      if (!hasWeapon) continue;

      const ammoType = WEAPON_AMMO_MAP[weaponType];
      const ammo = inventory.find((item) => item?.itemType === ammoType);
      if (ammo && (ammo.state?.count ?? 0) > 0) {
        return true;
      }
    }

    // Check for pistol with at least 5 ammo
    const hasPistol = inventory.some((item) => item?.itemType === "pistol");
    if (hasPistol) {
      const pistolAmmo = inventory.find((item) => item?.itemType === "pistol_ammo");
      if (pistolAmmo && (pistolAmmo.state?.count ?? 0) >= 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if player has at least one bandage
   */
  private static hasBandage(inventory: InventoryItem[]): boolean {
    return inventory.some((item) => item?.itemType === "bandage");
  }

  /**
   * Get total bandage count
   */
  private static getBandageCount(inventory: InventoryItem[]): number {
    return inventory.filter((item) => item?.itemType === "bandage").length;
  }

  /**
   * Get total ammo count for all ranged weapons
   */
  private static getTotalAmmoCount(inventory: InventoryItem[]): number {
    let total = 0;
    const ammoTypes = Object.values(WEAPON_AMMO_MAP);

    for (const item of inventory) {
      if (item && ammoTypes.includes(item.itemType)) {
        total += item.state?.count ?? 0;
      }
    }

    return total;
  }
}
