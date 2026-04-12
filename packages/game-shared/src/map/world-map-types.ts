import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
  isNpcDialogueSpawnTile,
  NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID,
  NPC_HEALER_DIALOGUE_SPAWN_TILE_ID,
} from "./spawn-palette";
import { DECAL_TILE_MESSAGE } from "./decal-palette";
import type { PlayerQuestStatePayload } from "../quests/player-quest-state";
import { emptyPlayerQuestState, getActiveStepIndex } from "../quests/player-quest-state";
import type { WorldMapQuestDefinition } from "./quest-types";
import { talkToNpcStepMatchesNpc } from "./quest-types";

/** Max conditional dialog sessions per NPC (bounds replicated entity size). */
export const DIALOGUE_NPC_MAX_SESSIONS = 8;

/** Max atomic clauses inside one session's `{ type: "all", conditions }` (bounds replicated entity size). */
export const DIALOGUE_NPC_MAX_AND_CLAUSES = 8;

const QUEST_ID_FIELD_MAX = 64;

/** Max length for editor-only group label and group id strings (map JSON; not replicated). */
export const DIALOGUE_NPC_EDITOR_GROUP_MAX = 48;

/** Single requirement inside a `{ type: "all", conditions: [...] }` branch. */
export type DialogueNpcAtomicCondition =
  | { type: "quest_completed"; questId: string }
  | { type: "quest_active"; questId: string }
  /** True when the quest id is absent from {@link PlayerQuestStatePayload.active}. */
  | { type: "quest_not_active"; questId: string }
  | { type: "quest_not_completed"; questId: string }
  | { type: "quest_active_and_has_item"; questId: string; itemType: string }
  | { type: "quest_active_all_steps_done"; questId: string }
  /**
   * Active quest whose **current** step is `talk_to_npc` and targets this dialogue NPC
   * (requires {@link DialogueNpcSessionPickContext.dialogueNpc} + `getQuestDefinition`).
   */
  | { type: "quest_active_on_matching_talk_step"; questId: string }
  /**
   * Quest is active; the **last authored step** is `talk_to_npc` for this NPC; and the player is
   * either on that step or has cleared all objectives (`step >= steps.length`) while completion is
   * still pending. Use with `completeQuestId` on the same session so finale lines show on open and
   * the completion pick after the talk step advances still matches.
   */
  | { type: "quest_active_final_talk_turn_in"; questId: string };

/** Optional context when evaluating conditions that need authored quest definitions (step count). */
export type DialogueNpcSessionPickContext = {
  getQuestStepCount?: (questId: string) => number | undefined;
  getQuestDefinition?: (questId: string) => WorldMapQuestDefinition | undefined;
  /** Identity of the NPC whose session is being picked (for talk-step matching). */
  dialogueNpc?: { displayName: string; npcKey: string };
};

/**
 * When a session matches the player's quest state.
 * Non-default branches use `{ type: "all", conditions }` (every atomic must match).
 * Session list order matters (last matching non-default wins): see `pickDialogueNpcSession`.
 */
export type DialogueNpcCondition =
  | { type: "always" }
  | { type: "all"; conditions: DialogueNpcAtomicCondition[] };

/** One dialog branch: lines, optional grant on close, optional complete on close. */
export interface WorldMapDialogueNpcSession {
  /** Omit or `always` = default branch (should be last in the list). */
  when?: DialogueNpcCondition;
  lines: string[];
  grantQuestId?: string | null;
  completeQuestId?: string | null;
  /** When true, server restores interacting player to full HP and stamina after dialog ends. */
  healOnDialogueComplete?: boolean;
  /**
   * Editor-only: stable key shared by grouped dialogue states (see {@link WorldMapDialogueNpcEntry.editorGroups}).
   * Omitted from replicated payloads via {@link dialogueNpcSessionsToSerialized}.
   */
  editorGroupId?: string;
  /**
   * @deprecated Loaded from legacy map JSON only; stripped in {@link normalizeDialogueNpcs}. Use
   * {@link editorGroupId} + {@link WorldMapDialogueNpcEntry.editorGroups}.
   */
  editorGroup?: string;
}

