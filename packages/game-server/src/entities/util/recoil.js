import Movable from "@/extensions/movable";
import { normalizeDirection } from "@shared/util/direction";
import { normalizeVector } from "@shared/util/physics";
import PoolManager from "@shared/util/pool-manager";
export function applyWeaponRecoil(options) {
    const { player, facing, aimAngle, strength } = options;
    if (strength <= 0 || !player.hasExt(Movable)) {
        return;
    }
    const poolManager = PoolManager.getInstance();
    let directionVector;
    if (aimAngle !== undefined) {
        directionVector = poolManager.vector2.claim(Math.cos(aimAngle), Math.sin(aimAngle));
    }
    else {
        directionVector = normalizeDirection(facing);
    }
    const normalized = normalizeVector(directionVector);
    if (normalized.x === 0 && normalized.y === 0) {
        return;
    }
    const recoilVelocity = poolManager.vector2.claim(-normalized.x * strength, -normalized.y * strength);
    player.getExt(Movable).setVelocity(recoilVelocity);
}
