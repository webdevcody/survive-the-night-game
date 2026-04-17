export const PLAYER_CLASS_IDS = ["survivor", "scavenger", "medic"] as const;

export type PlayerClassId = (typeof PLAYER_CLASS_IDS)[number];

export function isPlayerClassId(value: unknown): value is PlayerClassId {
  return typeof value === "string" && PLAYER_CLASS_IDS.includes(value as PlayerClassId);
}

export function coercePlayerClassId(value: unknown): PlayerClassId {
  return isPlayerClassId(value) ? value : "survivor";
}
