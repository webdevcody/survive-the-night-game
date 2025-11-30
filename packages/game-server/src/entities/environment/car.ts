import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Groupable from "@/extensions/groupable";
import Static from "@/extensions/static";
import { GameMessageEvent } from "../../../../game-shared/src/events/server-sent/events/game-message-event";
import { CarRepairEvent } from "../../../../game-shared/src/events/server-sent/events/car-repair-event";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import Interactive from "@/extensions/interactive";

import { getConfig } from "@shared/config";

export class Car extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(32, 16);
  }
  private static readonly INITIAL_HEALTH = 20;
  private static readonly ATTACK_MESSAGE_COOLDOWN = getConfig().entity.CAR_ATTACK_MESSAGE_COOLDOWN_MS;
  private static readonly REPAIR_COOLDOWN = getConfig().entity.CAR_REPAIR_COOLDOWN_MS;

  private lastAttackMessageTime: number = 0;
  private playerRepairTimes: Map<number, number> = new Map();

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CAR);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(32, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Collidable(this).setSize(size));
    this.addExtension(
      new Destructible(this)
        .setMaxHealth(Car.INITIAL_HEALTH)
        .setHealth(Car.INITIAL_HEALTH)
        .onDamaged(() => this.onDamaged())
        .onDeath(() => this.onDeath())
    );
    this.addExtension(new Groupable(this, "friendly"));
    this.addExtension(new Static(this));
    this.addExtension(
      new Interactive(this)
        .onInteract((entityId) => this.onRepair(entityId))
        .setDisplayName("repair")
    );
  }

  private onDamaged(): void {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastAttackMessageTime;

    // Only send message if enough time has passed since the last one
    if (timeSinceLastMessage >= Car.ATTACK_MESSAGE_COOLDOWN) {
      this.lastAttackMessageTime = now;
      this.getGameManagers()
        .getBroadcaster()
        .broadcastEvent(
          new GameMessageEvent({
            message: "The car is under attack!",
            color: "red",
          })
        );
    }
  }

  private onDeath(): void {
    const carPosition = this.getExt(Positionable).getCenterPosition();
    const poolManager = PoolManager.getInstance();
    const broadcaster = this.getGameManagers().getBroadcaster();

    // Broadcast death message
    broadcaster.broadcastEvent(
      new GameMessageEvent({
        message: "WE'RE GOING TO DIE!!",
        color: "red",
      })
    );

    // Only spawn zombies in wave mode - skip in infection mode
    const gameMode = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy().getConfig().modeId;
    if (gameMode !== "infection") {
      // Spawn 200 big zombies around the campsite
      this.getGameManagers().getMapManager().spawnZombiesAroundCampsite("big", 200);
      this.getGameManagers().getMapManager().spawnZombiesAroundCampsite("bat", 100);
    }

    // Play multiple explosion animations at the car entity location
    // Create explosions with slight random offsets to make it look like multiple explosions
    const EXPLOSION_COUNT = 8;
    const EXPLOSION_SPREAD = 24; // pixels
    for (let i = 0; i < EXPLOSION_COUNT; i++) {
      const offsetX = (Math.random() - 0.5) * EXPLOSION_SPREAD;
      const offsetY = (Math.random() - 0.5) * EXPLOSION_SPREAD;
      const explosionPosition = poolManager.vector2.claim(
        carPosition.x + offsetX,
        carPosition.y + offsetY
      );

      broadcaster.broadcastEvent(
        new ExplosionEvent({
          position: explosionPosition,
        })
      );
      poolManager.vector2.release(explosionPosition);
    }

    // Remove the car entity immediately (car is static, so it won't be processed by pruneEntities)
    this.getEntityManager().removeEntity(this.getId());

    // Clear the map manager's car cache
    const mapManager = this.getGameManagers().getMapManager() as any;
    if (mapManager && typeof mapManager.clearCarCache === "function") {
      mapManager.clearCarCache();
    }
  }

  private onRepair(entityId: number): void {
    const now = Date.now();
    const playerLastRepair = this.playerRepairTimes.get(entityId) ?? 0;
    const timeSinceLastRepair = now - playerLastRepair;

    // Only repair if enough time has passed since this player's last repair
    if (timeSinceLastRepair >= Car.REPAIR_COOLDOWN) {
      this.playerRepairTimes.set(entityId, now);

      const destructible = this.getExt(Destructible);

      // Only repair if the car is damaged
      if (destructible.getHealth() < destructible.getMaxHealth()) {
        destructible.heal(1);
        // Broadcast repair event so clients can play sound
        this.getGameManagers()
          .getBroadcaster()
          .broadcastEvent(new CarRepairEvent({ carId: this.getId(), playerId: entityId }));
      }
    }
  }
}
