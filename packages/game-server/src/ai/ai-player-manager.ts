import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { AIController } from "./ai-controller";
import { generateHumanName, resetUsedNames } from "./ai-names";
import { AI_CONFIG } from "./ai-config";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { Entities, getZombieTypesSet } from "@shared/constants";

interface AIPlayerEntry {
  player: Player;
  controller: AIController;
}

/**
 * Manages the lifecycle of AI players in Battle Royale mode
 */
export class AIPlayerManager {
  private gameManagers: IGameManagers;
  private aiPlayers: Map<number, AIPlayerEntry> = new Map();

  constructor(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
  }

  /**
   * Spawn AI players at game start
   */
  spawnAIPlayers(count: number = AI_CONFIG.DEFAULT_AI_COUNT): void {
    // Reset used names for new game
    resetUsedNames();

    console.log(`[AIPlayerManager] Spawning ${count} AI players`);

    for (let i = 0; i < count; i++) {
      this.spawnAIPlayer();
    }
  }

  /**
   * Spawn a single AI player
   */
  private spawnAIPlayer(): void {
    // Create player instance
    const player = new Player(this.gameManagers);

    // Set human-like display name
    const displayName = generateHumanName();
    player.setDisplayName(displayName);

    // Mark as AI player
    (player as any).serialized.set("isAI", true);

    // Set realistic ping (50-70ms)
    const ping =
      AI_CONFIG.MIN_PING + Math.floor(Math.random() * (AI_CONFIG.MAX_PING - AI_CONFIG.MIN_PING));
    player.setPing(ping);

    // Get spawn position from game mode strategy (same as real players)
    const strategy = this.gameManagers.getGameServer().getGameLoop().getGameModeStrategy();
    strategy.handlePlayerSpawn(player, this.gameManagers);

    // Add player to entity manager (makes them appear on leaderboard)
    this.gameManagers.getEntityManager().addEntity(player);

    // Create AI controller for this player
    const controller = new AIController(player, this.gameManagers);

    // Hook damage events - KEY for "attack who's hitting me" fix
    this.hookDamageEvents(player, controller);

    // Track the AI player
    this.aiPlayers.set(player.getId(), { player, controller });

    console.log(
      `[AIPlayerManager] Spawned AI player "${displayName}" (ID: ${player.getId()}) with ping ${ping}ms`
    );
  }

  /**
   * Hook damage events to notify AI controller when taking damage
   * This is the KEY connection for damage-based threat prioritization
   */
  private hookDamageEvents(player: Player, controller: AIController): void {
    if (!player.hasExt(Destructible)) return;

    const destructible = player.getExt(Destructible);
    const entityManager = this.gameManagers.getEntityManager();
    const zombieTypes = getZombieTypesSet();

    // Set up the damage callback
    destructible.onDamaged((attackerId?: number, damage?: number) => {
      if (attackerId === undefined || damage === undefined) return;

      // Determine attacker type (zombie or player)
      const attacker = entityManager.getEntityById(attackerId);
      if (!attacker) return;

      const attackerType = attacker.getType();
      const isZombie = zombieTypes.has(attackerType as any);
      const entityType: "zombie" | "player" = isZombie ? "zombie" : "player";

      // Notify the controller
      controller.onDamaged(attackerId, entityType, damage);
    });
  }

  /**
   * Update all AI players - called each game tick
   */
  update(deltaTime: number): void {
    const toRemove: number[] = [];

    for (const [id, entry] of this.aiPlayers) {
      const { player, controller } = entry;

      // Only remove if completely removed from the game (not just dead)
      if (player.isMarkedForRemoval()) {
        toRemove.push(id);
        continue;
      }

      // Skip updating dead players - they'll respawn and continue being updated
      if (player.isDead()) {
        continue;
      }

      // Update the AI controller (works for both human and zombie AI players)
      controller.update(deltaTime);
    }

    // Remove only completely removed AI players from tracking
    for (const id of toRemove) {
      const entry = this.aiPlayers.get(id);
      if (entry) {
        console.log(`[AIPlayerManager] AI player "${entry.player.getDisplayName()}" removed from game`);
      }
      this.aiPlayers.delete(id);
    }
  }

  /**
   * Get count of alive AI players
   */
  getAliveCount(): number {
    let count = 0;
    for (const [_, entry] of this.aiPlayers) {
      if (!entry.player.isDead()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clean up all AI players (on game end)
   */
  cleanup(): void {
    console.log(`[AIPlayerManager] Cleaning up ${this.aiPlayers.size} AI players`);
    this.aiPlayers.clear();
    resetUsedNames();
  }

  /**
   * Check if an entity ID belongs to an AI player
   */
  isAIPlayer(entityId: number): boolean {
    return this.aiPlayers.has(entityId);
  }
}
