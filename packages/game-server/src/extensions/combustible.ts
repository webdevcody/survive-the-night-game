import { Entities } from "@/constants";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import { Extension } from "@/extensions/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

type EntityFactory = (type: EntityType) => IEntity;

type CombustibleFields = {
  numFires: number;
  spreadRadius: number;
};

export default class Combustible extends ExtensionBase<CombustibleFields> {
  public static readonly type = "combustible";

  private entityFactory: EntityFactory;

  public constructor(self: IEntity, entityFactory: EntityFactory, numFires = 3, spreadRadius = 32) {
    super(self, { numFires, spreadRadius });
    this.entityFactory = entityFactory;
  }

  public onDeath() {
    const position = this.self.getExt(Positionable).getPosition();
    const numFires = this.serialized.get('numFires');
    const spreadRadius = this.serialized.get('spreadRadius');

    for (let i = 0; i < numFires; i++) {
      const fire = this.entityFactory(Entities.FIRE);
      const randomPosition = this.getRandomPositionInRadius(position, spreadRadius);
      fire.getExt(Positionable).setPosition(randomPosition);
      this.self.getEntityManager().addEntity(fire);
    }
  }

  private getRandomPositionInRadius(center: Vector2, radius: number): Vector2 {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    const poolManager = PoolManager.getInstance();
    return poolManager.vector2.claim(
      center.x + Math.cos(angle) * distance,
      center.y + Math.sin(angle) * distance
    );
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Combustible.type));
    writer.writeUInt32(this.serialized.get('numFires'));
    writer.writeFloat64(this.serialized.get('spreadRadius'));
  }
}
