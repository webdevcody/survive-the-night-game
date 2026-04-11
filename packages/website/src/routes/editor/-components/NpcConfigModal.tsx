import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { useEditorStore } from "../-store";
import { NpcAuthoringPanel } from "./NpcAuthoringPanel";

export function NpcConfigModal() {
  const npcConfigModal = useEditorStore((s) => s.npcConfigModal);
  const setNpcConfigModal = useEditorStore((s) => s.setNpcConfigModal);
  const dialogueNpcs = useEditorStore((s) => s.dialogueNpcs);
  const updateDialogueNpcEntry = useEditorStore((s) => s.updateDialogueNpcEntry);
  const startDialogueNpcRelocate = useEditorStore((s) => s.startDialogueNpcRelocate);
  const removeDialogueNpcAt = useEditorStore((s) => s.removeDialogueNpcAt);

  const open = npcConfigModal !== null;
  const row = npcConfigModal?.row ?? 0;
  const col = npcConfigModal?.col ?? 0;
  const entry = dialogueNpcs.find((e) => e.row === row && e.col === col);

  const nameInputClass =
    "w-full min-w-[12rem] max-w-[20rem] rounded-md border border-gray-600 bg-gray-950 px-2.5 py-2 text-sm text-gray-100 placeholder:text-gray-500";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setNpcConfigModal(null)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none border-gray-600 bg-gray-900 text-white sm:max-w-3xl">
        <DialogHeader className="space-y-0 pr-10 text-left">
          <DialogTitle className="text-lg font-semibold leading-none">
            Dialogue NPC editor
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-gray-700/50 pb-3">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="npc-modal-display-name"
              className="mb-1 block text-xs font-medium text-gray-400"
            >
              Display name
            </label>
            <input
              id="npc-modal-display-name"
              type="text"
              className={nameInputClass}
              value={entry?.name ?? ""}
              placeholder="(optional)"
              maxLength={48}
              disabled={!entry}
              onChange={(e) => {
                if (!entry) return;
                updateDialogueNpcEntry(row, col, { name: e.target.value || undefined });
              }}
            />
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-8 text-xs"
              onClick={() => startDialogueNpcRelocate(row, col)}
            >
              Relocate
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

        {open ? <NpcAuthoringPanel row={row} col={col} variant="modal" /> : null}
      </DialogContent>
    </Dialog>
  );
}
