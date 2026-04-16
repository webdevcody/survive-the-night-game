import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useEditorStore } from "../-store";
import {
  SPAWNER_META_RESPAWN_INTERVAL_SEC_MAX,
  SPAWNER_META_RESPAWN_INTERVAL_SEC_MIN,
} from "@survive-the-night/game-shared/map/world-map-types";
import {
  SPAWNER_META_CONFIGURABLE_ENTRIES,
  SPAWNER_META_TYPEAHEAD_GROUP_LABEL,
  SPAWNER_META_TYPEAHEAD_GROUP_ORDER,
  getAuthoredSpawnerDefaultRespawnSec,
  getSpawnerMetaTypeaheadGroupId,
  isNpcDialogueSpawnTile,
  isPlayerSpawnTile,
} from "@survive-the-night/game-shared/map/spawn-palette";
import { EditorSpawnSpriteIcon } from "./EditorSpawnSpriteIcon";

function configurableEntriesForGroup(
  group: (typeof SPAWNER_META_TYPEAHEAD_GROUP_ORDER)[number],
) {
  return SPAWNER_META_CONFIGURABLE_ENTRIES.filter(
    (e) => getSpawnerMetaTypeaheadGroupId(e.id) === group,
  );
}

const SPAWNER_TYPE_SELECT_PLAYER_ENTRIES = SPAWNER_META_CONFIGURABLE_ENTRIES.filter((e) =>
  isPlayerSpawnTile(e.id),
);

export function SpawnerMetaModal() {
  const spawnerConfigModal = useEditorStore((s) => s.spawnerConfigModal);
  const setSpawnerConfigModal = useEditorStore((s) => s.setSpawnerConfigModal);
  const startSpawnerRelocate = useEditorStore((s) => s.startSpawnerRelocate);
  const spawnsGrid = useEditorStore((s) => s.spawnsGrid);
  const spawnerMeta = useEditorStore((s) => s.spawnerMeta);
  const updateSpawnerMetaAt = useEditorStore((s) => s.updateSpawnerMetaAt);
  const updateSpawnerRespawnIntervalSecAt = useEditorStore(
    (s) => s.updateSpawnerRespawnIntervalSecAt,
  );
  const setSpawnerSpawnTypeAt = useEditorStore((s) => s.setSpawnerSpawnTypeAt);
  const removeSpawnerAt = useEditorStore((s) => s.removeSpawnerAt);

  const open = spawnerConfigModal !== null;
  const row = spawnerConfigModal?.row ?? 0;
  const col = spawnerConfigModal?.col ?? 0;
  const tileId = spawnsGrid[row]?.[col] ?? 0;
  const valid =
    open && tileId > 0 && !isNpcDialogueSpawnTile(tileId);
  const entry = spawnerMeta.find((e) => e.row === row && e.col === col);
  const defaultRespawnSec = getAuthoredSpawnerDefaultRespawnSec(tileId);
  const showRespawnInterval = valid && !isPlayerSpawnTile(tileId);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setSpawnerConfigModal(null)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none border-gray-600 bg-gray-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Spawner</DialogTitle>
          <DialogDescription className="text-gray-400">
            Set spawn type (player, zombie, or item fixture), optional display name for the editor (row{" "}
            {row}, col {col}). Use Relocate to move this marker (the dialog closes until you pick a
            tile).
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
            <label className="block text-[10px] font-medium text-gray-400">Spawner type</label>
            <Select
              value={String(tileId)}
              onValueChange={(v) => setSpawnerSpawnTypeAt(row, col, Number(v))}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-full rounded border-gray-600 bg-gray-950 text-[11px] text-gray-100"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <EditorSpawnSpriteIcon spawnTileId={tileId} zoom={2} />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent className="max-h-[min(24rem,60vh)] border-gray-600 bg-gray-900 text-gray-100">
                {SPAWNER_TYPE_SELECT_PLAYER_ENTRIES.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] text-gray-500">Player</SelectLabel>
                    {SPAWNER_TYPE_SELECT_PLAYER_ENTRIES.map((e) => (
                      <SelectItem
                        key={e.id}
                        value={String(e.id)}
                        className="cursor-pointer text-[11px] focus:bg-gray-800 focus:text-gray-100"
                      >
                        <span className="flex items-center gap-2">
                          <EditorSpawnSpriteIcon spawnTileId={e.id} zoom={2} />
                          {e.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                {SPAWNER_META_TYPEAHEAD_GROUP_ORDER.map((groupId) => {
                  const groupEntries = configurableEntriesForGroup(groupId);
                  if (groupEntries.length === 0) {
                    return null;
                  }
                  return (
                    <SelectGroup key={groupId}>
                      <SelectLabel className="text-[10px] text-gray-500">
                        {SPAWNER_META_TYPEAHEAD_GROUP_LABEL[groupId]}
                      </SelectLabel>
                      {groupEntries.map((e) => (
                        <SelectItem
                          key={e.id}
                          value={String(e.id)}
                          className="cursor-pointer text-[11px] focus:bg-gray-800 focus:text-gray-100"
                        >
                          <span className="flex items-center gap-2">
                            <EditorSpawnSpriteIcon spawnTileId={e.id} zoom={2} />
                            {e.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            {showRespawnInterval ? (
              <div className="space-y-1">
                <label className="block text-[10px] font-medium text-gray-400">
                  Seconds between respawns
                </label>
                <input
                  type="number"
                  min={SPAWNER_META_RESPAWN_INTERVAL_SEC_MIN}
                  max={SPAWNER_META_RESPAWN_INTERVAL_SEC_MAX}
                  step={1}
                  className="w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px] text-gray-100"
                  value={entry?.respawnIntervalSec ?? ""}
                  placeholder={
                    defaultRespawnSec != null ? `default ${defaultRespawnSec}` : "default"
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      updateSpawnerRespawnIntervalSecAt(row, col, null);
                      return;
                    }
                    const n = Number(v);
                    if (!Number.isFinite(n)) return;
                    updateSpawnerRespawnIntervalSecAt(row, col, n);
                  }}
                />
                <p className="text-[9px] text-gray-500">
                  Leave empty to use the default for this spawner type
                  {defaultRespawnSec != null ? ` (${defaultRespawnSec}s)` : ""}. Custom values:{" "}
                  {SPAWNER_META_RESPAWN_INTERVAL_SEC_MIN}–{SPAWNER_META_RESPAWN_INTERVAL_SEC_MAX}s.
                </p>
              </div>
            ) : null}
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
