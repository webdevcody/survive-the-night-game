---
name: map-editor
description: >-
  Website map editor UI patterns: click-to-edit flows, Zustand modals, WholeNumberInput,
  ComboboxTypeahead for entity/item ids, list panels, and styling. Use when adding or changing
  anything under packages/website/src/routes/editor (sidebar, modals, decal/NPC/merchant/spawner
  authoring, numeric fields, or typeaheads).
---

# Map editor (website)

Read this skill **before** implementing or refactoring UI in [`packages/website/src/routes/editor`](../../../packages/website/src/routes/editor). After changes, verify the checklist at the end.

## Layout and state

- **Editor route:** [`index.tsx`](../../../packages/website/src/routes/editor/index.tsx) mounts list panels, tile palette, and modals.
- **State:** [`-store.ts`](../../../packages/website/src/routes/editor/-store.ts) (`useEditorStore`). Map mutations usually go through dedicated actions (e.g. `setMerchantShopLinesAt`, `updateScavengeDecalEntry`) so grids and meta stay reconciled.
- **Right overlay tabs:** [`EditorRightOverlay.tsx`](../../../packages/website/src/routes/editor/-components/EditorRightOverlay.tsx) — NPCs, Spawners, Merchants, **Scavenge**, Quests, etc.

## Click-to-edit patterns

### List row → modal (heavy forms)

Use when editing many fields or long content.

1. **Sidebar list** renders one row per map entity (e.g. [`MerchantsListPanel.tsx`](../../../packages/website/src/routes/editor/-components/MerchantsListPanel.tsx), [`NpcsListPanel.tsx`](../../../packages/website/src/routes/editor/-components/NpcsListPanel.tsx)).
2. **Primary click** on the row:
   - Optionally **`focusCameraOnMapCell(row, col)`** first so the user sees the tile (merchants do this together with opening the editor).
   - Call a store opener such as **`openMerchantMetaEditor(row, col)`**, **`openScavengeDecalEditor(row, col)`**, or **`openDialogueNpcEditor(row, col)`**, which sets the matching `*ConfigModal` cell and closes competing modals when appropriate.
3. **Modal** reads `row`/`col` from store, loads the current entry, and writes back via store actions. Use **`Dialog`** from [`~/components/ui/dialog`](../../../packages/website/src/components/ui/dialog.tsx). Close with `set*ConfigModal(null)` on `onOpenChange`.

Reference implementations:

- [`MerchantMetaModal.tsx`](../../../packages/website/src/routes/editor/-components/MerchantMetaModal.tsx) — stock lines, relocate, remove.
- [`ScavengeDecalModal.tsx`](../../../packages/website/src/routes/editor/-components/ScavengeDecalModal.tsx) + [`ScavengeListPanel.tsx`](../../../packages/website/src/routes/editor/-components/ScavengeListPanel.tsx) — **`setScavengePlaceMode`** + map click paints a decal (like merchant place mode); otherwise click opens the modal; `handleGridCellClick` gates behavior like merchants.
- [`NpcConfigModal.tsx`](../../../packages/website/src/routes/editor/-components/NpcConfigModal.tsx) + [`NpcAuthoringPanel.tsx`](../../../packages/website/src/routes/editor/-components/NpcAuthoringPanel.tsx).
- [`SpawnerMetaModal.tsx`](../../../packages/website/src/routes/editor/-components/SpawnerMetaModal.tsx).

### List row → inline panel (lighter forms)

Use when a small set of fields is enough and discovery next to the layer palette helps (decals).

- Example: [`MessageDecalsListPanel.tsx`](../../../packages/website/src/routes/editor/-components/MessageDecalsListPanel.tsx) inside [`TilePalette.tsx`](../../../packages/website/src/routes/editor/-components/TilePalette.tsx).
- Still provide **`Go`** (camera only) and **`Remove`** (clear tile + reconcile) when the inline list is the right fit.

### Buttons

