import { useEditorStore } from "../-store";

/** Shown while picking a destination tile; modal is closed so the map stays clickable. */
export function RelocateMapBanner() {
  const npcFrom = useEditorStore((s) => s.dialogueNpcRelocateFrom);
  const spawnerFrom = useEditorStore((s) => s.spawnerRelocateFrom);
  const questPick = useEditorStore((s) => s.questWaypointPickTarget);
  const merchantRelocate = useEditorStore((s) => s.merchantRelocateFrom);
  const merchantPlace = useEditorStore((s) => s.merchantPlaceMode);

  if (!npcFrom && !spawnerFrom && !questPick && !merchantRelocate && !merchantPlace) return null;

  let label: string;
  if (merchantRelocate) {
    label = `Relocate merchant from (${merchantRelocate.row}, ${merchantRelocate.col}) — click a tile with empty decal and/or collidable slots as needed for this shop. Press Esc to cancel.`;
  } else if (merchantPlace) {
    label =
      "Place merchant — click a map tile to add a shopkeeper (decals). Press Esc to cancel.";
  } else if (npcFrom) {
    label = `Relocate dialogue NPC from (${npcFrom.row}, ${npcFrom.col}) — click an empty spawns tile. Press Esc to cancel.`;
  } else if (spawnerFrom) {
    label = `Relocate spawner from (${spawnerFrom.row}, ${spawnerFrom.col}) — click an empty spawns tile. Press Esc to cancel.`;
  } else {
    label = `Pick quest waypoint — click a map tile to set row/col for this step. Press Esc to cancel.`;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[45] max-w-lg -translate-x-1/2 rounded border border-amber-500/50 bg-gray-950/95 px-4 py-2 text-center text-[11px] text-amber-100 shadow-lg"
      role="status"
    >
      {label}
    </div>
  );
}
