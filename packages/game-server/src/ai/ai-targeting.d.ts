import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { InventoryItem } from "@shared/util/inventory";
import { ThreatInfo } from "./ai-state-machine";
import { DamageHistory } from "./ai-threat-tracker";
import { ThreatAssessment } from "./ai-threat-scorer";
export interface AITarget {
    type: "item" | "player" | "crate" | "barrel" | "position" | "zombie" | "enemy";
    entity?: IEntity;
    position: Vector2;
    priority: number;
    distance?: number;
}
/**
 * Enhanced threat information with damage-based prioritization
 */
export interface EnhancedThreatInfo {
    immediateThreat: ThreatAssessment | null;
    threats: ThreatAssessment[];
    enemyCount: number;
    zombieCount: number;
    playerCount: number;
    isSurrounded: boolean;
    isBeingFocused: boolean;
    safestRetreatDirection: Vector2 | null;
    hasImmediateThreat: boolean;
    hasNearbyEnemy: boolean;
    nearestEnemyDistance: number;
    enemyType: "zombie" | "player" | "none";
}
/**
 * AI targeting system for finding items, enemies, and safe positions
 */
export declare class AITargetingSystem {
    private gameManagers;
    private pathfinder;
    constructor(gameManagers: IGameManagers);
    /**
     * Get comprehensive threat information for the state machine
     */
    getThreatInfo(player: Player): ThreatInfo;
    /**
     * Get enhanced threat information with damage-based prioritization
     * This is the KEY FIX for the "AI targets distant players over attacking zombies" bug
     */
    getEnhancedThreatInfo(player: Player, damageHistory: DamageHistory, currentWeaponType?: string): EnhancedThreatInfo;
    /**
     * Check if AI is surrounded (3+ enemies in different directions)
     * Uses angle-based clustering to detect encirclement
     */
    private checkIfSurrounded;
    /**
     * Calculate the safest direction to retreat (away from most threats)
     */
    private calculateSafestRetreatDirection;
    /**
     * Find the best enemy to attack using enhanced threat scoring
     * This replaces findNearestEnemy when damage history is available
     */
    findBestEnemy(player: Player, damageHistory: DamageHistory, currentWeaponType?: string): AITarget | null;
    /**
     * Find the nearest enemy (zombie or player) to attack
     * For zombie AI, only targets non-zombie players (no zombies)
     */
    findNearestEnemy(player: Player): AITarget | null;
    /**
     * Find the best loot target for the AI player
     * Prioritizes health packs when hurt and ammo when low
     */
    findBestLootTarget(player: Player): AITarget | null;
    /**
     * Find the nearest bandage for the AI player (used during retreat)
     */
    findNearestHealingConsumable(player: Player): AITarget | null;
    /**
     * Find the best player target to hunt
     * Respects game mode friendly fire settings
     * - Zombie AI: only targets non-zombie players
     * - Human AI with friendly fire OFF: only targets zombie players
     * - Human AI with friendly fire ON: targets all other players
     */
    findBestPlayerTarget(player: Player): AITarget | null;
    /**
     * Find a safe retreat position considering ALL threats (players AND zombies)
     * Uses A* pathfinding to verify the path is actually reachable and safe
     */
    findSafeRetreatPosition(player: Player): AITarget;
    /**
     * Find the nearest unexplored special biome (farm, city, dock, gas station, shed)
     * Returns null if all special biomes have been explored or none exist
     */
    findNearestSpecialBiome(player: Player, exploredBiomes: Set<string>): AITarget | null;
    /**
     * Get a random explore target that avoids already explored areas
     * Includes repulsion from other players to prevent clustering
     * Never targets fixed points like campsite
     */
    getExploreTarget(player: Player, exploredCells?: Set<string>): AITarget;
    /**
     * Find opportunistic pickup target - good weapons, ammo, or resources within pickup radius
     * Used for picking up valuable items while in any state (hunt, explore, etc.)
     * Does NOT target crates - use findOpportunisticCrate for that
     */
    findOpportunisticPickup(player: Player): AITarget | null;
    /**
     * Find opportunistic crate to destroy - crates within close radius
     * Crates often contain good weapons and should be destroyed when convenient
     */
    findOpportunisticCrate(player: Player): AITarget | null;
    hasGoodWeapon(inventory: InventoryItem[]): boolean;
    needsAmmo(inventory: InventoryItem[]): boolean;
    /**
     * Check if inventory is full (can't add new non-stackable items)
     */
    isInventoryFull(inventory: InventoryItem[]): boolean;
    /**
     * Check if the AI can pick up a specific item type
     * Returns true if:
     * - Inventory has space, OR
     * - Item is stackable and AI already has that item type
     */
    canPickUpItem(inventory: InventoryItem[], itemType: string): boolean;
    /**
     * Get list of weapons the AI currently has
     */
    getOwnedWeapons(inventory: InventoryItem[]): string[];
    /**
     * Find useless ammo in inventory (ammo for weapons we don't have)
     * Returns the index of the first useless ammo item, or -1 if none found
     */
    findUselessAmmoIndex(inventory: InventoryItem[]): number;
    /**
     * Check if there's any useful loot that the AI can actually pick up
     * Used to determine if AI should enter LOOT state when inventory is full
     */
    hasUsefulLootTarget(player: Player): boolean;
    private getLootPriority;
}
