import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { EntityType } from "@/types/entity";
import { ItemType } from "@shared/util/inventory";

export abstract class StackableItem extends Entity {
  public static readonly Size = new Vector2(16, 16);

  constructor(
    gameManagers: IGameManagers,
    entityType: EntityType,
    itemType: ItemType,
    defaultCount: number,
    displayName: string
  ) {
    super(gameManagers, entityType);

    this.extensions = [
      new Positionable(this).setSize(StackableItem.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName(displayName),
      new Carryable(this, itemType).setItemState({
        count: defaultCount,
      }),
    ];
  }

  protected interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    const carryable = this.getExt(Carryable);
    carryable.pickup(entityId, {
      state: { count: carryable.getItemState().count },
      mergeStrategy: (existing, pickup) => ({
        count: (existing?.count || 0) + (pickup?.count || this.getDefaultCount()),
      }),
    });
  }

  protected abstract getDefaultCount(): number;
}
