import { Fragment, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
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
  DIALOGUE_NPC_EDITOR_GROUP_MAX,
  DIALOGUE_NPC_MAX_AND_CLAUSES,
  DIALOGUE_NPC_MAX_SESSIONS,
  finalizeDialogueNpcEditorMetadata,
  getDialogueNpcSessions,
  newDialogueNpcEditorGroupId,
  type DialogueNpcAtomicCondition,
  type WorldMapDialogueNpcSession,
} from "@survive-the-night/game-shared/map/world-map-types";

function questSummaryLabel(questId: string | undefined, quests: WorldMapQuestDefinition[]): string {
  const id = questId?.trim() ?? "";
  if (!id) return "";
  const def = quests.find((q) => q.id === id);
  const title = def?.title?.trim();
  const label = title ? title : id;
  return def?.editorIsMainQuest ? `★ ${label}` : label;
}

function questOptionsForSelect(
  questId: string | null | undefined,
  quests: WorldMapQuestDefinition[],
): WorldMapQuestDefinition[] {
  const id = questId?.trim() ?? "";
  if (!id || quests.some((quest) => quest.id === id)) {
    return quests;
  }
  return [{ id, title: `${id} (missing)`, steps: [], rewards: [], startRewards: [] }, ...quests];
}

function npcQuestDraftTitle(name: string | undefined, row: number, col: number): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed.endsWith("s") ? `${trimmed}' quest` : `${trimmed}'s quest`;
  }
  return `Quest for NPC ${row},${col}`;
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
  if (when == null || when.type === "always") {
    const preview = firstLine.trim().slice(0, 48);
    return preview
      ? `Always (default) — ${preview}${firstLine.length > 48 ? "…" : ""}`
      : "Always (default)";
  }
  if (when.conditions.length === 0) return "Conditional (no clauses)";
  const parts = when.conditions.map((c) => atomicLabelLine(c, quests));
  return `All of: ${parts.join(" · ")}`;
}

function makeDefaultAtomic(
  quests: WorldMapQuestDefinition[],
): DialogueNpcAtomicCondition {
  const qid = (quests[0]?.id ?? "").slice(0, 64);
  return { type: "quest_completed", questId: qid };
}

function questPickerLabel(q: WorldMapQuestDefinition): string {
  const t = q.title.trim();
  const base = t || q.id;
  return q.editorIsMainQuest ? `★ ${base}` : base;
}

function isAuthoredQuestId(id: string, quests: WorldMapQuestDefinition[]): boolean {
  return quests.some((q) => q.id === id);
}

type DialogueSessionChunk =
  | { kind: "single"; startIdx: number }
  | { kind: "group"; groupId: string; indices: number[] };

function chunkDialogueSessions(sessions: WorldMapDialogueNpcSession[]): DialogueSessionChunk[] {
  const chunks: DialogueSessionChunk[] = [];
  let i = 0;
  while (i < sessions.length) {
    const gid = sessions[i]?.editorGroupId;
    if (!gid) {
      chunks.push({ kind: "single", startIdx: i });
      i++;
      continue;
    }
    const indices: number[] = [];
    while (i < sessions.length && sessions[i]?.editorGroupId === gid) {
      indices.push(i);
      i++;
    }
    if (indices.length >= 2) {
      chunks.push({ kind: "group", groupId: gid, indices });
    } else {
      for (const idx of indices) {
        chunks.push({ kind: "single", startIdx: idx });
      }
    }
  }
  return chunks;
}

function sessionSortableId(idx: number): string {
  return `session-${idx}`;
}

function parseSessionSortableId(id: unknown): number | null {
  const m = /^session-(\d+)$/.exec(String(id));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isNaN(n) ? null : n;
}

const dialogueDropCollision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  const activeIdx = parseSessionSortableId(args.active.id);

  if (within.length > 0) {
    const mergeHits = within.filter((h) => {
      const id = String(h.id);
      if (!id.startsWith("merge-")) return false;
      const targetIdx = Number(id.slice("merge-".length));
      return (
        activeIdx !== null &&
        !Number.isNaN(targetIdx) &&
        targetIdx !== activeIdx
      );
    });
    if (mergeHits.length > 0) {
      return [mergeHits[0]!];
    }
    const ug = within.find((h) => h.id === "ungroup");
    if (ug) return [ug];
  }

  return closestCenter(args);
};

