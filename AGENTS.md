# Agent notes

## Items / inventory sprites (16×16 items sheet)

When adding or changing **item or resource icons** on the shared items atlas (`packages/website/public/sheets/items-sheet.png`), read the project skill **[.cursor/skills/items-sheet-sprites/SKILL.md](.cursor/skills/items-sheet-sprites/SKILL.md)** first.

It covers grid alignment with `TILE_SIZE`, extending the PNG, using [`scripts/patch-items-sheet-sprites.py`](scripts/patch-items-sheet-sprites.py), and hooking up `assetKey` / `x` / `y` plus `InteractableTexts` / `interactableDisplayName` for world pickups.

## Game client UI and styling

If you are adding or changing **canvas HUD**, **in-game buttons**, **inventory UI**, or **DOM overlays** that should match the game’s RPG frame look, read **[docs/user-interfaces.md](docs/user-interfaces.md)** first.

Use that guide when:

- Building a new control on the **bottom HUD** (near mute, players online, chat).
- Adding any new **canvas-drawn button** or chip.
- Styling **HTML overlays** that appear over the game so they stay consistent with `rpg-hud-theme.ts`.

It points to shared helpers (`drawHudFlatPanel`, `drawCanvasUiButton`, `drawRpgFramedPanel`) and concrete example files.

## Map editor (website)

When adding or changing the **world map editor** (`packages/website/src/routes/editor` — sidebars, modals, decal/NPC/merchant/spawner authoring, numeric fields, item pickers), read the project skill **[.cursor/skills/map-editor/SKILL.md](.cursor/skills/map-editor/SKILL.md)** first.

It describes click-to-edit flows (list → modal vs inline panels), `WholeNumberInput`, `ComboboxTypeahead` + registry item lists, Zustand/store patterns, and a short verification checklist so new UI stays consistent with existing panels.

## Website-only work

For **React / React Router** pages in `packages/website`, follow the patterns and docs in that package (project rules reference React Router 7).
