import Positionable from "@/extensions/positionable";
import { Direction } from "@/util/direction";
import { IEntity } from "../types";
import { IEntityManager } from "@/managers/types";
import Vector2 from "@/util/vector2";
import Inventory from "@/extensions/inventory";
import Static from "@/extensions/static";

export function knockBack(
  entityManager: IEntityManager,
  entity: IEntity,
  facing: Direction,
  distance: number
) {
  const isStatic = entity.hasExt(Static);

  if (isStatic) {
    return;
  }

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
  // Use the inventory's consumeAmmo method which works with the separate ammo storage
  return inventory.consumeAmmo(ammoType, 1);
}
