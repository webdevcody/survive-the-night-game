import { IGameModeStrategy, GameModeConfig, WinConditionResult } from "./game-mode-strategy";
import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import Destructible from "@/extensions/destructible";
import Collidable from "@/extensions/collidable";
import { ToxicGasCloud } from "@/entities/environment/toxic-gas-cloud";
import { ToxicBiomeZone } from "@/entities/environment/toxic-biome-zone";
import { getConfig } from "@shared/config";
import { GameMessageEvent } from "@shared/events/server-sent/events/game-message-event";
import PoolManager from "@shared/util/pool-manager";
import Positionable from "@/extensions/positionable";
import { AIPlayerManager } from "@/ai/ai-player-manager";
import Poison from "@/extensions/poison";
import { ToxicGasCloudExtension } from "@/extensions/toxic-gas-cloud-extension";
import { ToxicBiomeZoneExtension } from "@/extensions/toxic-biome-zone-extension";
import Groupable from "@/extensions/groupable";
import Illuminated from "@/extensions/illuminated";
import { Groups } from "@shared/util/group-encoding";
import { distance } from "@shared/util/physics";

// Battle Royale timing constants (in seconds)
const TOXIC_ZONE_INTERVAL = 60; // Every 60 seconds, toxic zones spread
const CRATE_SPAWN_INTERVAL = 90; // Every 60 seconds, spawn crates

// Number of biomes that become toxic per interval, indexed by ring number
// Ring 0 = outermost, higher rings = more inner
// If a ring index exceeds the array length, the last value is used
const BIOMES_PER_INTERVAL_BY_RING: number[] = [
  4, // Ring 0 (outer edge): 4 biomes at a time
  3, // Ring 1: 3 biomes at a time
  2, // Ring 2: 2 biomes at a time
  1, // Ring 3+: 1 biome at a time (final showdown)
];

/**
 * Battle Royale Mode Strategy
 *
 * In this mode:
 * - No car entity, no zombie waves
 * - Players spawn at random empty locations
 * - Friendly fire enabled - players can damage each other
 * - No respawning - dead players stay dead
 * - Game ends when only one player remains
 * - Arena shrinks from the outside in, ring by ring
 * - Every minute, a random biome from the current ring becomes toxic
 * - Once all biomes in a ring are toxic, moves to the next inner ring
 * - Crates spawn randomly every minute
 * - Zombies only idle spawn, don't target car
 */
export class BattleRoyaleModeStrategy implements IGameModeStrategy {
  private readonly config: GameModeConfig = {
    modeId: "battle_royale",
    displayName: "Battle Royale",
    friendlyFireEnabled: true,
    allowRespawn: false,
    hasCarEntity: false,
    hasWaveSystem: false,
    hasBosses: false,
    hasSurvivors: false,
    minPlayers: 2,
  };

  // Timing state
  private toxicZoneTimer: number = 0;
  private crateSpawnTimer: number = 0;

  // Track which biomes have become toxic (by biome coordinates "x,y")
  private toxicBiomes: Set<string> = new Set();

  // Current ring being filled (0 = outermost, increases inward)
  private currentRing: number = 0;

  // Track active toxic gas clouds
  private toxicGasClouds: ToxicGasCloud[] = [];
  private occupiedTiles: Set<string> = new Set();
  private readonly TILE_SIZE = getConfig().world.TILE_SIZE;

  // Biome constants
  private readonly MAP_SIZE = getConfig().world.MAP_SIZE;
  private readonly BIOME_SIZE = getConfig().world.BIOME_SIZE;

  // Track biome fill progress and consolidated zones
  // Maps "biomeX,biomeY" to number of tiles filled in that biome
  private biomeTileCounts: Map<string, number> = new Map();
  // Biomes that have been fully filled and consolidated into a single zone entity
  private consolidatedBiomes: Set<string> = new Set();
  // Track ToxicBiomeZone entities
  private toxicBiomeZones: ToxicBiomeZone[] = [];
  // Total tiles per biome (BIOME_SIZE * BIOME_SIZE)
  private readonly TILES_PER_BIOME = this.BIOME_SIZE * this.BIOME_SIZE;

  // AI Player Manager
  private aiPlayerManager: AIPlayerManager | null = null;

  // Track death order for placement - stores player IDs in order of death (first death = first element)
  // Only tracks human deaths (not zombie deaths)
  private deathOrder: number[] = [];

  // Track if the entire map is toxic (endgame state)
  private allBiomesToxic: boolean = false;

  getConfig(): GameModeConfig {
    return this.config;
  }

