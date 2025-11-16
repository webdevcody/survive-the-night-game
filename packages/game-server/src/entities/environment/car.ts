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
import { GameMessageEvent } from "@shared/events/server-sent/game-message-event";
import { CarRepairEvent } from "@shared/events/server-sent/car-repair-event";
import Interactive from "@/extensions/interactive";

export class Car extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(32, 16);
  }
  private static readonly INITIAL_HEALTH = 100;
  private static readonly ATTACK_MESSAGE_COOLDOWN = 5000; // 5 seconds
  private static readonly REPAIR_COOLDOWN = 1000; // 1 second

  private lastAttackMessageTime: number = 0;
  private lastRepairTime: number = 0;

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
    // End the game when car is destroyed
    this.getGameManagers().getGameServer().endGame();
    this.getEntityManager().markEntityForRemoval(this);
  }

  private onRepair(entityId: string): void {
    const now = Date.now();
    const timeSinceLastRepair = now - this.lastRepairTime;

    // Only repair if enough time has passed since the last repair
    if (timeSinceLastRepair >= Car.REPAIR_COOLDOWN) {
      this.lastRepairTime = now;

      const destructible = this.getExt(Destructible);

      // Only repair if the car is damaged
      if (destructible.getHealth() < destructible.getMaxHealth()) {
        destructible.heal(1);
        // Broadcast repair event so clients can play sound
        this.getGameManagers().getBroadcaster().broadcastEvent(new CarRepairEvent(this.getId()));
      }
    }
  }
}
