/** Persisted / replicated player quest progress (JSON-serializable). */
export interface PlayerQuestStatePayload {
  /** questId → current step index (0-based). */
  active: Record<string, number>;
  completed: string[];
}

export function emptyPlayerQuestState(): PlayerQuestStatePayload {
  return { active: {}, completed: [] };
}

export function parsePlayerQuestState(raw: unknown): PlayerQuestStatePayload {
  if (raw == null || raw === "") return emptyPlayerQuestState();
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return coercePlayerQuestState(raw);
  }
  if (typeof raw !== "string" || raw.trim() === "") return emptyPlayerQuestState();
  try {
    const o = JSON.parse(raw) as Partial<PlayerQuestStatePayload>;
    const active =
      o.active && typeof o.active === "object" && !Array.isArray(o.active)
        ? Object.fromEntries(
            Object.entries(o.active).filter(
              ([k, v]) => typeof k === "string" && typeof v === "number" && Number.isInteger(v),
            ),
          )
        : {};
    const completed = Array.isArray(o.completed)
      ? o.completed.filter((id): id is string => typeof id === "string")
      : [];
    return { active, completed };
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
  const active =
    o.active && typeof o.active === "object" && !Array.isArray(o.active)
      ? Object.fromEntries(
          Object.entries(o.active).filter(
            ([k, v]) => typeof k === "string" && typeof v === "number" && Number.isInteger(v),
          ),
        )
      : {};
  const completed = Array.isArray(o.completed)
    ? o.completed.filter((id): id is string => typeof id === "string")
    : [];
  return { active, completed };
}

export function stringifyPlayerQuestState(s: PlayerQuestStatePayload): string {
  return JSON.stringify({
    active: s.active,
    completed: s.completed,
  });
}
