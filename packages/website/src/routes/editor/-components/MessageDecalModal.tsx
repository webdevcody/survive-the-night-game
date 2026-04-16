import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
} from "@survive-the-night/game-shared/map/spawn-palette";
import { getMessageDecalLines } from "@survive-the-night/game-shared/map/world-map-types";
import { DECAL_TILE_MESSAGE } from "@survive-the-night/game-shared/map/decal-palette";

export function MessageDecalModal() {
  const messageConfigModal = useEditorStore((s) => s.messageConfigModal);
  const setMessageConfigModal = useEditorStore((s) => s.setMessageConfigModal);
  const decalsGrid = useEditorStore((s) => s.decalsGrid);
  const messageDecals = useEditorStore((s) => s.messageDecals);
  const updateMessageDecalEntry = useEditorStore((s) => s.updateMessageDecalEntry);
  const removeMessageDecalAt = useEditorStore((s) => s.removeMessageDecalAt);
  const focusCameraOnMapCell = useEditorStore((s) => s.focusCameraOnMapCell);

  const open = messageConfigModal !== null;
  const row = messageConfigModal?.row ?? 0;
  const col = messageConfigModal?.col ?? 0;
  const decalId = decalsGrid[row]?.[col] ?? 0;
  const isMessageTile = open && decalId === DECAL_TILE_MESSAGE;
  const entry =
    messageDecals.find((e) => e.row === row && e.col === col) ?? { row, col };
  const linesText = getMessageDecalLines(entry).join("\n");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMessageConfigModal(null);
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden rounded-none border-gray-600 bg-gray-900 text-white sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Message sign</DialogTitle>
          <DialogDescription className="text-gray-400">
            Text shown when players read this sign (row {row}, col {col}).
          </DialogDescription>
        </DialogHeader>
        {!isMessageTile ? (
          <p className="text-[10px] text-gray-500">
            This tile is not a message decal. Close and select the message marker in the Markers tab,
            or click a message sign cell on the map.
          </p>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                onClick={() => focusCameraOnMapCell(row, col)}
              >
                Focus on map
              </Button>
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-medium text-gray-500">Lines</label>
              <textarea
                className="min-h-[6rem] w-full resize-y rounded border border-gray-600 bg-gray-950 px-2 py-1.5 font-mono text-[11px] text-gray-100"
                value={linesText}
                onChange={(e) => {
                  const raw = e.target.value.split("\n");
                  const lines = raw
                    .map((l) => l.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH))
                    .slice(0, DIALOGUE_NPC_MAX_LINE_COUNT);
                  if (lines.length === 0) {
                    updateMessageDecalEntry(row, col, { lines: ["Read me."] });
                  } else {
                    updateMessageDecalEntry(row, col, { lines });
                  }
                }}
                spellCheck={true}
              />
              <p className="text-[9px] text-gray-600">
                One line per row in-game. Max {DIALOGUE_NPC_MAX_LINE_COUNT} lines,{" "}
                {DIALOGUE_NPC_MAX_MESSAGE_LENGTH} characters per line.
              </p>
            </div>
            <div className="border-t border-gray-700 pt-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-7 !rounded-none !px-2 !text-[10px] text-red-300 hover:bg-red-950/40 hover:text-red-200"
                onClick={() => {
                  removeMessageDecalAt(row, col);
                  setMessageConfigModal(null);
                }}
              >
                Remove message sign from map
              </Button>
              <p className="mt-1 text-[9px] text-gray-500">
                Clears this decals-layer cell and its message text.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
