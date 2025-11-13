import { Extension, ExtensionSerialized } from "@/extensions/types";
import Positionable from "@/extensions/positionable";
import Collidable from "@/extensions/collidable";
import { EntityType } from "@/types/entity";
import { ExtensionTypes } from "@/util/extension-types";
import { IEntity } from "@/entities/types";
import { Circle } from "@/util/shape";
import Vector2 from "@/util/vector2";

export default class Triggerable implements Extension {
  public static readonly type = ExtensionTypes.TRIGGERABLE;

  private self: IEntity;
  private size: Vector2;
  private onEntityEntered?: (entity: IEntity) => void;
  private filter: EntityType[];
  private dirty: boolean = false;

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: IEntity, size: Vector2, filter: EntityType[]) {
    this.self = self;
    this.size = size;
    this.filter = filter;
  }

  setOnEntityEntered(cb: (entity: IEntity) => void) {
    this.onEntityEntered = cb;
    return this;
  }

  update(deltaTime: number) {
    const positionable = this.self.getExt(Positionable);
    const entities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getCenterPosition(), this.size.x / 2, this.filter);

    for (const entity of entities) {
      if (!entity.hasExt(Collidable)) continue;
      this.onEntityEntered?.(entity);
    }
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
      type: Triggerable.type,
      width: this.size.x,
      height: this.size.y,
    };
  }
}
