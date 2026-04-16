---
name: items-sheet-sprites
description: >-
  Add or regenerate 16×16 item/resource icons on items-sheet.png (Pillow), align
  with game-shared asset coords, InteractableTexts, and optional interactableDisplayName.
  Use when adding new pickup sprites, patching the items atlas, or fixing misaligned tiles.
---

# Items sheet sprites (16×16)

## Context

- **Atlas file:** [`packages/website/public/sheets/items-sheet.png`](../../../packages/website/public/sheets/items-sheet.png) — loaded by the client as `/sheets/items-sheet.png` (see [`packages/game-client/src/managers/asset.ts`](../../../packages/game-client/src/managers/asset.ts)).
- **Tile size:** **16×16** pixels per icon (matches [`world-config.TILE_SIZE`](../../../packages/game-shared/src/config/world-config.ts)).
- **Config:** Each item/resource uses `assets: { assetKey, x, y, sheet: "items" }` in [`ITEM_CONFIGS`](../../../packages/game-shared/src/entities/item-configs.ts) / [`RESOURCE_CONFIGS`](../../../packages/game-shared/src/entities/resource-configs.ts). `x` and `y` are **top-left pixel coordinates** on the sheet, on a **16px grid** (multiples of 16).

## Grid rules (avoid broken UVs)

- The sheet width is commonly **160px** → **10** columns; valid `x` positions are `0, 16, …, 144`. **Do not** use `x ≥ 160` for a 160px-wide sheet (the rightmost16×16 cell starts at `x = 144`).
- If you need a new row, **extend the PNG height** by 16 (or more) and place the tile at `(column * 16, newRowY)`.
- After resizing the sheet, ensure no other configs still assume an old height (search for `y:` values in shared entity configs).

## Recommended workflow: patch script

The repo maintains a reproducible painter:

1. Open [`scripts/patch-items-sheet-sprites.py`](../../../scripts/patch-items-sheet-sprites.py).
2. Add a `spr_your_item()` function that returns a **RGBA** `Image` of size **(16, 16)** (use `Image.new("RGBA", (16, 16), (0,0,0,0))` and `ImageDraw` / pixel loops). Reuse palette constants at the top of the file for visual consistency.
3. Append `(pixelX, pixelY, spr_your_item)` to the `PATCHES` list.
4. If the new `pixelY` (plus16) exceeds the sheet height the script uses, update `main()` so `nh` (new height) is at least `pixelY + 16` (the script already does `max(oh, 224)` — raise the floor or compute `max(oh, max_y + 16)` for all patches).
5. Run from **repo root** with Pillow available:

```bash
python3 -m venv .venv-sprite
./.venv-sprite/bin/pip install pillow
./.venv-sprite/bin/python3 scripts/patch-items-sheet-sprites.py
```

6. Commit the updated PNG and script. Remove `.venv-sprite` if you do not want a local venv in the tree (add `.venv-sprite/` to `.gitignore` if you keep regenerating).

**Alternative:** one-off Pillow script that opens the sheet, `paste`s a 16×16 tile at `(x, y)`, and `save`s — same rules; prefer extending `patch-items-sheet-sprites.py` so art stays reproducible.

## Wire-up after the pixel lands

1. Set `assets.x` / `assets.y` / `assets.assetKey` on the item or resource config to match the pasted cell.
2. **Pickup / `Interactive` encoding:** Generic entities use `interactableDisplayName` (see [`BehaviorConfigs`](../../../packages/game-shared/src/entities/behavior-configs.ts)) or derive `id` with underscores → spaces. That string **must** exist in [`InteractableTexts`](../../../packages/game-shared/src/util/interactable-text-encoding.ts) (append **at the end** only — wire ids are declaration order).

## Related scripts

- [`scripts/patch-crafting-station-sprites.py`](../../../scripts/patch-crafting-station-sprites.py) — environment tiles on the same sheet (e.g. row `y = 224`).

## Example: zombie skin

`zombie_skin` was placed on a **new** row at **`(0, 240)`** after extending the sheet to **256px** tall, with coords updated in `RESOURCE_CONFIGS`. New icons should follow the same pattern if the sheet runs out of empty cells on existing rows.
