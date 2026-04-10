import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { DIALOGUE_NPC_MAX_MESSAGE_LENGTH } from "@survive-the-night/game-shared/map/spawn-palette";

export function DialogueNpcsPanel() {
  const dialogueNpcs = useEditorStore((state) => state.dialogueNpcs);
  const updateDialogueNpcMessage = useEditorStore((state) => state.updateDialogueNpcMessage);
  const removeDialogueNpcAt = useEditorStore((state) => state.removeDialogueNpcAt);

  if (dialogueNpcs.length === 0) {
    return (
      <p className="text-[10px] text-gray-500">
        Paint a <span className="text-emerald-300">Dialogue NPC</span> tile on the map, then edit
        messages here.
      </p>
    );
  }

  return (
    <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
      {dialogueNpcs.map((entry) => (
        <div
          key={`${entry.row}-${entry.col}`}
          className="rounded border border-emerald-700/80 bg-gray-900/80 p-2"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-gray-400">
              row {entry.row}, col {entry.col}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
              onClick={() => removeDialogueNpcAt(entry.row, entry.col)}
            >
              Remove
            </Button>
          </div>
          <textarea
            className="min-h-[4rem] w-full resize-y rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px] text-gray-100"
            value={entry.message}
            maxLength={DIALOGUE_NPC_MAX_MESSAGE_LENGTH}
            onChange={(e) =>
              updateDialogueNpcMessage(entry.row, entry.col, e.target.value)
            }
            spellCheck={true}
          />
          <p className="mt-0.5 text-[9px] text-gray-500">
            {entry.message.length}/{DIALOGUE_NPC_MAX_MESSAGE_LENGTH}
          </p>
        </div>
      ))}
    </div>
  );
}
