import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { DECAL_TILE_SCAVENGE } from "@survive-the-night/game-shared/map/decal-palette";

function collectScavengeCells(decals: number[][]): { row: number; col: number }[] {
  const n = decals.length;
  const out: { row: number; col: number }[] = [];
  for (let r = 0; r < n; r++) {
    const dr = decals[r];
    if (!dr) continue;
    for (let c = 0; c < n; c++) {
      if (dr[c] === DECAL_TILE_SCAVENGE) {
        out.push({ row: r, col: c });
      }
    }
  }
  return out.sort((a, b) => a.row - b.row || a.col - b.col);
}

export function ScavengeListPanel() {
  const decalsGrid = useEditorStore((s) => s.decalsGrid);
  const scavengeDecals = useEditorStore((s) => s.scavengeDecals);
  const openScavengeDecalEditor = useEditorStore((s) => s.openScavengeDecalEditor);
  const focusCameraOnMapCell = useEditorStore((s) => s.focusCameraOnMapCell);
  const removeScavengeDecalAt = useEditorStore((s) => s.removeScavengeDecalAt);
  const scavengePlaceMode = useEditorStore((s) => s.scavengePlaceMode);
  const setScavengePlaceMode = useEditorStore((s) => s.setScavengePlaceMode);

  const cells = useMemo(() => collectScavengeCells(decalsGrid), [decalsGrid]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 text-[11px] text-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={scavengePlaceMode ? "default" : "secondary"}
          className={`!h-7 !rounded-none !px-2 !text-[11px] ${
            scavengePlaceMode ? "bg-lime-700 hover:bg-lime-600" : ""
          }`}
          onClick={() => setScavengePlaceMode(!scavengePlaceMode)}
        >
          {scavengePlaceMode ? "Placing… (click map)" : "Place scavenge on map"}
        </Button>
        <span className="text-[9px] text-gray-500">
          One click paints a scavenge decal on the decals layer; Esc cancels. You can still paint
          from the Tiles tab.
        </span>
      </div>
      <p className="text-[10px] text-gray-500">
        <span className="text-lime-200">Scavenge</span> decals on the map. With this tab selected,
        click a scavenge cell on the map to edit timings and loot — same idea as merchants. Or use{" "}
        <span className="text-gray-400">Place scavenge on map</span> above.
      </p>
      {cells.length === 0 ? (
        <p className="text-xs text-gray-500">
          No scavenge piles yet. Use the Tiles tab, decals layer, and paint{" "}
          <span className="text-lime-300">Scavenge</span>.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {cells.map(({ row, col }) => {
            const meta = scavengeDecals.find((e) => e.row === row && e.col === col);
            const hasCustomTable = meta?.dropTable != null && meta.dropTable.length > 0;
            const summary = hasCustomTable
              ? `Custom loot: ${meta!.dropTable!.length} row(s)`
              : "Built-in loot table";
            return (
              <li key={`${row},${col}`}>
                <div className="flex gap-1 rounded border border-gray-700 bg-gray-950/80 hover:border-gray-500">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col items-start px-2 py-1.5 text-left"
                    onClick={() => {
                      focusCameraOnMapCell(row, col);
                      openScavengeDecalEditor(row, col);
                    }}
                  >
                    <span className="font-mono text-[10px] text-gray-400">
                      row {row}, col {col}
                    </span>
                    <span className="text-[11px] text-gray-300">{summary}</span>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title="Remove scavenge decal"
                    className="!h-auto shrink-0 !rounded-none !px-2 !py-1 !text-[10px] text-red-300 hover:bg-red-950/50 hover:text-red-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeScavengeDecalAt(row, col);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
