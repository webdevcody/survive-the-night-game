import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useEditorStore } from "../-store";
import {
  SPAWN_PALETTE_ENTRIES,
  SPAWNER_META_CONFIGURABLE_ENTRIES,
  SPAWNER_META_TYPEAHEAD_GROUP_LABEL,
  SPAWNER_META_TYPEAHEAD_GROUP_ORDER,
  getSpawnerMetaTypeaheadGroupId,
  isNpcDialogueSpawnTile,
  isPlayerSpawnTile,
} from "@survive-the-night/game-shared/map/spawn-palette";
import { getMapSideLength, isMapCellInEditorCameraView } from "../-utils";
import { EditorSpawnSpriteIcon } from "./EditorSpawnSpriteIcon";

const sectionLabel = "text-[10px] font-medium uppercase tracking-wide text-gray-500";

function spawnLabel(id: number): string {
  return SPAWN_PALETTE_ENTRIES.find((e) => e.id === id)?.label ?? `Spawn ${id}`;
}

export function SpawnersListPanel() {
  const spawnsGrid = useEditorStore((state) => state.spawnsGrid);
  const groundGrid = useEditorStore((state) => state.groundGrid);
  const cameraX = useEditorStore((state) => state.cameraX);
  const cameraY = useEditorStore((state) => state.cameraY);
  const viewportWidthTiles = useEditorStore((state) => state.viewportWidthTiles);
  const viewportHeightTiles = useEditorStore((state) => state.viewportHeightTiles);
  const spawnerMeta = useEditorStore((state) => state.spawnerMeta);
  const focusCameraOnMapCell = useEditorStore((state) => state.focusCameraOnMapCell);
  const openSpawnerMetaEditor = useEditorStore((state) => state.openSpawnerMetaEditor);
  const spawnerPlaceTileId = useEditorStore((state) => state.spawnerPlaceTileId);
  const setSpawnerPlaceTileId = useEditorStore((state) => state.setSpawnerPlaceTileId);
  const clearSpawnerPlacePick = useEditorStore((state) => state.clearSpawnerPlacePick);
  const spawnerPlaceInputResetSeq = useEditorStore((state) => state.spawnerPlaceInputResetSeq);

  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const [typeaheadQuery, setTypeaheadQuery] = useState("");
  const comboRef = useRef<HTMLDivElement>(null);
  const spawnerTypeaheadResetSkipFirst = useRef(true);

  const { playerPlaceOptions, groupedPlaceTypes } = useMemo(() => {
    const q = typeaheadQuery.trim().toLowerCase();
    const filtered = !q
      ? [...SPAWNER_META_CONFIGURABLE_ENTRIES]
      : SPAWNER_META_CONFIGURABLE_ENTRIES.filter((e) => e.label.toLowerCase().includes(q));

    const playerOpts = filtered.filter((e) => isPlayerSpawnTile(e.id));
    const rest = filtered.filter((e) => !isPlayerSpawnTile(e.id));

    const buckets = new Map<
      (typeof SPAWNER_META_TYPEAHEAD_GROUP_ORDER)[number],
      typeof filtered
    >();
    for (const gid of SPAWNER_META_TYPEAHEAD_GROUP_ORDER) {
      buckets.set(gid, []);
    }
    for (const e of rest) {
      const gid = getSpawnerMetaTypeaheadGroupId(e.id);
      if (gid != null) {
        buckets.get(gid)!.push(e);
      }
    }
    const groups = SPAWNER_META_TYPEAHEAD_GROUP_ORDER.map((gid) => ({
      id: gid,
      label: SPAWNER_META_TYPEAHEAD_GROUP_LABEL[gid],
      entries: buckets.get(gid)!,
    })).filter((g) => g.entries.length > 0);
    return { playerPlaceOptions: playerOpts, groupedPlaceTypes: groups };
  }, [typeaheadQuery]);

  const typeaheadHasResults =
    playerPlaceOptions.length > 0 || groupedPlaceTypes.length > 0;

  const showSpawnerTypeClear =
    typeaheadQuery.length > 0 ||
    (spawnerPlaceTileId != null && spawnerPlaceTileId > 0);

  useEffect(() => {
    if (spawnerTypeaheadResetSkipFirst.current) {
      spawnerTypeaheadResetSkipFirst.current = false;
      return;
    }
    setTypeaheadQuery("");
  }, [spawnerPlaceInputResetSeq]);

  useEffect(() => {
    if (!typeaheadOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (comboRef.current?.contains(e.target as Node)) return;
      setTypeaheadOpen(false);
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [typeaheadOpen]);

  const entries = useMemo(() => {
    const out: { row: number; col: number; id: number }[] = [];
    for (let row = 0; row < spawnsGrid.length; row++) {
      const r = spawnsGrid[row];
      if (!r) continue;
      for (let col = 0; col < r.length; col++) {
        const id = r[col] ?? 0;
        if (id > 0 && !isNpcDialogueSpawnTile(id)) {
          out.push({ row, col, id });
        }
      }
    }
    out.sort((a, b) => a.row - b.row || a.col - b.col);
    return out;
  }, [spawnsGrid]);

  const { inView, rest } = useMemo(() => {
    const mapSize = getMapSideLength(groundGrid);
    const vp = { cameraX, cameraY, viewportWidthTiles, viewportHeightTiles, mapSize };
    const a: typeof entries = [];
    const b: typeof entries = [];
    for (const e of entries) {
      if (isMapCellInEditorCameraView(e.row, e.col, vp)) a.push(e);
      else b.push(e);
    }
    return { inView: a, rest: b };
  }, [entries, groundGrid, cameraX, cameraY, viewportWidthTiles, viewportHeightTiles]);

  const renderRow = ({ row, col, id }: { row: number; col: number; id: number }) => {
    const authored = spawnerMeta.find((m) => m.row === row && m.col === col)?.name;
    return (
      <li
        key={`${row}-${col}-${id}`}
        className="flex items-center justify-between gap-2 rounded border border-violet-800/60 bg-gray-900/80 px-2 py-1.5"
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          onClick={() => openSpawnerMetaEditor(row, col)}
        >
          <EditorSpawnSpriteIcon spawnTileId={id} className="mt-0.5 shrink-0" zoom={2} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-gray-200">
              ({row}, {col})
              {authored ? ` · ${authored}` : ""}
            </p>
            <p className="truncate text-[9px] text-violet-200/90">{spawnLabel(id)}</p>
          </div>
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
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="space-y-1">
        <p className={`${sectionLabel}`}>Spawner type</p>
        <div ref={comboRef} className="relative">
          <Input
            type="text"
            autoComplete="off"
            placeholder="Search type…"
            value={typeaheadQuery}
            onChange={(e) => {
              const v = e.target.value;
              setTypeaheadQuery(v);
              setTypeaheadOpen(true);
              const trimmed = v.trim();
              if (!trimmed) {
                setSpawnerPlaceTileId(null);
                return;
              }
              const match = SPAWNER_META_CONFIGURABLE_ENTRIES.find(
                (x) => x.label.toLowerCase() === trimmed.toLowerCase(),
              );
              setSpawnerPlaceTileId(match?.id ?? null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                clearSpawnerPlacePick();
                setTypeaheadOpen(false);
              }
            }}
            onFocus={() => setTypeaheadOpen(true)}
            className={`h-8 rounded-none border-gray-600 bg-gray-950/80 text-[11px] text-gray-100 placeholder:text-gray-500 ${
              showSpawnerTypeClear ? "pr-8" : ""
            }`}
          />
          {showSpawnerTypeClear ? (
            <button
              type="button"
              aria-label="Clear spawner type"
              className="absolute right-0.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:bg-gray-800 hover:text-gray-200"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                clearSpawnerPlacePick();
                setTypeaheadOpen(false);
              }}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ) : null}
          {typeaheadOpen ? (
            <ul
              className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-80 overflow-y-auto rounded border border-gray-600 bg-gray-900 py-0.5 shadow-xl"
              role="listbox"
            >
              {!typeaheadHasResults ? (
                <li className="px-2 py-1.5 text-[10px] text-gray-500">No matches</li>
              ) : (
                <>
                  {playerPlaceOptions.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => {
                          setSpawnerPlaceTileId(e.id);
                          setTypeaheadQuery(e.label);
                          setTypeaheadOpen(false);
                        }}
                      >
                        <EditorSpawnSpriteIcon spawnTileId={e.id} zoom={2} />
                        <span className="min-w-0">{e.label}</span>
                      </button>
                    </li>
                  ))}
                  {groupedPlaceTypes.map((group) => (
                    <Fragment key={group.id}>
                      <li
                        role="presentation"
                        className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-gray-500"
                      >
                        {group.label}
                      </li>
                      {group.entries.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            role="option"
                            className="flex w-full items-center gap-2 px-2 py-1.5 pl-3 text-left text-[11px] text-gray-200 hover:bg-gray-800"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => {
                              setSpawnerPlaceTileId(e.id);
                              setTypeaheadQuery(e.label);
                              setTypeaheadOpen(false);
                            }}
                          >
                            <EditorSpawnSpriteIcon spawnTileId={e.id} zoom={2} />
                            <span className="min-w-0">{e.label}</span>
                          </button>
                        </li>
                      ))}
                    </Fragment>
                  ))}
                </>
              )}
            </ul>
          ) : null}
        </div>
        <div className="flex items-start gap-2 text-[10px] text-gray-500">
          {spawnerPlaceTileId != null && spawnerPlaceTileId > 0 ? (
            <>
              <EditorSpawnSpriteIcon spawnTileId={spawnerPlaceTileId} zoom={2} className="shrink-0" />
              <p>
                Click an <span className="text-gray-300">empty</span> map cell to place. Esc or{" "}
                <span className="text-gray-400">×</span> clears the type. Occupied cells still open
                the editor.
              </p>
            </>
          ) : (
            <p>Choose a spawner type above to paint, or click the map / list to edit an existing one.</p>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-[10px] text-gray-500">
          No spawners on the map yet. Pick a type above and click an empty cell, or right-click the
          map → <span className="text-violet-300">Add spawner</span>. Dialogue NPCs are under NPCs.
        </p>
      ) : (
        <>
          <p className="text-[10px] text-gray-500">
            {entries.length} spawner{entries.length === 1 ? "" : "s"} ({inView.length} in view) —
            Click a row or a spawner on the map to edit. <span className="text-gray-400">Go</span>{" "}
            moves the camera.
          </p>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <div>
              <p className={`${sectionLabel} mb-1`}>In view</p>
              {inView.length === 0 ? (
                <p className="text-[10px] text-gray-600">None in current view.</p>
              ) : (
                <ul className="space-y-1.5">{inView.map(renderRow)}</ul>
              )}
            </div>
            <div>
              <p className={`${sectionLabel} mb-1`}>Rest of map</p>
              {rest.length === 0 ? (
                <p className="text-[10px] text-gray-600">All spawners are in view.</p>
              ) : (
                <ul className="space-y-1.5">{rest.map(renderRow)}</ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
