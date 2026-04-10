import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import {
  DIALOGUE_NPC_MAX_LINE_COUNT,
  DIALOGUE_NPC_MAX_MESSAGE_LENGTH,
} from "@survive-the-night/game-shared/map/spawn-palette";
import { getMessageDecalLines } from "@survive-the-night/game-shared/map/world-map-types";

export function MessageDecalsListPanel() {
  const messageDecals = useEditorStore((state) => state.messageDecals);
  const updateMessageDecalEntry = useEditorStore((state) => state.updateMessageDecalEntry);
  const removeMessageDecalAt = useEditorStore((state) => state.removeMessageDecalAt);
  const focusCameraOnMapCell = useEditorStore((state) => state.focusCameraOnMapCell);

  const sorted = useMemo(
    () => [...messageDecals].sort((a, b) => a.row - b.row || a.col - b.col),
    [messageDecals],
  );

  if (sorted.length === 0) {
    return (
      <p className="text-[10px] text-gray-500">
        No message decals yet. Select the <span className="text-sky-300">Message</span> decal on
        the decals layer and paint the map.
      </p>
    );
  }

  return (
    <div className="mt-3 flex min-h-0 max-h-[40vh] flex-col gap-2 border-t border-gray-700 pt-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
        Message decals ({sorted.length})
      </p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {sorted.map((entry) => {
          const linesText = getMessageDecalLines(entry).join("\n");
          return (
            <li
              key={`${entry.row}-${entry.col}`}
              className="rounded border border-sky-900/50 bg-gray-900/80 px-2 py-1.5"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] text-sky-200/90">
                  ({entry.row}, {entry.col})
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                    onClick={() => focusCameraOnMapCell(entry.row, entry.col)}
                  >
                    Go
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                    onClick={() => removeMessageDecalAt(entry.row, entry.col)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <textarea
                className="min-h-[4rem] w-full resize-y rounded border border-gray-600 bg-gray-950 px-2 py-1 font-mono text-[11px] text-gray-100"
                value={linesText}
                onChange={(e) => {
                  const raw = e.target.value.split("\n");
                  const lines = raw
                    .map((l) => l.slice(0, DIALOGUE_NPC_MAX_MESSAGE_LENGTH))
                    .slice(0, DIALOGUE_NPC_MAX_LINE_COUNT);
                  if (lines.length === 0) {
                    updateMessageDecalEntry(entry.row, entry.col, { lines: ["Read me."] });
                  } else {
                    updateMessageDecalEntry(entry.row, entry.col, { lines });
                  }
                }}
                spellCheck={true}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
