# User interface styling

This document covers **in-game** UI drawn in the canvas (`packages/game-client`). The **website** (`packages/website`) uses React; follow patterns already used in that package for pages and layouts.

## 1. Canonical tokens (`rpg-hud-theme.ts`)

**File:** `packages/game-client/src/ui/rpg-hud-theme.ts`

All new HUD work should pull colors and layout helpers from here instead of inventing one-off grays or borders.

| Category | Exports | Typical use |
|----------|---------|-------------|
| HUD flat chips | `RPG_HUD_PANEL_BG`, `RPG_BORDER_GOLD` | Mute, players online, chat toggle, exit, small corner strips |
| Framed panels | `RPG_PANEL_GRADIENT_TOP` / `BOTTOM`, `RPG_ACCENT_BAR`, `drawRpgFramedPanel` | Dialogue, large modals, death screen–style frames |
| Typography | `RPG_TITLE_CREAM`, `RPG_BODY_TEXT`, `RPG_METADATA_MUTED`, `RPG_COUNTER_GOLD`, … | Labels, body copy, hints |
| Inventory / tabs | `RPG_SLOT_FILL`, `RPG_SLOT_STROKE`, `RPG_TAB_*` | Hotbar, grid slots, tab bars, compact buttons |
| Scaling | `rpgPanelBorderWidth(canvasW, canvasH)`, `calculateHudScale` | Stroke width and size that match resolution |

## 2. Reusable drawing helpers

### A. Flat HUD controls (bottom bar, corner chips)

**Helper:** `drawHudFlatPanel(ctx, x, y, w, h, canvasWidth, canvasHeight)`

Fills with `RPG_HUD_PANEL_BG`, strokes with `RPG_BORDER_GOLD` and scaled line width. This is the **default look** for controls that sit next to the mute button and players-online label.

**Reference implementations:**

- `packages/game-client/src/ui/chat-widget.ts` — chat open/close toggle
- `packages/game-client/src/ui/panels/mute-button-panel.ts` — same visual language via `Panel.drawPanelBackground` and `HUD_SETTINGS.MuteButton` colors
- `packages/game-client/src/ui/panels/players-online-panel.ts` — `drawPanelBackground` with the HUD token pair
- `packages/game-client/src/ui/panels/exit-game-button-panel.ts` — configured with the same background/border tokens

**Subclass pattern:** extend `packages/game-client/src/ui/panels/panel.ts` and use `drawPanelBackground` when `PanelSettings` use `RPG_HUD_PANEL_BG` and `RPG_BORDER_GOLD` (border width `2` at base scale, or use `rpgPanelBorderWidth` where you draw manually).

### B. Inventory-style rectangular buttons

**Helper:** `drawCanvasUiButton(ctx, rect, label, variant?, options?)`

**File:** `packages/game-client/src/ui/canvas-ui-rect.ts`

Uses slot/tab colors (`RPG_SLOT_FILL`, `RPG_SLOT_STROKE`, active tab stroke/fill when `pressed`). Prefer **`compact`** for small controls; **`wide`** for footer-style actions. Pair with `CanvasUiRect` helpers in the same file for hit testing.

### C. Large framed panels (gradient + top accent)

**Helper:** `drawRpgFramedPanel(ctx, x, y, w, h, scale, options?)`

**Example:** `packages/game-client/src/ui/dialogue-panel.ts` (and related full-screen overlays that need the gold frame and gradient body).

## 3. DOM overlays on top of the game

Some flows inject HTML (e.g. auction/sign modals). Reuse the **same token values** as strings (gradients, `RPG_BORDER_GOLD`, `RPG_SLOT_STROKE`, etc.) so overlays match canvas UI.

**Examples:** search for `RPG_` in `packages/game-client/src/ui/inventory-screen.ts` and `packages/game-client/src/ui/sign-modals.ts`.

## 4. Checklist for new canvas buttons / chips

1. Prefer **`drawHudFlatPanel`** for controls aligned with the **mute / players online / chat** row.
2. Prefer **`drawCanvasUiButton`** for **inventory panel** actions and slot-adjacent controls.
3. Use **`RPG_TITLE_CREAM`** for primary labels on flat HUD chips (matches players-online text).
4. Avoid ad-hoc `rgba(0, 0, 0, 0.75)` (or similar) for elements that should match the RPG HUD frame.

## 5. Website (`packages/website`)

Not covered in detail here. Use existing route components and styling conventions in that package when changing menus, marketing pages, or shell UI outside the canvas.
