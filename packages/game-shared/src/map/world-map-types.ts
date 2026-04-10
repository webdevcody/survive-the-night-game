import { DIALOGUE_NPC_MAX_MESSAGE_LENGTH } from "./spawn-palette";

/** Optional authored dialogue NPCs (spawns layer uses `NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID`). */
export interface WorldMapDialogueNpcEntry {
  row: number;
  col: number;
  message: string;
}

export function normalizeDialogueNpcs(
  entries: unknown,
  mapSide: number,
): WorldMapDialogueNpcEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  const out: WorldMapDialogueNpcEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const row = (e as WorldMapDialogueNpcEntry).row;
    const col = (e as WorldMapDialogueNpcEntry).col;
    let message = String((e as WorldMapDialogueNpcEntry).message ?? "");
    if (
      typeof row !== "number" ||
      typeof col !== "number" ||
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      col < 0 ||
      row >= mapSide ||
      col >= mapSide
    ) {
      continue;
    }
    if (message.length > DIALOGUE_NPC_MAX_MESSAGE_LENGTH) {
      message = message.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH);
    }
    out.push({ row, col, message });
  }
  return out;
}
