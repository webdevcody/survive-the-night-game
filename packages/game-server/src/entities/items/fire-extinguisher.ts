import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import Consumable from "@/extensions/consumable";

export class FireExtinguisher extends Entity {
  private static readonly EXTINGUISH_RADIUS = 64;
  private static readonly SIZE = new Vector2(16, 16);

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.FIRE_EXTINGUISHER);

    this.extensions = [
      new Positionable(this).setSize(FireExtinguisher.SIZE),
      new Interactive(this)
        .onInteract(this.interact.bind(this))
        .setDisplayName("fire extinguisher"),
      new Carryable(this, "fire_extinguisher"),
      new Consumable(this).onConsume(this.consume.bind(this)),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }

  private consume(entityId: string, idx: number): void {
    const player = this.getEntityManager().getEntityById(entityId);
    if (!player) return;

    const position = player.getExt(Positionable).getCenterPosition();
    const nearbyFires = this.getEntityManager().getNearbyEntities(
      position,
      FireExtinguisher.EXTINGUISH_RADIUS,
      [Entities.FIRE]
    );

    for (const fire of nearbyFires) {
      this.getEntityManager().markEntityForRemoval(fire);
    }
  }
}
