import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
  isNpcDialogueSurvivorSpawnTile,
} from "./spawn-palette";
import { DECAL_TILE_MESSAGE } from "./decal-palette";
import type { PlayerQuestStatePayload } from "../quests/player-quest-state";
import { emptyPlayerQuestState } from "../quests/player-quest-state";

/** Max conditional dialog sessions per NPC (bounds replicated entity size). */
export const DIALOGUE_NPC_MAX_SESSIONS = 8;

const QUEST_ID_FIELD_MAX = 64;

/** When a session matches the player's quest state (first non-default match wins; see `pickDialogueNpcSession`). */
export type DialogueNpcCondition =
  | { type: "always" }
  | { type: "quest_completed"; questId: string }
  | { type: "quest_active"; questId: string }
  | { type: "quest_not_completed"; questId: string };

/** One dialog branch: lines, optional grant on close, optional complete on close. */
export interface WorldMapDialogueNpcSession {
  /** Omit or `always` = default branch (should be last in the list). */
  when?: DialogueNpcCondition;
  lines: string[];
  grantQuestId?: string | null;
  completeQuestId?: string | null;
}

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
  /** Ordered branches; first matching `when` wins. Prefer this over legacy flat fields. */
  dialogueSessions?: WorldMapDialogueNpcSession[];
  /** Legacy single block; migrated into `dialogueSessions` when missing. */
  message?: string;
  /** Legacy; mirrored from default session for older tooling. */
  lines?: string[];
  name?: string;
  grantQuestId?: string | null;
}

function isDefaultCondition(when: DialogueNpcCondition | undefined): boolean {
  return when == null || when.type === "always";
}

function conditionMatchesNonDefault(
  when: DialogueNpcCondition,
  st: PlayerQuestStatePayload,
): boolean {
  switch (when.type) {
    case "always":
      return false;
    case "quest_completed":
      return st.completed.includes(when.questId);
    case "quest_active":
      return st.active[when.questId] !== undefined;
    case "quest_not_completed":
      return !st.completed.includes(when.questId);
    default:
      return false;
  }
}

/**
 * First session whose `when` is a non-default condition and matches `st`, else last default * (`when` omitted or `always`), else last session.
 */
export function pickDialogueNpcSession(
  sessions: WorldMapDialogueNpcSession[],
  st: PlayerQuestStatePayload,
): WorldMapDialogueNpcSession {
  if (sessions.length === 0) {
    return { when: { type: "always" }, lines: ["…"] };
  }
  for (const s of sessions) {
    const w = s.when;
    if (!isDefaultCondition(w) && w && conditionMatchesNonDefault(w, st)) {
      return s;
    }
  }
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (isDefaultCondition(sessions[i].when)) {
      return sessions[i];
    }
  }
  return sessions[sessions.length - 1];
}

/** Sessions for an entry (normalized `dialogueSessions` or one legacy block). */
export function getDialogueNpcSessions(entry: WorldMapDialogueNpcEntry): WorldMapDialogueNpcSession[] {
  if (entry.dialogueSessions && entry.dialogueSessions.length > 0) {
    return entry.dialogueSessions;
  }
  let lines =
    entry.lines && entry.lines.length > 0
      ? entry.lines.map((l) => String(l))
      : (() => {
          const m = entry.message?.trim() ?? "";
          return m ? [m] : ["…"];
        })();
  let grantQuestId: string | null | undefined;
  const grantRaw = entry.grantQuestId;
  if (grantRaw === null) grantQuestId = null;
  else if (typeof grantRaw === "string" && grantRaw.trim()) {
    grantQuestId = grantRaw.trim().slice(0, QUEST_ID_FIELD_MAX);
  }
  /** @deprecated Old maps only; folded into `lines`. */
  const legacyAfter = (entry as { linesAfterQuestGrant?: string[] }).linesAfterQuestGrant;
  if (legacyAfter && legacyAfter.length > 0) {
    const merged = [...lines];
    for (const raw of legacyAfter) {
      if (merged.length >= DIALOGUE_NPC_MAX_LINE_COUNT) break;
      let s = String(raw ?? "");
      if (s.length > DIALOGUE_NPC_MAX_MESSAGE_LENGTH) {
        s = s.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH);
      }
      merged.push(s);
    }
    lines = merged;
  }
  return [
    {
      when: { type: "always" },
      lines,
      ...(grantQuestId !== undefined ? { grantQuestId } : {}),
    },
  ];
}

/** Plain-object sessions for entity replication (JSON-serializable). */
export type DialogueNpcSessionSerialized = {
  when?: DialogueNpcCondition;
  lines: string[];
  grantQuestId?: string;
  completeQuestId?: string;
};

export function dialogueNpcSessionsToSerialized(
  sessions: WorldMapDialogueNpcSession[],
): DialogueNpcSessionSerialized[] {
  return sessions.map((s) => {
    const grant = s.grantQuestId;
    const grantStr =
      grant === null || grant === undefined ? undefined : String(grant).trim() || undefined;
    const complete = s.completeQuestId;
    const completeStr =
      complete === null || complete === undefined
        ? undefined
        : String(complete).trim() || undefined;
    const out: DialogueNpcSessionSerialized = {
      lines: s.lines.map((l) => String(l)),
      ...(s.when ? { when: s.when } : {}),
      ...(grantStr ? { grantQuestId: grantStr.slice(0, QUEST_ID_FIELD_MAX) } : {}),
      ...(completeStr ? { completeQuestId: completeStr.slice(0, QUEST_ID_FIELD_MAX) } : {}),
    };
    return out;
  });
}

