import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import {
  SPAWN_PALETTE_ENTRIES,
  isNpcDialogueSurvivorSpawnTile,
} from "@survive-the-night/game-shared/map/spawn-palette";

function spawnLabel(id: number): string {
  return SPAWN_PALETTE_ENTRIES.find((e) => e.id === id)?.label ?? `Spawn ${id}`;
}

export function SpawnersListPanel() {
  const spawnsGrid = useEditorStore((state) => state.spawnsGrid);
  const spawnerMeta = useEditorStore((state) => state.spawnerMeta);
  const focusCameraOnMapCell = useEditorStore((state) => state.focusCameraOnMapCell);
  const openSpawnerMetaEditor = useEditorStore((state) => state.openSpawnerMetaEditor);

  const entries = useMemo(() => {
    const out: { row: number; col: number; id: number }[] = [];
    for (let row = 0; row < spawnsGrid.length; row++) {
      const r = spawnsGrid[row];
      if (!r) continue;
      for (let col = 0; col < r.length; col++) {
        const id = r[col] ?? 0;
        if (id > 0 && !isNpcDialogueSurvivorSpawnTile(id)) {
          out.push({ row, col, id });
        }
      }
    }
    out.sort((a, b) => a.row - b.row || a.col - b.col);
    return out;
  }, [spawnsGrid]);

  if (entries.length === 0) {
    return (
      <p className="text-[10px] text-gray-500">
        No spawners (player, zombies, or item fixtures) on the map. Right-click a tile and choose{" "}
        <span className="text-violet-300">Add spawner</span> on the map (first item type in the
        registry). Use <span className="text-gray-300">Go</span> to move the camera,{" "}
        <span className="text-gray-300">Select</span> to highlight on the map.
        Dialogue NPCs are under NPCs.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-[10px] text-gray-500">
        {entries.length} spawner{entries.length === 1 ? "" : "s"} — Click a row (or a spawner tile on
        the map) to edit the label and relocate. <span className="text-gray-400">Go</span> moves the
        camera.
      </p>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {entries.map(({ row, col, id }) => {
          const authored = spawnerMeta.find((m) => m.row === row && m.col === col)?.name;
          return (
            <li
              key={`${row}-${col}-${id}`}
              className="flex items-center justify-between gap-2 rounded border border-violet-800/60 bg-gray-900/80 px-2 py-1.5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => openSpawnerMetaEditor(row, col)}
              >
                <p className="text-[10px] font-medium text-gray-200">
                  ({row}, {col})
                  {authored ? ` · ${authored}` : ""}
                </p>
                <p className="truncate text-[9px] text-violet-200/90">{spawnLabel(id)}</p>
              </button>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                  onClick={() => focusCameraOnMapCell(row, col)}
                >
                  Go
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                  onClick={() =>
                    useEditorStore.setState({
                      activeLayer: "spawns",
                      selectedSpawnCell: { row, col },
                      selectedTileId: id,
                    })
                  }
                >
                  Select
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
