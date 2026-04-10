import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { getDialogueNpcLines } from "@survive-the-night/game-shared/map/world-map-types";

export function NpcsListPanel() {
  const dialogueNpcs = useEditorStore((state) => state.dialogueNpcs);
  const removeDialogueNpcAt = useEditorStore((state) => state.removeDialogueNpcAt);
  const openDialogueNpcEditor = useEditorStore((state) => state.openDialogueNpcEditor);
  const focusCameraOnMapCell = useEditorStore((state) => state.focusCameraOnMapCell);

  const sorted = useMemo(
    () => [...dialogueNpcs].sort((a, b) => a.row - b.row || a.col - b.col),
    [dialogueNpcs],
  );

  if (sorted.length === 0) {
    return (
      <p className="text-[10px] text-gray-500">
        No dialogue NPCs yet. Right-click the map and choose{" "}
        <span className="text-emerald-300">Add NPC</span>.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-[10px] text-gray-500">
        {sorted.length} NPC{sorted.length === 1 ? "" : "s"} — click a row to edit.{" "}
        <span className="text-gray-400">Go</span> moves the camera.
      </p>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {sorted.map((entry) => {
          const preview = getDialogueNpcLines(entry)[0]?.slice(0, 100) ?? "";
          return (
            <li
              key={`${entry.row}-${entry.col}`}
              className="flex items-start justify-between gap-2 rounded border border-emerald-800/60 bg-gray-900/80 px-2 py-1.5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => openDialogueNpcEditor(entry.row, entry.col)}
              >
                <p className="text-[10px] font-medium text-gray-200">
                  ({entry.row}, {entry.col})
                  {entry.name ? ` · ${entry.name}` : ""}
                </p>
                <p className="truncate text-[9px] text-gray-500">{preview || "…"}</p>
              </button>
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
                  onClick={() => removeDialogueNpcAt(entry.row, entry.col)}
                >
                  Remove
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
