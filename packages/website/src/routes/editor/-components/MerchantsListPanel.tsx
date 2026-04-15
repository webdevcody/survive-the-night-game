import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { DECAL_TILE_SHOPKEEPER } from "@survive-the-night/game-shared/map/decal-palette";
import { COLLIDABLE_TILE_MERCHANT } from "@survive-the-night/game-shared/map/collidable-tile-ids";

function collectMerchantCells(
  decals: number[][],
  collidables: number[][],
): { row: number; col: number }[] {
  const n = decals.length;
  const out: { row: number; col: number }[] = [];
  const seen = new Set<string>();
  for (let r = 0; r < n; r++) {
    const dr = decals[r];
    const cr = collidables[r];
    if (!dr || !cr) continue;
    for (let c = 0; c < n; c++) {
      if (dr[c] === DECAL_TILE_SHOPKEEPER || cr[c] === COLLIDABLE_TILE_MERCHANT) {
        const k = `${r},${c}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ row: r, col: c });
      }
    }
  }
  return out.sort((a, b) => a.row - b.row || a.col - b.col);
}

export function MerchantsListPanel() {
  const decalsGrid = useEditorStore((s) => s.decalsGrid);
  const collidablesGrid = useEditorStore((s) => s.collidablesGrid);
  const merchantMeta = useEditorStore((s) => s.merchantMeta);
  const openMerchantMetaEditor = useEditorStore((s) => s.openMerchantMetaEditor);
  const focusCameraOnMapCell = useEditorStore((s) => s.focusCameraOnMapCell);
  const merchantPlaceMode = useEditorStore((s) => s.merchantPlaceMode);
  const setMerchantPlaceMode = useEditorStore((s) => s.setMerchantPlaceMode);
  const removeMerchantAtTile = useEditorStore((s) => s.removeMerchantAtTile);

  const cells = useMemo(
    () => collectMerchantCells(decalsGrid, collidablesGrid),
    [decalsGrid, collidablesGrid],
  );

  const sortedCells = useMemo(() => {
    const decorated = cells.map((cell) => {
      const meta = merchantMeta.find((e) => e.row === cell.row && e.col === cell.col);
      return { cell, label: meta?.label?.trim() ?? "" };
    });
    decorated.sort((a, b) => {
      const byLabel = a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      if (byLabel !== 0) return byLabel;
      return a.cell.row - b.cell.row || a.cell.col - b.cell.col;
    });
    return decorated.map((d) => d.cell);
  }, [cells, merchantMeta]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 text-[11px] text-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={merchantPlaceMode ? "default" : "secondary"}
          className={`!h-7 !rounded-none !px-2 !text-[11px] ${
            merchantPlaceMode ? "bg-violet-600 hover:bg-violet-500" : ""
          }`}
          onClick={() => setMerchantPlaceMode(!merchantPlaceMode)}
        >
          {merchantPlaceMode ? "Placing… (click map)" : "Place merchant on map"}
        </Button>
        <span className="text-[9px] text-gray-500">
          One click places a shopkeeper; Esc cancels. You can also right-click the map → Add
          merchant.
        </span>
      </div>
      <p className="text-[10px] text-gray-500">
        Shopkeeper decals and merchant collidables. Without a custom list, each uses the global
        buyable-items catalog. Add rows below per shop to override items and coin prices (base
        price; surcharges still apply in-game).
      </p>
      {cells.length === 0 ? (
        <p className="text-xs text-gray-500">
          No merchants on the map. Paint a <span className="text-violet-300">Shopkeeper</span> decal
          or place the merchant collidable tile.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {sortedCells.map(({ row, col }) => {
            const meta = merchantMeta.find((e) => e.row === row && e.col === col);
            const summary =
              meta?.shopItems === undefined
                ? "Global catalog"
                : meta.shopItems.length === 0
                  ? "Custom: empty stock"
                  : `Custom: ${meta.shopItems.length} item(s)`;
            const title = meta?.label?.trim() || "Unlabeled merchant";
            return (
              <li key={`${row},${col}`}>
                <div className="flex gap-1 rounded border border-gray-700 bg-gray-950/80 hover:border-gray-500">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col items-start px-2 py-1.5 text-left"
                    onClick={() => {
                      focusCameraOnMapCell(row, col);
                      openMerchantMetaEditor(row, col);
                    }}
                  >
                    <span className="text-[11px] font-medium text-gray-100">{title}</span>
                    <span className="font-mono text-[10px] text-gray-400">
                      row {row}, col {col}
                    </span>
                    <span className="text-[11px] text-gray-300">{summary}</span>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title="Remove shopkeeper decal / merchant tile"
                    className="!h-auto shrink-0 !rounded-none !px-2 !py-1 !text-[10px] text-red-300 hover:bg-red-950/50 hover:text-red-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMerchantAtTile(row, col);
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
