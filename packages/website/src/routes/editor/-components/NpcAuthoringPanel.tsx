import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
} from "@survive-the-night/game-shared/map/spawn-palette";
import {
  DIALOGUE_NPC_MAX_SESSIONS,
  getDialogueNpcSessions,
  type DialogueNpcCondition,
  type WorldMapDialogueNpcSession,
} from "@survive-the-night/game-shared/map/world-map-types";

const CONDITION_OPTIONS: { value: DialogueNpcCondition["type"]; label: string }[] = [
  { value: "always", label: "Always (default branch)" },
  { value: "quest_completed", label: "Quest completed" },
  { value: "quest_active", label: "Quest active" },
  { value: "quest_not_completed", label: "Quest not completed" },
];

function conditionType(when: WorldMapDialogueNpcSession["when"]): DialogueNpcCondition["type"] {
  return when?.type ?? "always";
}

function questIdForCondition(when: WorldMapDialogueNpcSession["when"]): string {
  if (!when || when.type === "always") return "";
  return when.questId ?? "";
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

  const entry = dialogueNpcs.find((e) => e.row === row && e.col === col);
  if (!entry) {
    return (
      <p className="text-[10px] text-gray-500">
        No dialogue data for tile {row},{col}. Paint a Dialogue NPC tile first.
      </p>
    );
  }

  const sessions = getDialogueNpcSessions(entry);

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
    } else {
      updateSession(idx, { when: { type: "quest_not_completed", questId: qid } });
    }
  };

  const setConditionQuestId = (idx: number, questId: string) => {
    const s = sessions[idx];
    const t = conditionType(s.when);
    if (t === "always") return;
    updateSession(idx, { when: { type: t, questId: questId.trim().slice(0, 64) } });
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

      <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-0.5">
        {sessions.map((session, idx) => {
          const ctype = conditionType(session.when);
          const needsQuest = ctype !== "always";
          const linesText = session.lines.join("\n");

          return (
            <div
              key={idx}
              className="space-y-1.5 rounded border border-gray-700 bg-gray-950/80 p-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[9px] font-medium text-emerald-200/90">State {idx + 1}</span>
                <div className="flex flex-wrap gap-0.5">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
