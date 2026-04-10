import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
} from "@survive-the-night/game-shared/map/spawn-palette";
import { getDialogueNpcLines } from "@survive-the-night/game-shared/map/world-map-types";

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

  const entry = dialogueNpcs.find((e) => e.row === row && e.col === col);
  if (!entry) {
    return (
      <p className="text-[10px] text-gray-500">
        No dialogue data for tile {row},{col}. Paint a Dialogue NPC tile first.
      </p>
    );
  }

  const linesText = getDialogueNpcLines(entry).join("\n");

  return (
    <div className="space-y-2 rounded border border-emerald-700/80 bg-gray-900/90 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-emerald-300">Dialogue NPC</span>
        <div className="flex gap-1">
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
      <label className="block text-[10px] font-medium text-gray-400">Display name</label>
      <input
        className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px] text-gray-100"
        value={entry.name ?? ""}
        placeholder="(optional)"
        maxLength={48}
        onChange={(e) => updateDialogueNpcEntry(row, col, { name: e.target.value || undefined })}
      />
      <label className="block text-[10px] font-medium text-gray-400">
        Dialog lines (one per line; Space advances in-game)
      </label>
      <textarea
        className="min-h-[6rem] w-full resize-y rounded border border-gray-600 bg-gray-950 px-2 py-1 font-mono text-[11px] text-gray-100"
        value={linesText}
        onChange={(e) => {
          const raw = e.target.value.split("\n");
          const lines = raw
            .map((l) => l.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH))
            .slice(0, DIALOGUE_NPC_MAX_LINE_COUNT);
          if (lines.length === 0) {
            updateDialogueNpcEntry(row, col, { lines: ["…"] });
          } else {
            updateDialogueNpcEntry(row, col, { lines });
          }
        }}
        spellCheck={true}
      />
      <label className="block text-[10px] font-medium text-gray-400">
        Grant quest after last line (optional)
      </label>
      <select
        className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px] text-gray-100"
        value={entry.grantQuestId ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          updateDialogueNpcEntry(row, col, {
            grantQuestId: v === "" ? null : v,
          });
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
}
