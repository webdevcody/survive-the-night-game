import Movable from "@/extensions/movable";
import type { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { Direction, normalizeDirection } from "@shared/util/direction";
import { normalizeVector } from "@shared/util/physics";

interface RecoilOptions {
  player: IEntity;
  facing: Direction;
  aimAngle?: number;
  strength: number;
}

export function applyWeaponRecoil(options: RecoilOptions): void {
  const { player, facing, aimAngle, strength } = options;
  if (strength <= 0 || !player.hasExt(Movable)) {
    return;
  }

  let directionVector: Vector2;
  if (aimAngle !== undefined) {
    directionVector = new Vector2(Math.cos(aimAngle), Math.sin(aimAngle));
  } else {
    directionVector = normalizeDirection(facing);
  }

  const normalized = normalizeVector(directionVector);
  if (normalized.x === 0 && normalized.y === 0) {
    return;
  }

  const recoilVelocity = new Vector2(-normalized.x * strength, -normalized.y * strength);
  player.getExt(Movable).setVelocity(recoilVelocity);
}
