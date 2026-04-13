import type { EntityType } from "../types/entity";

export const QUEST_ID_MAX_LENGTH = 64;
export const QUEST_TITLE_MAX_LENGTH = 120;
export const QUEST_MAX_STEPS = 32;
export const QUEST_MAX_REWARDS = 8;
/** Matches dialogue NPC `name` / serialized `displayName` (trimmed). */
export const QUEST_TALK_NPC_NAME_MAX_LENGTH = 48;
/** Inclusive max for `kill_enemies.count` when normalizing map JSON. */
export const QUEST_KILL_ENEMIES_COUNT_MAX = 500;

/** Single objective in an authored quest. */
export type QuestStep =
  | { type: "pickup_item"; itemType: EntityType }
  | { type: "reach_waypoint"; row: number; col: number; radiusTiles?: number }
  | { type: "kill_enemies"; enemyType: EntityType; count: number }
  | {
      type: "talk_to_npc";
      /** Must match the NPC's authored display name (same as map entry `name`). */
      npcName?: string;
      /** Optional `row,col` (tile Y,X) — same encoding as entity `npcKey`; use to disambiguate duplicate names. */
      npcKey?: string;
    };

/** Quest rewards; `experience` is persisted to website `user_stats.experience`. */
export type QuestReward =
  | { type: "permanent_stat"; stat: string; amount: number }
  | { type: "item"; itemType: EntityType; count: number }
  | { type: "experience"; amount: number };

/**
 * How completion rewards are applied after all objectives are cleared (`step >= steps.length`).
 * - `dialogue_npc`: player must close an NPC dialogue whose session has `completeQuestId` (legacy).
 * - `final_step`: rewards apply as soon as the last step is satisfied (no turn-in dialogue).
 */
export type QuestCompletionType = "dialogue_npc" | "final_step";

export interface WorldMapQuestDefinition {
  id: string;
  title: string;
  steps: QuestStep[];
  /**
   * Defaults to `dialogue_npc` when omitted (see {@link getQuestCompletionType}).
   */
  completionType?: QuestCompletionType;
  /** Granted when the quest completes (see `completionType`). */
  rewards: QuestReward[];
  /** Granted once when the quest becomes active (e.g. NPC grants it). */
  startRewards: QuestReward[];
  /**
   * Map editor only: when true, the quest list uses main-quest styling (color).
   * Omitted or false = side quest styling. Not read by game runtime.
   */
  editorIsMainQuest?: boolean;
}

export function getQuestCompletionType(def: WorldMapQuestDefinition): QuestCompletionType {
  return def.completionType === "final_step" ? "final_step" : "dialogue_npc";
}

function clampString(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Starter quest shape used by editor flows so a freshly created quest is immediately valid and
 * won't get stuck as a zero-step entry if it is assigned to an NPC before further editing.
 */
export function createQuestDefinitionDraft(
  id: string,
  title: string = "New quest",
): WorldMapQuestDefinition {
  const safeId = clampString(String(id ?? "").trim() || "quest", QUEST_ID_MAX_LENGTH);
  const safeTitle = clampString(String(title ?? "").trim() || "New quest", QUEST_TITLE_MAX_LENGTH);

  return {
    id: safeId,
    title: safeTitle,
    steps: [{ type: "pickup_item", itemType: "bandage" as EntityType }],
    completionType: "dialogue_npc",
    rewards: [],
    startRewards: [],
  };
}

function normalizeQuestStep(raw: unknown, mapSide: number): QuestStep | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const t = o.type;
  if (t === "pickup_item") {
    const itemType = String(o.itemType ?? "");
    if (!itemType) return null;
    return { type: "pickup_item", itemType: itemType as EntityType };
  }
  if (t === "reach_waypoint") {
    const row = o.row;
    const col = o.col;
    if (typeof row !== "number" || typeof col !== "number") return null;
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    if (row < 0 || col < 0 || row >= mapSide || col >= mapSide) return null;
    let radiusTiles: number | undefined;
    const rawR = o.radiusTiles;
    if (rawR !== undefined && rawR !== null) {
      if (typeof rawR !== "number" || !Number.isFinite(rawR)) return null;
      radiusTiles = Math.max(1, Math.min(8, Math.floor(rawR)));
    }
    if (radiusTiles !== undefined) {
      return { type: "reach_waypoint", row, col, radiusTiles };
    }
    return { type: "reach_waypoint", row, col };
  }
  if (t === "talk_to_npc") {
    const nameRaw = o.npcName ?? o.name;
    const name =
      typeof nameRaw === "string"
        ? clampString(nameRaw.trim(), QUEST_TALK_NPC_NAME_MAX_LENGTH)
        : "";
    let npcKey: string | undefined;
    const keyRaw = o.npcKey;
    if (typeof keyRaw === "string" && keyRaw.trim()) {
      const parts = keyRaw.trim().split(",");
      if (parts.length === 2) {
        const row = Number.parseInt(parts[0]!, 10);
        const col = Number.parseInt(parts[1]!, 10);
        if (
          Number.isInteger(row) &&
          Number.isInteger(col) &&
          row >= 0 &&
          col >= 0 &&
          row < mapSide &&
          col < mapSide
        ) {
          npcKey = `${row},${col}`;
        }
      }
    }
    if (!name && !npcKey) return null;
    return {
      type: "talk_to_npc",
      ...(name ? { npcName: name } : {}),
      ...(npcKey ? { npcKey } : {}),
    };
  }
  if (t === "kill_enemies") {
    const enemyType = String(o.enemyType ?? "").trim();
    if (!enemyType) return null;
    const countRaw = o.count;
    if (typeof countRaw !== "number" || !Number.isFinite(countRaw)) return null;
    const count = Math.max(1, Math.min(QUEST_KILL_ENEMIES_COUNT_MAX, Math.floor(countRaw)));
    return { type: "kill_enemies", enemyType: enemyType as EntityType, count };
  }
  return null;
}

