import Positionable from "@/extensions/positionable";
import { Direction } from "@/util/direction";
import { IEntity } from "../types";

export function knockBack(entity: IEntity, facing: Direction, distance: number) {
  const positionable = entity.getExt(Positionable);
  const position = positionable.getPosition();

  // Push zombie back based on facing direction
  if (facing === Direction.Right) {
    position.x += distance;
  } else if (facing === Direction.Left) {
    position.x -= distance;
  } else if (facing === Direction.Up) {
    position.y -= distance;
  } else if (facing === Direction.Down) {
    position.y += distance;
  }

  positionable.setPosition(position);
}
