import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { InputManager } from "@/managers/input";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import {
  InventoryItem,
  isWeapon,
  getWeaponAmmoType,
  createEmptyEquipment,
  EQUIPMENT_SLOT_KEYS,
  canItemGoInEquipmentSlot,
  type EquipmentSlotKey,
  type PlayerEquipmentState,
} from "@shared/util/inventory";
import { getConfig } from "@shared/config";
import { formatDisplayName } from "@/util/format";
import { PlayerClient } from "@/entities/player";
import { ClientPoison } from "@/extensions/poison";
import { ClientInfiniteRun } from "@/extensions/infinite-run";
import {
  CHARACTER_STAT_KEYS,
  computeInventoryWeightKg,
  getItemWeightKg,
} from "@shared/util/character-stats";
import { ABILITY_TREE_NODES, type AbilityId } from "@shared/util/ability-tree";
import { getProgressionPointsBudget } from "@shared/util/experience-level";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import {
  getWeaponLoadoutSlotKey,
  itemMatchesLoadoutRow,
  weaponLoadoutSlotKeyToIndex,
} from "@shared/util/weapon-loadout";
import {
  TAB_BAR_H,
  PANEL_TAB_CONTENT_GAP,
  characterStatPlusMinusRects,
  characterStatRowLabelY,
  drawCanvasUiButton,
  panelBottomWideButtonRect,
  skillsNodeCenter,
  SKILLS_NODE_RADIUS,
  tabBarHitRect,
  uiCircleContains,
  uiRectContains,
} from "@/ui/canvas-ui-rect";
import type { QuestStep } from "@shared/map/quest-types";
import type { QuestActiveProgress } from "@shared/quests/player-quest-state";
import { getActiveStepIndex } from "@shared/quests/player-quest-state";
import {
  PROFESSION_DEFINITIONS,
  PROFESSION_IDS,
  type ProfessionId,
} from "@shared/util/professions";
import { CRAFTING_STATION_LABELS } from "@shared/util/crafting-stations";
import { calculateHudScale } from "@/util/hud-scale";
import {
  drawRpgTopAccentBar,
  fillRpgPanelGradient,
  RPG_BODY_TEXT,
  RPG_COUNTER_GOLD,
  RPG_METADATA_MUTED,
  RPG_PROMPT_GOLD,
  RPG_PROMPT_TYPING,
  RPG_SLOT_FILL,
  RPG_SLOT_FILL_DIM,
  RPG_SLOT_STROKE,
  RPG_TAB_ACTIVE_FILL,
  RPG_TAB_ACTIVE_STROKE,
  RPG_TAB_INACTIVE_FILL,
  RPG_TAB_INACTIVE_STROKE,
  RPG_TITLE_CREAM,
  strokeRpgPanelBorder,
} from "@/ui/rpg-hud-theme";

const DRAG_THRESHOLD = 12;
const PANEL_WIDTH_RATIO = 0.46;
const LAYOUT_PAD_PX = 20;
const INVENTORY_PANEL_OPEN_SPEED = 7;
const INVENTORY_PANEL_CLOSE_SPEED = 10;

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function professionBannerUrl(id: ProfessionId): string {
  return `/ui/professions/profession-${id}-banner.png`;
}