/** True if a `talk_to_npc` step targets this NPC (display name + optional tile key). */
export function talkToNpcStepMatchesNpc(
  step: Extract<QuestStep, { type: "talk_to_npc" }>,
  npcDisplayName: string,
  npcKey: string,
): boolean {
  const wantName = step.npcName?.trim() ?? "";
  const wantKey = step.npcKey?.trim() ?? "";
  const gotName = npcDisplayName.trim();
  const gotKey = npcKey.trim();
  if (wantName && wantKey) {
    return gotName === wantName && gotKey === wantKey;
  }
  if (wantKey) return gotKey === wantKey;
  if (wantName) return gotName === wantName;
  return false;
}

function normalizeQuestReward(raw: unknown): QuestReward | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const t = o.type;
  if (t === "permanent_stat") {
    const stat = String(o.stat ?? "");
    const amount = o.amount;
    if (!stat || typeof amount !== "number" || !Number.isFinite(amount)) return null;
    const n = Math.floor(amount);
    if (n <= 0 || n > 99) return null;
    return { type: "permanent_stat", stat, amount: n };
  }
  if (t === "item") {
    const itemType = String(o.itemType ?? "");
    const count = o.count;
    if (!itemType || typeof count !== "number" || !Number.isFinite(count)) return null;
    const c = Math.max(1, Math.min(99, Math.floor(count)));
    return { type: "item", itemType: itemType as EntityType, count: c };
  }
  if (t === "experience") {
    const amount = o.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
    const n = Math.max(1, Math.min(1_000_000, Math.floor(amount)));
    return { type: "experience", amount: n };
  }
  return null;
}

export function normalizeQuests(entries: unknown, mapSide: number): WorldMapQuestDefinition[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  const out: WorldMapQuestDefinition[] = [];
  const seenIds = new Set<string>();
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    let id = String(o.id ?? "").trim();
    if (!id) continue;
    id = clampString(id, QUEST_ID_MAX_LENGTH);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    let title = String(o.title ?? id).trim();
    title = clampString(title, QUEST_TITLE_MAX_LENGTH);
    const stepsRaw = o.steps;
    const steps: QuestStep[] = [];
    if (Array.isArray(stepsRaw)) {
      for (const s of stepsRaw) {
        if (steps.length >= QUEST_MAX_STEPS) break;
        const step = normalizeQuestStep(s, mapSide);
        if (step) steps.push(step);
      }
    }
    const rewardsRaw = o.rewards;
    const rewards: QuestReward[] = [];
    if (Array.isArray(rewardsRaw)) {
      for (const r of rewardsRaw) {
        if (rewards.length >= QUEST_MAX_REWARDS) break;
        const reward = normalizeQuestReward(r);
        if (reward) rewards.push(reward);
      }
    }
    const startRewardsRaw = o.startRewards;
    const startRewards: QuestReward[] = [];
    if (Array.isArray(startRewardsRaw)) {
      for (const r of startRewardsRaw) {
        if (startRewards.length >= QUEST_MAX_REWARDS) break;
        const reward = normalizeQuestReward(r);
        if (reward) startRewards.push(reward);
      }
    }
    const rawCt = o.completionType;
    const completionType: QuestCompletionType | undefined =
      rawCt === "final_step"
        ? "final_step"
        : rawCt === "dialogue_npc"
          ? "dialogue_npc"
          : undefined;
    const editorIsMainQuest = o.editorIsMainQuest === true;
    out.push({
      id,
      title,
      steps,
      rewards,
      startRewards,
      ...(completionType ? { completionType } : {}),
      ...(editorIsMainQuest ? { editorIsMainQuest: true } : {}),
    });
  }
  return out;
}
