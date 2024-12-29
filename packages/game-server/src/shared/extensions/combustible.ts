import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Positionable } from "./index";
import { Vector2 } from "../physics";
import { Entity } from "../entities";
import { EntityType, Entities } from "../entity-types";

type EntityFactory = (type: EntityType) => Entity;

export default class Combustible implements Extension {
  public static readonly Name = ExtensionNames.combustible;

  private self: Entity;
  private entityFactory: EntityFactory;
  private numFires: number;
  private spreadRadius: number;

  public constructor(self: Entity, entityFactory: EntityFactory, numFires = 3, spreadRadius = 32) {
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
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };
  }

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Combustible.Name,
      numFires: this.numFires,
      spreadRadius: this.spreadRadius,
    };
  }
}
