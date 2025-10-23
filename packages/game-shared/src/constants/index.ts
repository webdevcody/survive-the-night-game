import { EntityType } from "@/types/entity";
export * from "./constants";

export const Entities = {
  ZOMBIE: "zombie",
  BIG_ZOMBIE: "big_zombie",
  FAST_ZOMBIE: "fast_zombie",
  EXPLODING_ZOMBIE: "exploding_zombie",
  BAT_ZOMBIE: "bat_zombie",
  SPITTER_ZOMBIE: "spitter_zombie",
  ACID_PROJECTILE: "acid_projectile",
  PLAYER: "player",
  TREE: "tree",
  BULLET: "bullet",
  WALL: "wall",
  BOUNDARY: "boundary",
  BANDAGE: "bandage",
  CLOTH: "cloth",
  SPIKES: "spikes",
  FIRE: "fire",
  TORCH: "torch",
  GASOLINE: "gasoline",
  PISTOL: "pistol",
  SHOTGUN: "shotgun",
  KNIFE: "knife",
  PISTOL_AMMO: "pistol_ammo",
  SHOTGUN_AMMO: "shotgun_ammo",
  LANDMINE: "landmine",
  GRENADE: "grenade",
  FIRE_EXTINGUISHER: "fire_extinguisher",
} as const;

export const Zombies: EntityType[] = [
  Entities.ZOMBIE,
  Entities.BIG_ZOMBIE,
  Entities.FAST_ZOMBIE,
  Entities.BAT_ZOMBIE,
  Entities.SPITTER_ZOMBIE,
];
