import { Extension } from "@/extensions/types";
import Positionable from "@/extensions/positionable";
import Collidable from "@/extensions/collidable";
import { EntityType } from "@/types/entity";
import { ExtensionTypes } from "@/util/extension-types";
import { IEntity } from "@/entities/types";
import { Circle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";

export default class Triggerable extends ExtensionBase {
  public static readonly type = ExtensionTypes.TRIGGERABLE;

  private size: Vector2;
  private onEntityEntered?: (entity: IEntity) => void;
  private filter: EntityType[];

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: IEntity, size: Vector2, filter: EntityType[]) {
    super(self, { size: { x: size.x, y: size.y }, filter });
    this.size = PoolManager.getInstance().vector2.claim(size.x, size.y);
    this.filter = filter;
  }

  setOnEntityEntered(cb: (entity: IEntity) => void) {
    this.onEntityEntered = cb;
    return this;
  }

  update(deltaTime: number) {
    const positionable = this.self.getExt(Positionable);
    const filterSet = new Set<EntityType>(this.filter);
    const entities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getCenterPosition(), this.size.x / 2, filterSet);

    for (const entity of entities) {
      if (!entity.hasExt(Collidable)) continue;
      this.onEntityEntered?.(entity);
    }
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Triggerable.type));
    
    if (onlyDirty) {
      const dirtyFields = this.serialized.getDirtyFields();
      const fieldsToWrite: Array<{ index: number }> = [];
      
      // Field indices: size = 0, filter = 1 (but filter is not serialized, only size)
      if (dirtyFields.has("size")) {
        fieldsToWrite.push({ index: 0 });
      }
      
      writer.writeUInt8(fieldsToWrite.length);
      for (const field of fieldsToWrite) {
        writer.writeUInt8(field.index);
        if (field.index === 0) {
          writer.writeFloat64(this.size.x);
          writer.writeFloat64(this.size.y);
        }
      }
    } else {
      // Write all fields: field count = 1, then field
      writer.writeUInt8(1); // field count
      writer.writeUInt8(0); // size index
      writer.writeFloat64(this.size.x);
      writer.writeFloat64(this.size.y);
    }
  }
}
