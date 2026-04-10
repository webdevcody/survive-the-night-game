import { useLayoutEffect, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import {
  itemRegistry,
  resourceRegistry,
  weaponRegistry,
} from "@survive-the-night/game-shared/entities/index";
import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
} from "@survive-the-night/game-shared/map/spawn-palette";
import type { WorldMapQuestDefinition } from "@survive-the-night/game-shared/map/quest-types";
import {
  DIALOGUE_NPC_MAX_AND_CLAUSES,
  DIALOGUE_NPC_MAX_SESSIONS,
  getDialogueNpcSessions,
  type DialogueNpcAtomicCondition,
  type WorldMapDialogueNpcSession,
} from "@survive-the-night/game-shared/map/world-map-types";

function questSummaryLabel(questId: string | undefined, quests: WorldMapQuestDefinition[]): string {
  const id = questId?.trim() ?? "";
  if (!id) return "";
  const def = quests.find((q) => q.id === id);
  const title = def?.title?.trim();
  return title ? title : id;
}

const ATOMIC_CONDITION_OPTIONS: { value: DialogueNpcAtomicCondition["type"]; label: string }[] = [
  { value: "quest_completed", label: "Quest completed" },
  { value: "quest_active", label: "Quest active" },
  { value: "quest_not_active", label: "Quest not active (not in progress)" },
  { value: "quest_not_completed", label: "Quest not completed" },
  {
    value: "quest_active_all_steps_done",
    label: "Step index past last objective (rare; see “on talk step”)",
  },
  {
    value: "quest_active_on_matching_talk_step",
    label: "Active: current step is talk to this NPC",
  },
  {
    value: "quest_active_final_talk_turn_in",
    label: "Active: final quest step is talk here (finale + completeQuestId)",
  },
  { value: "quest_active_and_has_item", label: "Quest active + has item" },
];

function isDefaultWhen(when: WorldMapDialogueNpcSession["when"]): boolean {
  return when == null || when.type === "always";
}

function questIdForAtomic(c: DialogueNpcAtomicCondition): string {
  return c.questId ?? "";
}

function itemTypeForAtomic(c: DialogueNpcAtomicCondition): string {
  return c.type === "quest_active_and_has_item" ? c.itemType ?? "" : "";
}

function atomicLabelLine(
  c: DialogueNpcAtomicCondition,
  quests: WorldMapQuestDefinition[],
): string {
  const opt = ATOMIC_CONDITION_OPTIONS.find((o) => o.value === c.type)?.label ?? c.type;
  const q = questSummaryLabel(questIdForAtomic(c), quests);
  if (c.type === "quest_active_and_has_item") {
    const it = c.itemType?.trim();
    return [opt, q || null, it || null].filter(Boolean).join(" · ");
  }
  return q ? `${opt} · ${q}` : opt;
}

function conditionTriggerSummary(
  when: WorldMapDialogueNpcSession["when"],
  firstLine: string,
  quests: WorldMapQuestDefinition[],
): string {
  if (isDefaultWhen(when)) {
    const preview = firstLine.trim().slice(0, 48);
    return preview
      ? `Always (default) — ${preview}${firstLine.length > 48 ? "…" : ""}`
      : "Always (default)";
  }
  if (when.type === "all") {
    if (when.conditions.length === 0) return "Conditional (no clauses)";
    const parts = when.conditions.map((c) => atomicLabelLine(c, quests));
    return `All of: ${parts.join(" · ")}`;
  }
  const _exhaustive: never = when;
  return _exhaustive;
}

function makeDefaultAtomic(
  quests: WorldMapQuestDefinition[],
): DialogueNpcAtomicCondition {
  const qid = (quests[0]?.id ?? "").slice(0, 64);
  return { type: "quest_completed", questId: qid };
}

function questPickerLabel(q: WorldMapQuestDefinition): string {
  const t = q.title.trim();
  return t || q.id;
}

function isAuthoredQuestId(id: string, quests: WorldMapQuestDefinition[]): boolean {
  return quests.some((q) => q.id === id);
}

