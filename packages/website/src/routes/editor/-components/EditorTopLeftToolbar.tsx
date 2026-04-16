import { useState } from "react";
import { AlertCircle, Check, Expand, Loader2, Save, Undo2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import type { SaveStatus } from "../-types";
import { ExpandMapDialog } from "./ExpandMapDialog";

const iconBtn =
  "!h-8 !w-8 !min-w-0 shrink-0 !rounded-none !p-0 text-white [&_svg]:size-[18px]";

interface EditorTopLeftToolbarProps {
  onSaveMap: () => void;
  saveStatus: SaveStatus;
}

export function EditorTopLeftToolbar({ onSaveMap, saveStatus }: EditorTopLeftToolbarProps) {
  const history = useEditorStore((state) => state.history);
  const undo = useEditorStore((state) => state.undo);
  const [expandMapOpen, setExpandMapOpen] = useState(false);

  const saveClass =
    saveStatus === "saved"
      ? "bg-green-600 hover:bg-green-700 text-white border-0"
      : saveStatus === "error"
        ? "bg-red-600 hover:bg-red-700 text-white border-0"
        : "bg-blue-600 hover:bg-blue-700 text-white border-0";

  return (
    <>
      <div
        className="pointer-events-auto fixed left-[5px] top-[5px] z-40 flex gap-1 rounded-none bg-gray-900/95 px-1 py-1 shadow-2xl ring-1 ring-gray-700/90 backdrop-blur-md"
        onPointerDown={(e) => e.stopPropagation()}
        role="toolbar"
        aria-label="Map editor actions"
      >
        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={onSaveMap}
          disabled={saveStatus === "saving"}
          className={`${iconBtn} ${saveClass}`}
          title={
            saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                  ? "Save failed — try again"
                  : "Save map"
          }
          aria-label={
            saveStatus === "saving"
              ? "Saving map"
              : saveStatus === "saved"
                ? "Map saved"
                : saveStatus === "error"
                  ? "Save failed, retry"
                  : "Save map"
          }
        >
          {saveStatus === "saving" ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : saveStatus === "saved" ? (
            <Check aria-hidden />
          ) : saveStatus === "error" ? (
            <AlertCircle aria-hidden />
          ) : (
            <Save aria-hidden />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={undo}
          disabled={history.length === 0}
          className={`${iconBtn} border border-gray-600 bg-gray-800 text-white hover:bg-gray-700 ${
            history.length === 0 ? "cursor-not-allowed opacity-60" : ""
          }`}
          title={`Undo (Ctrl+Z)${history.length > 0 ? ` · ${history.length} step${history.length === 1 ? "" : "s"}` : ""}`}
          aria-label={`Undo last change${history.length > 0 ? `, ${history.length} available` : ", none available"}`}
        >
          <Undo2 aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={() => setExpandMapOpen(true)}
          className={`${iconBtn} border border-gray-600 bg-gray-800 text-white hover:bg-gray-700`}
          title="Expand map"
          aria-label="Expand map"
        >
          <Expand aria-hidden />
        </Button>
      </div>

      <ExpandMapDialog open={expandMapOpen} onOpenChange={setExpandMapOpen} />
    </>
  );
}
