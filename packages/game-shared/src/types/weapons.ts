export const WEAPON_TYPES = {
  KNIFE: "knife",
  SHOTGUN: "shotgun",
  PISTOL: "pistol",
  GRENADE: "grenade",
} as const;

export type WeaponType = (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES];

// Array of weapon type values for iteration/checking
export const WEAPON_TYPE_VALUES: WeaponType[] = Object.values(WEAPON_TYPES);