- Small actions: `Button` with `size="sm"`, `className="!h-6 !min-h-0 !px-2 !py-0 !text-[10px]"` (see merchant / scavenge panels).
- Destructive row actions: `variant="ghost"` with red text classes matching merchant line remove.

## Numeric inputs

- **Prefer [`WholeNumberInput`](../../../packages/website/src/components/ui/whole-number-input.tsx)** for integer fields that must not flicker to `0` on every keystroke (it uses text + `inputMode="numeric"` and commits on blur).
- **Required props:** `value: number`, `onValueChange: (n: number) => void`, **`max`**, and usually `min` (defaults to `0`).
- **Styling** (match merchant / scavenge):  `className="h-8 w-full rounded border border-gray-600 bg-gray-950 px-2 text-[11px] text-gray-100"`
- **Optional “omit from map when equal to default”:** display `value={entry.field ?? DEFAULT}` and in `onValueChange` write `undefined` (or `null` per API) when `n === DEFAULT`, so JSON stays minimal — see scavenge search/respawn/drop counts.
- **Do not** use raw `type="number"` for new integer UX unless you need a specific behavior `WholeNumberInput` cannot express (e.g. a legacy optional field); if you keep `type="number"`, follow an existing pattern and document why.

## Item / entity typeahead

- Use **[`ComboboxTypeahead`](../../../packages/website/src/components/ui/combobox-typeahead.tsx)** for picking `itemType` strings (items, weapons, resources) from the full registry set.
- **Options:** map ids to `{ value, label }` (labels are usually the id string). Build the id list the same way everywhere:
  - [`MerchantMetaModal.tsx`](../../../packages/website/src/routes/editor/-components/MerchantMetaModal.tsx) — `sortedAllItemTypeIds()` using `itemRegistry`, `weaponRegistry`, `resourceRegistry` from `@survive-the-night/game-shared/entities/index`.
- **Props:** `placeholder="Type to search…"`, `listClassName="max-h-48"` (or similar), and inside **dialogs** set **`stopEscapePropagation`** so Escape closes the dropdown instead of the dialog incorrectly (see merchant modal).
- **Quests** reuse the same component with different option lists — see [`QuestsEditorPanel.tsx`](../../../packages/website/src/routes/editor/-components/QuestsEditorPanel.tsx).

## Row-based “tables” (shop stock, drop tables, etc.)

Mirror **[`MerchantMetaModal.tsx`](../../../packages/website/src/routes/editor/-components/MerchantMetaModal.tsx)**:

1. **`+ Add item`** appends a row with a sensible default (first id in sorted list + default weight/price).
2. Cap row count with a shared constant when appropriate (e.g. **`MERCHANT_META_MAX_SHOP_LINES`** from game-shared for shop-like lists).
3. Each row: typeahead + **`WholeNumberInput`** columns + **Remove**.
4. Optional “revert to default behavior” button (e.g. **Use global catalog** / **Use built-in loot**) that clears overrides in the shape the server expects.

Keep updates **immutable** (`map`/`filter`) and commit via one store call per logical edit if possible.

## Labels and copy

- Field labels: `text-[9px] font-medium text-gray-500` (or `text-gray-400` for section labels).
- Helper text: `text-[9px] text-gray-600` or `text-[10px] text-gray-500`.
- Empty-state / warning: `text-[10px] text-amber-200/90` where merchant does.

## Agent verification checklist

After editing the map editor:

1. **Interaction:** Does the user open the flow the same way as similar features (list → modal vs inline panel)? Is **`focusCameraOnMapCell`** used when a modal edits a tile?
2. **Numbers:** Are new integer fields using **`WholeNumberInput`** with **`max`** (and documented min/default behavior)?
3. **Item pickers:** Is **`ComboboxTypeahead`** used with the **registry union** pattern and **`stopEscapePropagation`** inside dialogs?
4. **State:** Are updates going through **`-store.ts`** actions that reconcile grids/meta (no hand-editing only local React state for persisted data)?
5. **Visuals:** Do buttons/inputs match **merchant / scavenge** spacing and typography?
