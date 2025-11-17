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

export default class Combustible extends ExtensionBase {
  public static readonly type = "combustible";

  private entityFactory: EntityFactory;

  public constructor(self: IEntity, entityFactory: EntityFactory, numFires = 3, spreadRadius = 32) {
    super(self, { numFires, spreadRadius });
    this.entityFactory = entityFactory;
  }

  public onDeath() {
    const serialized = this.serialized as any;
    const position = this.self.getExt(Positionable).getPosition();

    for (let i = 0; i < serialized.numFires; i++) {
      const fire = this.entityFactory(Entities.FIRE);
      const randomPosition = this.getRandomPositionInRadius(position, serialized.spreadRadius);
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
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Combustible.type));

    if (onlyDirty) {
      const dirtyFields = this.serialized.getDirtyFields();
      const fieldsToWrite: Array<{ index: number }> = [];

      // Field indices: numFires = 0, spreadRadius = 1
      if (dirtyFields.has("numFires")) {
        fieldsToWrite.push({ index: 0 });
      }
      if (dirtyFields.has("spreadRadius")) {
        fieldsToWrite.push({ index: 1 });
      }

      writer.writeUInt8(fieldsToWrite.length);
      for (const field of fieldsToWrite) {
        writer.writeUInt8(field.index);
        if (field.index === 0) {
          writer.writeUInt32(serialized.numFires);
        } else if (field.index === 1) {
          writer.writeFloat64(serialized.spreadRadius);
        }
      }
    } else {
      // Write all fields: field count = 2, then fields in order
      writer.writeUInt8(2); // field count
      writer.writeUInt8(0); // numFires index
      writer.writeUInt32(serialized.numFires);
      writer.writeUInt8(1); // spreadRadius index
      writer.writeFloat64(serialized.spreadRadius);
    }
  }
}
