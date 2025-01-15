import { Extension, ExtensionSerialized } from "@/extensions/types";
import { distance, Vector2 } from "@shared/geom/physics";
import { Rectangle } from "@shared/geom/rectangle";
import Positionable from "@/extensions/positionable";
import Collidable from "@/extensions/collidable";
import { EntityType } from "@shared/types/entity";
import { ExtensionTypes } from "@shared/geom/extension-types";
import { IEntity } from "@shared/geom/types";

export default class Triggerable implements Extension {
  public static readonly type = ExtensionTypes.TRIGGERABLE;
  private static readonly TriggerRadius = 10;

  private self: IEntity;
  private size: Vector2;
  private onEntityEntered?: (entity: IEntity) => void;
  private filter: EntityType[];

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: IEntity, width: number, height: number, filter: EntityType[]) {
    this.self = self;
    this.size = { x: width, y: height };
    this.filter = filter;
  }

  setOnEntityEntered(cb: (entity: IEntity) => void) {
    this.onEntityEntered = cb;
    return this;
  }

  update(deltaTime: number) {
    const entities = this.self
      .getEntityManager()
      .getNearbyEntities(
        this.self.getExt(Positionable).getPosition(),
        undefined,
        this.filter
      ) as IEntity[];

    const triggerBox = this.getTriggerBox();
    const triggerCenter = triggerBox.getCenter();

    for (const entity of entities) {
      if (!entity.hasExt(Collidable)) continue;
      const hitbox = entity.getExt(Collidable).getHitBox();
      const entityHitbox = new Rectangle(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      const entityCenter = entityHitbox.getCenter();

      const centerDistance = distance(triggerCenter, entityCenter);

      if (centerDistance <= Triggerable.TriggerRadius) {
        this.onEntityEntered?.(entity);
      }
    }
  }

  public getTriggerBox(): Rectangle {
    const positionable = this.self.getExt(Positionable);
    return new Rectangle(
      positionable.getPosition().x,
      positionable.getPosition().y,
      this.size.x,
      this.size.y
    );
  }

  public deserialize(data: ExtensionSerialized): this {
    this.size = { x: data.width, y: data.height };
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Triggerable.type,
      width: this.size.x,
      height: this.size.y,
    };
  }
}
