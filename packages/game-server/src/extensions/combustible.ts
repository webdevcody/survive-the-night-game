import { Entities } from "@/constants";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import Vector2 from "@/util/vector2";

type EntityFactory = (type: EntityType) => IEntity;

export default class Combustible implements Extension {
  public static readonly type = "combustible";

  private self: IEntity;
  private entityFactory: EntityFactory;
  private numFires: number;
  private spreadRadius: number;
  private dirty: boolean = false;

  public constructor(self: IEntity, entityFactory: EntityFactory, numFires = 3, spreadRadius = 32) {
    this.self = self;
    this.entityFactory = entityFactory;
    this.numFires = numFires;
    this.spreadRadius = spreadRadius;
  }

  public onDeath() {
    const position = this.self.getExt(Positionable).getPosition();

    for (let i = 0; i < this.numFires; i++) {
      const fire = this.entityFactory(Entities.FIRE);
      const randomPosition = this.getRandomPositionInRadius(position, this.spreadRadius);
      fire.getExt(Positionable).setPosition(randomPosition);
      this.self.getEntityManager().addEntity(fire);
    }
  }

  private getRandomPositionInRadius(center: Vector2, radius: number): Vector2 {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    return new Vector2(
      center.x + Math.cos(angle) * distance,
      center.y + Math.sin(angle) * distance
    );
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Combustible.type,
      numFires: this.numFires,
      spreadRadius: this.spreadRadius,
    };
  }
}
