import { Direction } from "@shared/util/direction";
import type { Player } from "@/entities/players/player";
/**
 * Final fire angle (radians) with accuracy jitter. `baseSpread` is max half-cone in radians before accuracy (pistol uses ~0.14).
 */
export declare function getJitteredFireAngleRadians(player: Player, aimAngle: number | undefined, facing: Direction, baseSpreadRadians: number): number;
