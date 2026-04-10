import type { EntityType } from "../types/entity";

export const QUEST_ID_MAX_LENGTH = 64;
export const QUEST_TITLE_MAX_LENGTH = 120;
export const QUEST_MAX_STEPS = 32;
export const QUEST_MAX_REWARDS = 8;

/** Single objective in an authored quest. */
export type QuestStep =
  | { type: "pickup_item"; itemType: EntityType }
  | { type: "reach_waypoint"; row: number; col: number; radiusTiles?: number };

export type QuestReward =
  | { type: "permanent_stat"; stat: string; amount: number }
  | { type: "item"; itemType: EntityType; count: number };

export interface WorldMapQuestDefinition {
  id: string;
  title: string;
  steps: QuestStep[];
  rewards: QuestReward[];
}

function clampString(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
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
  /** Legacy `talk_to_npc` steps are dropped (use NPC dialog `completeQuestId` instead). */
  if (t === "talk_to_npc") {
    return null;
  }
  return null;
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
    out.push({ id, title, steps, rewards });
  }
  return out;
}
