import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { RawEntity } from "@/types/entity";
import Vector2 from "@/util/vector2";
import Groupable from "@/extensions/groupable";
import Static from "@/extensions/static";

export class Car extends Entity {
  public static readonly Size = new Vector2(32, 16);
  private static readonly INITIAL_HEALTH = 100;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CAR);

    this.extensions = [
      new Positionable(this).setSize(Car.Size),
      new Collidable(this).setSize(Car.Size),
      new Destructible(this)
        .setMaxHealth(Car.INITIAL_HEALTH)
        .setHealth(Car.INITIAL_HEALTH)
        .onDeath(() => this.onDeath()),
      new Groupable(this, "car"),
      new Static(this),
    ];
  }

  private onDeath(): void {
    // End the game when car is destroyed
    this.getGameManagers().getGameServer().endGame();
    this.getEntityManager().markEntityForRemoval(this);
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      health: this.getExt(Destructible).getHealth(),
    };
  }
}
