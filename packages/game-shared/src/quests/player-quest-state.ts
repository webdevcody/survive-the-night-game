import type { WorldMapQuestDefinition } from "../map/quest-types";

/** One active quest’s persisted progress (step index + optional partial objective counters). */
export interface QuestActiveProgress {
  step: number;
  /** Kill tallies toward the current kill step; cleared when the step advances. */
  kills?: Record<string, number>;
}

/** Persisted / replicated player quest progress (JSON-serializable). */
export interface PlayerQuestStatePayload {
  /**
   * questId → progress. `step` is the 0-based step index while objectives remain.
   * When equal to that quest’s `steps.length`, all objectives are done. What happens next depends on
   * the quest’s `completionType` (`dialogue_npc` vs `final_step`); see game-server quest runtime.
   */
  active: Record<string, QuestActiveProgress>;
  completed: string[];
}

export function emptyPlayerQuestState(): PlayerQuestStatePayload {
  return { active: {}, completed: [] };
}

function parseKillCounts(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== "string" || !k) continue;
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Coerce a single active-quest value from DB / legacy saves (step-only number or object). */
export function normalizeActiveEntry(raw: unknown): QuestActiveProgress | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) {
    return { step: raw };
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const step = o.step;
    if (typeof step === "number" && Number.isInteger(step) && step >= 0) {
      const kills = parseKillCounts(o.kills);
      return kills ? { step, kills } : { step };
    }
  }
  return null;
}

function parseActiveRecord(raw: unknown): Record<string, QuestActiveProgress> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, QuestActiveProgress> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== "string") continue;
    const e = normalizeActiveEntry(v);
    if (e) out[k] = e;
  }
  return out;
}

export function getActiveStepIndex(st: PlayerQuestStatePayload, qid: string): number {
  return st.active[qid]?.step ?? 0;
}

export function stringifyPlayerQuestState(s: PlayerQuestStatePayload): string {
  const active: Record<string, QuestActiveProgress> = {};
  for (const [qid, e] of Object.entries(s.active)) {
    if (e.kills && Object.keys(e.kills).length > 0) {
      active[qid] = { step: e.step, kills: e.kills };
    } else {
      active[qid] = { step: e.step };
    }
  }
  return JSON.stringify({
    active,
    completed: s.completed,
  });
}

export function parsePlayerQuestState(raw: unknown): PlayerQuestStatePayload {
  if (raw == null || raw === "") return emptyPlayerQuestState();
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return coercePlayerQuestState(raw);
  }
  if (typeof raw !== "string" || raw.trim() === "") return emptyPlayerQuestState();
  try {
    const o = JSON.parse(raw) as Partial<PlayerQuestStatePayload>;
    const completed = Array.isArray(o.completed)
      ? o.completed.filter((id): id is string => typeof id === "string")
      : [];
    return { active: parseActiveRecord(o.active), completed };
  } catch {
    return emptyPlayerQuestState();
  }
}

/** Normalize quest JSON from DB (jsonb object) or parsed string. */
export function coercePlayerQuestState(raw: unknown): PlayerQuestStatePayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyPlayerQuestState();
  }
  const o = raw as Partial<PlayerQuestStatePayload>;
  const completed = Array.isArray(o.completed)
    ? o.completed.filter((id): id is string => typeof id === "string")
    : [];
  return { active: parseActiveRecord(o.active), completed };
}

export function activeQuestProgressEquals(a: QuestActiveProgress, b: QuestActiveProgress): boolean {
  if (a.step !== b.step) return false;
  const ak = a.kills;
  const bk = b.kills;
  if (!ak && !bk) return true;
  if (!ak || !bk) return false;
  const keys = new Set([...Object.keys(ak), ...Object.keys(bk)]);
  for (const k of keys) {
    if ((ak[k] ?? 0) !== (bk[k] ?? 0)) return false;
  }
  return true;
}

/**
 * Clamp step to `0..steps.length` and align kill tallies with the **current** step’s kill objective
 * (after map/quest edits: added/removed steps, changed counts, or changed step types).
 */
export function sanitizeActiveProgressAgainstQuestDefinition(
  entry: QuestActiveProgress,
  def: WorldMapQuestDefinition,
): QuestActiveProgress {
  const maxStep = def.steps.length;
  let step = entry.step;
  if (typeof step !== "number" || !Number.isInteger(step) || step < 0) {
    step = 0;
  } else {
    step = Math.min(step, maxStep);
  }

  if (step >= maxStep) {
    return { step };
  }

  const cur = def.steps[step];
  if (cur && cur.type === "kill_enemies") {
    const et = cur.enemyType;
    const need = Math.floor(Number(cur.count));
    if (Number.isFinite(need) && need >= 1) {
      const raw = entry.kills?.[et] ?? 0;
      const capped = Math.max(0, Math.min(raw, need - 1));
      if (capped > 0) {
        return { step, kills: { [et]: capped } };
      }
    }
  }

  return { step };
}

/**
 * Mutates {@link PlayerQuestStatePayload.active} for each entry whose quest id exists in `defById`.
 * @returns Whether any active entry changed.
 */
export function sanitizePlayerQuestActiveEntriesAgainstDefinitions(
  st: PlayerQuestStatePayload,
  defById: ReadonlyMap<string, WorldMapQuestDefinition>,
): boolean {
  let changed = false;
  for (const qid of Object.keys(st.active)) {
    const def = defById.get(qid);
    if (!def) continue;
    const prev = st.active[qid]!;
    const next = sanitizeActiveProgressAgainstQuestDefinition(prev, def);
    if (!activeQuestProgressEquals(prev, next)) {
      st.active[qid] = next;
      changed = true;
    }
  }
  return changed;
}