function MergeDropTarget({
  targetIndex,
  className,
  children,
}: {
  targetIndex: number;
  className?: string;
  children: (isOver: boolean) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `merge-${targetIndex}` });
  return (
    <div ref={setNodeRef} className={className}>
      {children(isOver)}
    </div>
  );
}

function UngroupDropZone({ children }: { children: (isOver: boolean) => ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "ungroup" });
  return <div ref={setNodeRef}>{children(isOver)}</div>;
}

type NpcStateDetailTab = "dialog" | "conditions" | "triggers";

/** Past grip handle so tabs / body line up with “State N” summary text. */
const NPC_STATE_BODY_INDENT = "pl-10 pr-2";

const EDITOR_GROUP_OUTLINE_PRESETS = [
  {
    shell: "border-2 border-sky-500/50 bg-sky-950/25 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12)]",
    member:
      "border border-sky-500/35 border-l-4 border-l-sky-400/80 bg-gray-950/55",
    heading: "text-sky-200/90",
  },
  {
    shell: "border-2 border-violet-500/50 bg-violet-950/25 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.12)]",
    member:
      "border border-violet-500/35 border-l-4 border-l-violet-400/80 bg-gray-950/55",
    heading: "text-violet-200/90",
  },
  {
    shell: "border-2 border-amber-500/50 bg-amber-950/20 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]",
    member:
      "border border-amber-500/35 border-l-4 border-l-amber-400/80 bg-gray-950/55",
    heading: "text-amber-200/90",
  },
  {
    shell: "border-2 border-rose-500/50 bg-rose-950/25 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.12)]",
    member:
      "border border-rose-500/35 border-l-4 border-l-rose-400/80 bg-gray-950/55",
    heading: "text-rose-200/90",
  },
  {
    shell: "border-2 border-cyan-500/50 bg-cyan-950/25 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]",
    member:
      "border border-cyan-500/35 border-l-4 border-l-cyan-400/80 bg-gray-950/55",
    heading: "text-cyan-200/90",
  },
  {
    shell: "border-2 border-lime-500/45 bg-lime-950/15 shadow-[inset_0_0_0_1px_rgba(163,230,53,0.12)]",
    member:
      "border border-lime-500/35 border-l-4 border-l-lime-400/70 bg-gray-950/55",
    heading: "text-lime-200/85",
  },
  {
    shell: "border-2 border-fuchsia-500/50 bg-fuchsia-950/25 shadow-[inset_0_0_0_1px_rgba(232,121,249,0.12)]",
    member:
      "border border-fuchsia-500/35 border-l-4 border-l-fuchsia-400/80 bg-gray-950/55",
    heading: "text-fuchsia-200/90",
  },
  {
    shell: "border-2 border-orange-500/50 bg-orange-950/20 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.12)]",
    member:
      "border border-orange-500/35 border-l-4 border-l-orange-400/80 bg-gray-950/55",
    heading: "text-orange-200/90",
  },
] as const;

function dialogueEditorGroupOutline(
  groupId: string,
): (typeof EDITOR_GROUP_OUTLINE_PRESETS)[number] {
  let h = 2166136261;
  for (let i = 0; i < groupId.length; i++) {
    h ^= groupId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % EDITOR_GROUP_OUTLINE_PRESETS.length;
  return EDITOR_GROUP_OUTLINE_PRESETS[idx]!;
}

function dialogueLinesPreview(
  lines: string[],
  maxLen = 96,
): { primary: string; extraLineCount: number } {
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);
  const firstRaw = trimmed[0] ?? lines[0]?.trim() ?? "…";
  const primary =
    firstRaw.length > maxLen ? `${firstRaw.slice(0, maxLen - 1)}…` : firstRaw;
  const nonEmptyLineCount = lines.filter((l) => l.trim()).length;
  const extraLineCount = nonEmptyLineCount > 1 ? nonEmptyLineCount - 1 : 0;
  return { primary, extraLineCount };
}

