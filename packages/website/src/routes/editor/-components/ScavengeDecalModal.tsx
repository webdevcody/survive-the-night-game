import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { ComboboxTypeahead } from "~/components/ui/combobox-typeahead";
import { WholeNumberInput } from "~/components/ui/whole-number-input";
import { useEditorStore } from "../-store";
import {
  DEFAULT_SCAVENGE_DECAL_DROP_MAX,
  DEFAULT_SCAVENGE_DECAL_DROP_MIN,
  DEFAULT_SCAVENGE_DECAL_RESPAWN_MS,
  DEFAULT_SCAVENGE_DECAL_SEARCH_MS,
  MERCHANT_META_MAX_SHOP_LINES,
} from "@survive-the-night/game-shared/map/world-map-types";
import type { ZombieDropTableEntry } from "@survive-the-night/game-shared/config/zombie-drop-tables";
import {
  itemRegistry,
  resourceRegistry,
  weaponRegistry,
} from "@survive-the-night/game-shared/entities/index";
import { DECAL_TILE_SCAVENGE } from "@survive-the-night/game-shared/map/decal-palette";

const SCAVENGE_DROP_WEIGHT_MAX = 1_000_000;
const SCAVENGE_STACK_PER_LINE_MAX = 99;

function sortedAllItemTypeIds(): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const id of itemRegistry.getAllItemIds()) push(id);
  for (const id of weaponRegistry.getAllWeaponTypes()) push(id);
  for (const id of resourceRegistry.getAllResourceTypes()) push(id);
  ids.sort((a, b) => a.localeCompare(b));
  return ids;
}

function patchDropLine(
  line: ZombieDropTableEntry,
  patch: Partial<ZombieDropTableEntry>,
): ZombieDropTableEntry {
  const m: ZombieDropTableEntry = { ...line, ...patch };
  if (m.count == null || m.count <= 1) {
    const { count: _omit, ...rest } = m;
    return rest;
  }
  return m;
}

