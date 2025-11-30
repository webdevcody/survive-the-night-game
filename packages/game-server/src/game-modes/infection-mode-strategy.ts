import { IGameModeStrategy, GameModeConfig, WinConditionResult } from "./game-mode-strategy";
import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import Destructible from "@/extensions/destructible";
import Collidable from "@/extensions/collidable";
import { GameMessageEvent } from "@shared/events/server-sent/events/game-message-event";
import Positionable from "@/extensions/positionable";
import { AIPlayerManager } from "@/ai/ai-player-manager";
import Groupable from "@/extensions/groupable";
import Illuminated from "@/extensions/illuminated";
import { Groups } from "@shared/util/group-encoding";
import { getConfig } from "@shared/config";

/**
 * Infection Mode Strategy
 *
 * In this mode:
 * - One random player starts as "Patient Zero" (zombie human)
 * - All other players spawn at campsite defending the car
 * - When a human dies, they become a zombie
 * - Zombies share a pool of lives (3 per defender)
 * - Zombies can sprint in this mode
 * - Zombies target the car or other humans
 * - 5-minute countdown timer - if humans survive, they win
 * - Win conditions:
 *   - Zombies win: All humans infected OR car destroyed
 *   - Humans win: Survive 5 minutes OR zombie lives exhausted
 */
export class InfectionModeStrategy implements IGameModeStrategy {
  private readonly config: GameModeConfig = {
    modeId: "infection",
    displayName: "Infection",
    friendlyFireEnabled: false, // Humans cannot damage each other
    allowRespawn: true, // Zombies respawn from shared pool
    hasCarEntity: true, // Car exists in campsite
    hasWaveSystem: false, // No wave spawning
    hasBosses: false,
    hasSurvivors: false,
    minPlayers: 2,
  };

  // Infection mode state
  private sharedZombieLives: number = 0;
  private maxZombieLives: number = 0;
  private initialZombieSelected: boolean = false;
  private aiPlayerManager: AIPlayerManager | null = null;
  private pendingDeathConversions: Set<number> = new Set(); // Track players being converted
  private gameStartTime: number = 0; // Timestamp when game started
  private lastTimeAnnouncement: number = 0; // Track last time announcement to avoid spam

  getConfig(): GameModeConfig {
    return this.config;
  }

