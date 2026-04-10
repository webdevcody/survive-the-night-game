import { AI_CONFIG, GOOD_WEAPONS, WEAPON_AMMO_MAP } from "./ai-config";
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
    static calculate(player) {
        const inventory = player.getInventory();
        const healthPercent = player.getHealth() / player.getMaxHealth();
        // Calculate individual scores
        const weaponScore = this.getWeaponScore(inventory);
        const ammoScore = this.getAmmoScore(inventory);
        const healingScore = this.getHealingScore(inventory);
        const healthScore = healthPercent;
        // Calculate combined readiness (0-100)
        const combatReadiness = Math.round(weaponScore * AI_CONFIG.READINESS_WEIGHT_WEAPON +
            ammoScore * AI_CONFIG.READINESS_WEIGHT_AMMO +
            healingScore * AI_CONFIG.READINESS_WEIGHT_HEALING +
            healthScore * AI_CONFIG.READINESS_WEIGHT_HEALTH);
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
    static getWeaponScore(inventory) {
        // Check for good weapons first (highest score)
        for (const item of inventory) {
            if (item && GOOD_WEAPONS.includes(item.itemType)) {
                return 1.0;
            }
        }
        // Check for pistol (medium score)
        if (inventory.some((item) => (item === null || item === void 0 ? void 0 : item.itemType) === "pistol")) {
            return 0.6;
        }
        // Check for knife (low score)
        if (inventory.some((item) => (item === null || item === void 0 ? void 0 : item.itemType) === "knife")) {
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
    static getAmmoScore(inventory) {
        var _a, _b;
        // Find the best ranged weapon the player has
        const rangedWeapon = inventory.find((item) => item && Object.keys(WEAPON_AMMO_MAP).includes(item.itemType));
        // If no ranged weapon, return neutral score (melee only)
        if (!rangedWeapon) {
            return 0.5;
        }
        // Get ammo type for this weapon
        const ammoType = WEAPON_AMMO_MAP[rangedWeapon.itemType];
        const ammo = inventory.find((item) => (item === null || item === void 0 ? void 0 : item.itemType) === ammoType);
        const count = (_b = (_a = ammo === null || ammo === void 0 ? void 0 : ammo.state) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0;
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
    static getHealingScore(inventory) {
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
    static hasAnyWeapon(inventory) {
        const weaponTypes = ["pistol", "shotgun", "ak47", "bolt_action_rifle", "knife"];
        return inventory.some((item) => item && weaponTypes.includes(item.itemType));
    }
    /**
     * Check if player has a good weapon (shotgun, ak47, bolt action)
     */
    static hasGoodWeapon(inventory) {
        return inventory.some((item) => item && GOOD_WEAPONS.includes(item.itemType));
    }
    /**
     * Check if player has ranged weapon with ammo
     */
    static hasRangedWeaponWithAmmo(inventory) {
        var _a, _b;
        const rangedWeapons = ["pistol", "shotgun", "ak47", "bolt_action_rifle"];
        for (const weaponType of rangedWeapons) {
            const hasWeapon = inventory.some((item) => (item === null || item === void 0 ? void 0 : item.itemType) === weaponType);
            if (!hasWeapon)
                continue;
            const ammoType = WEAPON_AMMO_MAP[weaponType];
            const ammo = inventory.find((item) => (item === null || item === void 0 ? void 0 : item.itemType) === ammoType);
            if (ammo && ((_b = (_a = ammo.state) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0) > 0) {
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
    static isReadyToHunt(inventory) {
        var _a, _b, _c, _d;
        // Check for good ranged weapons first (shotgun, ak47, bolt action) - need any ammo
        for (const weaponType of GOOD_WEAPONS) {
            const hasWeapon = inventory.some((item) => (item === null || item === void 0 ? void 0 : item.itemType) === weaponType);
            if (!hasWeapon)
                continue;
            const ammoType = WEAPON_AMMO_MAP[weaponType];
            const ammo = inventory.find((item) => (item === null || item === void 0 ? void 0 : item.itemType) === ammoType);
            if (ammo && ((_b = (_a = ammo.state) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0) > 0) {
                return true;
            }
        }
        // Check for pistol with at least 5 ammo
        const hasPistol = inventory.some((item) => (item === null || item === void 0 ? void 0 : item.itemType) === "pistol");
        if (hasPistol) {
            const pistolAmmo = inventory.find((item) => (item === null || item === void 0 ? void 0 : item.itemType) === "pistol_ammo");
            if (pistolAmmo && ((_d = (_c = pistolAmmo.state) === null || _c === void 0 ? void 0 : _c.count) !== null && _d !== void 0 ? _d : 0) >= 5) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if player has at least one bandage
     */
    static hasBandage(inventory) {
        return inventory.some((item) => (item === null || item === void 0 ? void 0 : item.itemType) === "bandage");
    }
    /**
     * Get total bandage count
     */
    static getBandageCount(inventory) {
        return inventory.filter((item) => (item === null || item === void 0 ? void 0 : item.itemType) === "bandage").length;
    }
    /**
     * Get total ammo count for all ranged weapons
     */
    static getTotalAmmoCount(inventory) {
        var _a, _b;
        let total = 0;
        const ammoTypes = Object.values(WEAPON_AMMO_MAP);
        for (const item of inventory) {
            if (item && ammoTypes.includes(item.itemType)) {
                total += (_b = (_a = item.state) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0;
            }
        }
        return total;
    }
}
