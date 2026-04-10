import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
  isNpcDialogueSurvivorSpawnTile,
} from "./spawn-palette";

/** Editor-only labels for non-dialogue spawner tiles (zombies, items, etc.). */
export interface WorldMapSpawnerMetaEntry {
  row: number;
  col: number;
  name?: string;
}

const SPAWNER_META_NAME_MAX = 48;

export function normalizeSpawnerMeta(entries: unknown, mapSide: number): WorldMapSpawnerMetaEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  const byKey = new Map<string, WorldMapSpawnerMetaEntry>();
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const row = (e as WorldMapSpawnerMetaEntry).row;
    const col = (e as WorldMapSpawnerMetaEntry).col;
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
    let name: string | undefined;
    const rawName = (e as WorldMapSpawnerMetaEntry).name;
    if (typeof rawName === "string" && rawName.trim()) {
      name = rawName.trim().slice(0, SPAWNER_META_NAME_MAX);
    }
    const entry: WorldMapSpawnerMetaEntry = { row, col, ...(name !== undefined ? { name } : {}) };
    byKey.set(`${row},${col}`, entry);
  }
  return [...byKey.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Keeps metadata only for cells that currently have a non-dialogue spawner tile. */
export function reconcileSpawnerMetaWithSpawnsLayer(
  spawns: number[][],
  rawMeta: unknown,
): WorldMapSpawnerMetaEntry[] {
  const n = spawns.length;
  const normalized = normalizeSpawnerMeta(rawMeta, n);
  const eligible = new Set<string>();
  for (let r = 0; r < n; r++) {
    const row = spawns[r];
    if (!row) continue;
    for (let c = 0; c < n; c++) {
      const id = row[c] ?? 0;
      if (id > 0 && !isNpcDialogueSurvivorSpawnTile(id)) {
        eligible.add(`${r},${c}`);
      }
    }
  }
  return normalized.filter((e) => eligible.has(`${e.row},${e.col}`));
}

/** Optional authored dialogue NPCs (spawns layer uses `NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID`). */
export interface WorldMapDialogueNpcEntry {
  row: number;
  col: number;
  /** Legacy single block; migrated to `lines` when missing. */
  message?: string;
  /** One sentence per entry; Space advances in-game. */
  lines?: string[];
  /** Shown above the NPC at all times. */
  name?: string;
  /** Quest id added to the player's journal after the last dialog line (server-validated). */
  grantQuestId?: string | null;
}

/** Canonical lines for an entry (prefers `lines`, else legacy `message`). */
export function getDialogueNpcLines(entry: WorldMapDialogueNpcEntry): string[] {
  if (entry.lines && entry.lines.length > 0) {
    return entry.lines.map((l) => String(l));
  }
  const m = entry.message?.trim() ?? "";
  return m ? [m] : ["…"];
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

    let lines: string[] | undefined;
    const rawLines = (e as WorldMapDialogueNpcEntry).lines;
    if (Array.isArray(rawLines)) {
      lines = [];
      for (const line of rawLines) {
        if (lines.length >= DIALOGUE_NPC_MAX_LINE_COUNT) break;
        let s = String(line ?? "");
        if (s.length > DIALOGUE_NPC_MAX_MESSAGE_LENGTH) {
          s = s.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH);
        }
        lines.push(s);
      }
    }

    let message = String((e as WorldMapDialogueNpcEntry).message ?? "");
    if (message.length > DIALOGUE_NPC_MAX_MESSAGE_LENGTH) {
      message = message.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH);
    }

    if (!lines || lines.length === 0) {
      lines = message.trim() ? [message.trim()] : ["Hello!"];
    }

    let name: string | undefined;
    const rawName = (e as WorldMapDialogueNpcEntry).name;
    if (typeof rawName === "string" && rawName.trim()) {
      name = rawName.trim().slice(0, 48);
    }

    let grantQuestId: string | null | undefined;
    const rawGrant = (e as WorldMapDialogueNpcEntry).grantQuestId;
    if (rawGrant === null) {
      grantQuestId = null;
    } else if (typeof rawGrant === "string" && rawGrant.trim()) {
      grantQuestId = rawGrant.trim().slice(0, 64);
    }

    out.push({
      row,
      col,
      lines,
      message: lines[0] ?? "",
      ...(name !== undefined ? { name } : {}),
      ...(grantQuestId !== undefined ? { grantQuestId } : {}),
    });
  }
  return out;
}