/** Editor-only labels for non-dialogue spawner tiles (zombies, items, etc.). */
export interface WorldMapSpawnerMetaEntry {
  row: number;
  col: number;
  name?: string;
  /** Seconds between respawns for this fixture; omit to use registry / zombie-type defaults. */
  respawnIntervalSec?: number;
}

const SPAWNER_META_NAME_MAX = 48;

/** Inclusive bounds for authored `respawnIntervalSec` (whole seconds). */
export const SPAWNER_META_RESPAWN_INTERVAL_SEC_MIN = 1;
export const SPAWNER_META_RESPAWN_INTERVAL_SEC_MAX = 3600;

function clampSpawnerMetaRespawnSec(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  const n = Math.round(raw);
  if (
    n < SPAWNER_META_RESPAWN_INTERVAL_SEC_MIN ||
    n > SPAWNER_META_RESPAWN_INTERVAL_SEC_MAX
  ) {
    return undefined;
  }
  return n;
}

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
    const respawnIntervalSec = clampSpawnerMetaRespawnSec(
      (e as WorldMapSpawnerMetaEntry).respawnIntervalSec,
    );
    const entry: WorldMapSpawnerMetaEntry = {
      row,
      col,
      ...(name !== undefined ? { name } : {}),
      ...(respawnIntervalSec !== undefined ? { respawnIntervalSec } : {}),
    };
    if (entry.name === undefined && entry.respawnIntervalSec === undefined) {
      continue;
    }
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
      if (id > 0 && !isNpcDialogueSpawnTile(id)) {
        eligible.add(`${r},${c}`);
      }
    }
  }
  return normalized.filter((e) => eligible.has(`${e.row},${e.col}`));
}

/** Optional authored dialogue NPCs (spawns layer uses dialogue NPC tile ids from spawn-palette). */
export interface WorldMapDialogueNpcEntry {
  row: number;
  col: number;
  /** Ordered branches; when several match, the last in the list wins. Prefer over legacy flat fields. */
  dialogueSessions?: WorldMapDialogueNpcSession[];
  /** Legacy single block; migrated into `dialogueSessions` when missing. */
  message?: string;
  /** Legacy; mirrored from default session for older tooling. */
  lines?: string[];
  name?: string;
  grantQuestId?: string | null;
  /**
   * Editor-only: display name for each {@link WorldMapDialogueNpcSession.editorGroupId}. Not replicated.
   */
  editorGroups?: Record<string, string>;
}

/**
 * Editor-only NPC grouping; persisted in `world-map-quests.json` as `dialogueNpcEditorMetadata` so it
 * reloads with the quest sidecar (map editor). Not used at runtime.
 */
export type WorldMapDialogueNpcEditorMetadata = {
  row: number;
  col: number;
  editorGroups?: Record<string, string>;
  /** Same order as dialogue sessions on this tile; null clears an id for that index. */
  sessionEditorGroupIds?: (string | null)[];
  /**
   * Full authored `dialogueSessions` snapshot for this tile (editor-only). Restored before
   * normalize so session order and grouping survive even if `world-map-npcs.json` drifts.
   */
  editorDialogueSessions?: Record<string, unknown>[];
};

function isDefaultCondition(when: DialogueNpcCondition | undefined): boolean {
  return when == null || when.type === "always";
}

