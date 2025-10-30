import Positionable from "@/extensions/positionable";
import { Direction } from "@/util/direction";
import { IEntity } from "../types";
import { IEntityManager } from "@/managers/types";
import Vector2 from "@/util/vector2";
import Inventory from "@/extensions/inventory";

export function knockBack(
  entityManager: IEntityManager,
  entity: IEntity,
  facing: Direction,
  distance: number
) {
  const positionable = entity.getExt(Positionable);
  const originalPosition = { ...positionable.getPosition() };
  const newPosition = { ...originalPosition };

  if (facing === Direction.Right) {
    newPosition.x += distance;
  } else if (facing === Direction.Left) {
    newPosition.x -= distance;
  } else if (facing === Direction.Up) {
    newPosition.y -= distance;
  } else if (facing === Direction.Down) {
    newPosition.y += distance;
  }

  positionable.setPosition(new Vector2(newPosition.x, newPosition.y));

  if (entityManager.isColliding(entity)) {
    positionable.setPosition(new Vector2(originalPosition.x, originalPosition.y));
  }
}

/**
 * Attempts to consume one unit of ammo from the player's inventory.
 * Returns true if ammo was successfully consumed, false otherwise.
 */
export function consumeAmmo(inventory: Inventory, ammoType: string): boolean {
  // TODO: item? the item should never be undefined
  const ammoItem = inventory.getItems().find((item) => item?.itemType === ammoType);

  if (!ammoItem || !ammoItem.state?.count || ammoItem.state.count <= 0) {
    return false;
  }

  const ammoIndex = inventory.getItems().findIndex((item) => item.itemType === ammoType);
  inventory.updateItemState(ammoIndex, { count: ammoItem.state.count - 1 });

  if (ammoItem.state.count <= 0) {
    inventory.removeItem(ammoIndex);
  }

  return true;
}