/** Scale-crop image to fill a rectangle (object-cover). */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw <= 0 || ih <= 0) return;
  const ir = iw / ih;
  const cr = dw / dh;
  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;
  if (ir > cr) {
    sh = ih;
    sw = sh * cr;
    sx = (iw - sw) / 2;
    sy = 0;
  } else {
    sw = iw;
    sh = sw / cr;
    sx = 0;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawProfessionCardChrome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  banner: HTMLImageElement | undefined,
): void {
  const ready = banner && banner.complete && banner.naturalWidth > 0;
  if (ready) {
    drawImageCover(ctx, banner!, x, y, w, h);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "rgba(10, 11, 16, 0.2)");
    g.addColorStop(0.42, "rgba(10, 11, 16, 0.5)");
    g.addColorStop(1, "rgba(10, 11, 16, 0.9)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else {
    ctx.fillStyle = RPG_SLOT_FILL_DIM;
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = RPG_SLOT_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

/** Canvas equivalent of `paint-order: stroke fill` + ~`webkit-text-stroke: Npx black`. */
function fillTextStroked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillStyle: string,
  strokeWidthPx: number = 2,
): void {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = "rgba(6, 8, 16, 0.92)";
  ctx.lineWidth = strokeWidthPx * 2;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export type InventoryUiTab =
  | "inventory"
  | "character"
  | "abilities"
  | "professions"
  | "quests";

function describeQuestStep(
  step: QuestStep | undefined,
  activeEntry?: QuestActiveProgress,
): string {
  if (!step) return "(unknown step)";
  if (step.type === "pickup_item") return `Pick up ${step.itemType}`;
  if (step.type === "reach_waypoint") {
    const r = step.radiusTiles ?? 2;
    return `Reach (${step.row}, ${step.col}) · r≤${r}`;
  }
  if (step.type === "kill_enemies") {
    const cur = activeEntry?.kills?.[step.enemyType] ?? 0;
    return `Kill ${cur}/${step.count} ${step.enemyType}`;
  }
  if (step.type === "talk_to_npc") {
    if (step.npcName && step.npcKey) return `Talk to ${step.npcName} (${step.npcKey})`;
    if (step.npcKey) return `Talk to NPC at ${step.npcKey}`;
    if (step.npcName) return `Talk to ${step.npcName}`;
    return "Talk to NPC";
  }
  return "(unknown step)";
}
const STAT_LABELS: Record<(typeof CHARACTER_STAT_KEYS)[number], string> = {
  health: "Health",
  evade: "Evade (vs zombies)",
  accuracy: "Accuracy",
  reloadSpeed: "Reload speed",
  runSpeed: "Run speed",
  luck: "Luck (loot)",
  stamina: "Stamina (max)",
  recovery: "Stamina recovery",
  hpRecovery: "Passive HP regen",
  strength: "Strength (inventory)",
};
const GRID_COLS = 10;

const EQUIP_SLOT_LABELS: Record<EquipmentSlotKey, string> = {
  head: "Head",
  shoulders: "Shoulders",
  torso: "Torso",
  legs: "Legs",
  shoes: "Shoes",
  back: "Back",
  hands: "Hands",
};

type EquipRect = { x: number; y: number; w: number; h: number };

type DragSource =
  | { kind: "bag"; index: number }
  | { kind: "equip"; slot: EquipmentSlotKey };

type DragState = {
  source: DragSource;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  targetBagIndex: number | null;
  targetEquipSlot: EquipmentSlotKey | null;
  targetLoadoutSlot: 0 | 1 | 2 | null;
};

export type InventoryScreenDeps = {
  assetManager: AssetManager;
  inputManager: InputManager;
  getInventory: () => (InventoryItem | null)[];
  getEquipment: () => PlayerEquipmentState | null;
  getMyPlayer: () => PlayerClient | null;
  sendDropItem: (slotIndex: number) => void;
  sendSwapItems: (from: number, to: number) => void;
  sendSwapBagAndEquipment: (bagIndex: number, equipSlot: EquipmentSlotKey) => void;
  sendSelectInventorySlot: (slotIndex: number) => void;
  sendProgressionAllocations: (
    kind: "ability" | "character",
    allocations: Record<string, number>,
  ) => void;
  sendSetWeaponLoadoutSlot: (slot: 0 | 1 | 2, bagIndex: number) => void;
  sendSelectWeaponLoadout: (loadout: 0 | 1 | 2) => void;
  getAuthoredQuests: () => import("@shared/map/quest-types").WorldMapQuestDefinition[];
};

function buildCharacterMapFromPlayer(player: PlayerClient): Record<string, number> {
  const o: Record<string, number> = {};
  for (const key of CHARACTER_STAT_KEYS) {
    o[key] = player.getCharacterStat(key);
  }
  return o;
}

function buildAbilityMapFromPlayer(player: PlayerClient): Record<string, number> {
  return {
    sprint: player.getAbilitySprintRank(),
    regenerate: player.getAbilityRegenerateRank(),
  };
}

function drawRpgMainPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const scale = calculateHudScale(ctx.canvas.width, ctx.canvas.height);
  fillRpgPanelGradient(ctx, x, y, w, h);
  drawRpgTopAccentBar(ctx, x, y, w, Math.max(3, Math.round(4 * scale)));
  strokeRpgPanelBorder(ctx, x, y, w, h, Math.max(2, Math.round(2 * scale)));
}

export class InventoryScreenUI {
  private open = false;
  private visibilityProgress = 0;
  private lastVisibilityAnimationAt = 0;
  private deps: InventoryScreenDeps;
  private dragState: DragState | null = null;
  private hoveredBagIndex: number | null = null;
  private hoveredEquipSlot: EquipmentSlotKey | null = null;
  private hoveredLoadoutSlot: 0 | 1 | 2 | null = null;
  private lastW = 0;
  private lastH = 0;
  private activeTab: InventoryUiTab = "inventory";
  private hoveredAbilityId: AbilityId | null = null;
  private selectedProfessionId: ProfessionId | null = null;
  private professionBannerImages: Partial<Record<ProfessionId, HTMLImageElement>> = {};
  private professionBannersPreloadStarted = false;

  constructor(deps: InventoryScreenDeps) {
    this.deps = deps;
    this.preloadProfessionBanners();
  }

  private preloadProfessionBanners(): void {
    if (this.professionBannersPreloadStarted) return;
    this.professionBannersPreloadStarted = true;
    for (const id of PROFESSION_IDS) {
      const img = new Image();
      img.decoding = "async";
      img.src = professionBannerUrl(id);
      img.onload = () => {
        this.professionBannerImages[id] = img;
      };
    }
  }

  public toggle(): void {
    this.open = !this.open;
    if (!this.open) {
      this.dragState = null;
      this.activeTab = "inventory";
      this.selectedProfessionId = null;
    }
  }

  public setOpen(value: boolean): void {
    this.open = value;
    if (!this.open) {
      this.dragState = null;
      this.activeTab = "inventory";
      this.selectedProfessionId = null;
    }
  }

  /**
   * Horizontal center (screen px) for the visible gameplay column while the panel is open
   * or closing. Lerps to canvas center as the close animation finishes.
   */
  public getCameraCenterScreenX(canvasWidth: number): number | null {
    if (this.visibilityProgress <= 0.001) {
      return null;
    }
    const rightW = Math.min(canvasWidth * PANEL_WIDTH_RATIO, canvasWidth - LAYOUT_PAD_PX * 2);
    const rightX = canvasWidth - rightW - LAYOUT_PAD_PX;
    const openCenter = rightX / 2;
    const eased = easeOutCubic(this.visibilityProgress);
    const defaultCenter = canvasWidth / 2;
    return defaultCenter + (openCenter - defaultCenter) * eased;
  }

  /** True while the panel is shown or playing its open/close slide animation. */
  public isOpen(): boolean {
    return this.open || this.visibilityProgress > 0.001;
  }

  public getActiveTab(): InventoryUiTab {
    return this.activeTab;
  }

  /** Open the panel (if needed) and switch to the given tab. */
  public focusTab(tab: InventoryUiTab): void {
    this.open = true;
    this.activeTab = tab;
    this.dragState = null;
    if (tab !== "professions") {
      this.selectedProfessionId = null;
    }
  }

  public isHovering(): boolean {
    if (!this.isOpen()) return false;
    const pos = this.deps.inputManager.getMousePosition();
    if (!pos || !this.lastW || !this.lastH) return false;
    return this.isPointOverUi(pos.x, pos.y, this.lastW, this.lastH);
  }

  private getBagSlotCount(): number {
    const p = this.deps.getMyPlayer();
    return p?.getMaxInventorySlots() ?? getConfig().player.MAX_INVENTORY_SLOTS;
  }

  private layout(canvasWidth: number, canvasHeight: number, bagSlotCount: number = getConfig().player.MAX_INVENTORY_SLOTS) {
    const pad = LAYOUT_PAD_PX;
    const gridRows = Math.max(1, Math.ceil(bagSlotCount / GRID_COLS));
    const rightW = Math.min(canvasWidth * PANEL_WIDTH_RATIO, canvasWidth - pad * 2);
    const rightX = canvasWidth - rightW - pad;
    const rightY = pad;
    const rightH = canvasHeight - pad * 2;

    const tabTop = rightY;
    const contentTop = tabTop + TAB_BAR_H;
    const contentH = rightH - TAB_BAR_H;

    const loadoutTop = contentTop + PANEL_TAB_CONTENT_GAP + 4;
    const loadoutSlotSize = Math.min(44, Math.floor((rightW - 56) / 3));
    const loadoutGap = 10;
    const loadoutRowInnerW = 3 * loadoutSlotSize + 2 * loadoutGap;
    const loadoutLeft = rightX + (rightW - loadoutRowInnerW) / 2;
    const loadoutSlotRects: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < 3; i++) {
      loadoutSlotRects.push({
        x: loadoutLeft + i * (loadoutSlotSize + loadoutGap),
        y: loadoutTop + 18,
        w: loadoutSlotSize,
        h: loadoutSlotSize,
      });
    }
    // Room for 11px loadout labels (baseline r.h+14) + descenders; keep loadout block from colliding with equipment.
    const loadoutBlockH = 18 + loadoutSlotSize + 28;

    const equipTop = loadoutTop + loadoutBlockH + 26;
    const cell = Math.min(40, Math.floor(Math.min((rightW - 32) / 4.5, (contentH * 0.5) / 7)));
    // Labels sit at rect.y-8; need enough gap so the next row's label does not overlap the slot above.
    const rowGap = 22;
    const colGap = 10;
    const cx = rightX + rightW * 0.5;

    let y = equipTop;
    const headRect: EquipRect = { x: cx - cell / 2, y, w: cell, h: cell };
    y += cell + rowGap;

    const shouldersRect: EquipRect = { x: cx - cell / 2, y, w: cell, h: cell };
    y += cell + rowGap;

    const torsoRowY = y;
    const handsRect: EquipRect = {
      x: cx - cell / 2 - colGap - cell,
      y: torsoRowY,
      w: cell,
      h: cell,
    };
    const torsoRect: EquipRect = { x: cx - cell / 2, y: torsoRowY, w: cell, h: cell };
    const backRect: EquipRect = {
      x: cx + cell / 2 + colGap,
      y: torsoRowY,
      w: cell,
      h: cell,
    };
    y += cell + rowGap;

    const legsRect: EquipRect = { x: cx - cell / 2, y, w: cell, h: cell };
    y += cell + rowGap;

    const shoesRect: EquipRect = { x: cx - cell / 2, y, w: cell, h: cell };
    y += cell + rowGap;

    const bodyBottom = y;
    const equipH = bodyBottom - equipTop + 12;

    const equipRects: Record<EquipmentSlotKey, EquipRect> = {
      head: headRect,
      shoulders: shouldersRect,
      torso: torsoRect,
      legs: legsRect,
      shoes: shoesRect,
      back: backRect,
      hands: handsRect,
    };

    const gridTop = bodyBottom + 24;
    const gridBottom = rightY + rightH - 20;
    const gridAvailH = Math.max(72, gridBottom - gridTop);
    const cellGap = 5;
    const cellSize = Math.min(
      48,
      Math.floor((rightW - cellGap * (GRID_COLS - 1)) / GRID_COLS),
      Math.floor((gridAvailH - cellGap * (gridRows - 1)) / gridRows),
    );
    const gridW = GRID_COLS * cellSize + (GRID_COLS - 1) * cellGap;
    const gridH = gridRows * cellSize + (gridRows - 1) * cellGap;
    const gridLeft = rightX + (rightW - gridW) / 2;

    const tabs = [
      { id: "inventory" as const, label: "Inventory (I)" },
      { id: "character" as const, label: "Character (C)" },
      { id: "abilities" as const, label: "Abilities (K)" },
      { id: "professions" as const, label: "Professions (P)" },
      { id: "quests" as const, label: "Quests (Q)" },
    ];
    const tabCount = tabs.length;
    const tabW = rightW / tabCount;
    const tabX0 = rightX;

    return {
      rightX,
      rightY,
      rightW,
      rightH,
      tabTop,
      tabBarH: TAB_BAR_H,
      contentTop,
      contentH,
      loadoutTop,
      loadoutSlotRects,
      loadoutSlotSize,
      loadoutGap,
      loadoutLeft,
      equipTop,
      tabs,
      tabW,
      tabX0,
      equipH,
      equipRects,
      gridLeft,
      gridTop,
      cellSize,
      cellGap,
      gridW,
      gridH,
      gridRows,
      bagSlotCount,
      skillsOriginX: rightX + 24,
      skillsOriginY: contentTop + PANEL_TAB_CONTENT_GAP + 8,
    };
  }

  private stepVisibility(isOpen: boolean, now: number): void {
    const dtSeconds =
      this.lastVisibilityAnimationAt > 0
        ? Math.min(0.05, (now - this.lastVisibilityAnimationAt) / 1000)
        : 1 / 60;
    this.lastVisibilityAnimationAt = now;

    const target = isOpen ? 1 : 0;
    const speed = isOpen ? INVENTORY_PANEL_OPEN_SPEED : INVENTORY_PANEL_CLOSE_SPEED;
    const step = dtSeconds * speed;

    if (this.visibilityProgress < target) {
      this.visibilityProgress = Math.min(target, this.visibilityProgress + step);
    } else if (this.visibilityProgress > target) {
      this.visibilityProgress = Math.max(target, this.visibilityProgress - step);
    }
  }

  /** Slide offset (px): panel moves right by this amount; 0 when fully open. */
  private getPanelSlidePxFromRightW(rightW: number): number {
    const eased = easeOutCubic(this.visibilityProgress);
    return Math.round((1 - eased) * (rightW + LAYOUT_PAD_PX));
  }

  private toPanelLocalX(screenX: number, rightW: number): number {
    return screenX - this.getPanelSlidePxFromRightW(rightW);
  }

  private getBagIndexAt(x: number, y: number, L: ReturnType<InventoryScreenUI["layout"]>): number | null {
    const player = this.deps.getMyPlayer();
    for (let row = 0; row < L.gridRows; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        if (idx >= L.bagSlotCount) continue;
        const sx = L.gridLeft + col * (L.cellSize + L.cellGap);
        const sy = L.gridTop + row * (L.cellSize + L.cellGap);
        if (x >= sx && x <= sx + L.cellSize && y >= sy && y <= sy + L.cellSize) {
          if (player && this.bagSlotBackedByWeaponLoadout(idx, player)) {
            return null;
          }
          return idx;
        }
      }
    }
    return null;
  }

  private getEquipAt(
    x: number,
    y: number,
    L: ReturnType<InventoryScreenUI["layout"]>
  ): EquipmentSlotKey | null {
    for (const key of EQUIPMENT_SLOT_KEYS) {
      const r = L.equipRects[key];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return key;
      }
    }
    return null;
  }

  /** Bag cells that back a weapon loadout are shown only in the loadout row (not duplicated in the grid). */
  private bagSlotBackedByWeaponLoadout(bagIdx0: number, p: PlayerClient): boolean {
    const b = bagIdx0 + 1;
    const pBag = (p as any).weaponLoadoutPrimary ?? 0;
    const sBag = (p as any).weaponLoadoutSecondary ?? 0;
    const mBag = (p as any).weaponLoadoutMelee ?? 0;
    return pBag === b || sBag === b || mBag === b;
  }

  private getLoadoutSlotAt(
    x: number,
    y: number,
    L: ReturnType<InventoryScreenUI["layout"]>,
  ): 0 | 1 | 2 | null {
    for (let i = 0; i < L.loadoutSlotRects.length; i++) {
      const r = L.loadoutSlotRects[i]!;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return i as 0 | 1 | 2;
      }
    }
    return null;
  }

  /** Double-click bag slot: armor → correct slot; weapons → their loadout row (replaces existing). */
  private tryQuickEquipFromBag(bagIdx: number, item: InventoryItem): boolean {
    const t = item.itemType;
    const loadoutKey = getWeaponLoadoutSlotKey(t);
    if (loadoutKey !== null) {
      const row = weaponLoadoutSlotKeyToIndex(loadoutKey);
      this.deps.sendSetWeaponLoadoutSlot(row, bagIdx + 1);
      return true;
    }
    for (const slot of EQUIPMENT_SLOT_KEYS) {
      if (canItemGoInEquipmentSlot(t, slot)) {
        this.deps.sendSwapBagAndEquipment(bagIdx, slot);
        return true;
      }
    }
    return false;
  }

  private drawTabBar(
    ctx: CanvasRenderingContext2D,
    L: ReturnType<InventoryScreenUI["layout"]>,
  ): void {
    const panelRight = L.rightX + L.rightW;
    const n = L.tabs.length;
    for (let i = 0; i < n; i++) {
      const t = L.tabs[i]!;
      const x = L.tabX0 + i * L.tabW;
      const w = i === n - 1 ? panelRight - x : L.tabW;
      const y = L.tabTop;
      const active = this.activeTab === t.id;
      ctx.fillStyle = active ? RPG_TAB_ACTIVE_FILL : RPG_TAB_INACTIVE_FILL;
      ctx.fillRect(x, y, w, L.tabBarH);
      ctx.strokeStyle = active ? RPG_TAB_ACTIVE_STROKE : RPG_TAB_INACTIVE_STROKE;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, L.tabBarH);
      ctx.font = "bold 14px Georgia";
      ctx.fillStyle = active ? RPG_TITLE_CREAM : RPG_METADATA_MUTED;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.label, x + w / 2, y + L.tabBarH / 2);
    }
    ctx.textBaseline = "alphabetic";
  }

  private renderCharacterTab(
    ctx: CanvasRenderingContext2D,
    L: ReturnType<InventoryScreenUI["layout"]>,
    player: PlayerClient,
  ): void {
    const xp = player.getTotalExperience();
    const budget = getProgressionPointsBudget(xp);
    const avail = player.getAvailableCharacterPoints();
    ctx.font = "16px Arial";
    ctx.fillStyle = RPG_BODY_TEXT;
    ctx.textAlign = "left";
    let y = L.contentTop + PANEL_TAB_CONTENT_GAP;
    ctx.fillText(`Character stats   (available ${avail} / budget ${budget} from level)`, L.rightX + 12, y);
    y += 36;
    ctx.font = "15px Arial";

    for (const key of CHARACTER_STAT_KEYS) {
      const val = player.getCharacterStat(key);
      ctx.fillStyle = RPG_TITLE_CREAM;
      ctx.fillText(`${STAT_LABELS[key]}`, L.rightX + 16, y);
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.textAlign = "right";
      ctx.fillText(`${val}`, L.rightX + L.rightW - 120, y);
      ctx.textAlign = "left";
      const { minus, plus } = characterStatPlusMinusRects(L.rightX, L.rightW, y);
      drawCanvasUiButton(ctx, minus, "-", "compact");
      drawCanvasUiButton(ctx, plus, "+", "compact");
      y += 30;
    }

    const maxHp = player.getMaxHealth();
    const hp = player.getHealth();
    const stamina = player.getStamina();
    const maxStamina = player.getMaxStamina();
    y += 8;
    ctx.fillStyle = RPG_COUNTER_GOLD;
    ctx.font = "14px Arial";
    ctx.fillText(`Current HP: ${hp} / ${maxHp}`, L.rightX + 16, y);
    y += 22;
    ctx.fillText(`Stamina: ${Math.round(stamina)} / ${maxStamina}`, L.rightX + 16, y);
    y += 22;
    if (player.hasExt(ClientPoison)) {
      ctx.fillStyle = "rgba(160, 220, 170, 0.95)";
      ctx.fillText("Poisoned", L.rightX + 16, y);
      y += 22;
    }
    if (player.hasExt(ClientInfiniteRun)) {
      ctx.fillStyle = RPG_PROMPT_TYPING;
      ctx.fillText("Infinite run", L.rightX + 16, y);
      y += 22;
    }

    drawCanvasUiButton(
      ctx,
      panelBottomWideButtonRect(L.rightX, L.rightY, L.rightW, L.rightH),
      "Reset character stats",
      "wide",
    );
  }

  private renderAbilitiesTab(
    ctx: CanvasRenderingContext2D,
    L: ReturnType<InventoryScreenUI["layout"]>,
    player: PlayerClient,
  ): void {
    const xp = player.getTotalExperience();
    const budget = getProgressionPointsBudget(xp);
    const avail = player.getAvailableAbilityPoints();
    ctx.font = "16px Arial";
    ctx.fillStyle = RPG_BODY_TEXT;
    ctx.textAlign = "left";
    let ty = L.contentTop + PANEL_TAB_CONTENT_GAP;
    ctx.fillText(`Abilities   (available ${avail} / budget ${budget})`, L.rightX + 12, ty);
    ty += 28;
    ctx.font = "13px Arial";
    ctx.fillStyle = RPG_METADATA_MUTED;
    ctx.fillText("Click a node to unlock (when you have points). Click again to refund.", L.rightX + 12, ty);

    for (const node of ABILITY_TREE_NODES) {
      const { cx, cy } = skillsNodeCenter(L.skillsOriginX, L.skillsOriginY, node.x, node.y);
      const rank =
        node.id === "sprint" ? player.getAbilitySprintRank() : player.getAbilityRegenerateRank();
      const hover = this.hoveredAbilityId === node.id;
      ctx.beginPath();
      ctx.arc(cx, cy, SKILLS_NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = rank > 0 ? "rgba(200, 165, 95, 0.82)" : RPG_SLOT_FILL_DIM;
      ctx.fill();
      ctx.strokeStyle = hover ? RPG_PROMPT_GOLD : RPG_SLOT_STROKE;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = "bold 13px Arial";
      ctx.fillStyle = RPG_BODY_TEXT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, cx, cy - 6);
      ctx.font = "11px Arial";
      ctx.fillText(rank > 0 ? "Active" : "Locked", cx, cy + 10);
    }
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    drawCanvasUiButton(
      ctx,
      panelBottomWideButtonRect(L.rightX, L.rightY, L.rightW, L.rightH),
      "Reset abilities",
      "wide",
    );
  }

  private professionCardRects(L: ReturnType<InventoryScreenUI["layout"]>) {
    const cards: Array<{ id: ProfessionId; x: number; y: number; w: number; h: number }> = [];
    const cols = 2;
    const gap = 14;
    const cardW = (L.rightW - 24 - gap) / cols;
    const cardH = 96;
    const startX = L.rightX + 12;
    const startY = L.contentTop + PANEL_TAB_CONTENT_GAP + 32;
    for (let i = 0; i < PROFESSION_IDS.length; i++) {
      const professionId = PROFESSION_IDS[i]!;
      const col = i % cols;
      const row = Math.floor(i / cols);
      cards.push({
        id: professionId,
        x: startX + col * (cardW + gap),
        y: startY + row * (cardH + gap),
        w: cardW,
        h: cardH,
      });
    }
    return cards;
  }

  private professionBackRect(L: ReturnType<InventoryScreenUI["layout"]>) {
    return {
      x: L.rightX + 12,
      y: L.contentTop + PANEL_TAB_CONTENT_GAP,
      w: 88,
      h: 26,
    };
  }

  private renderProfessionsTab(
    ctx: CanvasRenderingContext2D,
    L: ReturnType<InventoryScreenUI["layout"]>,
    player: PlayerClient,
  ): void {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "16px Arial";
    fillTextStroked(
      ctx,
      "Professions",
      L.rightX + 12,
      L.contentTop + PANEL_TAB_CONTENT_GAP,
      RPG_TITLE_CREAM,
      2,
    );

    if (!this.selectedProfessionId) {
      ctx.font = "13px Arial";
      fillTextStroked(
        ctx,
        "Level professions through gathering, scrapping, and station crafting. Click a profession to inspect unlocks.",
        L.rightX + 12,
        L.contentTop + PANEL_TAB_CONTENT_GAP + 20,
        RPG_METADATA_MUTED,
        2,
      );

      for (const rect of this.professionCardRects(L)) {
        const details = player.getProfessionDetails(rect.id);
        const def = PROFESSION_DEFINITIONS[rect.id];
        drawProfessionCardChrome(ctx, rect.x, rect.y, rect.w, rect.h, this.professionBannerImages[rect.id]);
        ctx.strokeStyle = RPG_SLOT_STROKE;
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.font = "bold 14px Georgia";
        fillTextStroked(ctx, def.label, rect.x + 12, rect.y + 22, RPG_BODY_TEXT, 2);
        ctx.font = "12px Arial";
        fillTextStroked(
          ctx,
          `Station: ${CRAFTING_STATION_LABELS[def.station]}`,
          rect.x + 12,
          rect.y + 40,
          RPG_METADATA_MUTED,
          2,
        );
        fillTextStroked(
          ctx,
          `Level ${details.level}`,
          rect.x + 12,
          rect.y + 58,
          RPG_METADATA_MUTED,
          2,
        );
        ctx.fillStyle = "rgba(12, 14, 24, 0.95)";
        ctx.fillRect(rect.x + 12, rect.y + 66, rect.w - 24, 10);
        const fill =
          details.isMaxLevel || details.xpToNextLevel <= 0
            ? 1
            : Math.max(0, Math.min(1, details.currentXpInLevel / details.xpToNextLevel));
        ctx.fillStyle = "rgba(200, 170, 95, 0.88)";
        ctx.fillRect(rect.x + 12, rect.y + 66, (rect.w - 24) * fill, 10);
        ctx.font = "11px Arial";
        fillTextStroked(
          ctx,
          details.nextUnlock
            ? `Next unlock: Lv ${details.nextUnlock.level} ${details.nextUnlock.label}`
            : "All unlocks discovered",
          rect.x + 12,
          rect.y + 92,
          RPG_BODY_TEXT,
          2,
        );
      }
      return;
    }

    const def = PROFESSION_DEFINITIONS[this.selectedProfessionId];
    const details = player.getProfessionDetails(this.selectedProfessionId);
    const backRect = this.professionBackRect(L);
    drawCanvasUiButton(ctx, backRect, "Back", "compact");

    const headerBanner = this.professionBannerImages[this.selectedProfessionId];
    const headerBannerReady =
      headerBanner && headerBanner.complete && headerBanner.naturalWidth > 0;
    let y: number;
    if (headerBannerReady) {
      const bannerX = L.rightX + 12;
      const bannerY = backRect.y + backRect.h + 8;
      const bannerW = L.rightW - 24;
      const bannerH = 76;
      drawImageCover(ctx, headerBanner!, bannerX, bannerY, bannerW, bannerH);
      const g = ctx.createLinearGradient(bannerX, bannerY, bannerX, bannerY + bannerH);
      g.addColorStop(0, "rgba(10, 11, 16, 0.12)");
      g.addColorStop(1, "rgba(10, 11, 16, 0.78)");
      ctx.fillStyle = g;
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
      ctx.strokeStyle = RPG_SLOT_STROKE;
      ctx.lineWidth = 1;
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
      y = bannerY + bannerH + 14;
    } else {
      y = L.contentTop + PANEL_TAB_CONTENT_GAP + 46;
    }
    ctx.font = "bold 20px Georgia";
    fillTextStroked(ctx, def.label, L.rightX + 12, y, RPG_TITLE_CREAM, 2);
    y += 24;
    ctx.font = "13px Arial";
    fillTextStroked(ctx, def.description, L.rightX + 12, y, RPG_METADATA_MUTED, 2);
    y += 22;
    fillTextStroked(
      ctx,
      `Station: ${CRAFTING_STATION_LABELS[def.station]}  •  Level ${details.level}  •  XP ${details.totalXp}`,
      L.rightX + 12,
      y,
      RPG_METADATA_MUTED,
      2,
    );
    y += 24;
    ctx.fillStyle = "rgba(12, 14, 24, 0.95)";
    ctx.fillRect(L.rightX + 12, y, L.rightW - 24, 12);
    const fill =
      details.isMaxLevel || details.xpToNextLevel <= 0
        ? 1
        : Math.max(0, Math.min(1, details.currentXpInLevel / details.xpToNextLevel));
    ctx.fillStyle = "rgba(200, 170, 95, 0.88)";
    ctx.fillRect(L.rightX + 12, y, (L.rightW - 24) * fill, 12);
    y += 28;
    ctx.font = "bold 14px Arial";
    fillTextStroked(ctx, "Unlock Timeline", L.rightX + 12, y, RPG_TITLE_CREAM, 2);
    y += 22;
    ctx.font = "13px Arial";
    for (const unlock of def.unlocks) {
      const unlocked = details.level >= unlock.level;
      fillTextStroked(
        ctx,
        `Lv ${unlock.level}  ${unlock.label}${unlocked ? "  • unlocked" : ""}`,
        L.rightX + 18,
        y,
        unlocked ? "rgba(190, 230, 195, 0.95)" : RPG_METADATA_MUTED,
        2,
      );
      y += 20;
    }
  }

  private renderQuestsTab(
    ctx: CanvasRenderingContext2D,
    L: ReturnType<InventoryScreenUI["layout"]>,
    player: PlayerClient,
  ): void {
    const progress = player.getQuestProgressPayload();
    const quests = this.deps.getAuthoredQuests();
    const byId = new Map(quests.map((q) => [q.id, q] as const));
    const st = progress ?? { active: {}, completed: [] };

    const padX = L.rightX + 12;
    const contentW = L.rightW - 24;
    let y = L.contentTop + PANEL_TAB_CONTENT_GAP;
    const yMax = L.rightY + L.rightH - 28;
    const lineMain = 20;
    const lineSub = 18;
    let clipped = false;

    const nextBlock = (h: number): boolean => {
      if (y + h > yMax) {
        clipped = true;
        return false;
      }
      return true;
    };

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 14px Arial";

    if (!quests.length) {
      ctx.fillStyle = RPG_METADATA_MUTED;
      if (nextBlock(lineMain)) ctx.fillText("No authored quests on this map.", padX, y);
      return;
    }

    const activeIds = Object.keys(st.active);
    ctx.fillStyle = RPG_COUNTER_GOLD;
    if (nextBlock(lineMain)) {
      ctx.fillText("Active", padX, y);
      y += lineMain + 4;
    }

    if (!activeIds.length) {
      ctx.font = "13px Arial";
      ctx.fillStyle = RPG_METADATA_MUTED;
      if (nextBlock(lineMain)) {
        ctx.fillText("—", padX, y);
        y += lineMain + 8;
      }
    } else {
      ctx.font = "13px Arial";
      for (const qid of activeIds) {
        if (clipped) break;
        const def = byId.get(qid);
        const title = def?.title ?? qid;
        const stepIdx = getActiveStepIndex(st, qid);
        const activeEntry = st.active[qid];
        const stepTotal = def?.steps.length ?? 0;
        const onObjective = stepTotal > 0 && stepIdx < stepTotal;
        const step = onObjective ? def?.steps[stepIdx] : undefined;
        const stepSummary = describeQuestStep(step, activeEntry);

        ctx.fillStyle = RPG_BODY_TEXT;
        if (!nextBlock(lineMain)) break;
        ctx.fillText(title, padX, y);
        y += lineMain;

        ctx.fillStyle = RPG_METADATA_MUTED;
        const progressPart =
          stepTotal === 0
            ? "Talk to an NPC to finish"
            : stepIdx >= stepTotal
              ? "Objectives done · talk to an NPC to turn in"
              : `Step ${stepIdx + 1}/${stepTotal}`;
        const stepLine = `${progressPart}${stepSummary ? ` · ${stepSummary}` : ""}`;
        if (!nextBlock(lineSub)) break;
        const maxW = contentW - 8;
        let drawLine = stepLine;
        if (ctx.measureText(drawLine).width > maxW) {
          while (drawLine.length > 8 && ctx.measureText(`${drawLine}…`).width > maxW) {
            drawLine = drawLine.slice(0, -1);
          }
          drawLine = `${drawLine}…`;
        }
        ctx.fillText(drawLine, padX + 4, y);
        y += lineSub + 6;
      }
    }

    y += 4;
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "rgba(185, 220, 175, 0.95)";
    if (!nextBlock(lineMain)) {
      if (clipped) {
        ctx.font = "12px Arial";
        ctx.fillStyle = RPG_METADATA_MUTED;
        ctx.fillText("…", padX, yMax);
      }
      return;
    }
    ctx.fillText("Completed", padX, y);
    y += lineMain + 4;

    const done = st.completed.filter((id: string) => byId.has(id));
    ctx.font = "13px Arial";
    if (!done.length) {
      ctx.fillStyle = RPG_METADATA_MUTED;
      if (nextBlock(lineMain)) ctx.fillText("—", padX, y);
    } else {
      for (const qid of done) {
        if (clipped) break;
        const def = byId.get(qid)!;
        ctx.fillStyle = "rgba(195, 220, 200, 0.92)";
        if (!nextBlock(lineMain)) break;
        ctx.fillText(`\u2713 ${def.title}`, padX, y);
        y += lineMain + 4;
      }
    }

    if (clipped) {
      ctx.font = "12px Arial";
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.fillText("…", padX, Math.min(y, yMax));
    }
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.lastW = ctx.canvas.width;
    this.lastH = ctx.canvas.height;

    const now = performance.now();
    this.stepVisibility(this.open, now);

    if (this.visibilityProgress <= 0.001) {
      return;
    }

    const player = getPlayer(gameState);
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    if (!player || !(player instanceof PlayerClient)) {
      if (this.open) {
        return;
      }
      const L = this.layout(w, h, getConfig().player.MAX_INVENTORY_SLOTS);
      const slidePx = this.getPanelSlidePxFromRightW(L.rightW);
      const eased = easeOutCubic(this.visibilityProgress);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.55 * eased})`;
      ctx.fillRect(0, 0, w, h);
      ctx.translate(slidePx, 0);
      drawRpgMainPanel(ctx, L.rightX, L.rightY, L.rightW, L.rightH);
      ctx.restore();
      return;
    }

    const L = this.layout(w, h, player.getMaxInventorySlots());
    const eased = easeOutCubic(this.visibilityProgress);
    const slidePx = this.getPanelSlidePxFromRightW(L.rightW);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = `rgba(0, 0, 0, ${0.55 * eased})`;
    ctx.fillRect(0, 0, w, h);

    ctx.translate(slidePx, 0);

    drawRpgMainPanel(ctx, L.rightX, L.rightY, L.rightW, L.rightH);

    this.drawTabBar(ctx, L);

    if (this.activeTab === "inventory") {
      const items = this.deps.getInventory();
      const equipment = this.deps.getEquipment();

      ctx.font = "14px Arial";
      ctx.fillStyle = RPG_TITLE_CREAM;
      ctx.textAlign = "left";
      ctx.fillText("Weapon loadout", L.rightX + 14, L.loadoutTop);
      const totalKg = computeInventoryWeightKg(items, equipment ?? createEmptyEquipment());
      ctx.textAlign = "right";
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.fillText(`Weight: ${totalKg.toFixed(1)} kg`, L.rightX + L.rightW - 14, L.contentTop + PANEL_TAB_CONTENT_GAP);
      ctx.textAlign = "left";

      const pBag = (player as any).weaponLoadoutPrimary ?? 0;
      const sBag = (player as any).weaponLoadoutSecondary ?? 0;
      const mBag = (player as any).weaponLoadoutMelee ?? 0;
      const activeLo = (player as any).activeWeaponLoadout ?? 0;
      const bags: number[] = [pBag, sBag, mBag];
      const loadoutLabels = ["1 Primary", "2 Secondary", "3 Melee"];

      for (let i = 0; i < 3; i++) {
        const r = L.loadoutSlotRects[i]!;
        let item: InventoryItem | null = null;
        const bag = bags[i]!;
        if (bag >= 1) {
          const it = items[bag - 1];
          if (it && itemMatchesLoadoutRow(it.itemType, i as 0 | 1 | 2)) item = it;
        }
        const isLoActive = activeLo === i;
        const isHover = this.hoveredLoadoutSlot === i && !this.dragState?.isDragging;
        const isDropTarget =
          this.dragState?.isDragging &&
          this.dragState.targetLoadoutSlot === i &&
          this.dragState.source.kind === "bag";
        ctx.fillStyle = RPG_SLOT_FILL;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = isDropTarget
          ? "rgba(100, 200, 255, 0.95)"
          : isLoActive
            ? "rgba(255, 234, 182, 0.95)"
            : isHover
              ? RPG_TAB_ACTIVE_STROKE
              : RPG_SLOT_STROKE;
        ctx.lineWidth = isLoActive || isDropTarget ? 2 : 1;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        if (item) {
          const img = this.deps.assetManager.get(getItemAssetKey(item));
          if (img) {
            const pad = 6;
            ctx.drawImage(img, r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2);
          }
        }
        ctx.font = "11px Arial";
        ctx.fillStyle = RPG_METADATA_MUTED;
        ctx.textAlign = "center";
        ctx.fillText(loadoutLabels[i]!, r.x + r.w / 2, r.y + r.h + 14);
        ctx.textAlign = "left";
      }

      ctx.font = "14px Arial";
      ctx.fillStyle = RPG_TITLE_CREAM;
      ctx.fillText("Equipment", L.rightX + 14, L.equipTop - 8);

      for (const slot of EQUIPMENT_SLOT_KEYS) {
        this.drawEquipSlot(
          ctx,
          L.equipRects[slot],
          equipment?.[slot] ?? null,
          EQUIP_SLOT_LABELS[slot],
          slot,
        );
      }

      const slots = L.bagSlotCount;
      const curSlot = this.deps.inputManager.getCurrentInventorySlot();
      const activeIdx = curSlot === FISTS_INVENTORY_SENTINEL ? -1 : curSlot - 1;

      for (let row = 0; row < L.gridRows; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const idx = row * GRID_COLS + col;
          if (idx >= slots) continue;
          const sx = L.gridLeft + col * (L.cellSize + L.cellGap);
          const sy = L.gridTop + row * (L.cellSize + L.cellGap);
          const isHiddenLoadoutBagSlot = this.bagSlotBackedByWeaponLoadout(idx, player);
          const rawBagItem = items[idx];
          const invItem =
            rawBagItem && !isHiddenLoadoutBagSlot ? rawBagItem : null;
          const isActive = !isHiddenLoadoutBagSlot && activeIdx === idx;
          const isHover = !isHiddenLoadoutBagSlot && this.hoveredBagIndex === idx && !this.dragState?.isDragging;
          const isDragSource =
            !isHiddenLoadoutBagSlot &&
            this.dragState?.isDragging &&
            this.dragState.source.kind === "bag" &&
            this.dragState.source.index === idx;
          const isTarget =
            !isHiddenLoadoutBagSlot &&
            this.dragState?.isDragging &&
            this.dragState.targetBagIndex === idx &&
            this.dragState.source.kind === "bag" &&
            this.dragState.source.index !== idx;

          ctx.fillStyle = RPG_SLOT_FILL_DIM;
          ctx.fillRect(sx, sy, L.cellSize, L.cellSize);

          if (isDragSource) {
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect(sx, sy, L.cellSize, L.cellSize);
          }

          ctx.strokeStyle = isTarget
            ? "rgba(100, 200, 255, 0.95)"
            : isActive
              ? "rgba(255, 234, 182, 0.95)"
              : isHover
                ? RPG_TAB_ACTIVE_STROKE
                : RPG_SLOT_STROKE;
          ctx.lineWidth = isActive || isTarget ? 2 : 1;
          ctx.strokeRect(sx, sy, L.cellSize, L.cellSize);

          if (invItem) {
            const img = this.deps.assetManager.get(getItemAssetKey(invItem));
            if (img) {
              const pad = 6;
              ctx.save();
              if (isDragSource) ctx.globalAlpha = 0.35;
              ctx.drawImage(
                img,
                sx + pad,
                sy + pad,
                L.cellSize - pad * 2,
                L.cellSize - pad * 2,
              );
              ctx.restore();
            }
            if (invItem.state?.count) {
              ctx.font = "bold 14px Arial";
              ctx.textAlign = "right";
              ctx.fillStyle = RPG_BODY_TEXT;
              ctx.strokeStyle = "rgba(6,8,16,0.9)";
              ctx.lineWidth = 2;
              const cx = sx + L.cellSize - 4;
              const cy = sy + L.cellSize - 4;
              ctx.strokeText(`${invItem.state.count}`, cx, cy);
              ctx.fillText(`${invItem.state.count}`, cx, cy);
            }
            if (isWeapon(invItem.itemType)) {
              const ammoType = getWeaponAmmoType(invItem.itemType);
              if (ammoType) {
                const ammoItem = items.find((it) => it?.itemType === ammoType);
                const ammoCount = ammoItem?.state?.count ?? 0;
                ctx.font = "bold 11px Arial";
                ctx.textAlign = "right";
                ctx.fillStyle = ammoCount > 0 ? "rgba(255, 255, 120, 1)" : "rgba(255, 100, 100, 1)";
                ctx.strokeStyle = "rgba(0,0,0,0.8)";
                ctx.lineWidth = 2;
                const ax = sx + L.cellSize - 4;
                const ay = sy + 14;
                ctx.strokeText(`${ammoCount}`, ax, ay);
                ctx.fillText(`${ammoCount}`, ax, ay);
              }
            }
          }
        }
      }

      this.renderDragPreview(ctx, L.cellSize);
      this.renderTooltipFixed(ctx, items, equipment);
    } else if (this.activeTab === "character") {
      this.renderCharacterTab(ctx, L, player);
    } else if (this.activeTab === "abilities") {
      this.renderAbilitiesTab(ctx, L, player);
    } else if (this.activeTab === "professions") {
      this.renderProfessionsTab(ctx, L, player);
    } else if (this.activeTab === "quests") {
      this.renderQuestsTab(ctx, L, player);
    }

    ctx.fillStyle = RPG_PROMPT_GOLD;
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(
      "I / C / K / P / Q — tab (press again on same tab to close) · Esc — close",
      L.rightX + 12,
      L.rightY + L.rightH - 12,
    );
    ctx.restore();
  }

  private drawEquipSlot(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
    item: InventoryItem | null,
    label: string,
    slot: EquipmentSlotKey
  ): void {
    const isHover = this.hoveredEquipSlot === slot && !this.dragState?.isDragging;
    const isDragSource =
      this.dragState?.isDragging &&
      this.dragState.source.kind === "equip" &&
      this.dragState.source.slot === slot;
    const isTarget =
      this.dragState?.isDragging &&
      this.dragState.targetEquipSlot === slot &&
      !(
        this.dragState.source.kind === "equip" && this.dragState.source.slot === slot
      );

    ctx.fillStyle = RPG_SLOT_FILL;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (isDragSource) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.strokeStyle = isTarget
      ? "rgba(100, 200, 255, 0.95)"
      : isHover
        ? RPG_TAB_ACTIVE_STROKE
        : RPG_SLOT_STROKE;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    ctx.font = "12px Arial";
    ctx.fillStyle = RPG_METADATA_MUTED;
    ctx.textAlign = "center";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y - 8);

    if (item) {
      const img = this.deps.assetManager.get(getItemAssetKey(item));
      if (img) {
        const pad = 8;
        ctx.save();
        if (isDragSource) ctx.globalAlpha = 0.35;
        ctx.drawImage(img, rect.x + pad, rect.y + pad, rect.w - pad * 2, rect.h - pad * 2);
        ctx.restore();
      }
    }
  }

  private renderDragPreview(ctx: CanvasRenderingContext2D, cellSize: number): void {
    if (!this.dragState?.isDragging) return;
    let dragged: InventoryItem | null = null;
    if (this.dragState.source.kind === "bag") {
      dragged = this.deps.getInventory()[this.dragState.source.index] ?? null;
    } else {
      dragged = this.deps.getEquipment()?.[this.dragState.source.slot] ?? null;
    }
    if (!dragged) return;
    const img = this.deps.assetManager.get(getItemAssetKey(dragged));
    if (!img) return;
    const previewSize = cellSize * 0.85;
    const dx = this.dragState.currentX - previewSize / 2;
    const dy = this.dragState.currentY - previewSize / 2;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, dx, dy, previewSize, previewSize);
    ctx.restore();
  }

  private _mx = 0;
  private _my = 0;

  public updateMousePosition(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    this._mx = x;
    this._my = y;
    this.lastW = canvasWidth;
    this.lastH = canvasHeight;
    if (!this.isOpen()) {
      this.hoveredLoadoutSlot = null;
      this.hoveredBagIndex = null;
      this.hoveredEquipSlot = null;
      return;
    }
    const L = this.layout(canvasWidth, canvasHeight, this.getBagSlotCount());
    const lx = this.toPanelLocalX(x, L.rightW);
    this.hoveredAbilityId = null;
    if (this.activeTab === "inventory") {
      this.hoveredLoadoutSlot = this.getLoadoutSlotAt(lx, y, L);
      this.hoveredBagIndex = this.getBagIndexAt(lx, y, L);
      this.hoveredEquipSlot = this.getEquipAt(lx, y, L);
    } else {
      this.hoveredLoadoutSlot = null;
      this.hoveredBagIndex = null;
      this.hoveredEquipSlot = null;
    }
    if (this.activeTab === "abilities") {
      for (const node of ABILITY_TREE_NODES) {
        const { cx, cy } = skillsNodeCenter(L.skillsOriginX, L.skillsOriginY, node.x, node.y);
        if (uiCircleContains(cx, cy, SKILLS_NODE_RADIUS, lx, y)) {
          this.hoveredAbilityId = node.id;
          break;
        }
      }
    }
    if (this.dragState?.isDragging) {
      this.dragState.currentX = x;
      this.dragState.currentY = y;
      this.dragState.targetBagIndex = this.hoveredBagIndex;
      this.dragState.targetEquipSlot = this.hoveredEquipSlot;
      this.dragState.targetLoadoutSlot = this.hoveredLoadoutSlot;
    }
  }

  /** Fix broken renderTooltip - use _mx,_my */
  private renderTooltipFixed(
    ctx: CanvasRenderingContext2D,
    items: (InventoryItem | null)[],
    equipment: PlayerEquipmentState | null
  ): void {
    if (this.dragState?.isDragging) return;

    let hovered: InventoryItem | null = null;
    if (this.hoveredBagIndex !== null) {
      hovered = items[this.hoveredBagIndex] ?? null;
    } else if (this.hoveredEquipSlot) {
      hovered = equipment?.[this.hoveredEquipSlot] ?? null;
    }
    if (!hovered) return;

    const name = formatDisplayName(hovered.itemType);
    const stackKg =
      getItemWeightKg(hovered.itemType) * (hovered.state?.count ?? 1);
    const weightLine = `${stackKg.toFixed(1)} kg`;

    ctx.textAlign = "center";
    ctx.font = "bold 16px Arial";
    const wName = ctx.measureText(name).width;
    ctx.font = "14px Arial";
    const wWeight = ctx.measureText(weightLine).width;

    const pad = 8;
    const bw = Math.max(wName, wWeight) + pad * 2;
    const bh = 44;
    const bx = this._mx - bw / 2;
    const by = this._my - bh - 10;

    ctx.fillStyle = "rgba(6, 8, 16, 0.94)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = RPG_SLOT_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.font = "bold 16px Georgia";
    ctx.fillStyle = RPG_TITLE_CREAM;
    ctx.fillText(name, this._mx, by + 20);
    ctx.font = "14px Arial";
    ctx.fillStyle = RPG_METADATA_MUTED;
    ctx.fillText(weightLine, this._mx, by + 36);
  }

  public handleClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    clickCount: number = 1
  ): boolean {
    if (!this.isOpen()) return false;
    const L = this.layout(canvasWidth, canvasHeight, this.getBagSlotCount());
    const lx = this.toPanelLocalX(x, L.rightW);
    const inPanel =
      lx >= L.rightX &&
      lx <= L.rightX + L.rightW &&
      y >= L.rightY &&
      y <= L.rightY + L.rightH;

    if (lx < L.rightX) {
      this.toggle();
      return true;
    }

    if (!inPanel) {
      this.toggle();
      return true;
    }

    const player = this.deps.getMyPlayer();
    if (!player) {
      return true;
    }

    for (let i = 0; i < L.tabs.length; i++) {
      const t = L.tabs[i]!;
      const tr = tabBarHitRect(L.tabX0, L.tabTop, L.tabW, L.tabBarH, i, L.tabs.length, L.rightX + L.rightW);
      if (uiRectContains(tr, lx, y)) {
        this.activeTab = t.id;
        this.dragState = null;
        return true;
      }
    }

    if (this.activeTab === "character") {
      const resetRect = panelBottomWideButtonRect(L.rightX, L.rightY, L.rightW, L.rightH);
      if (uiRectContains(resetRect, lx, y)) {
        this.deps.sendProgressionAllocations("character", {});
        return true;
      }
      for (let i = 0; i < CHARACTER_STAT_KEYS.length; i++) {
        const key = CHARACTER_STAT_KEYS[i]!;
        const rowY = characterStatRowLabelY(L.contentTop, i);
        const { minus, plus } = characterStatPlusMinusRects(L.rightX, L.rightW, rowY);
        if (uiRectContains(minus, lx, y)) {
          const m = buildCharacterMapFromPlayer(player);
          m[key] = Math.max(0, (m[key] ?? 0) - 1);
          this.deps.sendProgressionAllocations("character", m);
          return true;
        }
        if (uiRectContains(plus, lx, y)) {
          const m = buildCharacterMapFromPlayer(player);
          m[key] = (m[key] ?? 0) + 1;
          this.deps.sendProgressionAllocations("character", m);
          return true;
        }
      }
      return true;
    }

    if (this.activeTab === "abilities") {
      const resetRect = panelBottomWideButtonRect(L.rightX, L.rightY, L.rightW, L.rightH);
      if (uiRectContains(resetRect, lx, y)) {
        this.deps.sendProgressionAllocations("ability", {});
        return true;
      }
      for (const node of ABILITY_TREE_NODES) {
        const { cx, cy } = skillsNodeCenter(L.skillsOriginX, L.skillsOriginY, node.x, node.y);
        if (uiCircleContains(cx, cy, SKILLS_NODE_RADIUS, lx, y)) {
          const abilities = buildAbilityMapFromPlayer(player);
          const curS = abilities.sprint ?? 0;
          const curR = abilities.regenerate ?? 0;
          if (node.id === "sprint") {
            abilities.sprint = curS > 0 ? 0 : 1;
            if (abilities.sprint && curS === 0 && player.getAvailableAbilityPoints() <= 0) {
              return true;
            }
          } else {
            abilities.regenerate = curR > 0 ? 0 : 1;
            if (
              abilities.regenerate &&
              curR === 0 &&
              player.getAvailableAbilityPoints() <= 0
            ) {
              return true;
            }
          }
          this.deps.sendProgressionAllocations("ability", abilities);
          return true;
        }
      }
      return true;
    }

    if (this.activeTab === "professions") {
      if (!this.selectedProfessionId) {
        for (const rect of this.professionCardRects(L)) {
          if (uiRectContains(rect, lx, y)) {
            this.selectedProfessionId = rect.id;
            return true;
          }
        }
        return true;
      }

      const backRect = this.professionBackRect(L);
      if (uiRectContains(backRect, lx, y)) {
        this.selectedProfessionId = null;
      }
      return true;
    }

    if (this.activeTab === "quests") {
      return true;
    }

    const loadoutHit = this.getLoadoutSlotAt(lx, y, L);
    if (loadoutHit !== null) {
      if (clickCount >= 2) {
        this.deps.sendSetWeaponLoadoutSlot(loadoutHit, 0);
      } else {
        this.deps.sendSelectWeaponLoadout(loadoutHit);
      }
      return true;
    }

    const bagIdx = this.getBagIndexAt(x, y, L);
    const eq = this.getEquipAt(x, y, L);
    if (bagIdx !== null) {
      const item = this.deps.getInventory()[bagIdx];
      if (item && clickCount >= 2 && this.tryQuickEquipFromBag(bagIdx, item)) {
        if (bagIdx < (this.deps.getMyPlayer()?.getMaxInventorySlots() ?? getConfig().player.MAX_INVENTORY_SLOTS)) {
          this.deps.sendSelectInventorySlot(bagIdx + 1);
        }
        return true;
      }
      if (item) {
        this.dragState = {
          source: { kind: "bag", index: bagIdx },
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          isDragging: false,
          targetBagIndex: null,
          targetEquipSlot: null,
          targetLoadoutSlot: null,
        };
      }
      if (bagIdx < (this.deps.getMyPlayer()?.getMaxInventorySlots() ?? getConfig().player.MAX_INVENTORY_SLOTS)) {
        this.deps.sendSelectInventorySlot(bagIdx + 1);
      }
      return true;
    }
    if (eq) {
      const item = this.deps.getEquipment()?.[eq];
      if (item) {
        this.dragState = {
          source: { kind: "equip", slot: eq },
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          isDragging: false,
          targetBagIndex: null,
          targetEquipSlot: null,
          targetLoadoutSlot: null,
        };
      }
      return true;
    }
    return true;
  }

  public handleMouseMove(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    this.updateMousePosition(x, y, canvasWidth, canvasHeight);
    const drag = this.dragState;
    if (!drag || drag.isDragging) {
      return;
    }
    const d = Math.hypot(x - drag.startX, y - drag.startY);
    if (d >= DRAG_THRESHOLD) {
      drag.isDragging = true;
      this.hoveredBagIndex = null;
      this.hoveredEquipSlot = null;
    }
  }

  public handleMouseUp(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.isOpen() || this.activeTab !== "inventory") return;
    const drag = this.dragState;
    this.dragState = null;
    if (!drag?.isDragging) {
      return;
    }

    const L = this.layout(canvasWidth, canvasHeight, this.getBagSlotCount());
    const lx = this.toPanelLocalX(x, L.rightW);
    const bagIdx = this.getBagIndexAt(lx, y, L);
    const eq = this.getEquipAt(lx, y, L);

    if (drag.source.kind === "bag") {
      const lo = drag.targetLoadoutSlot;
      if (lo !== null) {
        const items = this.deps.getInventory();
        const item = items[drag.source.index];
        if (item && itemMatchesLoadoutRow(item.itemType, lo)) {
          this.deps.sendSetWeaponLoadoutSlot(lo, drag.source.index + 1);
        }
        return;
      }
      if (bagIdx !== null && bagIdx !== drag.source.index) {
        this.deps.sendSwapItems(drag.source.index, bagIdx);
        return;
      }
      if (eq) {
        this.deps.sendSwapBagAndEquipment(drag.source.index, eq);
        return;
      }
      const inRight =
        lx >= L.rightX && lx <= L.rightX + L.rightW && y >= L.rightY && y <= L.rightY + L.rightH;
      if (!inRight) {
        this.deps.sendDropItem(drag.source.index);
      }
      return;
    }

    if (drag.source.kind === "equip") {
      if (bagIdx !== null) {
        this.deps.sendSwapBagAndEquipment(bagIdx, drag.source.slot);
      }
    }
  }

  public isPointOverUi(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.isOpen()) return false;
    const L = this.layout(canvasWidth, canvasHeight, this.getBagSlotCount());
    const lx = this.toPanelLocalX(x, L.rightW);
    return lx >= L.rightX && lx <= L.rightX + L.rightW && y >= L.rightY && y <= L.rightY + L.rightH;
  }
}
