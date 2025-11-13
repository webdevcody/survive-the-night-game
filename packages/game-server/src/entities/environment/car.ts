import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import Groupable from "@/extensions/groupable";
import Static from "@/extensions/static";
import { GameMessageEvent } from "@shared/events/server-sent/game-message-event";
import Interactive from "@/extensions/interactive";

export class Car extends Entity {
  public static readonly Size = new Vector2(32, 16);
  private static readonly INITIAL_HEALTH = 100;
  private static readonly ATTACK_MESSAGE_COOLDOWN = 5000; // 5 seconds
  private static readonly REPAIR_COOLDOWN = 1000; // 1 second

  private lastAttackMessageTime: number = 0;
  private lastRepairTime: number = 0;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CAR);

    this.extensions = [
      new Positionable(this).setSize(Car.Size),
      new Collidable(this).setSize(Car.Size),
      new Destructible(this)
        .setMaxHealth(Car.INITIAL_HEALTH)
        .setHealth(Car.INITIAL_HEALTH)
        .onDamaged(() => this.onDamaged())
        .onDeath(() => this.onDeath()),
      new Groupable(this, "car"),
      new Static(this),
      new Interactive(this)
        .onInteract((entityId) => this.onRepair(entityId))
        .setDisplayName("repair"),
    ];
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
      }
    }
  }
}