  onGameStart(gameManagers: IGameManagers): void {
    // Reset state for new game
    this.toxicZoneTimer = 0;
    this.crateSpawnTimer = 0;
    this.toxicBiomes.clear();
    this.currentRing = 0;
    this.toxicGasClouds = [];
    this.occupiedTiles.clear();
    this.biomeTileCounts.clear();
    this.consolidatedBiomes.clear();
    this.toxicBiomeZones = [];
    this.deathOrder = [];
    this.allBiomesToxic = false;

    console.log("[BattleRoyaleModeStrategy] Game started in Battle Royale mode");
    console.log(
      `[BattleRoyaleModeStrategy] Map size: ${this.MAP_SIZE}, Max ring: ${this.getMaxRing()}`
    );

    // Initialize the toxic gas timer to count down from TOXIC_ZONE_INTERVAL
    gameManagers.getGameServer().getGameLoop().setPhaseTimer(Date.now(), TOXIC_ZONE_INTERVAL);

    // Broadcast welcome message
    gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: "Battle Royale - Last one standing wins!",
        color: "gold",
      })
    );

    // Initialize AI player manager and spawn initial AI players based on config
    this.aiPlayerManager = new AIPlayerManager(gameManagers);
    // Calculate initial AI count based on current real players
    const realPlayerCount = this.getRealPlayerCount(gameManagers);
    const config = getConfig().aiPlayer;
    const targetAI = Math.max(
      config.MIN_AI_PLAYERS,
      config.TOTAL_PLAYER_THRESHOLD - realPlayerCount
    );
    this.aiPlayerManager.spawnAIPlayers(targetAI);
  }

  /**
   * Get the AI player manager for dynamic AI adjustment
   */
  getAIPlayerManager(): AIPlayerManager | null {
    return this.aiPlayerManager;
  }

  /**
   * Count real (non-AI) players in the game
   */
  private getRealPlayerCount(gameManagers: IGameManagers): number {
    return gameManagers
      .getEntityManager()
      .getPlayerEntities()
      .filter((p) => !(p as any).serialized?.get("isAI") && !p.isMarkedForRemoval())
      .length;
  }

  onGameEnd(gameManagers: IGameManagers): void {
    // Clean up toxic gas clouds
    for (const cloud of this.toxicGasClouds) {
      const entity = gameManagers.getEntityManager().getEntityById(cloud.getId());
      if (entity) {
        gameManagers.getEntityManager().removeEntity(cloud.getId());
      }
    }
    // Clean up toxic biome zones
    for (const zone of this.toxicBiomeZones) {
      const entity = gameManagers.getEntityManager().getEntityById(zone.getId());
      if (entity) {
        gameManagers.getEntityManager().removeEntity(zone.getId());
      }
    }
    this.toxicGasClouds = [];
    this.toxicBiomeZones = [];
    this.occupiedTiles.clear();
    this.toxicBiomes.clear();
    this.biomeTileCounts.clear();
    this.consolidatedBiomes.clear();
    this.currentRing = 0;
    this.deathOrder = [];
    this.allBiomesToxic = false;

    // Clean up AI players
    if (this.aiPlayerManager) {
      this.aiPlayerManager.cleanup();
      this.aiPlayerManager = null;
    }

    console.log("[BattleRoyaleModeStrategy] Game ended");
  }

  update(deltaTime: number, gameManagers: IGameManagers): void {
    // Update timers
    this.toxicZoneTimer += deltaTime;
    this.crateSpawnTimer += deltaTime;

    // Check for toxic zone spawning
    if (this.toxicZoneTimer >= TOXIC_ZONE_INTERVAL) {
      this.toxicZoneTimer = 0;
      this.spawnToxicZone(gameManagers);
      // Reset the phase timer for the next toxic zone countdown
      gameManagers.getGameServer().getGameLoop().setPhaseTimer(Date.now(), TOXIC_ZONE_INTERVAL);
    }

    // Check for crate spawning
    if (this.crateSpawnTimer >= CRATE_SPAWN_INTERVAL) {
      this.crateSpawnTimer = 0;
      this.spawnCrate(gameManagers);
    }

    // Clean up removed clouds
    this.cleanupRemovedClouds(gameManagers);

    // Check if any biomes are fully filled and should be consolidated
    // This replaces many individual cloud entities with a single zone entity
    this.checkBiomeConsolidation(gameManagers);

    // Update AI players
    if (this.aiPlayerManager) {
      this.aiPlayerManager.update(deltaTime);
    }

    // Check for dead non-zombie players and respawn them as zombies
    this.handleZombieRespawns(gameManagers);

    // Check if all biomes are toxic and trigger endgame
    if (this.allBiomesToxic) {
      this.killAllRemainingPlayers(gameManagers);
    }
  }

  /**
   * Kill all remaining living (non-zombie) players when the entire map is toxic
   * This triggers the endgame - last player to die wins
   */
  private killAllRemainingPlayers(gameManagers: IGameManagers): void {
    const players = gameManagers.getEntityManager().getPlayerEntities() as Player[];
    const livingPlayers = players.filter((p) => !p.isDead() && !p.isZombie());

    if (livingPlayers.length === 0) {
      return; // No one left to kill
    }

    console.log(
      `[BattleRoyaleModeStrategy] Endgame - killing ${livingPlayers.length} remaining players`
    );

    // Broadcast endgame message
    gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: "The toxic gas has consumed the entire arena!",
        color: "red",
      })
    );

    // Kill all living players by dealing massive damage
    for (const player of livingPlayers) {
      if (player.hasExt(Destructible)) {
        const destructible = player.getExt(Destructible);
        // Deal damage equal to current health to kill them instantly
        destructible.damage(destructible.getHealth());
      }
    }
  }

  /**
   * Check for dead players and handle respawns:
   * - Non-zombie players: convert to zombie and respawn
   * - Zombie players: respawn as zombie again
   */
  private handleZombieRespawns(gameManagers: IGameManagers): void {
    // Don't respawn anyone during endgame - just record deaths
    const skipRespawns = this.allBiomesToxic;

    const players = gameManagers.getEntityManager().getPlayerEntities() as Player[];

    for (const player of players) {
      const isDead = player.isDead();
      const isZombie = player.isZombie();
      const isMarkedForRemoval = player.isMarkedForRemoval();

      // Skip players who are alive or marked for removal
      if (!isDead || isMarkedForRemoval) {
        continue;
      }

      // Track human deaths in the death order (only if not already tracked)
      // Zombie deaths don't count for placement
      if (!isZombie) {
        const playerId = player.getId();
        if (!this.deathOrder.includes(playerId)) {
          this.deathOrder.push(playerId);
          console.log(
            `[BattleRoyaleModeStrategy] Recorded death #${
              this.deathOrder.length
            } for ${player.getDisplayName()} (ID: ${playerId})`
          );
        }
      }

      // Check respawn cooldown (use deathTime)
      const deathTime = player.getDeathTime();
      const timeSinceDeath = Date.now() - deathTime;
      const respawnCooldown = getConfig().entity.PLAYER_RESPAWN_COOLDOWN_MS;

      if (deathTime > 0 && timeSinceDeath < respawnCooldown) {
        continue; // Still in cooldown
      }

      // Skip respawns during endgame
      if (skipRespawns) {
        continue;
      }

      // Respawn the player
      if (isZombie) {
        // Already a zombie - just respawn them as zombie again
        this.respawnZombiePlayer(player, gameManagers);
      } else {
        // Convert to zombie and respawn
        this.respawnAsZombie(player, gameManagers);
      }
    }
  }

  /**
   * Respawn a zombie player who died (they stay as zombie)
   */
  private respawnZombiePlayer(player: Player, gameManagers: IGameManagers): void {
    console.log(`[BattleRoyaleModeStrategy] ${player.getDisplayName()} (zombie) respawning`);

    // Re-enable collision
    if (player.hasExt(Collidable)) {
      player.getExt(Collidable).setEnabled(true);
    }

    // Restore health to max
    const destructible = player.getExt(Destructible);
    if (destructible) {
      destructible.setHealth(destructible.getMaxHealth());
    }

    // Spawn at random position
    const spawnPosition = this.getPlayerSpawnPosition(player, gameManagers);
    player.getExt(Positionable).setPosition(spawnPosition);

    // Clear death time
    player.setDeathTime(0);

    // Check if spawned in toxic gas
    this.checkPlayerInToxicGas(player, gameManagers);
  }

  /**
   * Respawn a dead player as a zombie
   */
  private respawnAsZombie(player: Player, gameManagers: IGameManagers): void {
    console.log(`[BattleRoyaleModeStrategy] ${player.getDisplayName()} respawning as zombie`);

    // Convert to zombie
    player.setIsZombie(true);

    // Change group to "enemy" so other zombies don't target this player
    if (player.hasExt(Groupable)) {
      player.getExt(Groupable).setGroup(Groups.ENEMY);
    }

    // Add illumination so zombie players can see in the dark (small radius)
    if (!player.hasExt(Illuminated)) {
      player.addExtension(new Illuminated(player, 80)); // Small light radius for zombie vision
    } else {
      player.getExt(Illuminated).setRadius(80);
    }

    // Clear their inventory (zombies don't use items)
    player.clearInventory();

    // Re-enable collision
    if (player.hasExt(Collidable)) {
      player.getExt(Collidable).setEnabled(true);
    }

    // Restore health to max
    const destructible = player.getExt(Destructible);
    if (destructible) {
      destructible.setHealth(destructible.getMaxHealth());
    }

    // Spawn at random position (away from safe zones)
    const spawnPosition = this.getPlayerSpawnPosition(player, gameManagers);
    player.getExt(Positionable).setPosition(spawnPosition);

    // Clear death time
    player.setDeathTime(0);

    // Check if spawned in toxic gas
    this.checkPlayerInToxicGas(player, gameManagers);

    // Broadcast message
    gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: `${player.getDisplayName()} has risen as a zombie!`,
        color: "red",
      })
    );
  }

  getPlayerSpawnPosition(player: Player, gameManagers: IGameManagers): Vector2 {
    // Spawn players at random positions throughout the map, excluding the campsite
    // Ensure players spawn with minimum distance from each other to prevent clustering
    const MIN_SPAWN_DISTANCE = 200; // pixels (~12.5 tiles)
    const MAX_ATTEMPTS = 50; // Try up to 50 random positions

    const entityManager = gameManagers.getEntityManager();
    const existingPlayers = entityManager.getPlayerEntities() as Player[];

    // Filter out dead players and the current player (if already spawned)
    const livingPlayers = existingPlayers.filter(
      (p) => !p.isDead() && p.getId() !== player.getId() && p.hasExt(Positionable)
    );

    // If no other players exist, validate and return a random position
    if (livingPlayers.length === 0) {
      const position = gameManagers.getMapManager().getRandomGrassPositionExcludingCampsite();
      // Validate position is valid for placement (checks ground tiles, collidables, and existing entities)
      if (gameManagers.getMapManager().isPositionValidForPlacement(position, true)) {
        return position;
      }
      // If invalid, try again (should be rare since getRandomGrassPositionExcludingCampsite filters valid tiles)
      // But this ensures we don't spawn in trees or on other entities
      return gameManagers.getMapManager().getRandomGrassPositionExcludingCampsite();
    }

    // Player size is TILE_SIZE x TILE_SIZE, so center offset is TILE_SIZE/2
    const playerCenterOffset = this.TILE_SIZE / 2;
    const poolManager = PoolManager.getInstance();

    // Try multiple positions until we find one that's far enough from other players
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidatePosition = gameManagers
        .getMapManager()
        .getRandomGrassPositionExcludingCampsite();

      // Validate position is valid for placement (checks ground tiles, collidables, and existing entities)
      if (!gameManagers.getMapManager().isPositionValidForPlacement(candidatePosition, true)) {
        continue; // Skip invalid positions
      }

      // Calculate the center position where the player would spawn
      // (spawn position is top-left corner, center is offset by half tile size)
      const candidateCenter = poolManager.vector2.claim(
        candidatePosition.x + playerCenterOffset,
        candidatePosition.y + playerCenterOffset
      );

      // Check if this position is far enough from all existing players
      let isValidPosition = true;
      for (const otherPlayer of livingPlayers) {
        const otherPos = otherPlayer.getExt(Positionable).getCenterPosition();
        const dist = distance(candidateCenter, otherPos);

        if (dist < MIN_SPAWN_DISTANCE) {
          isValidPosition = false;
          break;
        }
      }

      // Release the temporary vector
      poolManager.vector2.release(candidateCenter);

      // If this position is valid, return it
      if (isValidPosition) {
        return candidatePosition;
      }
    }

    // If we couldn't find a valid position after many attempts, fall back to random
    // This can happen if the map is very crowded or small
    console.warn(
      `[BattleRoyaleModeStrategy] Could not find spawn position with minimum distance after ${MAX_ATTEMPTS} attempts, using random position`
    );
    const fallbackPosition = gameManagers.getMapManager().getRandomGrassPositionExcludingCampsite();
    // Validate fallback position (should already be valid, but double-check)
    if (gameManagers.getMapManager().isPositionValidForPlacement(fallbackPosition, true)) {
      return fallbackPosition;
    }
    // Last resort: return anyway (should never happen, but prevents crashes)
    return fallbackPosition;
  }

  handlePlayerSpawn(player: Player, gameManagers: IGameManagers): void {
    // In Battle Royale mode, spawn players randomly throughout the map (not at campsite)
    const spawnPosition = this.getPlayerSpawnPosition(player, gameManagers);
    player.getExt(Positionable).setPosition(spawnPosition);

    // Check if player spawned in toxic gas and apply poison if needed
    this.checkPlayerInToxicGas(player, gameManagers);
  }

  canPlayerRespawn(player: Player): boolean {
    // In Battle Royale, dead players can respawn as zombies (one-time)
    // If already a zombie, cannot respawn again
    return !player.isZombie();
  }

  /**
   * Check if a player is inside any toxic gas clouds or zones and apply poison if needed
   */
  private checkPlayerInToxicGas(player: Player, gameManagers: IGameManagers): void {
    if (!player.hasExt(Positionable)) return;

    // Zombie players are immune to toxic gas
    if (player.isZombie()) return;

    const playerPos = player.getExt(Positionable);
    const playerCenter = playerPos.getCenterPosition();
    const entityManager = gameManagers.getEntityManager();
    const TILE_SIZE = getConfig().world.TILE_SIZE;

    // Check toxic gas clouds
    const toxicGasClouds = entityManager.getEntitiesByType("toxic_gas_cloud" as any);
    for (const cloud of toxicGasClouds) {
      if (!cloud.hasExt(Positionable) || !cloud.hasExt(ToxicGasCloudExtension)) continue;
      if (cloud.isMarkedForRemoval()) continue;

      const cloudPos = cloud.getExt(Positionable).getCenterPosition();
      const radius = TILE_SIZE / 2; // Half tile radius
      const dist = distance(cloudPos, playerCenter);

      if (dist < radius) {
        // Player is in cloud - apply poison if not already poisoned
        if (!player.hasExt(Poison)) {
          player.addExtension(new Poison(player, 3, 1, 1));
        }
        return; // Found one, no need to check others
      }
    }

    // Check toxic biome zones
    const toxicBiomeZones = entityManager.getEntitiesByType("toxic_biome_zone" as any);
    for (const zone of toxicBiomeZones) {
      if (!zone.hasExt(Positionable) || !zone.hasExt(ToxicBiomeZoneExtension)) continue;
      if (zone.isMarkedForRemoval()) continue;

      const zonePos = zone.getExt(Positionable).getPosition();
      const zoneSize = zone.getExt(Positionable).getSize();

      // Check if player center is within zone bounds
      if (
        playerCenter.x >= zonePos.x &&
        playerCenter.x <= zonePos.x + zoneSize.x &&
        playerCenter.y >= zonePos.y &&
        playerCenter.y <= zonePos.y + zoneSize.y
      ) {
        // Player is in zone - apply poison if not already poisoned
        if (!player.hasExt(Poison)) {
          player.addExtension(new Poison(player, 3, 1, 1));
        }
        return; // Found one, no need to check others
      }
    }
  }

  checkWinCondition(gameManagers: IGameManagers): WinConditionResult {
    const players = gameManagers.getEntityManager().getPlayerEntities() as Player[];

    // Filter for living players (not dead AND not zombies)
    const livingPlayers = players.filter((p) => !p.isDead() && !p.isZombie());

    // If only one living player remains, they win
    if (livingPlayers.length === 1 && players.length >= this.config.minPlayers) {
      const winner = livingPlayers[0];
      return {
        gameEnded: true,
        winnerId: winner.getId(),
        winnerName: winner.getDisplayName(),
        message: `${winner.getDisplayName()} wins the Battle Royale!`,
      };
    }

    // If no living players remain (all dead or zombies), the last person to die wins
    if (livingPlayers.length === 0 && players.length > 0) {
      // Edge case: if everyone is dead/zombie, pick the last person to die as the winner
      if (this.deathOrder.length > 0) {
        const lastDeadPlayerId = this.deathOrder[this.deathOrder.length - 1];
        const lastDeadPlayer = players.find((p) => p.getId() === lastDeadPlayerId);
        if (lastDeadPlayer) {
          return {
            gameEnded: true,
            winnerId: lastDeadPlayer.getId(),
            winnerName: lastDeadPlayer.getDisplayName(),
            message: `${lastDeadPlayer.getDisplayName()} wins the Battle Royale! (Last survivor)`,
          };
        }
      }

      // Fallback if we couldn't find the last dead player
      return {
        gameEnded: true,
        winnerId: null,
        winnerName: null,
        message: "No survivors - The zombies have won!",
      };
    }

    return {
      gameEnded: false,
      winnerId: null,
      winnerName: null,
      message: "",
    };
  }

  shouldDamageTarget(attacker: IEntity, target: IEntity, attackerId: number): boolean {
    // Don't damage yourself
    if (target.getId() === attackerId) {
      return false;
    }

    // Must have Destructible extension to take damage
    if (!target.hasExt(Destructible)) {
      return false;
    }

    // Check if attacker is a zombie player
    const attackerEntity = attacker.getType() === "player" ? attacker : null;
    const isZombiePlayer =
      attackerEntity instanceof Player && (attackerEntity as Player).isZombie();

    if (isZombiePlayer) {
      // Zombie players can ONLY damage living non-zombie players
      if (target instanceof Player) {
        return !target.isZombie() && !target.isDead();
      }
      // Zombies cannot damage other entities (walls, crates, etc.)
      return false;
    }

    // Normal living players can damage all destructible entities (friendly fire enabled)
    return true;
  }

  getZombieFallbackTarget(gameManagers: IGameManagers): Vector2 | null {
    // Zombies have no fallback target in Battle Royale - they only target nearby players
    return null;
  }

  /**
   * Get the set of toxic biomes (for AI pathfinding to avoid)
   * Returns biome keys in format "x,y"
   */
  public getToxicBiomes(): Set<string> {
    return this.toxicBiomes;
  }

  /**
   * Get the death order array (for placement/points calculation)
   * First element = first death (worst placement), last element = last death (best placement among dead)
   * Only tracks human deaths, not zombie deaths
   */
  public getDeathOrder(): number[] {
    return [...this.deathOrder];
  }

  /**
   * Get the placement for a player (1 = winner, higher = worse placement)
   * Returns null if the player is still alive
   */
  public getPlayerPlacement(playerId: number, totalPlayers: number): number | null {
    const deathIndex = this.deathOrder.indexOf(playerId);
    if (deathIndex === -1) {
      return null; // Player hasn't died yet (still alive)
    }
    // First death = last place, last death = 2nd place (or winner if everyone died)
    return totalPlayers - deathIndex;
  }

  /**
   * Get the number of biomes to make toxic this interval based on current ring
   */
  private getBiomesPerInterval(): number {
    if (this.currentRing < BIOMES_PER_INTERVAL_BY_RING.length) {
      return BIOMES_PER_INTERVAL_BY_RING[this.currentRing];
    }
    // Use the last configured value for any rings beyond the array
    return BIOMES_PER_INTERVAL_BY_RING[BIOMES_PER_INTERVAL_BY_RING.length - 1];
  }

  /**
   * Spawn toxic gas in multiple biomes from the current ring
   */
  private spawnToxicZone(gameManagers: IGameManagers): void {
    const biomesToSpawn = this.getBiomesPerInterval();
    const spawnedBiomes: { x: number; y: number }[] = [];

    // Spawn multiple biomes based on configuration
    for (let i = 0; i < biomesToSpawn; i++) {
      const selectedBiome = this.selectRandomBiomeFromCurrentRing();
      if (!selectedBiome) {
        if (spawnedBiomes.length === 0 && !this.allBiomesToxic) {
          console.log(
            "[BattleRoyaleModeStrategy] All biomes are now toxic - arena fully closed, triggering endgame"
          );
          this.allBiomesToxic = true;

          // Broadcast final warning
          gameManagers.getBroadcaster().broadcastEvent(
            new GameMessageEvent({
              message: "The campsite has been consumed! Last one standing wins!",
              color: "gold",
            })
          );
        }
        break;
      }

      spawnedBiomes.push(selectedBiome);
      this.spawnToxicInBiome(gameManagers, selectedBiome);
    }

    if (spawnedBiomes.length === 0) {
      return;
    }

    // Count remaining biomes in current ring
    const remainingInRing = this.getBiomesInRing(this.currentRing).filter(
      (b) => !this.toxicBiomes.has(`${b.x},${b.y}`)
    ).length;

    // Broadcast warning with ring info
    const ringName =
      this.currentRing === 0
        ? "outer edge"
        : this.currentRing === this.getMaxRing()
        ? "center"
        : `ring ${this.currentRing}`;

    const biomeCount = spawnedBiomes.length;
    const biomeWord = biomeCount === 1 ? "zone" : "zones";

    gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: `${biomeCount} toxic ${biomeWord} spreading! (${remainingInRing} left in ${ringName})`,
        color: "red",
      })
    );

    console.log(
      `[BattleRoyaleModeStrategy] Spawned ${biomeCount} toxic zones in ring ${this.currentRing}, ${remainingInRing} remaining`
    );
  }

  /**
   * Spawn toxic gas in a specific biome
   */
  private spawnToxicInBiome(gameManagers: IGameManagers, biome: { x: number; y: number }): void {
    const biomeKey = `${biome.x},${biome.y}`;
    this.toxicBiomes.add(biomeKey);

    // Calculate biome center for spawning initial cloud
    const biomeCenterX = (biome.x * this.BIOME_SIZE + this.BIOME_SIZE / 2) * this.TILE_SIZE;
    const biomeCenterY = (biome.y * this.BIOME_SIZE + this.BIOME_SIZE / 2) * this.TILE_SIZE;

    const poolManager = PoolManager.getInstance();
    const position = poolManager.vector2.claim(biomeCenterX, biomeCenterY);

    // Calculate spread direction (toward center of map)
    const mapCenterBiomeX = Math.floor(this.MAP_SIZE / 2);
    const mapCenterBiomeY = Math.floor(this.MAP_SIZE / 2);
    const dirX = biome.x < mapCenterBiomeX ? 1 : biome.x > mapCenterBiomeX ? -1 : 0;
    const dirY = biome.y < mapCenterBiomeY ? 1 : biome.y > mapCenterBiomeY ? -1 : 0;

    // Spawn initial cloud at biome center
    const cloud = new ToxicGasCloud(gameManagers, position);
    cloud.setEnvironmentalEventManager(this);
    cloud.setIsOriginalCloud(true);
    cloud.setCanReproduce(true);
    cloud.setPrimaryDirection({ x: dirX !== 0 ? dirX : 1, y: dirY !== 0 ? dirY : 1 });
    cloud.setPermanent(true); // Battle Royale clouds never expire
    gameManagers.getEntityManager().addEntity(cloud);
    // Immediately check for players already in the cloud (fixes issue where stationary players don't get poisoned)
    cloud.checkForPlayersImmediately();
    this.toxicGasClouds.push(cloud);
    this.markTileOccupied(position);
  }

  /**
   * Get the maximum ring index (center of the map)
   * Ring 0 = outermost playable biomes
   * Max ring = center biome(s)
   */
  private getMaxRing(): number {
    // Playable biomes are from index 1 to MAP_SIZE-2
    // For a 7x7 map: playable is 1-5 (5 biomes across), max ring = 2
    // For a 5x5 map: playable is 1-3 (3 biomes across), max ring = 1
    const playableSize = this.MAP_SIZE - 2; // e.g., 7-2 = 5
    return Math.floor((playableSize - 1) / 2);
  }

  /**
   * Calculate which ring a biome belongs to (0 = outermost)
   */
  private getBiomeRing(x: number, y: number): number {
    const playableMin = 1;
    const playableMax = this.MAP_SIZE - 2;

    // Distance from each edge
    const distFromLeft = x - playableMin;
    const distFromRight = playableMax - x;
    const distFromTop = y - playableMin;
    const distFromBottom = playableMax - y;

    // Ring is the minimum distance from any edge
    return Math.min(distFromLeft, distFromRight, distFromTop, distFromBottom);
  }

  /**
   * Get all biomes in a specific ring
   */
  private getBiomesInRing(ring: number): { x: number; y: number }[] {
    const biomes: { x: number; y: number }[] = [];
    const playableMin = 1;
    const playableMax = this.MAP_SIZE - 2;

    for (let x = playableMin; x <= playableMax; x++) {
      for (let y = playableMin; y <= playableMax; y++) {
        if (this.getBiomeRing(x, y) === ring) {
          biomes.push({ x, y });
        }
      }
    }

    return biomes;
  }

  /**
   * Select a random biome from the current ring that hasn't been made toxic yet.
   * If the current ring is fully toxic, moves to the next inner ring.
   */
  private selectRandomBiomeFromCurrentRing(): { x: number; y: number } | null {
    const maxRing = this.getMaxRing();

    // Try current ring first, then move inward if needed
    while (this.currentRing <= maxRing) {
      const biomesInRing = this.getBiomesInRing(this.currentRing);
      const availableBiomes = biomesInRing.filter(
        (biome) => !this.toxicBiomes.has(`${biome.x},${biome.y}`)
      );

      if (availableBiomes.length > 0) {
        // Pick a random available biome from this ring
        const randomIndex = Math.floor(Math.random() * availableBiomes.length);
        return availableBiomes[randomIndex];
      }

      // No available biomes in current ring, move to next inner ring
      console.log(
        `[BattleRoyaleModeStrategy] Ring ${this.currentRing} complete, moving to ring ${
          this.currentRing + 1
        }`
      );
      this.currentRing++;
    }

    // All rings are complete - entire map is toxic
    return null;
  }

  /**
   * Get a human-readable direction name for a biome
   */
  private getBiomeDirectionName(biome: { x: number; y: number }): string {
    const centerX = Math.floor(this.MAP_SIZE / 2);
    const centerY = Math.floor(this.MAP_SIZE / 2);

    const dx = biome.x - centerX;
    const dy = biome.y - centerY;

    let direction = "";
    if (dy < 0) direction += "North";
    if (dy > 0) direction += "South";
    if (dx < 0) direction += "West";
    if (dx > 0) direction += "East";

    return direction || "the edge";
  }

  /**
   * Spawn a crate at a random location
   */
  private spawnCrate(gameManagers: IGameManagers): void {
    const success = gameManagers.getMapManager().spawnCrateInRandomBiome();
    if (success) {
      gameManagers.getBroadcaster().broadcastEvent(
        new GameMessageEvent({
          message: "A supply crate has appeared!",
          color: "green",
        })
      );
    }
  }

  /**
   * Clean up removed clouds from tracking
   */
  private cleanupRemovedClouds(gameManagers: IGameManagers): void {
    const removedClouds: Array<{ cloud: ToxicGasCloud; position: Vector2 | null }> = [];

    this.toxicGasClouds = this.toxicGasClouds.filter((cloud) => {
      const entity = gameManagers.getEntityManager().getEntityById(cloud.getId());
      if (entity === null || entity.isMarkedForRemoval()) {
        let position: Vector2 | null = null;
        if (entity && entity.hasExt(Positionable)) {
          position = entity.getExt(Positionable).getPosition();
        }
        removedClouds.push({ cloud, position });
        return false;
      }
      return true;
    });

    // Remove tiles from grid for removed clouds
    for (const { position } of removedClouds) {
      if (position) {
        const tileX = Math.floor(position.x / this.TILE_SIZE);
        const tileY = Math.floor(position.y / this.TILE_SIZE);
        this.occupiedTiles.delete(`${tileX},${tileY}`);
      }
    }
  }

  // Methods required by ToxicGasCloud for spreading

  /**
   * Check if a tile is occupied by toxic gas
   */
  public isTileOccupied(position: Vector2): boolean {
    // If the biome is consolidated, all tiles are effectively occupied
    const biomeX = Math.floor(position.x / (this.BIOME_SIZE * this.TILE_SIZE));
    const biomeY = Math.floor(position.y / (this.BIOME_SIZE * this.TILE_SIZE));
    const biomeKey = `${biomeX},${biomeY}`;

    if (this.consolidatedBiomes.has(biomeKey)) {
      return true;
    }

    const tileX = Math.floor(position.x / this.TILE_SIZE);
    const tileY = Math.floor(position.y / this.TILE_SIZE);
    return this.occupiedTiles.has(`${tileX},${tileY}`);
  }

  /**
   * Mark a tile as occupied and track biome fill progress
   */
  private markTileOccupied(position: Vector2): void {
    const tileX = Math.floor(position.x / this.TILE_SIZE);
    const tileY = Math.floor(position.y / this.TILE_SIZE);
    this.occupiedTiles.add(`${tileX},${tileY}`);

    // Track tile count per biome for consolidation
    const biomeX = Math.floor(position.x / (this.BIOME_SIZE * this.TILE_SIZE));
    const biomeY = Math.floor(position.y / (this.BIOME_SIZE * this.TILE_SIZE));
    const biomeKey = `${biomeX},${biomeY}`;

    const currentCount = this.biomeTileCounts.get(biomeKey) || 0;
    this.biomeTileCounts.set(biomeKey, currentCount + 1);
  }

  /**
   * Check if any biomes are fully filled and should be consolidated
   * Returns the biome keys that need consolidation
   */
  private getBiomesToConsolidate(): string[] {
    const toConsolidate: string[] = [];

    for (const [biomeKey, tileCount] of this.biomeTileCounts) {
      // Skip already consolidated biomes
      if (this.consolidatedBiomes.has(biomeKey)) {
        continue;
      }

      // Check if biome is fully filled
      if (tileCount >= this.TILES_PER_BIOME) {
        toConsolidate.push(biomeKey);
      }
    }

    return toConsolidate;
  }

  /**
   * Consolidate a fully filled biome - replace individual clouds with single zone entity
   */
  private consolidateBiome(gameManagers: IGameManagers, biomeKey: string): void {
    const [biomeXStr, biomeYStr] = biomeKey.split(",");
    const biomeX = parseInt(biomeXStr, 10);
    const biomeY = parseInt(biomeYStr, 10);

    console.log(
      `[BattleRoyaleModeStrategy] Consolidating biome (${biomeX}, ${biomeY}) - replacing ${this.TILES_PER_BIOME} clouds with single zone`
    );

    // Calculate biome bounds in world coordinates
    const biomeStartX = biomeX * this.BIOME_SIZE * this.TILE_SIZE;
    const biomeStartY = biomeY * this.BIOME_SIZE * this.TILE_SIZE;
    const biomeWorldSize = this.BIOME_SIZE * this.TILE_SIZE;

    // Find all clouds in this biome and remove them
    const cloudsInBiome: ToxicGasCloud[] = [];
    this.toxicGasClouds = this.toxicGasClouds.filter((cloud) => {
      if (!cloud.hasExt(Positionable)) return true;

      const pos = cloud.getExt(Positionable).getPosition();
      const cloudBiomeX = Math.floor(pos.x / (this.BIOME_SIZE * this.TILE_SIZE));
      const cloudBiomeY = Math.floor(pos.y / (this.BIOME_SIZE * this.TILE_SIZE));

      if (cloudBiomeX === biomeX && cloudBiomeY === biomeY) {
        cloudsInBiome.push(cloud);
        return false; // Remove from toxicGasClouds array
      }
      return true;
    });

    // Remove all clouds in this biome from entity manager
    for (const cloud of cloudsInBiome) {
      gameManagers.getEntityManager().removeEntity(cloud.getId());
    }

    // Create single ToxicBiomeZone entity covering the entire biome
    const poolManager = PoolManager.getInstance();
    const zonePosition = poolManager.vector2.claim(biomeStartX, biomeStartY);
    const zoneSize = poolManager.vector2.claim(biomeWorldSize, biomeWorldSize);

    const zone = new ToxicBiomeZone(gameManagers, zonePosition, zoneSize);
    gameManagers.getEntityManager().addEntity(zone);
    // Immediately check for players already in the zone (fixes issue where stationary players don't get poisoned)
    zone.checkForPlayersImmediately();
    this.toxicBiomeZones.push(zone);

    // Mark biome as consolidated
    this.consolidatedBiomes.add(biomeKey);

    // Note: We keep the occupiedTiles set as-is for checking purposes
    // but the individual clouds are gone

    console.log(
      `[BattleRoyaleModeStrategy] Consolidated biome (${biomeX}, ${biomeY}) - removed ${cloudsInBiome.length} clouds`
    );
  }

  /**
   * Check for and perform biome consolidation
   */
  private checkBiomeConsolidation(gameManagers: IGameManagers): void {
    const biomesToConsolidate = this.getBiomesToConsolidate();

    for (const biomeKey of biomesToConsolidate) {
      this.consolidateBiome(gameManagers, biomeKey);
    }
  }

  /**
   * Check if a position is within any toxic biome
   */
  private isWithinToxicBiome(position: Vector2): boolean {
    // Calculate which biome this position is in
    const biomeX = Math.floor(position.x / (this.BIOME_SIZE * this.TILE_SIZE));
    const biomeY = Math.floor(position.y / (this.BIOME_SIZE * this.TILE_SIZE));
    const biomeKey = `${biomeX},${biomeY}`;

    // Check if this biome has been marked as toxic
    return this.toxicBiomes.has(biomeKey);
  }

  /**
   * Request to spawn a new cloud at a position (for spreading)
   */
  public requestSpawnCloud(
    position: Vector2,
    isOriginalCloud: boolean,
    canReproduce: boolean,
    primaryDirection: { x: number; y: number }
  ): boolean {
    // Check if tile is already occupied
    if (this.isTileOccupied(position)) {
      return false;
    }

    // Check if position is within a toxic biome (gas can only spread to biomes that are marked toxic)
    if (!this.isWithinToxicBiome(position)) {
      return false;
    }

    // We need gameManagers to spawn - get it from an existing cloud
    if (this.toxicGasClouds.length === 0) {
      return false;
    }

    const existingCloud = this.toxicGasClouds[0];
    const gameManagers = existingCloud.getGameManagers();

    // Spawn cloud and mark tile as occupied
    const cloud = new ToxicGasCloud(gameManagers, position);
    cloud.setEnvironmentalEventManager(this);
    cloud.setIsOriginalCloud(isOriginalCloud);
    cloud.setCanReproduce(canReproduce);
    cloud.setPrimaryDirection(primaryDirection);
    cloud.setPermanent(true); // Battle Royale clouds never expire
    gameManagers.getEntityManager().addEntity(cloud);
    // Immediately check for players already in the cloud (fixes issue where stationary players don't get poisoned)
    cloud.checkForPlayersImmediately();
    this.toxicGasClouds.push(cloud);
    this.markTileOccupied(position);

    return true;
  }
}
