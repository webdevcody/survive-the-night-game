import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useEditorStore } from "../-store";
import { NpcAuthoringPanel } from "./NpcAuthoringPanel";

export function NpcConfigModal() {
  const npcConfigModal = useEditorStore((s) => s.npcConfigModal);
  const setNpcConfigModal = useEditorStore((s) => s.setNpcConfigModal);

  const open = npcConfigModal !== null;
  const row = npcConfigModal?.row ?? 0;
  const col = npcConfigModal?.col ?? 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setNpcConfigModal(null)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none border-gray-600 bg-gray-900 text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Dialogue NPC</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure dialog states (conditions, lines), optional quest grant, and optional quest
            completion when the conversation ends. Use Relocate to move the NPC (the dialog closes
            until you pick a tile).
          </DialogDescription>
        </DialogHeader>
        {open ? <NpcAuthoringPanel row={row} col={col} variant="modal" /> : null}
      </DialogContent>
    </Dialog>
  );
}
