import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { isNpcDialogueSurvivorSpawnTile } from "@survive-the-night/game-shared/map/spawn-palette";

export function SpawnerMetaModal() {
  const spawnerConfigModal = useEditorStore((s) => s.spawnerConfigModal);
  const setSpawnerConfigModal = useEditorStore((s) => s.setSpawnerConfigModal);
  const startSpawnerRelocate = useEditorStore((s) => s.startSpawnerRelocate);
  const spawnsGrid = useEditorStore((s) => s.spawnsGrid);
  const spawnerMeta = useEditorStore((s) => s.spawnerMeta);
  const updateSpawnerMetaAt = useEditorStore((s) => s.updateSpawnerMetaAt);
  const removeSpawnerAt = useEditorStore((s) => s.removeSpawnerAt);

  const open = spawnerConfigModal !== null;
  const row = spawnerConfigModal?.row ?? 0;
  const col = spawnerConfigModal?.col ?? 0;
  const tileId = spawnsGrid[row]?.[col] ?? 0;
  const valid =
    open &&
    tileId > 0 &&
    !isNpcDialogueSurvivorSpawnTile(tileId);
  const entry = spawnerMeta.find((e) => e.row === row && e.col === col);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setSpawnerConfigModal(null)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none border-gray-600 bg-gray-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Spawner</DialogTitle>
          <DialogDescription className="text-gray-400">
            Optional label for this spawn point (editor reference; row {row}, col {col}). Use
            Relocate to move it on the map (the dialog closes until you pick a tile).
          </DialogDescription>
        </DialogHeader>
        {!valid ? (
          <p className="text-[10px] text-gray-500">
            This tile is not a spawner anymore. Close and pick another from the list.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                onClick={() => startSpawnerRelocate(row, col)}
              >
                Relocate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
                onClick={() => removeSpawnerAt(row, col)}
              >
                Remove
              </Button>
            </div>
            <label className="block text-[10px] font-medium text-gray-400">Display name</label>
            <input
              className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px] text-gray-100"
              value={entry?.name ?? ""}
              placeholder="(optional)"
              maxLength={48}
              onChange={(e) => updateSpawnerMetaAt(row, col, e.target.value)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