export function atomicConditionMatches(
  c: DialogueNpcAtomicCondition,
  st: PlayerQuestStatePayload,
  hasItemType: (itemType: string) => boolean,
  ctx?: DialogueNpcSessionPickContext,
): boolean {
  switch (c.type) {
    case "quest_completed":
      return st.completed.includes(c.questId);
    case "quest_active":
      return st.active[c.questId] !== undefined;
    case "quest_not_active":
      return st.active[c.questId] === undefined;
    case "quest_not_completed":
      return !st.completed.includes(c.questId);
    case "quest_active_and_has_item":
      return st.active[c.questId] !== undefined && hasItemType(c.itemType);
    case "quest_active_all_steps_done": {
      if (st.active[c.questId] === undefined) return false;
      const total = ctx?.getQuestStepCount?.(c.questId);
      if (total === undefined) return false;
      return getActiveStepIndex(st, c.questId) >= total;
    }
    case "quest_active_on_matching_talk_step": {
      if (st.active[c.questId] === undefined) return false;
      const def = ctx?.getQuestDefinition?.(c.questId);
      const npc = ctx?.dialogueNpc;
      if (!def || def.steps.length === 0 || !npc) return false;
      const idx = getActiveStepIndex(st, c.questId);
      if (idx !== def.steps.length - 1) return false;
      const step = def.steps[idx];
      if (!step || step.type !== "talk_to_npc") return false;
      return talkToNpcStepMatchesNpc(step, npc.displayName, npc.npcKey);
    }
    case "quest_active_final_talk_turn_in": {
      if (st.active[c.questId] === undefined) return false;
      const def = ctx?.getQuestDefinition?.(c.questId);
      const npc = ctx?.dialogueNpc;
      if (!def || def.steps.length === 0 || !npc) return false;
      const lastIdx = def.steps.length - 1;
      const lastStep = def.steps[lastIdx];
      if (!lastStep || lastStep.type !== "talk_to_npc") return false;
      if (!talkToNpcStepMatchesNpc(lastStep, npc.displayName, npc.npcKey)) return false;
      const idx = getActiveStepIndex(st, c.questId);
      return idx === lastIdx || idx >= def.steps.length;
    }
    default: {
      const _exhaustive: never = c;
      return _exhaustive;
    }
  }
}

function conditionMatchesNonDefault(
  when: DialogueNpcCondition,
  st: PlayerQuestStatePayload,
  hasItemType: (itemType: string) => boolean,
  ctx?: DialogueNpcSessionPickContext,
): boolean {
  if (when.type === "always") return false;
  return when.conditions.every((c) => atomicConditionMatches(c, st, hasItemType, ctx));
}

/**
 * Picks the dialog branch for the player's quest (and optional inventory) state.
 *
 * **Last match wins (non-default):** sessions are scanned in order; each non-default session whose
 * `when` matches updates the candidate. The **last** such session in the array is returned. Put
 * **broader** conditions **earlier** and **stricter / progression** branches **later** so the
 * intended line wins when multiple branches match at once. The default / `always` fallback should
 * stay **last**; if no non-default matches, the **last** default branch in the list is used.
 *
 * @param hasItemType Bag + equipment (server `Inventory.hasItem`); omit or return false when unknown (e.g. editor preview).
 * @param ctx Optional quest catalog for `quest_active_all_steps_done` / `quest_active_on_matching_talk_step` /
 *   `quest_active_final_talk_turn_in`; if omitted, those conditions never match.
 */
export function pickDialogueNpcSession(
  sessions: WorldMapDialogueNpcSession[],
  st: PlayerQuestStatePayload,
  hasItemType: (itemType: string) => boolean = () => false,
  ctx?: DialogueNpcSessionPickContext,
): WorldMapDialogueNpcSession {
  if (sessions.length === 0) {
    return { when: { type: "always" }, lines: ["…"] };
  }
  let candidate: WorldMapDialogueNpcSession | undefined;
  for (const s of sessions) {
    const w = s.when;
    if (!isDefaultCondition(w) && w && conditionMatchesNonDefault(w, st, hasItemType, ctx)) {
      candidate = s;
    }
  }
  if (candidate !== undefined) {
    return candidate;
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

/**
 * Sets spawns-layer cells for every authored dialogue NPC to the stable tile ids (250 / 251).
 * Run after loading world-map.json so coordinates in `dialogueNpcs` always match NPC markers even when
 * historic maps used dynamic ids that now overlap item fixtures (e.g. last item slot vs old NPC id).
 */
export function rewriteSpawnsLayerDialogueNpcTiles(
  spawns: number[][],
  dialogueNpcs: WorldMapDialogueNpcEntry[],
): void {
  for (const e of dialogueNpcs) {
    const row = e.row;
    const col = e.col;
    if (row < 0 || col < 0 || row >= spawns.length) continue;
    const rowArr = spawns[row];
    if (!rowArr || col >= rowArr.length) continue;
    const isHealer = getDialogueNpcSessions(e).some((s) => s.healOnDialogueComplete === true);
    rowArr[col] = isHealer
      ? NPC_HEALER_DIALOGUE_SPAWN_TILE_ID
      : NPC_DIALOGUE_SURVIVOR_SPAWN_TILE_ID;
  }
}

/** Plain-object sessions for entity replication (JSON-serializable). */
export type DialogueNpcSessionSerialized = {
  when?: DialogueNpcCondition;
  lines: string[];
  grantQuestId?: string;
  completeQuestId?: string;
  healOnDialogueComplete?: boolean;
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
      ...(s.healOnDialogueComplete === true ? { healOnDialogueComplete: true } : {}),
    };
    return out;
  });
}

