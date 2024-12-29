import { Entities, Entity, GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { distance, Vector2 } from "../physics";
import { Rectangle } from "../geom/rectangle";
import Positionable from "./positionable";
import { Zombie } from "../entities/zombie";
import { EntityType } from "../entity-types";
import Collidable from "./collidable";

export default class Triggerable implements Extension {
  public static readonly Name = ExtensionNames.trigger;
  private static readonly TriggerRadius = 10;

  private self: Entity;
  private size: Vector2;
  private onEntityEntered?: (entity: Entity) => void;
  private filter: EntityType[];

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: Entity, width: number, height: number, filter: EntityType[]) {
    this.self = self;
    this.size = { x: width, y: height };
    this.filter = filter;
  }

  setOnEntityEntered(cb: (entity: Entity) => void) {
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
      ) as Entity[];

    const triggerBox = this.getTriggerBox();
    const triggerCenter = triggerBox.getCenter();

    for (const entity of entities) {
      if (!entity.hasExt(Collidable)) continue;
      const hitbox = entity.getExt(Collidable).getHitBox();
      const entityHitbox = new Rectangle(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      const entityCenter = entityHitbox.getCenter();

      const centerDistance = distance(triggerCenter, entityCenter);

      if (centerDistance < Triggerable.TriggerRadius) {
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
      name: Triggerable.Name,
      width: this.size.x,
      height: this.size.y,
    };
  }
}
