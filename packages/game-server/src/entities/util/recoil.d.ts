import type { IEntity } from "@/entities/types";
import { Direction } from "@shared/util/direction";
interface RecoilOptions {
    player: IEntity;
    facing: Direction;
    aimAngle?: number;
    strength: number;
}
export declare function applyWeaponRecoil(options: RecoilOptions): void;
export {};