function parseAtomicConditionFromUnknown(raw: unknown): DialogueNpcAtomicCondition | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const w = raw as Record<string, unknown>;
  const t = w.type;
  if (
    t === "quest_completed" ||
    t === "quest_active" ||
    t === "quest_not_active" ||
    t === "quest_not_completed" ||
    t === "quest_active_all_steps_done" ||
    t === "quest_active_on_matching_talk_step" ||
    t === "quest_active_final_talk_turn_in"
  ) {
    const qid = String(w.questId ?? "")
      .trim()
      .slice(0, QUEST_ID_FIELD_MAX);
    if (!qid) return null;
    return { type: t, questId: qid };
  }
  if (t === "quest_active_and_has_item") {
    const qid = String(w.questId ?? "")
      .trim()
      .slice(0, QUEST_ID_FIELD_MAX);
    const itemType = String(w.itemType ?? "")
      .trim()
      .slice(0, QUEST_ID_FIELD_MAX);
    if (!qid || !itemType) return null;
    return { type: "quest_active_and_has_item", questId: qid, itemType };
  }
  return null;
}

export function newDialogueNpcEditorGroupId(): string {
  return `dg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseEditorGroupsRecord(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(k).trim().slice(0, DIALOGUE_NPC_EDITOR_GROUP_MAX);
    if (!id) continue;
    if (typeof v !== "string") continue;
    // Do not trim labels: the map editor normalizes on every keystroke; trimming would strip
    // trailing spaces while typing (e.g. "The " → "The") and break paste of spaced text.
    const label = v.slice(0, DIALOGUE_NPC_EDITOR_GROUP_MAX);
    if (!label) continue;
    out[id] = label;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Drop groups with 0–1 members; strip orphan ids from sessions. */
export function pruneDialogueNpcEditorGroups(
  sessions: WorldMapDialogueNpcSession[],
  editorGroups: Record<string, string> | undefined,
): {
  sessions: WorldMapDialogueNpcSession[];
  editorGroups: Record<string, string> | undefined;
} {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (s.editorGroupId) {
      counts.set(s.editorGroupId, (counts.get(s.editorGroupId) ?? 0) + 1);
    }
  }
  const nextSessions = sessions.map((s) => {
    if (!s.editorGroupId) return s;
    if ((counts.get(s.editorGroupId) ?? 0) <= 1) {
      const { editorGroupId: _id, ...rest } = s;
      return rest as WorldMapDialogueNpcSession;
    }
    return s;
  });
  if (!editorGroups || Object.keys(editorGroups).length === 0) {
    return { sessions: nextSessions, editorGroups: undefined };
  }
  const nextGroups: Record<string, string> = { ...editorGroups };
  for (const id of Object.keys(nextGroups)) {
    if ((counts.get(id) ?? 0) <= 1) delete nextGroups[id];
  }
  return Object.keys(nextGroups).length > 0
    ? { sessions: nextSessions, editorGroups: nextGroups }
    : { sessions: nextSessions, editorGroups: undefined };
}

/**
 * When the same group id appears in non-adjacent runs (e.g. after reorder), split later runs into
 * new ids with duplicated labels.
 */
export function reconcileContiguousDialogueNpcGroups(
  sessions: WorldMapDialogueNpcSession[],
  editorGroups: Record<string, string> | undefined,
): {
  sessions: WorldMapDialogueNpcSession[];
  editorGroups: Record<string, string> | undefined;
} {
  if (!sessions.length) return { sessions, editorGroups };
  let groups: Record<string, string> = { ...(editorGroups ?? {}) };
  const next = sessions.map((s) => ({ ...s }));
  const seenIds = new Set(
    next.map((s) => s.editorGroupId).filter((id): id is string => Boolean(id)),
  );
  for (const id of seenIds) {
    const indices = next.flatMap((s, i) => (s.editorGroupId === id ? [i] : []));
    const segments: number[][] = [];
    let cur: number[] = [];
    for (const idx of indices) {
      if (cur.length === 0 || idx === cur[cur.length - 1]! + 1) cur.push(idx);
      else {
        segments.push(cur);
        cur = [idx];
      }
    }
    if (cur.length) segments.push(cur);
    if (segments.length <= 1) continue;
    const label = (groups[id] ?? "Group").slice(0, DIALOGUE_NPC_EDITOR_GROUP_MAX);
    for (let si = 1; si < segments.length; si++) {
      const newId = newDialogueNpcEditorGroupId();
      groups[newId] = label;
      for (const idx of segments[si]!) {
        next[idx] = { ...next[idx]!, editorGroupId: newId };
      }
    }
  }
  return { sessions: next, editorGroups: groups };
}

type SessionWithLegacyGroup = WorldMapDialogueNpcSession & { editorGroup?: string };

function migrateLegacyEditorGroupLabelsToIds(
  sessions: SessionWithLegacyGroup[],
  editorGroups: Record<string, string> | undefined,
): { sessions: WorldMapDialogueNpcSession[]; editorGroups: Record<string, string> | undefined } {
  const groups: Record<string, string> = { ...(editorGroups ?? {}) };
  const next: WorldMapDialogueNpcSession[] = sessions.map((s) => {
    const { editorGroup: _legacy, ...rest } = s;
    return { ...rest };
  });
  let i = 0;
  while (i < sessions.length) {
    const raw = sessions[i]?.editorGroup?.trim();
    if (!raw || sessions[i]?.editorGroupId) {
      i++;
      continue;
    }
    let j = i;
    while (
      j < sessions.length &&
      sessions[j]?.editorGroup?.trim() === raw &&
      !sessions[j]?.editorGroupId
    ) {
      j++;
    }
    const id = newDialogueNpcEditorGroupId();
    groups[id] = raw.slice(0, DIALOGUE_NPC_EDITOR_GROUP_MAX);
    for (let k = i; k < j; k++) {
      next[k] = { ...next[k]!, editorGroupId: id };
    }
    i = j;
  }
  return Object.keys(groups).length > 0
    ? { sessions: next, editorGroups: groups }
    : { sessions: next, editorGroups: undefined };
}

function stripDeprecatedEditorGroupField(
  sessions: WorldMapDialogueNpcSession[],
): WorldMapDialogueNpcSession[] {
  return sessions.map((s) => {
    const x = s as SessionWithLegacyGroup;
    if (x.editorGroup === undefined) return s;
    const { editorGroup: _, ...rest } = x;
    return rest as WorldMapDialogueNpcSession;
  });
}

/** Normalize editor-only grouping metadata on loaded NPC entries (map JSON). */
export function finalizeDialogueNpcEditorMetadata(
  sessions: WorldMapDialogueNpcSession[],
  editorGroups: Record<string, string> | undefined,
): {
  sessions: WorldMapDialogueNpcSession[];
  editorGroups: Record<string, string> | undefined;
} {
  const withLegacy = sessions as SessionWithLegacyGroup[];
  let mig = migrateLegacyEditorGroupLabelsToIds(withLegacy, editorGroups);
  let next = stripDeprecatedEditorGroupField(mig.sessions);
  let groups = mig.editorGroups;
  const reconciled = reconcileContiguousDialogueNpcGroups(next, groups);
  next = reconciled.sessions;
  groups = reconciled.editorGroups;
  return pruneDialogueNpcEditorGroups(next, groups);
}

function parseWhenFromSerialized(rawWhen: unknown): DialogueNpcCondition | undefined {
  if (!rawWhen || typeof rawWhen !== "object" || Array.isArray(rawWhen)) return undefined;
  const w = rawWhen as Record<string, unknown>;
  const t = w.type;
  if (t === "always") return { type: "always" };
  if (t !== "all") return undefined;
  const rawConds = w.conditions;
  if (!Array.isArray(rawConds)) return undefined;
  const conditions: DialogueNpcAtomicCondition[] = [];
  for (const c of rawConds) {
    if (conditions.length >= DIALOGUE_NPC_MAX_AND_CLAUSES) break;
    const a = parseAtomicConditionFromUnknown(c);
    if (a) conditions.push(a);
  }
  if (conditions.length === 0) return undefined;
  return { type: "all", conditions };
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
    const when = parseWhenFromSerialized(o.when);
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
    const healOnDialogueComplete = o.healOnDialogueComplete === true ? true : undefined;
    let editorGroupId: string | undefined;
    const rawGid = o.editorGroupId;
    if (typeof rawGid === "string" && rawGid.trim()) {
      editorGroupId = rawGid.trim().slice(0, DIALOGUE_NPC_EDITOR_GROUP_MAX);
    }
    let editorGroupLegacy: string | undefined;
    const rawGroup = o.editorGroup;
    if (typeof rawGroup === "string" && rawGroup.trim()) {
      editorGroupLegacy = rawGroup.trim().slice(0, DIALOGUE_NPC_EDITOR_GROUP_MAX);
    }
    out.push({
      ...(when ? { when } : {}),
      lines,
      ...(grantQuestId !== undefined ? { grantQuestId } : {}),
      ...(completeQuestId !== undefined ? { completeQuestId } : {}),
      ...(healOnDialogueComplete ? { healOnDialogueComplete: true } : {}),
      ...(editorGroupId !== undefined ? { editorGroupId } : {}),
      ...(editorGroupLegacy !== undefined ? { editorGroup: editorGroupLegacy } : {}),
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
    let editorGroups = parseEditorGroupsRecord((e as Record<string, unknown>).editorGroups);
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
    const finalized = finalizeDialogueNpcEditorMetadata(sessions, editorGroups);
    sessions = finalized.sessions;
    editorGroups = finalized.editorGroups;
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
      ...(editorGroups && Object.keys(editorGroups).length > 0 ? { editorGroups } : {}),
    });
  }
  return out;
}

/** Read `dialogueNpcEditorMetadata` from parsed world-map-quests.json (or any object). */
export function parseDialogueNpcEditorMetadataFromQuestsSidecar(
  questsSidecarJson: unknown,
): WorldMapDialogueNpcEditorMetadata[] {
  if (
    questsSidecarJson == null ||
    typeof questsSidecarJson !== "object" ||
    Array.isArray(questsSidecarJson)
  ) {
    return [];
  }
  const raw = (questsSidecarJson as { dialogueNpcEditorMetadata?: unknown })
    .dialogueNpcEditorMetadata;
  if (!Array.isArray(raw)) return [];
  const out: WorldMapDialogueNpcEditorMetadata[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.row !== "number" || typeof o.col !== "number") continue;
    const row = Math.trunc(o.row);
    const col = Math.trunc(o.col);
    const meta: WorldMapDialogueNpcEditorMetadata = { row, col };
    const egRaw = o.editorGroups;
    if (egRaw && typeof egRaw === "object" && !Array.isArray(egRaw)) {
      const eg = parseEditorGroupsRecord(egRaw);
      if (eg && Object.keys(eg).length > 0) meta.editorGroups = eg;
    }
    const sid = o.sessionEditorGroupIds;
    if (Array.isArray(sid)) {
      const ids: (string | null)[] = [];
      for (const x of sid) {
        if (x === null) ids.push(null);
        else if (typeof x === "string") {
          const t = x.trim().slice(0, DIALOGUE_NPC_EDITOR_GROUP_MAX);
          ids.push(t === "" ? null : t);
        } else ids.push(null);
      }
      if (ids.some((x) => x != null)) meta.sessionEditorGroupIds = ids;
    }
    const eds = o.editorDialogueSessions;
    if (Array.isArray(eds) && eds.length > 0) {
      const clones: Record<string, unknown>[] = [];
      for (const sess of eds) {
        if (sess && typeof sess === "object" && !Array.isArray(sess)) {
          clones.push({ ...(sess as Record<string, unknown>) });
        }
      }
      if (clones.length > 0) meta.editorDialogueSessions = clones;
    }
    out.push(meta);
  }
  return out;
}

/**
 * Merge editor grouping from the quests sidecar into raw `dialogueNpcs` before {@link normalizeDialogueNpcs}.
 */
export function applyDialogueNpcEditorMetadataToRawDialogueNpcs(
  dialogueNpcs: unknown,
  meta: WorldMapDialogueNpcEditorMetadata[],
): unknown {
  if (!Array.isArray(dialogueNpcs) || meta.length === 0) return dialogueNpcs;
  const byMeta = new Map<string, WorldMapDialogueNpcEditorMetadata>();
  for (const m of meta) {
    byMeta.set(`${m.row},${m.col}`, m);
  }
  return dialogueNpcs.map((e) => {
    if (!e || typeof e !== "object") return e;
    const rec = e as Record<string, unknown>;
    const row = rec.row;
    const col = rec.col;
    if (typeof row !== "number" || typeof col !== "number") return e;
    const m = byMeta.get(`${row},${col}`);
    if (!m) return e;
    const next: Record<string, unknown> = { ...rec };
    if (m.editorGroups && Object.keys(m.editorGroups).length > 0) {
      next.editorGroups = { ...m.editorGroups };
    }
    if (m.editorDialogueSessions && m.editorDialogueSessions.length > 0) {
      next.dialogueSessions = m.editorDialogueSessions.map((s) =>
        s && typeof s === "object" && !Array.isArray(s)
          ? { ...(s as Record<string, unknown>) }
          : s,
      );
      return next;
    }
    const sessions = next.dialogueSessions;
    if (Array.isArray(sessions) && m.sessionEditorGroupIds?.length) {
      next.dialogueSessions = sessions.map((s, i) => {
        if (!s || typeof s !== "object") return s;
        const sid = m.sessionEditorGroupIds!;
        if (i >= sid.length) return s;
        const gid = sid[i];
        const sess: Record<string, unknown> = { ...(s as Record<string, unknown>) };
        if (gid === null || gid === undefined) {
          delete sess.editorGroupId;
        } else {
          sess.editorGroupId = gid;
        }
        return sess;
      });
    }
    return next;
  });
}

function cloneDialogueSessionsForEditorMeta(
  sessions: WorldMapDialogueNpcSession[],
): Record<string, unknown>[] {
  return sessions.map((s) => {
    const o: Record<string, unknown> = {
      lines: s.lines.map((l) => String(l)),
    };
    if (s.when) o.when = s.when;
    if (s.grantQuestId !== undefined) o.grantQuestId = s.grantQuestId;
    if (s.completeQuestId !== undefined) o.completeQuestId = s.completeQuestId;
    if (s.healOnDialogueComplete) o.healOnDialogueComplete = true;
    if (s.editorGroupId) o.editorGroupId = s.editorGroupId;
    return o;
  });
}

/** Snapshot editor-only grouping for `world-map-quests.json`. */
export function extractDialogueNpcEditorMetadataForQuestsJson(
  entries: WorldMapDialogueNpcEntry[] | undefined,
): WorldMapDialogueNpcEditorMetadata[] {
  if (!entries?.length) return [];
  const out: WorldMapDialogueNpcEditorMetadata[] = [];
  for (const e of entries) {
    const sessions = getDialogueNpcSessions(e);
    const sessionEditorGroupIds = sessions.map((s) => s.editorGroupId ?? null);
    const hasSessionIds = sessionEditorGroupIds.some((id) => id != null);
    const eg = e.editorGroups;
    const hasEg = eg && Object.keys(eg).length > 0;
    const hasMultiSession = sessions.length > 1;
    if (!hasSessionIds && !hasEg && !hasMultiSession) continue;
    out.push({
      row: e.row,
      col: e.col,
      ...(hasEg ? { editorGroups: { ...eg } } : {}),
      ...(hasSessionIds ? { sessionEditorGroupIds } : {}),
      editorDialogueSessions: cloneDialogueSessionsForEditorMeta(sessions),
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
