import { normalizeDirection } from "@shared/util/direction";
/**
 * Final fire angle (radians) with accuracy jitter. `baseSpread` is max half-cone in radians before accuracy (pistol uses ~0.14).
 */
export function getJitteredFireAngleRadians(player, aimAngle, facing, baseSpreadRadians) {
    const spreadMult = player.getAccuracySpreadMultiplier();
    const jitter = (Math.random() - 0.5) * baseSpreadRadians * spreadMult;
    if (aimAngle !== undefined && !Number.isNaN(aimAngle)) {
        return aimAngle + jitter;
    }
    const v = normalizeDirection(facing);
    const base = Math.atan2(v.y, v.x);
    return base + jitter;
}
