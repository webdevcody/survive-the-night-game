export const WEAPON_TYPES = {
  KNIFE: "knife",
  SHOTGUN: "shotgun",
  PISTOL: "pistol",
} as const;

export type WeaponType = (typeof WEAPON_TYPES)[keyof typeof WEAPON_TYPES];