export function dialogueNpcSessionsFromSerialized(
  raw: unknown,
): WorldMapDialogueNpcSession[] | null {
  if (!Array.isArray(raw)) return null;
  const out: WorldMapDialogueNpcSession[] = [];
  for (const item of raw) {
    if (out.length >= DIALOGUE_NPC_MAX_SESSIONS) break;
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    let lines = clampDialogueLineArray(o.lines);
    const legacyAfter = clampDialogueLineArray(o.linesAfterQuestGrant);
    if (legacyAfter.length > 0) {
      for (const x of legacyAfter) {
        if (lines.length >= DIALOGUE_NPC_MAX_LINE_COUNT) break;
        lines.push(x);
      }
    }
    if (lines.length === 0) continue;
    let when: DialogueNpcCondition | undefined;
    const rawWhen = o.when;
    if (rawWhen && typeof rawWhen === "object" && !Array.isArray(rawWhen)) {
      const w = rawWhen as Record<string, unknown>;
      const t = w.type;
      if (t === "always") when = { type: "always" };
      else if (
        t === "quest_completed" ||
        t === "quest_active" ||
        t === "quest_not_completed"
      ) {
        const qid = String(w.questId ?? "")
          .trim()
          .slice(0, QUEST_ID_FIELD_MAX);
        if (qid) when = { type: t, questId: qid } as DialogueNpcCondition;
      }
    }
    let grantQuestId: string | null | undefined;
    const g = o.grantQuestId;
    if (g === null) grantQuestId = null;
    else if (typeof g === "string" && g.trim()) {
      grantQuestId = g.trim().slice(0, QUEST_ID_FIELD_MAX);
    }
    let completeQuestId: string | null | undefined;
    const c = o.completeQuestId;
    if (c === null) completeQuestId = null;
    else if (typeof c === "string" && c.trim()) {
      completeQuestId = c.trim().slice(0, QUEST_ID_FIELD_MAX);
    }
    out.push({
      ...(when ? { when } : {}),
      lines,
      ...(grantQuestId !== undefined ? { grantQuestId } : {}),
      ...(completeQuestId !== undefined ? { completeQuestId } : {}),
    });
  }
  return out.length > 0 ? out : null;
}

/** Lines for the default branch (no active/completed quests): editor list preview. */
export function getDialogueNpcLines(entry: WorldMapDialogueNpcEntry): string[] {
  const sessions = getDialogueNpcSessions(entry);
  const s = pickDialogueNpcSession(sessions, emptyPlayerQuestState());
  return s.lines.length > 0 ? s.lines.map((l) => String(l)) : ["…"];
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

    let name: string | undefined;
    const rawName = (e as WorldMapDialogueNpcEntry).name;
    if (typeof rawName === "string" && rawName.trim()) {
      name = rawName.trim().slice(0, 48);
    }

    const rawSessions = (e as Record<string, unknown>).dialogueSessions;
    let sessions = dialogueNpcSessionsFromSerialized(rawSessions);

    if (!sessions || sessions.length === 0) {
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

      let grantQuestId: string | null | undefined;
      const rawGrant = (e as WorldMapDialogueNpcEntry).grantQuestId;
      if (rawGrant === null) {
        grantQuestId = null;
      } else if (typeof rawGrant === "string" && rawGrant.trim()) {
        grantQuestId = rawGrant.trim().slice(0, QUEST_ID_FIELD_MAX);
      }

      const legacyAfterRaw = (e as { linesAfterQuestGrant?: unknown }).linesAfterQuestGrant;
      const legacyAfter = clampDialogueLineArray(legacyAfterRaw);
      if (legacyAfter.length > 0) {
        for (const x of legacyAfter) {
          if (lines.length >= DIALOGUE_NPC_MAX_LINE_COUNT) break;
          lines.push(x);
        }
      }

      sessions = [
        {
          when: { type: "always" },
          lines,
          ...(grantQuestId !== undefined ? { grantQuestId } : {}),
        },
      ];
    }

    sessions = sessions.slice(0, DIALOGUE_NPC_MAX_SESSIONS);
    const def = pickDialogueNpcSession(sessions, emptyPlayerQuestState());
    const lines = def.lines.map((l) => String(l));

    let grantQuestId: string | null | undefined;
    const g = def.grantQuestId;
    if (g === null) grantQuestId = null;
    else if (typeof g === "string" && g.trim()) {
      grantQuestId = g.trim().slice(0, QUEST_ID_FIELD_MAX);
    }

    out.push({
      row,
      col,
      dialogueSessions: sessions,
      lines,
      message: lines[0] ?? "",
      ...(name !== undefined ? { name } : {}),
      ...(grantQuestId !== undefined ? { grantQuestId } : {}),
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
