import Positionable from "@/extensions/positionable";
import { Direction } from "@/util/direction";
import { IEntity } from "../types";
import { IEntityManager } from "@/managers/types";
import Vector2 from "@/util/vector2";

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