export function NpcAuthoringPanel({
  row,
  col,
  variant = "default",
}: {
  row: number;
  col: number;
  variant?: "default" | "modal";
}) {
  const dialogueNpcs = useEditorStore((state) => state.dialogueNpcs);
  const quests = useEditorStore((state) => state.quests);
  const updateDialogueNpcEntry = useEditorStore((state) => state.updateDialogueNpcEntry);
  const removeDialogueNpcAt = useEditorStore((state) => state.removeDialogueNpcAt);
  const setSelectedSpawnCell = useEditorStore((state) => state.setSelectedSpawnCell);
  const startDialogueNpcRelocate = useEditorStore((state) => state.startDialogueNpcRelocate);
  const sortedItemIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    const push = (id: string) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    };
    for (const id of itemRegistry.getAllItemIds()) push(id);
    for (const id of weaponRegistry.getAllWeaponTypes()) push(id);
    for (const id of resourceRegistry.getAllResourceTypes()) push(id);
    ids.sort((a, b) => a.localeCompare(b));
    return ids;
  }, []);

  const sortedQuestsByTitle = useMemo(
    () =>
      [...quests].sort((a, b) =>
        questPickerLabel(a).localeCompare(questPickerLabel(b), undefined, {
          sensitivity: "base",
        }),
      ),
    [quests],
  );

  const entry = dialogueNpcs.find((e) => e.row === row && e.col === col);
  if (!entry) {
    return (
      <p className="text-[10px] text-gray-500">
        No dialogue data for tile {row},{col}. Paint a Dialogue NPC tile first.
      </p>
    );
  }

  const sessions = getDialogueNpcSessions(entry);

  useLayoutEffect(() => {
    const e = dialogueNpcs.find((x) => x.row === row && x.col === col);
    if (!e) return;
    const fbItem = sortedItemIds[0];
    const fallbackQuestId = quests[0]?.id?.trim().slice(0, 64) ?? "";
    const sess = getDialogueNpcSessions(e);
    let next: WorldMapDialogueNpcSession[] | null = null;
    for (let i = 0; i < sess.length; i++) {
      const s = sess[i];
      if (s.when?.type !== "all") continue;
      let changed = false;
      const nextConds = s.when.conditions.map((c) => {
        let c2 = c;
        if (c.type === "quest_active_and_has_item" && fbItem && !c.itemType.trim()) {
          changed = true;
          c2 = { ...c2, itemType: fbItem.slice(0, 64) };
        }
        const qid = questIdForAtomic(c2).trim().slice(0, 64);
        if (fallbackQuestId && !qid) {
          changed = true;
          c2 = { ...c2, questId: fallbackQuestId };
        }
        return c2;
      });
      if (changed) {
        if (!next) next = [...sess];
        next[i] = { ...s, when: { type: "all", conditions: nextConds } };
      }
    }
    if (next) updateDialogueNpcEntry(row, col, { dialogueSessions: next });
  }, [dialogueNpcs, row, col, sortedItemIds, quests, updateDialogueNpcEntry]);

  const patchSessions = (next: WorldMapDialogueNpcSession[]) => {
    updateDialogueNpcEntry(row, col, { dialogueSessions: next });
  };

  const updateSession = (idx: number, patch: Partial<WorldMapDialogueNpcSession>) => {
    const next = sessions.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    patchSessions(next);
  };

  const setSessionBranchKind = (idx: number, kind: "default" | "conditional") => {
    const s = sessions[idx];
    if (!s) return;
    if (kind === "default") {
      updateSession(idx, { when: { type: "always" } });
      return;
    }
    const existing =
      s.when?.type === "all" && s.when.conditions.length > 0
        ? s.when.conditions
        : [makeDefaultAtomic(quests)];
    updateSession(idx, {
      when: { type: "all", conditions: existing.slice(0, DIALOGUE_NPC_MAX_AND_CLAUSES) },
    });
  };

  const replaceConditions = (idx: number, conditions: DialogueNpcAtomicCondition[]) => {
    const clamped = conditions.slice(0, DIALOGUE_NPC_MAX_AND_CLAUSES);
    if (clamped.length === 0) {
      updateSession(idx, { when: { type: "always" } });
      return;
    }
    updateSession(idx, { when: { type: "all", conditions: clamped } });
  };

  const setAtomicType = (
    idx: number,
    clauseIdx: number,
    type: DialogueNpcAtomicCondition["type"],
  ) => {
    const s = sessions[idx];
    if (s?.when?.type !== "all") return;
    const prev = s.when.conditions[clauseIdx];
    const qid = prev ? questIdForAtomic(prev).trim().slice(0, 64) : "";
    const q = (qid || quests[0]?.id || "quest").slice(0, 64);
    const itFallback = (sortedItemIds[0] || "bandage").slice(0, 64);
    let nextC: DialogueNpcAtomicCondition;
    if (type === "quest_active_and_has_item") {
      const it =
        prev?.type === "quest_active_and_has_item"
          ? (prev.itemType.trim() || itFallback).slice(0, 64)
          : itFallback;
      nextC = { type: "quest_active_and_has_item", questId: q, itemType: it };
    } else {
      nextC = { type, questId: q };
    }
    const conds = s.when.conditions.map((c, j) => (j === clauseIdx ? nextC : c));
    replaceConditions(idx, conds);
  };

  const setAtomicQuestId = (idx: number, clauseIdx: number, questId: string) => {
    const s = sessions[idx];
    if (s?.when?.type !== "all") return;
    const q = questId.trim().slice(0, 64);
    const conds = s.when.conditions.map((c, j) => {
      if (j !== clauseIdx) return c;
      if (c.type === "quest_active_and_has_item") {
        return {
          ...c,
          questId: q,
          itemType: (itemTypeForAtomic(c) || sortedItemIds[0] || "bandage").slice(0, 64),
        };
      }
      return { ...c, questId: q } as DialogueNpcAtomicCondition;
    });
    replaceConditions(idx, conds);
  };

  const setAtomicItemType = (idx: number, clauseIdx: number, itemType: string) => {
    const s = sessions[idx];
    if (s?.when?.type !== "all") return;
    const c = s.when.conditions[clauseIdx];
    if (c?.type !== "quest_active_and_has_item") return;
    const conds = s.when.conditions.map((x, j) =>
      j === clauseIdx
        ? ({
            type: "quest_active_and_has_item",
            questId: questIdForAtomic(c).trim().slice(0, 64) || (quests[0]?.id || "quest").slice(0, 64),
            itemType: itemType.trim().slice(0, 64),
          } satisfies DialogueNpcAtomicCondition)
        : x,
    );
    replaceConditions(idx, conds);
  };

  const addAtomicClause = (idx: number) => {
    const s = sessions[idx];
    if (s?.when?.type !== "all") return;
    if (s.when.conditions.length >= DIALOGUE_NPC_MAX_AND_CLAUSES) return;
    replaceConditions(idx, [...s.when.conditions, makeDefaultAtomic(quests)]);
  };

  const removeAtomicClause = (idx: number, clauseIdx: number) => {
    const s = sessions[idx];
    if (s?.when?.type !== "all") return;
    if (s.when.conditions.length <= 1) {
      setSessionBranchKind(idx, "default");
      return;
    }
    replaceConditions(
      idx,
      s.when.conditions.filter((_, j) => j !== clauseIdx),
    );
  };

  const moveSession = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= sessions.length) return;
    const next = [...sessions];
    [next[idx], next[j]] = [next[j], next[idx]];
    patchSessions(next);
  };

  const addSession = () => {
    if (sessions.length >= DIALOGUE_NPC_MAX_SESSIONS) return;
    patchSessions([
      ...sessions,
      { when: { type: "always" }, lines: ["…"] },
    ]);
  };

  const removeSession = (idx: number) => {
    if (sessions.length <= 1) return;
    patchSessions(sessions.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 rounded border border-emerald-700/80 bg-gray-900/90 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-emerald-300">Dialogue NPC</span>
        <div className="flex flex-wrap justify-end gap-1">
          {variant !== "modal" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
              onClick={() => setSelectedSpawnCell(null)}
            >
              Deselect
            </Button>
          ) : null}
          {variant === "modal" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
              onClick={() => startDialogueNpcRelocate(row, col)}
            >
              Relocate
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
            onClick={() => removeDialogueNpcAt(row, col)}
          >
            Remove
          </Button>
        </div>
      </div>
      <p className="text-[9px] text-gray-500">
        row {row}, col {col}
      </p>
      <p className="text-[9px] leading-snug text-gray-500">
        States are checked <span className="text-gray-300">top to bottom</span>. The first state whose
        condition matches is used—put <span className="text-gray-300">stricter</span> conditions{" "}
        <span className="text-gray-300">above</span> looser ones (e.g. “quest done + active + item”
        before “quest done” only). Put <span className="text-gray-300">Always (default)</span> last.
      </p>
      <label className="block text-[10px] font-medium text-gray-400">Display name</label>
      <input
        className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px] text-gray-100"
        value={entry.name ?? ""}
        placeholder="(optional)"
        maxLength={48}
        onChange={(e) => updateDialogueNpcEntry(row, col, { name: e.target.value || undefined })}
      />

      <div className="flex items-center justify-between gap-2 border-t border-gray-700/60 pt-2">
        <span className="text-[10px] font-medium text-gray-300">Dialog states</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
          disabled={sessions.length >= DIALOGUE_NPC_MAX_SESSIONS}
          onClick={addSession}
        >
          + State
        </Button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-0.5">
        <Accordion
          key={`${row}-${col}`}
          type="multiple"
          className="space-y-2"
          defaultValue={sessions.length > 0 ? ["state-0"] : []}
        >
          {sessions.map((session, idx) => {
            const isDefault = isDefaultWhen(session.when);
            const conditions =
              session.when?.type === "all" ? session.when.conditions : ([] as DialogueNpcAtomicCondition[]);
            const linesText = session.lines.join("\n");
            const firstLine = session.lines[0] ?? "";
            const summary = conditionTriggerSummary(session.when, firstLine, quests);

            return (
              <AccordionItem
                key={idx}
                value={`state-${idx}`}
                className="rounded border border-gray-700 bg-gray-950/80 px-2 !border-b-0"
              >
                <div className="flex items-start gap-1">
                  <AccordionTrigger className="min-w-0 flex-1 py-2.5 hover:no-underline [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-gray-400">
                    <span className="block min-w-0 text-left">
                      <span className="text-[9px] font-medium text-emerald-200/90">
                        State {idx + 1}
                      </span>
                      <span className="mt-0.5 block text-[9px] leading-snug text-gray-300">
                        {summary}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <div
                    className="flex shrink-0 flex-wrap justify-end gap-0.5 pt-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="!h-5 !min-h-0 !px-1 !text-[9px]"
                      disabled={idx === 0}
                      onClick={() => moveSession(idx, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="!h-5 !min-h-0 !px-1 !text-[9px]"
                      disabled={idx >= sessions.length - 1}
                      onClick={() => moveSession(idx, 1)}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="!h-5 !min-h-0 !px-1 !text-[9px]"
                      disabled={sessions.length <= 1}
                      onClick={() => removeSession(idx)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <AccordionContent className="space-y-1.5 pb-3 pt-0 text-white">
                  <label className="block text-[9px] font-medium text-gray-500">Branch</label>
                  <select
                    className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[10px] text-gray-100"
                    value={isDefault ? "default" : "conditional"}
                    onChange={(e) =>
                      setSessionBranchKind(idx, e.target.value === "default" ? "default" : "conditional")
                    }
                  >
                    <option value="default">Always (default fallback)</option>
                    <option value="conditional">Conditional (all clauses must match)</option>
                  </select>

                  {!isDefault ? (
                    <div className="space-y-2 rounded border border-gray-700/80 bg-gray-950/50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-medium text-gray-400">Clauses (AND)</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="!h-5 !min-h-0 !px-1.5 !text-[9px]"
                          disabled={conditions.length >= DIALOGUE_NPC_MAX_AND_CLAUSES}
                          onClick={() => addAtomicClause(idx)}
                        >
                          + Clause
                        </Button>
                      </div>
                      {conditions.map((clause, cidx) => (
                        <div
                          key={cidx}
                          className="space-y-1.5 border-b border-gray-800 pb-2 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] text-gray-500">Clause {cidx + 1}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="!h-5 !min-h-0 !px-1 !text-[9px]"
                              onClick={() => removeAtomicClause(idx, cidx)}
                            >
                              Remove
                            </Button>
                          </div>
                          <select
                            className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[10px] text-gray-100"
                            value={clause.type}
                            onChange={(e) =>
                              setAtomicType(
                                idx,
                                cidx,
                                e.target.value as DialogueNpcAtomicCondition["type"],
                              )
                            }
                          >
                            {ATOMIC_CONDITION_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <label className="block text-[9px] font-medium text-gray-500">Quest</label>
                          {sortedQuestsByTitle.length === 0 ? (
                            <p className="text-[9px] leading-snug text-amber-500/90">
                              Add a quest in the Quests panel, then choose it here.
                            </p>
                          ) : (
                            <select
                              className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[10px] text-gray-100"
                              value={(() => {
                                const id = questIdForAtomic(clause).trim().slice(0, 64);
                                if (isAuthoredQuestId(id, quests)) return id;
                                if (id) return id;
                                return sortedQuestsByTitle[0]?.id ?? "";
                              })()}
                              onChange={(e) => setAtomicQuestId(idx, cidx, e.target.value)}
                            >
                              {(() => {
                                const id = questIdForAtomic(clause).trim().slice(0, 64);
                                if (id && !isAuthoredQuestId(id, quests)) {
                                  return (
                                    <option value={id}>
                                      Not in quest list (from saved map) — select a quest below
                                    </option>
                                  );
                                }
                                return null;
                              })()}
                              {sortedQuestsByTitle.map((q) => (
                                <option key={q.id} value={q.id}>
                                  {questPickerLabel(q)}
                                </option>
                              ))}
                            </select>
                          )}
                          {clause.type === "quest_active_and_has_item" ? (
                            <>
                              <label className="block text-[9px] font-medium text-gray-500">
                                Item type
                              </label>
                              {(() => {
                                const cur = itemTypeForAtomic(clause).trim().slice(0, 64);
                                const ids = sortedItemIds;
                                const unknownCur = cur !== "" && !ids.includes(cur);
                                const optionIds = unknownCur ? [cur, ...ids] : ids;
                                const selectValue =
                                  cur !== "" && (ids.includes(cur) || unknownCur)
                                    ? cur
                                    : ids[0] ?? "";
                                return (
                                  <select
                                    className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 font-mono text-[10px] text-gray-100"
                                    value={selectValue}
                                    disabled={optionIds.length === 0}
                                    onChange={(e) => setAtomicItemType(idx, cidx, e.target.value)}
                                  >
                                    {optionIds.length === 0 ? (
                                      <option value="">No item types in registry</option>
                                    ) : (
                                      optionIds.map((id) => (
                                        <option key={id} value={id}>
                                          {unknownCur && id === cur ? `${id} (not in registry)` : id}
                                        </option>
                                      ))
                                    )}
                                  </select>
                                );
                              })()}
                            </>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <label className="block text-[9px] font-medium text-gray-500">
                    Lines (one per line)
                  </label>
                  <textarea
                    className="min-h-[4.5rem] w-full resize-y rounded border border-gray-600 bg-gray-950 px-2 py-1 font-mono text-[10px] text-gray-100"
                    value={linesText}
                    onChange={(e) => {
                      const raw = e.target.value.split("\n");
                      const lines = raw
                        .map((l) => l.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH))
                        .slice(0, DIALOGUE_NPC_MAX_LINE_COUNT);
                      updateSession(idx, { lines: lines.length > 0 ? lines : ["…"] });
                    }}
                    spellCheck={true}
                  />
                  <label className="block text-[9px] font-medium text-gray-500">
                    Grant quest when dialog finishes (optional)
                  </label>
                  <select
                    className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[10px] text-gray-100"
                    value={session.grantQuestId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateSession(idx, { grantQuestId: v === "" ? null : v });
                    }}
                  >
                    <option value="">— None —</option>
                    {(() => {
                      const gid = (session.grantQuestId ?? "").trim();
                      if (gid && !isAuthoredQuestId(gid, quests)) {
                        return (
                          <option key="__grant-orphan__" value={gid}>
                            Not in quest list (from saved map)
                          </option>
                        );
                      }
                      return null;
                    })()}
                    {sortedQuestsByTitle.map((q) => (
                      <option key={q.id} value={q.id}>
                        {questPickerLabel(q)}
                      </option>
                    ))}
                  </select>
                  <label className="block text-[9px] font-medium text-gray-500">
                    Complete quest when dialog closes (optional)
                  </label>
                  <select
                    className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[10px] text-gray-100"
                    value={session.completeQuestId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateSession(idx, { completeQuestId: v === "" ? null : v });
                    }}
                  >
                    <option value="">— None —</option>
                    {(() => {
                      const cid = (session.completeQuestId ?? "").trim();
                      if (cid && !isAuthoredQuestId(cid, quests)) {
                        return (
                          <option key="__complete-orphan__" value={cid}>
                            Not in quest list (from saved map)
                          </option>
                        );
                      }
                      return null;
                    })()}
                    {sortedQuestsByTitle.map((q) => (
                      <option key={q.id} value={q.id}>
                        {questPickerLabel(q)}
                      </option>
                    ))}
                  </select>
                  <label className="mt-1 flex cursor-pointer items-center gap-2 text-[9px] text-gray-400">
                    <input
                      type="checkbox"
                      className="rounded border-gray-600"
                      checked={session.healOnDialogueComplete === true}
                      onChange={(e) =>
                        updateSession(idx, {
                          healOnDialogueComplete: e.target.checked ? true : undefined,
                        })
                      }
                    />
                    Restore health and stamina when dialog finishes
                  </label>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
