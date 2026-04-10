import { useEffect, useMemo } from "react";
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
  DIALOGUE_NPC_MAX_SESSIONS,
  getDialogueNpcSessions,
  type DialogueNpcCondition,
  type WorldMapDialogueNpcSession,
} from "@survive-the-night/game-shared/map/world-map-types";

function questSummaryLabel(questId: string | undefined, quests: WorldMapQuestDefinition[]): string {
  const id = questId?.trim() ?? "";
  if (!id) return "";
  const def = quests.find((q) => q.id === id);
  const title = def?.title?.trim();
  return title ? title : id;
}

const CONDITION_OPTIONS: { value: DialogueNpcCondition["type"]; label: string }[] = [
  { value: "always", label: "Always (default branch)" },
  { value: "quest_completed", label: "Quest completed" },
  { value: "quest_active", label: "Quest active" },
  { value: "quest_not_completed", label: "Quest not completed" },
  { value: "quest_active_and_has_item", label: "Quest active + has item" },
];

function conditionType(when: WorldMapDialogueNpcSession["when"]): DialogueNpcCondition["type"] {
  return when?.type ?? "always";
}

function questIdForCondition(when: WorldMapDialogueNpcSession["when"]): string {
  if (!when || when.type === "always") return "";
  return when.questId ?? "";
}

function itemTypeForCondition(when: WorldMapDialogueNpcSession["when"]): string {
  if (when?.type === "quest_active_and_has_item") return when.itemType ?? "";
  return "";
}

