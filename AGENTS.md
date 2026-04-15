# Agent notes

## Game client UI and styling

If you are adding or changing **canvas HUD**, **in-game buttons**, **inventory UI**, or **DOM overlays** that should match the game’s RPG frame look, read **[docs/user-interfaces.md](docs/user-interfaces.md)** first.

Use that guide when:

- Building a new control on the **bottom HUD** (near mute, players online, chat).
- Adding any new **canvas-drawn button** or chip.
- Styling **HTML overlays** that appear over the game so they stay consistent with `rpg-hud-theme.ts`.

It points to shared helpers (`drawHudFlatPanel`, `drawCanvasUiButton`, `drawRpgFramedPanel`) and concrete example files.

## Website-only work

For **React / React Router** pages in `packages/website`, follow the patterns and docs in that package (project rules reference React Router 7).
