import { Entities } from "@/constants";

export const WEAPON_TYPES = {
  KNIFE: Entities.KNIFE,
  BASEBALL_BAT: Entities.BASEBALL_BAT,
  SHOTGUN: Entities.SHOTGUN,
  PISTOL: Entities.PISTOL,
  GRENADE: Entities.GRENADE,
  BOLT_ACTION_RIFLE: Entities.BOLT_ACTION_RIFLE,
  AK47: Entities.AK47,
  GRENADE_LAUNCHER: Entities.GRENADE_LAUNCHER,
  FLAMETHROWER: Entities.FLAMETHROWER,
} as const;

export type WeaponType = (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES];

// Array of weapon type values for iteration/checking
export const WEAPON_TYPE_VALUES: WeaponType[] = Object.values(WEAPON_TYPES);