function conditionTriggerSummary(
  when: WorldMapDialogueNpcSession["when"],
  firstLine: string,
  quests: WorldMapQuestDefinition[],
): string {
  const t = when?.type ?? "always";
  const label = CONDITION_OPTIONS.find((o) => o.value === t)?.label ?? "Always";
  if (t === "quest_active_and_has_item" && when?.type === "quest_active_and_has_item") {
    const q = when.questId?.trim();
    const qLabel = questSummaryLabel(q, quests);
    const it = when.itemType?.trim();
    if (qLabel && it) return `${label} · ${qLabel} · ${it}`;
    if (qLabel) return `${label} · ${qLabel}`;
    return label;
  }
  if (t !== "always" && when && "questId" in when && (when as { questId?: string }).questId) {
    const qid = (when as { questId: string }).questId;
    return `${label} · ${questSummaryLabel(qid, quests)}`;
  }
  const preview = firstLine.trim().slice(0, 48);
  return preview ? `${label} — ${preview}${firstLine.length > 48 ? "…" : ""}` : label;
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

  const entry = dialogueNpcs.find((e) => e.row === row && e.col === col);
  if (!entry) {
    return (
      <p className="text-[10px] text-gray-500">
        No dialogue data for tile {row},{col}. Paint a Dialogue NPC tile first.
      </p>
    );
  }

  const sessions = getDialogueNpcSessions(entry);

  useEffect(() => {
    const e = dialogueNpcs.find((x) => x.row === row && x.col === col);
    if (!e) return;
    const fb = sortedItemIds[0];
    if (!fb) return;
    const sess = getDialogueNpcSessions(e);
    let next: WorldMapDialogueNpcSession[] | null = null;
    for (let i = 0; i < sess.length; i++) {
      const s = sess[i];
      if (conditionType(s.when) !== "quest_active_and_has_item") continue;
      if (itemTypeForCondition(s.when).trim()) continue;
      if (!next) next = [...sess];
      next[i] = {
        ...s,
        when: {
          type: "quest_active_and_has_item",
          questId: (questIdForCondition(s.when) || quests[0]?.id || "quest").slice(0, 64),
          itemType: fb.slice(0, 64),
        },
      };
    }
    if (next) updateDialogueNpcEntry(row, col, { dialogueSessions: next });
  }, [dialogueNpcs, row, col, quests, sortedItemIds, updateDialogueNpcEntry]);

  const patchSessions = (next: WorldMapDialogueNpcSession[]) => {
    updateDialogueNpcEntry(row, col, { dialogueSessions: next });
  };

  const updateSession = (idx: number, patch: Partial<WorldMapDialogueNpcSession>) => {
    const next = sessions.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    patchSessions(next);
  };

  const setConditionType = (idx: number, type: DialogueNpcCondition["type"]) => {
    const s = sessions[idx];
    if (!s) return;
    if (type === "always") {
      updateSession(idx, { when: { type: "always" } });
      return;
    }
    const qid = (questIdForCondition(s.when) || quests[0]?.id || "quest").slice(0, 64);
    if (type === "quest_completed") {
      updateSession(idx, { when: { type: "quest_completed", questId: qid } });
    } else if (type === "quest_active") {
      updateSession(idx, { when: { type: "quest_active", questId: qid } });
    } else if (type === "quest_not_completed") {
      updateSession(idx, { when: { type: "quest_not_completed", questId: qid } });
    } else {
      const it = (
        itemTypeForCondition(s.when) ||
        sortedItemIds[0] ||
        "bandage"
      ).slice(0, 64);
      updateSession(idx, {
        when: { type: "quest_active_and_has_item", questId: qid, itemType: it },
      });
    }
  };

  const setConditionQuestId = (idx: number, questId: string) => {
    const s = sessions[idx];
    const t = conditionType(s.when);
    if (t === "always") return;
    const q = questId.trim().slice(0, 64);
    if (t === "quest_active_and_has_item") {
      updateSession(idx, {
        when: {
          type: "quest_active_and_has_item",
          questId: q,
          itemType: (itemTypeForCondition(s.when) || sortedItemIds[0] || "bandage").slice(0, 64),
        },
      });
      return;
    }
    updateSession(idx, { when: { type: t, questId: q } });
  };

  const setConditionItemType = (idx: number, itemType: string) => {
    const s = sessions[idx];
    if (conditionType(s.when) !== "quest_active_and_has_item") return;
    updateSession(idx, {
      when: {
        type: "quest_active_and_has_item",
        questId: (questIdForCondition(s.when) || quests[0]?.id || "quest").slice(0, 64),
        itemType: itemType.trim().slice(0, 64),
      },
    });
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
        First matching condition wins. Put <span className="text-gray-300">Always</span> last as the
        fallback branch.
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
            const ctype = conditionType(session.when);
            const needsQuest = ctype !== "always";
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
                  <label className="block text-[9px] font-medium text-gray-500">Condition</label>
                  <select
                    className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[10px] text-gray-100"
                    value={ctype}
                    onChange={(e) =>
                      setConditionType(idx, e.target.value as DialogueNpcCondition["type"])
                    }
                  >
                    {CONDITION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {needsQuest ? (
                    <>
                      <label className="block text-[9px] font-medium text-gray-500">Quest id</label>
                      <input
                        className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 font-mono text-[10px] text-gray-100"
                        value={questIdForCondition(session.when)}
                        onChange={(e) => setConditionQuestId(idx, e.target.value)}
                        maxLength={64}
                        placeholder="e.g. main_quest_1"
                      />
                      {quests.length > 0 ? (
                        <select
                          className="mt-1 w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[10px] text-gray-100"
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) setConditionQuestId(idx, v);
                          }}
                        >
                          <option value="">Insert authored quest…</option>
                          {quests.map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.title} ({q.id})
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </>
                  ) : null}
                  {ctype === "quest_active_and_has_item" ? (
                    <>
                      <label className="block text-[9px] font-medium text-gray-500">
                        Item type
                      </label>
                      {(() => {
                        const cur = itemTypeForCondition(session.when).trim().slice(0, 64);
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
                            onChange={(e) => setConditionItemType(idx, e.target.value)}
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
                    {quests.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.id})
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
                    {quests.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.id})
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
