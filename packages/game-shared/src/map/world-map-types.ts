import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
  isNpcDialogueSurvivorSpawnTile,
} from "./spawn-palette";
import { DECAL_TILE_MESSAGE } from "./decal-palette";

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
  /** One sentence per entry; interact key (E) advances in-game. */
  lines?: string[];
  /** Optional lines shown after `grantQuestId` is applied (same conversation). Requires `grantQuestId`. */
  linesAfterQuestGrant?: string[];
  /** Shown above the NPC at all times. */
  name?: string;
  /** Quest id applied after the last intro line; post-grant lines follow if authored. */
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

/** Post-grant lines from a normalized entry (empty if no grant or none authored). */
export function getDialogueNpcLinesAfterQuestGrant(entry: WorldMapDialogueNpcEntry): string[] {
  const grantRaw = entry.grantQuestId;
  if (grantRaw == null || String(grantRaw).trim() === "") return [];
  const raw = entry.linesAfterQuestGrant;
  if (!raw || raw.length === 0) return [];
  return raw.map((l) => String(l));
}

function clampDialogueLineArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const lines: string[] = [];
  for (const line of raw) {
    if (lines.length >= DIALOGUE_NPC_MAX_LINE_COUNT) break;
    let s = String(line ?? "");
    if (s.length > DIALOGUE_NPC_MAX_MESSAGE_LENGTH) {
      s = s.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH);
    }
    lines.push(s);
  }
  return lines;
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
      lines = clampDialogueLineArray(rawLines);
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

    let linesAfterQuestGrant: string[] | undefined;
    if (grantQuestId !== undefined && grantQuestId !== null && grantQuestId !== "") {
      const afterRaw = (e as WorldMapDialogueNpcEntry).linesAfterQuestGrant;
      const after = clampDialogueLineArray(afterRaw);
      if (after.length > 0) {
        linesAfterQuestGrant = after;
      }
    }

    out.push({
      row,
      col,
      lines,
      message: lines[0] ?? "",
      ...(name !== undefined ? { name } : {}),
      ...(grantQuestId !== undefined ? { grantQuestId } : {}),
      ...(linesAfterQuestGrant !== undefined ? { linesAfterQuestGrant } : {}),
    });
  }
  return out;
}

/** Message shown when the player interacts with a `DECAL_TILE_MESSAGE` cell. */
export interface WorldMapMessageDecalEntry {
  row: number;
  col: number;
  message?: string;
  lines?: string[];
}

export function getMessageDecalLines(entry: WorldMapMessageDecalEntry): string[] {
  if (entry.lines && entry.lines.length > 0) {
    return entry.lines.map((l) => String(l));
  }
  const m = entry.message?.trim() ?? "";
  return m ? [m] : ["…"];
}

export function normalizeMessageDecals(
  entries: unknown,
  mapSide: number,
): WorldMapMessageDecalEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  const out: WorldMapMessageDecalEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const row = (e as WorldMapMessageDecalEntry).row;
    const col = (e as WorldMapMessageDecalEntry).col;
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
    const rawLines = (e as WorldMapMessageDecalEntry).lines;
    if (Array.isArray(rawLines)) {
      lines = clampDialogueLineArray(rawLines);
    }

    let message = String((e as WorldMapMessageDecalEntry).message ?? "");
    if (message.length > DIALOGUE_NPC_MAX_MESSAGE_LENGTH) {
      message = message.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH);
    }

    if (!lines || lines.length === 0) {
      lines = message.trim() ? [message.trim()] : ["Read me."];
    }

    out.push({
      row,
      col,
      lines,
      message: lines[0] ?? "",
    });
  }
  return out;
}

const defaultMessageDecalEntry = (row: number, col: number): WorldMapMessageDecalEntry => ({
  row,
  col,
  lines: ["Read me."],
  message: "Read me.",
});

/** Keeps `messageDecals` aligned with decals-layer message tiles (editor + server). */
export function reconcileMessageDecalsWithDecalsLayer(
  decals: number[][],
  rawEntries: unknown,
  mapSide: number,
): WorldMapMessageDecalEntry[] {
  const normalized = normalizeMessageDecals(rawEntries, mapSide);
  const byKey = new Map<string, WorldMapMessageDecalEntry>();
  for (const e of normalized) {
    byKey.set(`${e.row},${e.col}`, e);
  }
  const out: WorldMapMessageDecalEntry[] = [];
  for (let row = 0; row < mapSide; row++) {
    const rowArr = decals[row];
    if (!rowArr) continue;
    for (let col = 0; col < mapSide; col++) {
      if (rowArr[col] !== DECAL_TILE_MESSAGE) continue;
      const k = `${row},${col}`;
      const prev = byKey.get(k);
      out.push(prev ? { ...prev, row, col } : defaultMessageDecalEntry(row, col));
    }
  }
  return normalizeMessageDecals(out, mapSide);
}