function ScavengeDropTableEditor({
  row,
  col,
  dropTable,
  itemOptions,
  firstItemType,
}: {
  row: number;
  col: number;
  dropTable: ZombieDropTableEntry[] | undefined;
  itemOptions: { value: string; label: string }[];
  firstItemType: string;
}) {
  const updateScavengeDecalEntry = useEditorStore((state) => state.updateScavengeDecalEntry);
  const lines = dropTable ?? [];
  const usesBuiltInLoot = lines.length === 0;

  const setLines = (next: ZombieDropTableEntry[]) => {
    updateScavengeDecalEntry(row, col, { dropTable: next });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
          disabled={usesBuiltInLoot}
          onClick={() => updateScavengeDecalEntry(row, col, { dropTable: [] })}
        >
          Use built-in loot
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"
          disabled={!usesBuiltInLoot && lines.length >= MERCHANT_META_MAX_SHOP_LINES}
          onClick={() => {
            const next: ZombieDropTableEntry = { itemType: firstItemType, weight: 1 };
            setLines([...lines, next]);
          }}
        >
          + Add item
        </Button>
      </div>

      {usesBuiltInLoot ? (
        <p className="text-[10px] text-amber-200/90">
          Using the built-in random loot table. Click &quot;Add item&quot; to define a custom weighted
          set for this tile only.
        </p>
      ) : lines.length === 0 ? (
        <p className="text-[10px] text-gray-500">Custom list is empty — nothing can drop here.</p>
      ) : null}

      <ul className="space-y-2">
        {lines.map((line, idx) => (
          <li
            key={`scavenge-drop-${row}-${col}-${idx}`}
            className="flex flex-wrap items-end gap-2 rounded border border-gray-700 bg-gray-950/60 p-2"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <label className="block text-[9px] font-medium text-gray-500">Item</label>
              <ComboboxTypeahead
                value={line.itemType}
                options={itemOptions}
                placeholder="Type to search…"
                stopEscapePropagation
                listClassName="max-h-48"
                onValueChange={(v) => {
                  const next = lines.map((x, i) =>
                    i === idx ? patchDropLine(x, { itemType: v }) : x,
                  );
                  setLines(next);
                }}
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="block text-[9px] font-medium text-gray-500">Weight</label>
              <WholeNumberInput
                min={1}
                max={SCAVENGE_DROP_WEIGHT_MAX}
                className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100"
                value={line.weight}
                onValueChange={(weight) => {
                  const next = lines.map((x, i) =>
                    i === idx ? patchDropLine(x, { weight }) : x,
                  );
                  setLines(next);
                }}
              />
            </div>
            <div className="w-20 space-y-1">
              <label className="block text-[9px] font-medium text-gray-500">Stack</label>
              <WholeNumberInput
                min={1}
                max={SCAVENGE_STACK_PER_LINE_MAX}
                className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100"
                value={line.count ?? 1}
                onValueChange={(n) => {
                  const next = lines.map((x, i) =>
                    i === idx ? patchDropLine(x, { count: n <= 1 ? undefined : n }) : x,
                  );
                  setLines(next);
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="!h-8 !text-[10px] text-red-300 hover:bg-red-950/40 hover:text-red-200"
              onClick={() => {
                setLines(lines.filter((_, i) => i !== idx));
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScavengeDecalModal() {
  const scavengeConfigModal = useEditorStore((s) => s.scavengeConfigModal);
  const setScavengeConfigModal = useEditorStore((s) => s.setScavengeConfigModal);
  const decalsGrid = useEditorStore((s) => s.decalsGrid);
  const scavengeDecals = useEditorStore((s) => s.scavengeDecals);
  const updateScavengeDecalEntry = useEditorStore((s) => s.updateScavengeDecalEntry);
  const removeScavengeDecalAt = useEditorStore((s) => s.removeScavengeDecalAt);

  const itemIds = useMemo(() => sortedAllItemTypeIds(), []);
  const itemOptions = useMemo(
    () => itemIds.map((id) => ({ value: id, label: id })),
    [itemIds],
  );
  const firstItemType = itemIds[0] ?? "wood";

  const open = scavengeConfigModal !== null;
  const row = scavengeConfigModal?.row ?? 0;
  const col = scavengeConfigModal?.col ?? 0;
  const decalId = decalsGrid[row]?.[col] ?? 0;
  const isScavengeTile = open && decalId === DECAL_TILE_SCAVENGE;
  const entry = scavengeDecals.find((e) => e.row === row && e.col === col) ?? { row, col };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setScavengeConfigModal(null);
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden rounded-none border-gray-600 bg-gray-900 text-white sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Scavenge pile</DialogTitle>
          <DialogDescription className="text-gray-400">
            Hold-to-search loot for this decal (row {row}, col {col}). Set timings, roll counts,
            and optional weighted item overrides.
          </DialogDescription>
        </DialogHeader>
        {!isScavengeTile ? (
          <p className="text-[10px] text-gray-500">
            This tile is not a scavenge decal. Close and pick another from the Scavenge list or click
            a <span className="text-lime-200">Scavenge</span> cell on the map while the Scavenge tab
            is active.
          </p>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[9px] font-medium text-gray-500">Search (ms)</label>
                <WholeNumberInput
                  min={250}
                  max={60_000}
                  className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100"
                  value={entry.searchDurationMs ?? DEFAULT_SCAVENGE_DECAL_SEARCH_MS}
                  onValueChange={(n) =>
                    updateScavengeDecalEntry(row, col, {
                      searchDurationMs:
                        n === DEFAULT_SCAVENGE_DECAL_SEARCH_MS ? undefined : n,
                    })
                  }
                />
                <p className="text-[9px] text-gray-600">
                  Default {DEFAULT_SCAVENGE_DECAL_SEARCH_MS} ms
                </p>
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-medium text-gray-500">Respawn (ms)</label>
                <WholeNumberInput
                  min={1000}
                  max={3_600_000}
                  className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100"
                  value={entry.respawnMs ?? DEFAULT_SCAVENGE_DECAL_RESPAWN_MS}
                  onValueChange={(n) =>
                    updateScavengeDecalEntry(row, col, {
                      respawnMs: n === DEFAULT_SCAVENGE_DECAL_RESPAWN_MS ? undefined : n,
                    })
                  }
                />
                <p className="text-[9px] text-gray-600">
                  Default {DEFAULT_SCAVENGE_DECAL_RESPAWN_MS} ms
                </p>
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-medium text-gray-500">Drops min</label>
                <WholeNumberInput
                  min={1}
                  max={99}
                  className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100"
                  value={entry.dropCountMin ?? DEFAULT_SCAVENGE_DECAL_DROP_MIN}
                  onValueChange={(n) =>
                    updateScavengeDecalEntry(row, col, {
                      dropCountMin: n === DEFAULT_SCAVENGE_DECAL_DROP_MIN ? undefined : n,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-medium text-gray-500">Drops max</label>
                <WholeNumberInput
                  min={1}
                  max={99}
                  className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100"
                  value={entry.dropCountMax ?? DEFAULT_SCAVENGE_DECAL_DROP_MAX}
                  onValueChange={(n) =>
                    updateScavengeDecalEntry(row, col, {
                      dropCountMax: n === DEFAULT_SCAVENGE_DECAL_DROP_MAX ? undefined : n,
                    })
                  }
                />
              </div>
            </div>
            <p className="text-[10px] font-medium text-gray-500">Item set</p>
            <ScavengeDropTableEditor
              row={row}
              col={col}
              dropTable={entry.dropTable}
              itemOptions={itemOptions}
              firstItemType={firstItemType}
            />
            <div className="border-t border-gray-700 pt-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="!h-7 !rounded-none !px-2 !text-[10px] text-red-300 hover:bg-red-950/40 hover:text-red-200"
                onClick={() => {
                  removeScavengeDecalAt(row, col);
                  setScavengeConfigModal(null);
                }}
              >
                Remove scavenge decal from map
              </Button>
              <p className="mt-1 text-[9px] text-gray-500">
                Clears this decals-layer cell and its loot configuration.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