function SortableSessionBlock({
  sortId,
  children,
}: {
  sortId: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
    zIndex: isDragging ? 2 : 0,
    position: isDragging ? ("relative" as const) : undefined,
  };
  const dragHandle = (
    <button
      type="button"
      className="mt-3 mr-0.5 shrink-0 touch-none rounded p-1 text-gray-500 hover:bg-gray-800/80 hover:text-gray-300"
      aria-label="Drag to reorder state"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
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
  const createQuestDraft = useEditorStore((state) => state.createQuestDraft);
  const setFocusedQuestId = useEditorStore((state) => state.setFocusedQuestId);
  const setSidebarSection = useEditorStore((state) => state.setSidebarSection);
  const setNpcConfigModal = useEditorStore((state) => state.setNpcConfigModal);
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

  const [stateDetailTabByIdx, setStateDetailTabByIdx] = useState<
    Record<number, NpcStateDetailTab>
  >({});
  const [linesSummaryExpandedByIdx, setLinesSummaryExpandedByIdx] = useState<
    Record<number, boolean>
  >({});

  const entry = dialogueNpcs.find((e) => e.row === row && e.col === col);
  if (!entry) {
    return (
      <p className="text-xs text-gray-500">
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
      const nextConds = s.when.conditions.map((c): DialogueNpcAtomicCondition => {
        let c2: DialogueNpcAtomicCondition = c;
        if (c.type === "quest_active_and_has_item" && fbItem && !c.itemType.trim()) {
          changed = true;
          c2 = {
            type: "quest_active_and_has_item",
            questId: c.questId,
            itemType: fbItem.slice(0, 64),
          };
        }
        const qid = questIdForAtomic(c2).trim().slice(0, 64);
        if (fallbackQuestId && !qid) {
          changed = true;
          c2 = { ...c2, questId: fallbackQuestId } as DialogueNpcAtomicCondition;
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

  const commitDialogueSessions = (
    nextSessions: WorldMapDialogueNpcSession[],
    nextEditorGroups?: Record<string, string>,
  ) => {
    const groups =
      nextEditorGroups !== undefined ? nextEditorGroups : entry.editorGroups;
    const finalized = finalizeDialogueNpcEditorMetadata(nextSessions, groups);
    updateDialogueNpcEntry(row, col, {
      dialogueSessions: finalized.sessions,
      ...(finalized.editorGroups && Object.keys(finalized.editorGroups).length > 0
        ? { editorGroups: finalized.editorGroups }
        : { editorGroups: undefined }),
    });
  };

  const patchSessions = (next: WorldMapDialogueNpcSession[]) => {
    commitDialogueSessions(next);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sortableIds = useMemo(
    () => sessions.map((_, i) => sessionSortableId(i)),
    [sessions.length],
  );

  const mergeSessionsIntoGroup = (dragIdx: number, targetIdx: number) => {
    if (dragIdx === targetIdx) return;
    const next = sessions.map((s) => ({ ...s }));
    const groups: Record<string, string> = { ...(entry.editorGroups ?? {}) };
    const [removed] = next.splice(dragIdx, 1);
    const adjTarget = dragIdx < targetIdx ? targetIdx - 1 : targetIdx;
    if (!removed || adjTarget < 0 || adjTarget >= next.length) return;
    next.splice(adjTarget + 1, 0, removed);
    const target = next[adjTarget];
    const dragged = next[adjTarget + 1];
    if (!target || !dragged) return;
    let gid = target.editorGroupId;
    if (!gid) {
      gid = newDialogueNpcEditorGroupId();
      const label =
        (target.lines[0] ?? dragged.lines[0] ?? "Group").trim().slice(
          0,
          DIALOGUE_NPC_EDITOR_GROUP_MAX,
        ) || "Group";
      groups[gid] = label;
    }
    next[adjTarget] = { ...target, editorGroupId: gid };
    next[adjTarget + 1] = { ...dragged, editorGroupId: gid };
    commitDialogueSessions(next, groups);
  };

  const ungroupSessionAt = (idx: number) => {
    const next = sessions.map((s, i) => {
      if (i !== idx) return { ...s };
      const { editorGroupId: _drop, ...rest } = s;
      return rest;
    });
    commitDialogueSessions(next, entry.editorGroups);
  };

  const onSessionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeIdx = parseSessionSortableId(active.id);
    if (activeIdx === null) return;

    if (over.id === "ungroup") {
      ungroupSessionAt(activeIdx);
      return;
    }
    const overStr = String(over.id);
    if (overStr.startsWith("merge-")) {
      const targetIdx = Number(overStr.slice("merge-".length));
      if (!Number.isNaN(targetIdx)) mergeSessionsIntoGroup(activeIdx, targetIdx);
      return;
    }
    const overIdx = parseSessionSortableId(over.id);
    if (overIdx === null || overIdx === activeIdx) return;
    patchSessions(arrayMove(sessions, activeIdx, overIdx));
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

  const openQuestEditor = (questId: string | null | undefined) => {
    const id = questId?.trim() ?? "";
    if (!id) return;
    setFocusedQuestId(id);
    setSidebarSection("quests");
    if (variant === "modal") {
      setNpcConfigModal(null);
    }
  };

  const createAndAssignQuest = (idx: number, field: "grantQuestId" | "completeQuestId") => {
    const id = createQuestDraft(npcQuestDraftTitle(entry.name, row, col));
    if (field === "grantQuestId") {
      updateSession(idx, { grantQuestId: id });
    } else {
      updateSession(idx, { completeQuestId: id });
    }
    setSidebarSection("quests");
    if (variant === "modal") {
      setNpcConfigModal(null);
    }
  };
  const fieldInputClass =
    "w-full rounded-md border border-gray-600 bg-gray-950 px-2.5 py-2 text-sm text-gray-100";

  return (
    <div
      className={
        variant === "modal"
          ? "space-y-3"
          : "space-y-4 rounded-lg border border-gray-700 bg-gray-900/90 p-4"
      }
    >
      {variant !== "modal" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700/70 pb-3">
            <p className="text-xs text-gray-400">
              Tile{" "}
              <span className="font-medium text-gray-200">
                row {row} · col {col}
              </span>
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="min-h-8 text-xs"
                onClick={() => setSelectedSpawnCell(null)}
              >
                Deselect
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="min-h-8 text-xs"
                onClick={() => removeDialogueNpcAt(row, col)}
              >
                Remove NPC
              </Button>
            </div>
          </div>

          <details className="rounded-md border border-gray-800/90 bg-gray-950/40 px-3 py-2 [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer list-none text-xs font-medium text-gray-400 hover:text-gray-300">
              How state matching works
            </summary>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              States are evaluated <span className="text-gray-300">top to bottom</span>. The{" "}
              <span className="text-gray-300">last</span> state whose condition matches is the one
              the game shows—put <span className="text-gray-300">broader</span> conditions{" "}
              <span className="text-gray-300">earlier</span> and stricter / progression branches{" "}
              <span className="text-gray-300">later</span>. Put{" "}
              <span className="text-gray-300">Always (default)</span> last. Drag the grip beside each
              state to reorder. Drop a state on another state’s{" "}
              <span className="text-gray-300">group drop</span> strip to combine them (editor-only;
              not sent to the game client). Drag onto{" "}
              <span className="text-gray-300">Remove from group</span> to leave a group; a lone state
              is no longer shown as grouped.
            </p>
          </details>

          <section aria-labelledby="npc-identity-heading" className="space-y-2">
            <h2 id="npc-identity-heading" className="text-xs font-semibold tracking-wide text-gray-300">
              NPC details
            </h2>
            <div>
              <label
                htmlFor="npc-display-name"
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                Display name
              </label>
              <input
                id="npc-display-name"
                className={fieldInputClass}
                value={entry.name ?? ""}
                placeholder="(optional)"
                maxLength={48}
                onChange={(e) =>
                  updateDialogueNpcEntry(row, col, { name: e.target.value || undefined })
                }
              />
            </div>
          </section>
        </>
      ) : null}

      <section aria-labelledby="npc-states-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-700/60 pt-4">
          <h2 id="npc-states-heading" className="text-xs font-semibold tracking-wide text-gray-300">
            Dialog states
          </h2>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-8 text-xs"
            disabled={sessions.length >= DIALOGUE_NPC_MAX_SESSIONS}
            onClick={addSession}
          >
            + State
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={dialogueDropCollision}
            onDragEnd={onSessionDragEnd}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <UngroupDropZone>
                {(isOver) => (
                  <div
                    className={`mb-3 rounded-md border border-dashed px-2 py-2 text-center text-[11px] ${
                      isOver
                        ? "border-amber-500/80 bg-amber-950/40 text-amber-100"
                        : "border-gray-700 text-gray-500"
                    }`}
                  >
                    Remove from group — drop a state here to leave its group
                  </div>
                )}
              </UngroupDropZone>
              <Accordion
                key={`${row}-${col}`}
                type="multiple"
                className="space-y-3"
                defaultValue={
                  variant === "modal" ? [] : sessions.length > 0 ? ["state-0"] : []
                }
              >
                {chunkDialogueSessions(sessions).map((chunk) => {
                  const groupOutline =
                    chunk.kind === "group"
                      ? dialogueEditorGroupOutline(chunk.groupId)
                      : null;

                  const wrapGroup = (inner: ReactNode) =>
                    chunk.kind === "group" && groupOutline ? (
                      <div
                        key={`grp-${row}-${col}-${chunk.groupId}`}
                        className={cn("space-y-2 rounded-lg p-2", groupOutline.shell)}
                      >
                        <div className="px-1 pt-0.5">
                          <label
                            htmlFor={`npc-grp-${row}-${col}-${chunk.groupId}`}
                            className={cn(
                              "mb-1 block text-[11px] font-medium uppercase tracking-wide",
                              groupOutline.heading,
                            )}
                          >
                            Group name (editor only)
                          </label>
                          <input
                            id={`npc-grp-${row}-${col}-${chunk.groupId}`}
                            className={fieldInputClass}
                            value={entry.editorGroups?.[chunk.groupId] ?? ""}
                            placeholder="Label for this group"
                            maxLength={DIALOGUE_NPC_EDITOR_GROUP_MAX}
                            onKeyDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const raw = e.target.value.slice(0, DIALOGUE_NPC_EDITOR_GROUP_MAX);
                              const nextGroups = { ...(entry.editorGroups ?? {}) };
                              if (raw.trim() === "") {
                                delete nextGroups[chunk.groupId];
                              } else {
                                nextGroups[chunk.groupId] = raw;
                              }
                              updateDialogueNpcEntry(row, col, {
                                editorGroups:
                                  Object.keys(nextGroups).length > 0 ? nextGroups : undefined,
                              });
                            }}
                          />
                        </div>
                        {inner}
                      </div>
                    ) : (
                      <Fragment key={`single-${row}-${col}-${chunk.startIdx}`}>{inner}</Fragment>
                    );

                  const indices =
                    chunk.kind === "group" ? chunk.indices : [chunk.startIdx];

                  return wrapGroup(
                    <>
                      {indices.map((idx) => {
                        const session = sessions[idx];
                        if (!session) return null;
                        const isDefault = isDefaultWhen(session.when);
                        const conditions =
                          session.when?.type === "all"
                            ? session.when.conditions
                            : ([] as DialogueNpcAtomicCondition[]);
                        const linesText = session.lines.join("\n");
                        const firstLine = session.lines[0] ?? "";
                        const summary = conditionTriggerSummary(session.when, firstLine, quests);
                        const grantQuestOptions = questOptionsForSelect(session.grantQuestId, quests);
                        const completeQuestOptions = questOptionsForSelect(
                          session.completeQuestId,
                          quests,
                        );
                        const hasGrantQuestDefinition =
                          !!session.grantQuestId?.trim() &&
                          quests.some((quest) => quest.id === session.grantQuestId);
                        const hasCompleteQuestDefinition =
                          !!session.completeQuestId?.trim() &&
                          quests.some((quest) => quest.id === session.completeQuestId);
                        const preview = dialogueLinesPreview(session.lines);
                        const stateTab = stateDetailTabByIdx[idx] ?? "dialog";
                        const linesSummaryExpanded = linesSummaryExpandedByIdx[idx] ?? false;
                        const branchId = `npc-state-${idx}-branch`;
                        const linesId = `npc-state-${idx}-lines`;
                        const grantId = `npc-state-${idx}-grant`;
                        const completeId = `npc-state-${idx}-complete`;
                        const healId = `npc-state-${idx}-heal`;
                        const groupBadge =
                          chunk.kind === "group"
                            ? (entry.editorGroups?.[chunk.groupId] ?? "").trim()
                            : "";

                        return (
                          <SortableSessionBlock
                            key={`${row}-${col}-sess-${idx}`}
                            sortId={sessionSortableId(idx)}
                          >
                            {(dragHandle) => (
                              <AccordionItem
                                value={`state-${idx}`}
                                className={cn(
                                  "overflow-hidden rounded-lg px-2 !border-b-0",
                                  groupOutline
                                    ? groupOutline.member
                                    : "border border-gray-700 bg-gray-950/60",
                                )}
                              >
                                <div className="flex items-start gap-0">
                                  {dragHandle}
                                  <MergeDropTarget
                                    targetIndex={idx}
                                    className="flex min-w-0 flex-1 flex-col rounded-md transition-colors"
                                  >
                                    {(mergeOver) => (
                                      <>
                                        <div
                                          className={cn(
                                            "border-b py-1 text-[10px]",
                                            NPC_STATE_BODY_INDENT,
                                            mergeOver
                                              ? "border-emerald-600/80 bg-emerald-950/50 text-emerald-100"
                                              : "border-gray-700/80 text-gray-500",
                                          )}
                                        >
                                          Drop anywhere on this card to group with state {idx + 1}
                                        </div>
                                        <div className="flex items-start gap-0">
                                          <AccordionTrigger className="min-w-0 flex-1 py-3 pr-1 hover:no-underline [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-gray-400">
                                    <span className="block min-w-0 text-left break-words">
                                      <span className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-semibold text-emerald-200/95">
                                          State {idx + 1}
                                        </span>
                                        {groupBadge ? (
                                          <span
                                            className={cn(
                                              "rounded bg-black/35 px-1.5 py-0.5 text-[10px] font-medium",
                                              groupOutline
                                                ? groupOutline.heading
                                                : "text-gray-400",
                                            )}
                                          >
                                            {groupBadge}
                                          </span>
                                        ) : null}
                                      </span>
                                  {linesSummaryExpanded ? (
                                    <div
                                      className="mt-1 space-y-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      role="presentation"
                                    >
                                      {session.lines.map((line, li) => (
                                        <span
                                          key={li}
                                          className="block text-sm leading-snug text-gray-100"
                                        >
                                          {line.trim() ? line : "…"}
                                        </span>
                                      ))}
                                      <button
                                        type="button"
                                        className="mt-1 block text-left text-[11px] text-emerald-400/90 hover:underline"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setLinesSummaryExpandedByIdx((m) => ({
                                            ...m,
                                            [idx]: false,
                                          }));
                                        }}
                                      >
                                        Show less
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="mt-1 block text-sm leading-snug text-gray-100">
                                        {preview.primary}
                                      </span>
                                      {preview.extraLineCount > 0 ? (
                                        <button
                                          type="button"
                                          className="mt-0.5 block w-full text-left text-[11px] text-emerald-400/90 hover:underline"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setLinesSummaryExpandedByIdx((m) => ({
                                              ...m,
                                              [idx]: true,
                                            }));
                                          }}
                                        >
                                          +{preview.extraLineCount} more line
                                          {preview.extraLineCount > 1 ? "s" : ""}
                                          {" — "}
                                          show all
                                        </button>
                                      ) : null}
                                    </>
                                  )}
                                  <span className="mt-1 block text-[11px] leading-snug text-gray-500">
                                    {summary}
                                  </span>
                                </span>
                              </AccordionTrigger>
                              <div
                                className="flex shrink-0 flex-wrap justify-end gap-1.5 py-2.5"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                role="presentation"
                              >
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="min-h-8 px-2.5 text-xs"
                        disabled={idx === 0}
                        aria-label={`Move state ${idx + 1} up`}
                        onClick={() => moveSession(idx, -1)}
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="min-h-8 px-2.5 text-xs"
                        disabled={idx >= sessions.length - 1}
                        aria-label={`Move state ${idx + 1} down`}
                        onClick={() => moveSession(idx, 1)}
                      >
                        Down
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="min-h-8 px-2.5 text-xs"
                        disabled={sessions.length <= 1}
                        aria-label={`Delete state ${idx + 1}`}
                        onClick={() => removeSession(idx)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <AccordionContent
                    className={cn(NPC_STATE_BODY_INDENT, "space-y-4 pb-4 pt-0 text-white")}
                  >
                    <div
                      className="flex flex-wrap gap-0.5 border-b border-gray-800"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="tablist"
                      aria-label={`State ${idx + 1} sections`}
                    >
                      {(
                        [
                          { id: "dialog" as const, label: "Dialog" },
                          { id: "conditions" as const, label: "Conditions" },
                          { id: "triggers" as const, label: "Triggers" },
                        ] as const
                      ).map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={stateTab === id}
                          className={cn(
                            "-mb-px rounded-t border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                            stateTab === id
                              ? "border-emerald-500/80 text-emerald-200"
                              : "border-transparent text-gray-500 hover:text-gray-300",
                          )}
                          onClick={() =>
                            setStateDetailTabByIdx((m) => ({
                              ...m,
                              [idx]: id,
                            }))
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {stateTab === "dialog" ? (
                      <div className="space-y-2 pt-1" role="tabpanel">
                        <div>
                          <label
                            htmlFor={linesId}
                            className="mb-1 block text-xs font-medium text-gray-400"
                          >
                            Lines (one per line)
                          </label>
                          <textarea
                            id={linesId}
                            className={`${fieldInputClass} min-h-[5.5rem] resize-y font-mono`}
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
                        </div>
                      </div>
                    ) : null}

                    {stateTab === "conditions" ? (
                      <div className="space-y-2 pt-1" role="tabpanel">
                        <div>
                          <label
                            htmlFor={branchId}
                            className="mb-1 block text-xs font-medium text-gray-400"
                          >
                            Branch
                          </label>
                          <select
                            id={branchId}
                            className={fieldInputClass}
                            value={isDefault ? "default" : "conditional"}
                            onChange={(e) =>
                              setSessionBranchKind(
                                idx,
                                e.target.value === "default" ? "default" : "conditional",
                              )
                            }
                          >
                            <option value="default">Always (default fallback)</option>
                            <option value="conditional">Conditional (all clauses must match)</option>
                          </select>
                        </div>

                        {!isDefault ? (
                          <div className="space-y-3 rounded-md bg-gray-950/50 px-3 py-3 ring-1 ring-gray-800/80">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-medium text-gray-400">Clauses (AND)</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="min-h-8 text-xs"
                                disabled={conditions.length >= DIALOGUE_NPC_MAX_AND_CLAUSES}
                                onClick={() => addAtomicClause(idx)}
                              >
                                + Clause
                              </Button>
                            </div>
                            {conditions.map((clause, cidx) => {
                              const clauseTypeId = `npc-state-${idx}-clause-${cidx}-type`;
                              const clauseQuestId = `npc-state-${idx}-clause-${cidx}-quest`;
                              const clauseItemId = `npc-state-${idx}-clause-${cidx}-item`;
                              return (
                                <div
                                  key={cidx}
                                  className="space-y-2 border-b border-gray-800/90 pb-3 last:border-b-0 last:pb-0"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs text-gray-500">Clause {cidx + 1}</span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      className="min-h-8 text-xs"
                                      aria-label={`Remove clause ${cidx + 1} from state ${idx + 1}`}
                                      onClick={() => removeAtomicClause(idx, cidx)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                  <div>
                                    <label
                                      htmlFor={clauseTypeId}
                                      className="sr-only"
                                    >{`Clause ${cidx + 1} condition type`}</label>
                                    <select
                                      id={clauseTypeId}
                                      className={fieldInputClass}
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
                                  </div>
                                  <div>
                                    <label
                                      htmlFor={clauseQuestId}
                                      className="mb-1 block text-xs font-medium text-gray-500"
                                    >
                                      Quest
                                    </label>
                                    {sortedQuestsByTitle.length === 0 ? (
                                      <p className="text-xs leading-snug text-amber-500/90">
                                        Add a quest in the Quests panel, then choose it here.
                                      </p>
                                    ) : (
                                      <select
                                        id={clauseQuestId}
                                        className={fieldInputClass}
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
                                                Not in quest list (from saved map) — select a quest
                                                below
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
                                  </div>
                                  {clause.type === "quest_active_and_has_item" ? (
                                    <div>
                                      <label
                                        htmlFor={clauseItemId}
                                        className="mb-1 block text-xs font-medium text-gray-500"
                                      >
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
                                            id={clauseItemId}
                                            className={`${fieldInputClass} font-mono text-sm`}
                                            value={selectValue}
                                            disabled={optionIds.length === 0}
                                            onChange={(e) =>
                                              setAtomicItemType(idx, cidx, e.target.value)
                                            }
                                          >
                                            {optionIds.length === 0 ? (
                                              <option value="">No item types in registry</option>
                                            ) : (
                                              optionIds.map((id) => (
                                                <option key={id} value={id}>
                                                  {unknownCur && id === cur
                                                    ? `${id} (not in registry)`
                                                    : id}
                                                </option>
                                              ))
                                            )}
                                          </select>
                                        );
                                      })()}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {stateTab === "triggers" ? (
                      <div className="space-y-3 pt-1" role="tabpanel">
                        <div>
                          <label
                            htmlFor={grantId}
                            className="mb-1 block text-xs font-medium text-gray-400"
                          >
                            Grant quest when dialog finishes (optional)
                          </label>
                          <select
                            id={grantId}
                            className={fieldInputClass}
                            value={session.grantQuestId ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateSession(idx, { grantQuestId: v === "" ? null : v });
                            }}
                          >
                            <option value="">— None —</option>
                            {grantQuestOptions.map((q) => (
                              <option key={q.id} value={q.id}>
                                {questPickerLabel(q)}
                              </option>
                            ))}
                          </select>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="min-h-8 text-xs"
                              onClick={() => createAndAssignQuest(idx, "grantQuestId")}
                            >
                              New quest
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="min-h-8 text-xs"
                              disabled={!hasGrantQuestDefinition}
                              onClick={() => openQuestEditor(session.grantQuestId)}
                            >
                              Open quest
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label
                            htmlFor={completeId}
                            className="mb-1 block text-xs font-medium text-gray-400"
                          >
                            Complete quest when dialog closes (optional)
                          </label>
                          <select
                            id={completeId}
                            className={fieldInputClass}
                            value={session.completeQuestId ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateSession(idx, { completeQuestId: v === "" ? null : v });
                            }}
                          >
                            <option value="">— None —</option>
                            {completeQuestOptions.map((q) => (
                              <option key={q.id} value={q.id}>
                                {questPickerLabel(q)}
                              </option>
                            ))}
                          </select>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="min-h-8 text-xs"
                              onClick={() => createAndAssignQuest(idx, "completeQuestId")}
                            >
                              New quest
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="min-h-8 text-xs"
                              disabled={!hasCompleteQuestDefinition}
                              onClick={() => openQuestEditor(session.completeQuestId)}
                            >
                              Open quest
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 pt-1">
                          <input
                            id={healId}
                            type="checkbox"
                            className="mt-1 size-4 shrink-0 rounded border-gray-600"
                            checked={session.healOnDialogueComplete === true}
                            onChange={(e) =>
                              updateSession(idx, {
                                healOnDialogueComplete: e.target.checked ? true : undefined,
                              })
                            }
                          />
                          <label htmlFor={healId} className="cursor-pointer text-xs text-gray-400">
                            Restore health and stamina when dialog finishes
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </AccordionContent>
                                      </>
                                    )}
                                  </MergeDropTarget>
                                </div>
                              </AccordionItem>
                            )}
                          </SortableSessionBlock>
                        );
                      })}
                    </>
                  );
                })}
              </Accordion>
            </SortableContext>
          </DndContext>
        </div>
      </section>
    </div>
  );
}
