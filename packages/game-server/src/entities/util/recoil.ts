import Movable from "@/extensions/movable";
import type { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { Direction, normalizeDirection } from "@shared/util/direction";
import { normalizeVector } from "@shared/util/physics";
import PoolManager from "@shared/util/pool-manager";

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

  const poolManager = PoolManager.getInstance();
  let directionVector: Vector2;
  if (aimAngle !== undefined) {
    directionVector = poolManager.vector2.claim(Math.cos(aimAngle), Math.sin(aimAngle));
  } else {
    directionVector = normalizeDirection(facing);
  }

  const normalized = normalizeVector(directionVector);
  if (normalized.x === 0 && normalized.y === 0) {
    return;
  }

  const recoilVelocity = poolManager.vector2.claim(-normalized.x * strength, -normalized.y * strength);
  player.getExt(Movable).setVelocity(recoilVelocity);
}