  onGameStart(gameManagers: IGameManagers): void {
    // Reset state
    this.initialZombieSelected = false;
    this.pendingDeathConversions.clear();
    this.gameStartTime = Date.now();
    this.lastTimeAnnouncement = 0;

    console.log("[InfectionModeStrategy] Game started in Infection mode");

    // Initialize AI player manager and spawn initial AI players based on config
    this.aiPlayerManager = new AIPlayerManager(gameManagers);
    // Calculate initial AI count based on current real players
    const realPlayerCount = this.getRealPlayerCount(gameManagers);
    const aiConfig = getConfig().aiPlayer;
    const targetAI = Math.max(
      aiConfig.MIN_AI_PLAYERS,
      aiConfig.TOTAL_PLAYER_THRESHOLD - realPlayerCount
    );
    this.aiPlayerManager.spawnAIPlayers(targetAI);

    // Select initial zombie immediately
    this.selectInitialZombie(gameManagers);

    // Broadcast welcome message
    gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: "Infection Mode - Survive the outbreak!",
        color: "gold",
      })
    );
  }

  /**
   * Select a random player to be "Patient Zero" (initial zombie)
   * Can be any player (human or AI)
   */
  private selectInitialZombie(gameManagers: IGameManagers): void {
    if (this.initialZombieSelected) return;

    const players = gameManagers.getEntityManager().getPlayerEntities() as Player[];
    const alivePlayers = players.filter((p) => !p.isDead());

    if (alivePlayers.length < 1) {
      console.log("[InfectionModeStrategy] No players available for Patient Zero");
      return;
    }

    // Calculate shared zombie lives based on total defenders (all players minus Patient Zero)
    const totalDefenders = alivePlayers.length - 1; // minus Patient Zero
    const livesPerHuman = getConfig().infection.LIVES_PER_HUMAN;
    this.sharedZombieLives = Math.max(1, totalDefenders * livesPerHuman);
    this.maxZombieLives = this.sharedZombieLives;

    console.log(
      `[InfectionModeStrategy] Shared zombie lives: ${this.sharedZombieLives} (${totalDefenders} defenders x ${livesPerHuman})`
    );

    // Select random player as Patient Zero (can be human or AI)
    const randomIndex = Math.floor(Math.random() * alivePlayers.length);
    const patientZero = alivePlayers[randomIndex];

    console.log(
      `[InfectionModeStrategy] Selected "${patientZero.getDisplayName()}" as Patient Zero`
    );

    // Convert to zombie (this also moves them outside campsite)
    this.convertToZombie(patientZero, gameManagers, true);

    this.initialZombieSelected = true;

    // Broadcast infection message
    gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: `${patientZero.getDisplayName()} is Patient Zero! Run!`,
        color: "red",
      })
    );

    // Broadcast zombie lives update
    this.broadcastZombieLives(gameManagers);
  }

  /**
   * Convert a player to a zombie
   */
  private convertToZombie(
    player: Player,
    gameManagers: IGameManagers,
    isInitial: boolean = false
  ): void {
    // Set zombie state
    player.setIsZombie(true);

    // Change group to "enemy" so zombies don't target each other
    if (player.hasExt(Groupable)) {
      player.getExt(Groupable).setGroup(Groups.ENEMY);
    }

    // Add illumination for zombie vision
    if (!player.hasExt(Illuminated)) {
      player.addExtension(new Illuminated(player, 80));
    } else {
      player.getExt(Illuminated).setRadius(80);
    }

    // Clear inventory (zombies use claws)
    player.clearInventory();

    // Move zombie outside campsite immediately (zombies should never be inside campsite)
    const spawnPosition = gameManagers.getMapManager().getRandomGrassPositionExcludingCampsite();
    player.getExt(Positionable).setPosition(spawnPosition);

    if (!isInitial) {
      // Broadcast infection message for non-initial zombies
      gameManagers.getBroadcaster().broadcastEvent(
        new GameMessageEvent({
          message: `${player.getDisplayName()} has been infected!`,
          color: "red",
        })
      );
    }
  }

  /**
   * Respawn a zombie player (outside campsite)
   */
  private respawnZombie(player: Player, gameManagers: IGameManagers): void {
    console.log(`[InfectionModeStrategy] Respawning zombie "${player.getDisplayName()}"`);

    // Re-enable collision
    if (player.hasExt(Collidable)) {
      player.getExt(Collidable).setEnabled(true);
    }

    // Restore health to max
    const destructible = player.getExt(Destructible);
    if (destructible) {
      destructible.setHealth(destructible.getMaxHealth());
    }

    // Restore stamina to max
    const maxStamina = getConfig().player.MAX_STAMINA;
    (player as any).serialized.set("stamina", maxStamina);
    (player as any).serialized.set("maxStamina", maxStamina);

    // Spawn outside campsite
    const spawnPosition = gameManagers.getMapManager().getRandomGrassPositionExcludingCampsite();
    player.getExt(Positionable).setPosition(spawnPosition);

    // Clear death time
    player.setDeathTime(0);

    // Set zombie spawn cooldown as ready so they can spawn minions immediately
    player.setZombieSpawnReady();
  }

  /**
   * Respawn a human player (at campsite) - used for AI humans
   */
  private respawnHuman(player: Player, gameManagers: IGameManagers): void {
    console.log(
      `[InfectionModeStrategy] Respawning human "${player.getDisplayName()}" at campsite`
    );

    // Re-enable collision
    if (player.hasExt(Collidable)) {
      player.getExt(Collidable).setEnabled(true);
    }

    // Restore health to max
    const destructible = player.getExt(Destructible);
    if (destructible) {
      destructible.setHealth(destructible.getMaxHealth());
    }

    // Spawn at campsite
    const spawnPosition = gameManagers.getMapManager().getRandomCampsitePosition();
    if (spawnPosition) {
      player.getExt(Positionable).setPosition(spawnPosition);
    }

    // Clear death time
    player.setDeathTime(0);
  }

  /**
   * Handle player deaths - convert humans to zombies, respawn zombies if lives remain
   */
  private handlePlayerDeaths(gameManagers: IGameManagers): void {
    if (!this.initialZombieSelected) return;

    const players = gameManagers.getEntityManager().getPlayerEntities() as Player[];
    const respawnCooldown = getConfig().entity.PLAYER_RESPAWN_COOLDOWN_MS;

    for (const player of players) {
      const isDead = player.isDead();
      const isZombie = player.isZombie();
      const isMarkedForRemoval = player.isMarkedForRemoval();
      const playerId = player.getId();

      // Skip players who are alive or marked for removal
      if (!isDead || isMarkedForRemoval) {
        // Clear from pending conversions if alive
        if (!isDead) {
          this.pendingDeathConversions.delete(playerId);
        }
        continue;
      }

      // Get death time for cooldown check (used for respawn timing)
      const deathTime = player.getDeathTime();
      const timeSinceDeath = Date.now() - deathTime;
      const canRespawn = deathTime > 0 && timeSinceDeath >= respawnCooldown;

      if (isZombie) {
        // Zombie died - decrement shared lives (process immediately, don't wait for cooldown)
        // Only decrement if lives > 0 to prevent going negative
        if (!this.pendingDeathConversions.has(playerId)) {
          this.pendingDeathConversions.add(playerId);

          // Only decrement if there are lives remaining
          if (this.sharedZombieLives > 0) {
            this.sharedZombieLives--;
            console.log(
              `[InfectionModeStrategy] Zombie "${player.getDisplayName()}" died. Lives remaining: ${
                this.sharedZombieLives
              }`
            );

            // Broadcast lives update
            this.broadcastZombieLives(gameManagers);

            // Broadcast death message
            gameManagers.getBroadcaster().broadcastEvent(
              new GameMessageEvent({
                message: `Zombie down! ${this.sharedZombieLives} lives remaining`,
                color: "green",
              })
            );
          }
        }

        // Respawn if lives remain AND cooldown has passed
        if (this.sharedZombieLives > 0 && canRespawn) {
          this.respawnZombie(player, gameManagers);
          this.pendingDeathConversions.delete(playerId);
        }
      } else {
        // Human died
        const isAI = player.serialized.get("isAI");

        if (isAI) {
          // AI humans respawn as humans (they keep defending)
          if (!this.pendingDeathConversions.has(playerId)) {
            this.pendingDeathConversions.add(playerId);
            console.log(
              `[InfectionModeStrategy] AI human "${player.getDisplayName()}" died, respawning as human`
            );
          }

          // Respawn AI human at campsite (only after cooldown)
          if (canRespawn) {
            this.respawnHuman(player, gameManagers);
            this.pendingDeathConversions.delete(playerId);
          }
        } else {
          // Real human players convert to zombie (process immediately)
          if (!this.pendingDeathConversions.has(playerId)) {
            this.pendingDeathConversions.add(playerId);
            this.convertToZombie(player, gameManagers, false);
          }

          // Respawn as zombie (only after cooldown)
          if (canRespawn) {
            this.respawnZombie(player, gameManagers);
            this.pendingDeathConversions.delete(playerId);
          }
        }
      }
    }
  }

  /**
   * Broadcast zombie lives update to all clients
   */
  private broadcastZombieLives(gameManagers: IGameManagers): void {
    gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: `Zombie Lives: ${this.sharedZombieLives}/${this.maxZombieLives}`,
        color: "yellow",
      })
    );
  }

  onGameEnd(gameManagers: IGameManagers): void {
    // Clean up AI players
    if (this.aiPlayerManager) {
      this.aiPlayerManager.cleanup();
      this.aiPlayerManager = null;
    }

    this.pendingDeathConversions.clear();
    console.log("[InfectionModeStrategy] Game ended");
  }

  update(deltaTime: number, gameManagers: IGameManagers): void {
    // Update AI players
    if (this.aiPlayerManager) {
      this.aiPlayerManager.update(deltaTime);
    }

    // Handle player deaths (conversions and respawns)
    this.handlePlayerDeaths(gameManagers);

    // Broadcast time remaining at key intervals
    if (this.initialZombieSelected) {
      this.broadcastTimeRemaining(gameManagers);
    }
  }

  /**
   * Broadcast time remaining at key intervals (every minute, then 30s, 10s, 5s countdown)
   */
  private broadcastTimeRemaining(gameManagers: IGameManagers): void {
    const gameDuration = getConfig().infection.GAME_DURATION_MS;
    const elapsed = Date.now() - this.gameStartTime;
    const timeRemaining = Math.max(0, gameDuration - elapsed);
    const secondsRemaining = Math.floor(timeRemaining / 1000);

    // Determine if we should announce based on time remaining
    let shouldAnnounce = false;
    let message = "";
    let color: string = "yellow";

    // Announce at specific intervals
    if (
      secondsRemaining <= 5 &&
      secondsRemaining > 0 &&
      this.lastTimeAnnouncement !== secondsRemaining
    ) {
      // Final countdown: 5, 4, 3, 2, 1
      shouldAnnounce = true;
      message = `${secondsRemaining}...`;
      color = "red";
    } else if (secondsRemaining === 10 && this.lastTimeAnnouncement !== 10) {
      shouldAnnounce = true;
      message = "10 seconds remaining!";
      color = "red";
    } else if (secondsRemaining === 30 && this.lastTimeAnnouncement !== 30) {
      shouldAnnounce = true;
      message = "30 seconds remaining!";
      color = "orange";
    } else if (secondsRemaining === 60 && this.lastTimeAnnouncement !== 60) {
      shouldAnnounce = true;
      message = "1 minute remaining!";
      color = "yellow";
    } else if (secondsRemaining === 120 && this.lastTimeAnnouncement !== 120) {
      shouldAnnounce = true;
      message = "2 minutes remaining!";
      color = "yellow";
    } else if (secondsRemaining === 180 && this.lastTimeAnnouncement !== 180) {
      shouldAnnounce = true;
      message = "3 minutes remaining!";
      color = "yellow";
    } else if (secondsRemaining === 240 && this.lastTimeAnnouncement !== 240) {
      shouldAnnounce = true;
      message = "4 minutes remaining!";
      color = "yellow";
    }

    if (shouldAnnounce) {
      this.lastTimeAnnouncement = secondsRemaining;
      gameManagers.getBroadcaster().broadcastEvent(
        new GameMessageEvent({
          message,
          color,
        })
      );
    }
  }

  getPlayerSpawnPosition(player: Player, gameManagers: IGameManagers): Vector2 {
    // Zombies spawn outside campsite
    if (player.isZombie()) {
      return gameManagers.getMapManager().getRandomGrassPositionExcludingCampsite();
    }

    // Humans spawn at campsite
    const position = gameManagers.getMapManager().getRandomCampsitePosition();
    return position ?? gameManagers.getMapManager().getRandomGrassPosition();
  }

  handlePlayerSpawn(player: Player, gameManagers: IGameManagers): void {
    const spawnPosition = this.getPlayerSpawnPosition(player, gameManagers);
    player.getExt(Positionable).setPosition(spawnPosition);
  }

  canPlayerRespawn(player: Player): boolean {
    // Zombies can respawn if shared lives remain
    if (player.isZombie()) {
      return this.sharedZombieLives > 0;
    }
    // Humans always respawn (as zombies)
    return true;
  }

  checkWinCondition(gameManagers: IGameManagers): WinConditionResult {
    if (!this.initialZombieSelected) {
      return {
        gameEnded: false,
        winnerId: null,
        winnerName: null,
        message: "",
      };
    }

    const players = gameManagers.getEntityManager().getPlayerEntities() as Player[];

    // Count living humans and zombies
    const livingHumans = players.filter((p) => !p.isDead() && !p.isZombie());
    const livingZombies = players.filter((p) => !p.isDead() && p.isZombie());

    // Check timer - humans win if they survive the full duration
    const gameDuration = getConfig().infection.GAME_DURATION_MS;
    const elapsed = Date.now() - this.gameStartTime;
    const timeRemaining = gameDuration - elapsed;

    if (timeRemaining <= 0 && livingHumans.length > 0) {
      // Time's up and humans survived!
      const winner = livingHumans.find((p) => !p.serialized.get("isAI")) ?? livingHumans[0];
      return {
        gameEnded: true,
        winnerId: winner?.getId() ?? null,
        winnerName: winner?.getDisplayName() ?? null,
        message: "Humans Win! They survived the infection!",
      };
    }

    // Check if car is destroyed
    const carLocation = gameManagers.getMapManager().getCarLocation();
    const carDestroyed = carLocation === null;

    // Zombies win: All humans infected
    if (livingHumans.length === 0 && players.length >= this.config.minPlayers) {
      return {
        gameEnded: true,
        winnerId: null,
        winnerName: null,
        message: "Zombies Win! All humans have been infected!",
      };
    }

    // Zombies win: Car destroyed
    if (carDestroyed && this.initialZombieSelected) {
      return {
        gameEnded: true,
        winnerId: null,
        winnerName: null,
        message: "Zombies Win! The car has been destroyed!",
      };
    }

    // Humans win: Zombie lives exhausted AND no living zombies
    if (this.sharedZombieLives <= 0 && livingZombies.length === 0) {
      // Find the human with most kills or just pick the first living human
      const winner = livingHumans.find((p) => !p.serialized.get("isAI")) ?? livingHumans[0];
      return {
        gameEnded: true,
        winnerId: winner?.getId() ?? null,
        winnerName: winner?.getDisplayName() ?? null,
        message: "Humans Win! The infection has been contained!",
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
    const isAttackerZombie = attacker instanceof Player && (attacker as Player).isZombie();

    if (isAttackerZombie) {
      // Zombies can damage:
      // 1. Living non-zombie players (humans)
      // 2. The car
      if (target instanceof Player) {
        return !target.isZombie() && !target.isDead();
      }
      // Allow damaging car and other destructible entities
      return true;
    }

    // Human attacker
    if (target instanceof Player) {
      // Humans can only damage zombies (no friendly fire)
      return target.isZombie();
    }

    // Humans can damage other entities (car for repair, enemies, etc.)
    // But check if target is in enemy group
    if (target.hasExt(Groupable)) {
      return target.getExt(Groupable).getGroup() === "enemy";
    }

    return true;
  }

  getZombieFallbackTarget(gameManagers: IGameManagers): Vector2 | null {
    // Zombies target the car as fallback (like waves mode)
    return gameManagers.getMapManager().getCarLocation();
  }

  /**
   * Get current shared zombie lives (for UI)
   */
  public getSharedZombieLives(): number {
    return this.sharedZombieLives;
  }

  /**
   * Get max zombie lives (for UI)
   */
  public getMaxZombieLives(): number {
    return this.maxZombieLives;
  }

  /**
   * Get the AI player manager for dynamic AI adjustment
   */
  getAIPlayerManager(): AIPlayerManager | null {
    return this.aiPlayerManager;
  }

  /**
   * Ensure at least one zombie exists in the game.
   * If the zombie player disconnected, randomly select a human to become the new zombie.
   * Should be called after a player disconnects.
   */
  ensureZombieExists(gameManagers: IGameManagers): void {
    if (!this.initialZombieSelected) return; // Game hasn't started yet

    const players = gameManagers.getEntityManager().getPlayerEntities() as Player[];
    const livingZombies = players.filter((p) => !p.isDead() && p.isZombie() && !p.isMarkedForRemoval());
    const livingHumans = players.filter((p) => !p.isDead() && !p.isZombie() && !p.isMarkedForRemoval());

    // If there are no living zombies but there are humans, select a new zombie
    if (livingZombies.length === 0 && livingHumans.length > 0) {
      console.log("[InfectionModeStrategy] No zombies remaining, selecting new Patient Zero");

      // Pick a random human to become zombie
      const randomIndex = Math.floor(Math.random() * livingHumans.length);
      const newZombie = livingHumans[randomIndex];

      console.log(`[InfectionModeStrategy] Selected "${newZombie.getDisplayName()}" as new Patient Zero`);

      // Convert to zombie
      this.convertToZombie(newZombie, gameManagers, false);

      // Broadcast message
      gameManagers.getBroadcaster().broadcastEvent(
        new GameMessageEvent({
          message: `${newZombie.getDisplayName()} has become Patient Zero!`,
          color: "red",
        })
      );
    }
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
}
