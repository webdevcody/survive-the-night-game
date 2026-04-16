import { GameState, getEntityById } from "@/state";
import { getPlayer } from "@/util/get-player";
import { InputManager } from "@/managers/input";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import {
  InventoryItem,
  isWeapon,
  getWeaponAmmoType,
  getWeaponMagazineSize,
  createEmptyEquipment,
  EQUIPMENT_SLOT_KEYS,
  canItemGoInEquipmentSlot,
  decodeEquipmentSlotKey,
  encodeEquipmentSlotKey,
  type EquipmentSlotKey,
  type PlayerEquipmentState,
  canBagAcceptItem,
  isStackableInventoryItem,
} from "@shared/util/inventory";
import type { BankActionEventData } from "@shared/events/client-sent/events/bank-action";
import type { SetSignTextEventData } from "@shared/events/client-sent/events/set-sign-text";
import type { AuctionActionEventData } from "../../../game-shared/src/events/client-sent/events/auction-action";
import {
  AUCTION_MAX_PRICE,
  AUCTION_MIN_PRICE,
  type AuctionHouseSnapshotPayload,
  type AuctionListingSnapshot,
  canListItemFromBag,
} from "../../../game-shared/src/util/auction-types";
import type { AuctionItemCategory } from "../../../game-shared/src/util/auction-item-category";
import { itemRegistry } from "@shared/entities/item-registry";
import { getConfig, playerConfig, type MerchantShopItem } from "@shared/config";
import { MerchantClient } from "@/entities/environment/merchant";
import {
  buildMerchantShopGridEntries,
  canSellItemToMerchant,
  type MerchantCategoryTab,
  type MerchantShopGridEntry,
} from "@/ui/merchant-ui-helpers";
import { formatDisplayName } from "@/util/format";
import { calculateHudScale } from "@/util/hud-scale";
import { PlayerClient } from "@/entities/player";
import { ClientInventory } from "@/extensions/inventory";
import { ClientPositionable } from "@/extensions/positionable";
import { ClientPoison } from "@/extensions/poison";
import { ClientInfiniteRun } from "@/extensions/infinite-run";
import {
  CHARACTER_STAT_KEYS,
  CHARACTER_STAT_MODIFIERS,
  MAX_POINTS_PER_CHARACTER_STAT,
  computeStatEvadeChanceDisplay,
  computeTotalEvadeChance,
  computeArmorEvadeBonusFromEquipment,
  countEquippedArmorPieces,
  computeInventoryWeightKg,
  computePassiveHpRegenIntervalSeconds,
  computeStaminaRegenMultiplier,
  getItemWeightKg,
  type CharacterStatKey,
} from "@shared/util/character-stats";
import {
  ABILITY_TREE_NODES,
  ABILITY_DEFINITIONS,
  ABILITY_IDS,
  ABILITY_ICON_SHEET_TILE_PX,
  ABILITY_ICON_SHEET_URL,
  getAbilityIconSheetFrameIndex,
  MAX_RANK_PER_ABILITY,
  type AbilityId,
} from "@shared/util/ability-tree";
import {
  LOADOUT_RESERVED_BAG_SLOT_COUNT,
  getMaxVisibleBagSlots,
} from "@shared/util/ability-effects";
import { getProgressionPointsBudget } from "@shared/util/experience-level";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import { itemMatchesConsumableLoadout } from "@shared/util/consumable-loadout";
import {
  getWeaponLoadoutSlotKey,
  weaponLoadoutSlotKeyToIndex,
} from "@shared/util/weapon-loadout";
import {
  TAB_BAR_H,
  PANEL_TAB_CONTENT_GAP,
  characterStatPlusMinusRects,
  CHARACTER_STAT_GROUP_HEADER_BLOCK_PX,
  CHARACTER_STAT_ROW_STEP_PX,
  drawCanvasUiButton,
  tabBarHitRect,
  uiCircleContains,
  uiRectContains,
} from "@/ui/canvas-ui-rect";
import { renderUnspentProgressionBadge } from "./minimap-inventory-menu";
import { getQuestObjectiveLine } from "./quest-display";
import { SignTextModal } from "./sign-modals";
import { getSignInventoryDisplayName } from "@shared/util/sign-message";
import { getItemKindLabel } from "@shared/util/item-kind-label";
import {
  PROFESSION_DEFINITIONS,
  PROFESSION_IDS,
  type ProfessionId,
} from "@shared/util/professions";
import { CRAFTING_STATION_LABELS } from "@shared/util/crafting-stations";
import { distance } from "@shared/util/physics";
import {
  drawRpgTopAccentBar,
  fillRpgPanelGradient,
  RPG_BODY_TEXT,
  RPG_BORDER_GOLD,
  RPG_COUNTER_GOLD,
  RPG_METADATA_MUTED,
  RPG_MODAL_SCRIM,
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
/** Auction claim control: pinned top-right of bank panel; tabs leave this horizontal band clear. */
const AUCTION_CLAIM_BTN_W = 108;
const AUCTION_CLAIM_BTN_H = 22;
const AUCTION_CLAIM_BTN_TOP = 10;
const AUCTION_CLAIM_BTN_RIGHT_INSET = 10;
const AUCTION_TAB_RIGHT_RESERVE_FOR_CLAIM =
  AUCTION_CLAIM_BTN_W + AUCTION_CLAIM_BTN_RIGHT_INSET + 8;

const AUCTION_MODAL_INPUT_INVALID_BORDER = "rgba(220, 100, 100, 0.95)";

/** Non-negative integer string (no decimals, no empty). */
function parseAuctionModalUintString(raw: string): { ok: true; value: number } | { ok: false } {
  const t = raw.trim();
  if (t === "" || !/^\d+$/.test(t)) {
    return { ok: false };
  }
  const value = Number(t);
  if (!Number.isSafeInteger(value)) {
    return { ok: false };
  }
  return { ok: true, value };
}

function styleAuctionModalButton(el: HTMLButtonElement, variant: "primary" | "secondary"): void {
  const base =
    "font:bold 14px Arial,system-ui,sans-serif;padding:8px 18px;min-width:92px;border-radius:4px;cursor:pointer;box-sizing:border-box;transition:filter 0.12s ease;";
  if (variant === "secondary") {
    el.style.cssText =
      base +
      `background:${RPG_SLOT_FILL};color:${RPG_BODY_TEXT};border:1px solid ${RPG_SLOT_STROKE};`;
  } else {
    el.style.cssText =
      base +
      `background:${RPG_TAB_ACTIVE_FILL};color:${RPG_TITLE_CREAM};border:2px solid ${RPG_TAB_ACTIVE_STROKE};`;
  }
  el.onmouseenter = () => {
    el.style.filter = "brightness(1.08)";
  };
  el.onmouseleave = () => {
    el.style.filter = "";
  };
}

function auctionModalTextInputStyle(): string {
  return `width:100%;padding:8px;font-size:16px;box-sizing:border-box;border-radius:4px;border:1px solid ${RPG_SLOT_STROKE};background:${RPG_SLOT_FILL_DIM};color:${RPG_BODY_TEXT};outline:none;font-family:Georgia,system-ui,sans-serif;`;
}
const INVENTORY_PANEL_OPEN_SPEED = 7;
const INVENTORY_PANEL_CLOSE_SPEED = 10;

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function professionBannerUrl(id: ProfessionId): string {
  return `/ui/professions/profession-${id}-banner.png`;
}

/** 160×16 strip; frames follow `CHARACTER_STAT_KEYS` order in character-stats.ts */
const CHARACTER_STAT_ICON_SHEET_URL = "/ui/character-stat-icons.png";
/** Source tile size in the PNG (each frame is 16×16). */
const CHARACTER_STAT_ICON_SHEET_PX = 16;
/** Drawn size on the character tab (2× upscale, nearest-neighbor). */
const CHARACTER_STAT_ICON_DRAW_PX = 32;
const CHARACTER_STAT_ICON_TEXT_GAP = 8;
const CHARACTER_STAT_INFO_BADGE_RADIUS = 8;
/** Space between group title text end and the info badge (center sits after this gap). */
const CHARACTER_STAT_GROUP_TITLE_TO_INFO_GAP_PX = 8;

let measureBold14GeorgiaCanvas: HTMLCanvasElement | null = null;
function measureBold14GeorgiaWidth(text: string): number {
  if (typeof document === "undefined") {
    return text.length * 8.5;
  }
  if (!measureBold14GeorgiaCanvas) {
    measureBold14GeorgiaCanvas = document.createElement("canvas");
  }
  const c = measureBold14GeorgiaCanvas.getContext("2d");
  if (!c) return text.length * 8.5;
  c.font = "bold 14px Georgia";
  return c.measureText(text).width;
}

function characterStatInfoBadge(rightX: number, rightW: number, rowLabelY: number) {
  return {
    cx: rightX + rightW - 150,
    cy: rowLabelY - 6,
    r: CHARACTER_STAT_INFO_BADGE_RADIUS,
  };
}

function formatTooltipPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatTooltipNumber(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString();
}

function getCharacterStatTooltipLines(
  key: CharacterStatKey,
  points: number,
  player?: PlayerClient,
): string[] {
  switch (key) {
    case "health":
      return [
        `+${CHARACTER_STAT_MODIFIERS.healthPerPoint} max HP per point.`,
        `Current bonus: +${points * CHARACTER_STAT_MODIFIERS.healthPerPoint} max HP.`,
      ];
    case "evade": {
      const base = [
        "Zombie hits can deal 0 damage.",
        `+${formatTooltipPercent(CHARACTER_STAT_MODIFIERS.evadeChancePerPoint, 1)} evade per point from stats, up to ${formatTooltipPercent(CHARACTER_STAT_MODIFIERS.evadeMaxChance)} max (with armor).`,
        `Each equipped armor piece adds +${formatTooltipPercent(CHARACTER_STAT_MODIFIERS.armorEvadeChancePerEquippedPiece, 1)} before the cap.`,
      ];
      if (player?.hasExt(ClientInventory)) {
        const eq = player.getExt(ClientInventory).getEquipment();
        const statOnly = computeStatEvadeChanceDisplay(points);
        const armorBonus = computeArmorEvadeBonusFromEquipment(eq);
        const total = computeTotalEvadeChance(points, eq);
        const n = countEquippedArmorPieces(eq);
        return [
          ...base,
          `From stats: ${formatTooltipPercent(statOnly, 1)}.`,
          `From armor (${n} piece${n === 1 ? "" : "s"}): +${formatTooltipPercent(armorBonus, 1)}.`,
          `Total vs zombies: ${formatTooltipPercent(total, 1)}.`,
        ];
      }
      return [
        ...base,
        `Current from stats only: ${formatTooltipPercent(computeStatEvadeChanceDisplay(points), 1)} (open Character tab with gear for total).`,
      ];
    }
    case "accuracy": {
      const spreadMultiplier = Math.max(
        0.2,
        1 - points * CHARACTER_STAT_MODIFIERS.accuracySpreadReductionPerPoint,
      );
      return [
        "Tightens ranged weapon spread.",
        `-${formatTooltipPercent(CHARACTER_STAT_MODIFIERS.accuracySpreadReductionPerPoint)} spread per point, down to 20% of base.`,
        `Current spread: ${formatTooltipPercent(spreadMultiplier)} of base.`,
      ];
    }
    case "reloadSpeed": {
      const cooldownMultiplier = Math.max(
        0.5,
        1 - points * CHARACTER_STAT_MODIFIERS.reloadSpeedCooldownReductionPerPoint,
      );
      return [
        "Reduces weapon reload duration.",
        `-${formatTooltipPercent(CHARACTER_STAT_MODIFIERS.reloadSpeedCooldownReductionPerPoint)} reload time per point, down to 50% of base.`,
        `Current reload time: ${formatTooltipPercent(cooldownMultiplier)} of base.`,
      ];
    }
    case "runSpeed":
      return [
        `+${formatTooltipPercent(CHARACTER_STAT_MODIFIERS.runSpeedPerPoint)} move speed per point.`,
        `Current bonus: +${formatTooltipPercent(points * CHARACTER_STAT_MODIFIERS.runSpeedPerPoint)}.`,
      ];
    case "luck": {
      const bonus = Math.min(3, Math.floor(points / 4));
      return [
        "Coin pickups grant +1 extra coin every 4 points.",
        `Current bonus: +${bonus} coin${bonus === 1 ? "" : "s"} per pickup.`,
        "Loot rarity is not affected yet.",
      ];
    }
    case "stamina":
      return [
        `+${CHARACTER_STAT_MODIFIERS.staminaMaxPerPoint} max stamina per point.`,
        `Current bonus: +${points * CHARACTER_STAT_MODIFIERS.staminaMaxPerPoint} max stamina.`,
      ];
    case "recovery": {
      const regenMultiplier = computeStaminaRegenMultiplier(points);
      return [
        "Increases stamina regeneration.",
        `+${formatTooltipPercent(CHARACTER_STAT_MODIFIERS.staminaRecoveryPerPoint)} regen per point.`,
        `Current regen: ${formatTooltipPercent(regenMultiplier)} of base.`,
      ];
    }
    case "hpRecovery": {
      const interval = computePassiveHpRegenIntervalSeconds(points);
      return [
        `Passively heals ${formatTooltipNumber(CHARACTER_STAT_MODIFIERS.passiveHpRegenAmount)} HP each tick.`,
        `-${formatTooltipNumber(CHARACTER_STAT_MODIFIERS.passiveHpRegenIntervalReductionPerPoint)}s between ticks per point, min ${formatTooltipNumber(CHARACTER_STAT_MODIFIERS.passiveHpRegenMinIntervalSec)}s.`,
        `Current tick interval: ${formatTooltipNumber(interval)}s.`,
      ];
    }
    case "strength":
      return [
        `+${CHARACTER_STAT_MODIFIERS.strengthSlotsPerPoint} inventory slot per point.`,
        `Current bonus: +${points * CHARACTER_STAT_MODIFIERS.strengthSlotsPerPoint} slot${points === 1 ? "" : "s"}.`,
      ];
  }
}

/** One-line live effect for the character tab (next to each stat label). */
function formatCharacterStatInlineSummary(key: CharacterStatKey, player: PlayerClient): string {
  const points = Math.max(0, Math.floor(player.getCharacterStat(key)));
  switch (key) {
    case "health":
      return `${Math.round(player.getHealth())} / ${player.getMaxHealth()} HP`;
    case "stamina":
      return `${Math.round(player.getStamina())} / ${player.getMaxStamina()} stamina`;
    case "evade": {
      if (!player.hasExt(ClientInventory)) {
        return `${formatTooltipPercent(computeStatEvadeChanceDisplay(points), 1)} evade`;
      }
      const eq = player.getExt(ClientInventory).getEquipment();
      const statOnly = computeStatEvadeChanceDisplay(points);
      const armor = computeArmorEvadeBonusFromEquipment(eq);
      const total = computeTotalEvadeChance(points, eq);
      return `${formatTooltipPercent(statOnly, 1)} stats + ${formatTooltipPercent(armor, 1)} armor = ${formatTooltipPercent(total, 1)}`;
    }
    case "accuracy": {
      const spreadMultiplier = Math.max(
        0.2,
        1 - points * CHARACTER_STAT_MODIFIERS.accuracySpreadReductionPerPoint,
      );
      return `Spread ${formatTooltipPercent(spreadMultiplier)} of base`;
    }
    case "reloadSpeed": {
      const cooldownMultiplier = Math.max(
        0.5,
        1 - points * CHARACTER_STAT_MODIFIERS.reloadSpeedCooldownReductionPerPoint,
      );
      return `Reload ${formatTooltipPercent(cooldownMultiplier)} of base`;
    }
    case "runSpeed":
      return `+${formatTooltipPercent(points * CHARACTER_STAT_MODIFIERS.runSpeedPerPoint)} move speed`;
    case "luck": {
      const bonus = Math.min(3, Math.floor(points / 4));
      return `+${bonus} coin${bonus === 1 ? "" : "s"}/pickup`;
    }
    case "recovery": {
      const regenMultiplier = computeStaminaRegenMultiplier(points);
      return `Regen ${formatTooltipPercent(regenMultiplier)} of base`;
    }
    case "hpRecovery": {
      const interval = computePassiveHpRegenIntervalSeconds(points);
      return `Heal every ${formatTooltipNumber(interval)}s`;
    }
    case "strength":
      return `${player.getMaxInventorySlots()} bag slots`;
  }
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

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  if (!text.trim()) {
    return [];
  }
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth || currentLine.length === 0) {
      currentLine = nextLine;
      continue;
    }
    lines.push(currentLine);
    currentLine = word;
    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  const consumedWords = lines.join(" ").split(/\s+/).length;
  if (consumedWords < words.length && lines.length > 0) {
    const lastIndex = lines.length - 1;
    let lastLine = lines[lastIndex]!;
    while (lastLine.length > 0 && ctx.measureText(`${lastLine}...`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }
    lines[lastIndex] = lastLine ? `${lastLine}...` : "...";
  }

  return lines;
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

const STAT_LABELS: Record<(typeof CHARACTER_STAT_KEYS)[number], string> = {
  health: "Health",
  evade: "Evade (vs zombies)",
  accuracy: "Accuracy",
  reloadSpeed: "Reload speed",
  runSpeed: "Run speed",
  luck: "Luck (coins)",
  stamina: "Stamina (max)",
  recovery: "Stamina recovery",
  hpRecovery: "Passive HP regen",
  strength: "Strength (inventory)",
};

/** Loop-based groups for the character tab (each stat appears exactly once). */
const CHARACTER_STAT_LOOP_GROUPS: ReadonlyArray<{
  title: string;
  infoLines: readonly string[];
  keys: readonly CharacterStatKey[];
}> = [
  {
    title: "Survivability",
    infoLines: [
      "Useful when you want to last longer in fights and recover between engagements.",
      "Improves max HP, dodge chance vs zombies, and passive healing over time.",
    ],
    keys: ["health", "evade", "hpRecovery"],
  },
  {
    title: "Combat",
    infoLines: [
      "Useful when you want to deal damage more reliably and act faster in fights.",
      "Tightens ranged spread and reduces cooldowns for weapons, melee, and consumables.",
    ],
    keys: ["accuracy", "reloadSpeed"],
  },
  {
    title: "Mobility",
    infoLines: [
      "Useful for moving around the map and sprinting more effectively.",
      "Raises run speed, max stamina, and stamina regen. Heavy loads still drain sprint faster.",
    ],
    keys: ["runSpeed", "stamina", "recovery"],
  },
  {
    title: "Carry & loot",
    infoLines: [
      "Useful when you want to haul more gear and get more from pickups.",
      "Adds inventory slots and bonus coins from coin pickups.",
    ],
    keys: ["strength", "luck"],
  },
];
const WIDE_GRID_COLS = 5;
const NARROW_GRID_COLS = 4;
const ABILITY_CARD_COLS = 4;
const ABILITY_CARD_GAP = 12;

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
};

type BankCtxTarget =
  | { kind: "bank"; index: number }
  | { kind: "bag"; index: number }
  | { kind: "equip"; slot: EquipmentSlotKey }
  | { kind: "auction"; listingIndex: number };

type CtxMenuState = {
  x: number;
  y: number;
  target: BankCtxTarget;
};

export type InventoryScreenDeps = {
  assetManager: AssetManager;
  inputManager: InputManager;
  getInventory: () => (InventoryItem | null)[];
  getEquipment: () => PlayerEquipmentState | null;
  getBank: () => (InventoryItem | null)[];
  getMyPlayer: () => PlayerClient | null;
  sendDropItem: (slotIndex: number, amount?: number) => void;
  sendDropFromEquipment: (equipSlot: EquipmentSlotKey) => void;
  sendSwapItems: (from: number, to: number) => void;
  sendSwapBagAndEquipment: (bagIndex: number, equipSlot: EquipmentSlotKey) => void;
  sendConsumeItem: (itemType: string | null, slotIndex?: number) => void;
  sendProgressionAllocations: (
    kind: "ability" | "character",
    allocations: Record<string, number>,
  ) => void;
  sendSetWeaponLoadoutSlot: (slot: 0 | 1 | 2 | 3 | 4, bagIndex: number) => void;
  sendSelectWeaponLoadout: (loadout: 0 | 1 | 2) => void;
  sendBankAction: (data: BankActionEventData) => void;
  sendAuctionAction: (data: AuctionActionEventData) => void;
  sendSplitInventoryStack: (data: { slotIndex: number; quantity: number }) => void;
  sendSetSignText: (data: SetSignTextEventData) => void;
  getAuctionSnapshot: () => AuctionHouseSnapshotPayload | null;
  getAuthoredQuests: () => import("@shared/map/quest-types").WorldMapQuestDefinition[];
  sendMerchantBuy: (merchantId: number, itemIndex: number) => void;
  sendMerchantSell: (merchantId: number, inventorySlot: number) => void;
  getCanvas: () => HTMLCanvasElement | null;
};

function buildCharacterMapFromPlayer(player: PlayerClient): Record<string, number> {
  const o: Record<string, number> = {};
  for (const key of CHARACTER_STAT_KEYS) {
    o[key] = player.getCharacterStat(key);
  }
  return o;
}

function buildAbilityMapFromPlayer(player: PlayerClient): Record<string, number> {
  const abilities: Record<string, number> = {};
  for (const abilityId of ABILITY_IDS) {
    abilities[abilityId] = player.getAbilityRank(abilityId);
  }
  return abilities;
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
  /** 0–1: bank panel slides in from the left (independent of main panel when closing bank only). */
  private bankVisibilityProgress = 0;
  private lastBankVisibilityAnimationAt = 0;
  private deps: InventoryScreenDeps;
  private dragState: DragState | null = null;
  private hoveredBagIndex: number | null = null;
  private hoveredEquipSlot: EquipmentSlotKey | null = null;
  /** Nearest locker entity id while bank UI is open. */
  private bankLockerId: number | null = null;
  /** Auction house entity id while auction UI is open (mutually exclusive with bank). */
  private auctionHouseId: number | null = null;
  /** Merchant entity id while merchant shop dock is open. */
  private merchantId: number | null = null;
  private merchantCategoryFilter: MerchantCategoryTab = "all";
  private merchantTabRects: { id: MerchantCategoryTab; x: number; y: number; w: number; h: number }[] =
    [];
  /** First index into filtered merchant shop list for grid windowing. */
  private merchantShopScrollFirstIndex = 0;
  private merchantWheelHandler: ((e: WheelEvent) => void) | null = null;
  private latestGameState: GameState | null = null;
  private auctionCategoryFilter: AuctionItemCategory | "all" = "all";
  private auctionTabRects: { id: AuctionItemCategory | "all"; x: number; y: number; w: number; h: number }[] =
    [];
  private claimButtonRect: { x: number; y: number; w: number; h: number } | null = null;
  private auctionPriceModal: AuctionPriceModal | null = null;
  private splitStackModal: SplitStackQuantityModal | null = null;
  private signTextModal: SignTextModal | null = null;
  /**
   * True if the current inventory session was started by pressing E on a locker while the
   * inventory panel was closed (so E again closes bank + full inventory). Sticky until the
   * inventory panel fully closes; not cleared when only the bank panel closes.
   */
  private inventoryOpenedViaBankOnly = false;
  private hoveredBankSlotIndex: number | null = null;
  private ctxMenu: CtxMenuState | null = null;
  private lastW = 0;
  private lastH = 0;
  private activeTab: InventoryUiTab = "inventory";
  private hoveredAbilityId: AbilityId | null = null;
  private hoveredCharacterStatKey: CharacterStatKey | null = null;
  /** Index into `CHARACTER_STAT_LOOP_GROUPS` when hovering a group info badge. */
  private hoveredCharacterStatGroupIndex: number | null = null;
  private selectedProfessionId: ProfessionId | null = null;
  private professionBannerImages: Partial<Record<ProfessionId, HTMLImageElement>> = {};
  private professionBannersPreloadStarted = false;
  private characterStatIconSheet: HTMLImageElement | null = null;
  private characterStatIconsPreloadStarted = false;
  private abilityIconSheet: HTMLImageElement | null = null;
  private abilityIconsPreloadStarted = false;

  constructor(deps: InventoryScreenDeps) {
    this.deps = deps;
    this.preloadProfessionBanners();
    this.preloadCharacterStatIcons();
    this.preloadAbilityIcons();
  }

  private closeInventoryModals(): void {
    this.auctionPriceModal?.close();
    this.auctionPriceModal = null;
    this.splitStackModal?.close();
    this.splitStackModal = null;
    this.signTextModal?.close();
    this.signTextModal = null;
  }

  public isBlockingModalOpen(): boolean {
    return this.auctionPriceModal !== null || this.splitStackModal !== null || this.signTextModal !== null;
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

  private preloadCharacterStatIcons(): void {
    if (this.characterStatIconsPreloadStarted) return;
    this.characterStatIconsPreloadStarted = true;
    const img = new Image();
    img.decoding = "async";
    img.src = CHARACTER_STAT_ICON_SHEET_URL;
    img.onload = () => {
      this.characterStatIconSheet = img;
    };
  }

  private preloadAbilityIcons(): void {
    if (this.abilityIconsPreloadStarted) {
      return;
    }
    this.abilityIconsPreloadStarted = true;
    const img = new Image();
    img.decoding = "async";
    img.src = ABILITY_ICON_SHEET_URL;
    img.onload = () => {
      this.abilityIconSheet = img;
    };
  }

  public toggle(): void {
    this.setOpen(!this.open);
  }

  public setOpen(value: boolean): void {
    if (value) {
      if (!this.open) {
        this.inventoryOpenedViaBankOnly = false;
        this.bankVisibilityProgress = 0;
        this.lastBankVisibilityAnimationAt = 0;
      }
    }
    this.open = value;
    if (!this.open) {
      this.dragState = null;
      this.activeTab = "inventory";
      this.hoveredAbilityId = null;
      this.hoveredCharacterStatKey = null;
      this.selectedProfessionId = null;
      this.bankLockerId = null;
      this.auctionHouseId = null;
      this.merchantId = null;
      this.removeMerchantWheel();
      this.closeInventoryModals();
      this.ctxMenu = null;
    }
  }

  public openBank(lockerEntityId: number, inventoryWasAlreadyOpen: boolean): void {
    this.closeInventoryModals();
    this.auctionHouseId = null;
    this.merchantId = null;
    this.removeMerchantWheel();
    this.bankLockerId = lockerEntityId;
    this.ctxMenu = null;
    this.open = true;
    this.activeTab = "inventory";
    if (!inventoryWasAlreadyOpen) {
      this.inventoryOpenedViaBankOnly = true;
    }
  }

  public openMerchant(merchantEntityId: number, inventoryWasAlreadyOpen: boolean): void {
    this.closeInventoryModals();
    this.bankLockerId = null;
    this.auctionHouseId = null;
    this.merchantId = merchantEntityId;
    this.merchantCategoryFilter = "all";
    this.merchantShopScrollFirstIndex = 0;
    this.ctxMenu = null;
    this.open = true;
    this.activeTab = "inventory";
    if (!inventoryWasAlreadyOpen) {
      this.inventoryOpenedViaBankOnly = true;
    }
    this.setupMerchantWheel();
  }

  public openAuction(auctionHouseEntityId: number, inventoryWasAlreadyOpen: boolean): void {
    this.closeInventoryModals();
    this.bankLockerId = null;
    this.merchantId = null;
    this.removeMerchantWheel();
    this.auctionHouseId = auctionHouseEntityId;
    this.ctxMenu = null;
    this.open = true;
    this.activeTab = "inventory";
    if (!inventoryWasAlreadyOpen) {
      this.inventoryOpenedViaBankOnly = true;
    }
    this.requestAuctionSnapshot();
  }

  public closeBank(): void {
    this.bankLockerId = null;
    this.auctionHouseId = null;
    this.merchantId = null;
    this.removeMerchantWheel();
    this.closeInventoryModals();
    this.ctxMenu = null;
  }

  private requestAuctionSnapshot(): void {
    if (this.auctionHouseId == null) return;
    this.deps.sendAuctionAction({
      auctionHouseEntityId: this.auctionHouseId,
      kind: "snapshot",
      bagSlotIndex: 0,
      price: 0,
      listingId: "",
      listQuantity: 0,
    });
  }

  private setupMerchantWheel(): void {
    this.removeMerchantWheel();
    const canvas = this.deps.getCanvas();
    if (!canvas) {
      return;
    }
    this.merchantWheelHandler = (event: WheelEvent) => {
      if (this.merchantId == null || !this.isOpen() || this.activeTab !== "inventory") {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      if (!this.bankPanelContainsScreenPoint(x, y, canvas.width, canvas.height)) {
        return;
      }
      const B = this.layoutBank(canvas.width, canvas.height);
      const entries = this.getMerchantFilteredShopEntries();
      const maxFirst = Math.max(0, entries.length - B.bankSlots);
      if (maxFirst <= 0) {
        return;
      }
      event.preventDefault();
      const delta = event.deltaY > 0 ? B.gridCols : -B.gridCols;
      this.merchantShopScrollFirstIndex = Math.max(
        0,
        Math.min(maxFirst, this.merchantShopScrollFirstIndex + delta),
      );
    };
    canvas.addEventListener("wheel", this.merchantWheelHandler, { passive: false });
  }

  private removeMerchantWheel(): void {
    if (!this.merchantWheelHandler) {
      return;
    }
    const canvas = this.deps.getCanvas();
    if (canvas) {
      canvas.removeEventListener("wheel", this.merchantWheelHandler);
    }
    this.merchantWheelHandler = null;
  }

  private getMerchantShopItemsFromState(): MerchantShopItem[] {
    if (this.merchantId == null || !this.latestGameState) {
      return [];
    }
    const ent = getEntityById(this.latestGameState, this.merchantId);
    return ent instanceof MerchantClient ? ent.getShopItems() : [];
  }

  private getMerchantFilteredShopEntries(): MerchantShopGridEntry[] {
    return buildMerchantShopGridEntries(
      this.getMerchantShopItemsFromState(),
      this.merchantCategoryFilter,
    );
  }

  private layoutMerchantCategoryTabs(
    B: ReturnType<InventoryScreenUI["layoutBank"]>,
  ): { id: MerchantCategoryTab; x: number; y: number; w: number; h: number }[] {
    const ids: MerchantCategoryTab[] = ["all", "weapon", "ammo", "item"];
    const gap = 4;
    const h = 20;
    const leftPad = 12;
    const rightPad = 12;
    const w = Math.floor((B.bankW - leftPad - rightPad - gap * (ids.length - 1)) / ids.length);
    let x = B.bankX + leftPad;
    const y = B.titleY + 8;
    return ids.map((id) => {
      const r = { id, x, y, w, h };
      x += w + gap;
      return r;
    });
  }

  private hitTestMerchantTab(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
  ): MerchantCategoryTab | null {
    if (this.merchantId == null) {
      return null;
    }
    const B = this.layoutBank(canvasWidth, canvasHeight);
    const lx = screenX - this.getBankSlideOffsetPx(B.bankW);
    const ly = screenY;
    for (const t of this.merchantTabRects) {
      if (lx >= t.x && lx <= t.x + t.w && ly >= t.y && ly <= t.y + t.h) {
        return t.id;
      }
    }
    return null;
  }

  private maybeCloseBankIfOutOfRange(gameState: GameState, player: PlayerClient): void {
    const entityId = this.bankLockerId ?? this.auctionHouseId ?? this.merchantId;
    if (entityId == null) {
      return;
    }
    const ent = getEntityById(gameState, entityId);
    const maxR = getConfig().player.MAX_INTERACT_RADIUS;
    if (
      !ent ||
      !ent.hasExt(ClientPositionable) ||
      !player.hasExt(ClientPositionable)
    ) {
      this.closeBank();
      return;
    }
    const p = player.getExt(ClientPositionable).getCenterPosition();
    const q = ent.getExt(ClientPositionable).getCenterPosition();
    if (distance(p, q) > maxR) {
      this.closeBank();
    }
  }

  public isBankOpen(): boolean {
    return this.bankLockerId != null || this.auctionHouseId != null || this.merchantId != null;
  }

  /** When true, pressing E at the locker to dismiss the bank should also close the inventory panel. */
  public shouldCloseFullInventoryWhenTogglingBank(): boolean {
    return this.inventoryOpenedViaBankOnly;
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
    const leftX = LAYOUT_PAD_PX;
    const withBankCenter = (leftX + rightW + rightX) / 2;
    const withoutBankCenter = rightX / 2;
    const bankEased = easeOutCubic(this.bankVisibilityProgress);
    // If the inventory session started from E at the locker, keep the camera centered for the
    // whole session, including the close animation.
    const bankBlend = this.inventoryOpenedViaBankOnly ? 1 : bankEased;
    const openCenter = withoutBankCenter + (withBankCenter - withoutBankCenter) * bankBlend;
    const eased = easeOutCubic(this.visibilityProgress);
    const defaultCenter = canvasWidth / 2;
    return defaultCenter + (openCenter - defaultCenter) * eased;
  }

  /** True while the panel is shown or playing its open/close slide animation. */
  public isOpen(): boolean {
    return this.open || this.visibilityProgress > 0.001;
  }

  /**
   * Advance open/close and bank slide progress once per frame before camera + aim run.
   * (Previously this ran at render time, so gameplay used stale progress vs the drawn panel.)
   */
  public tickPanelAnimations(now: number): void {
    this.stepVisibility(this.open, now);
    this.stepBankVisibility(now);
  }

  public getActiveTab(): InventoryUiTab {
    return this.activeTab;
  }

  /** Open the panel (if needed) and switch to the given tab. */
  public focusTab(tab: InventoryUiTab): void {
    if (!this.open) {
      this.inventoryOpenedViaBankOnly = false;
      this.bankVisibilityProgress = 0;
      this.lastBankVisibilityAnimationAt = 0;
    }
    this.open = true;
    this.activeTab = tab;
    this.dragState = null;
    if (tab !== "inventory") {
      this.bankLockerId = null;
      this.auctionHouseId = null;
      this.closeInventoryModals();
      this.ctxMenu = null;
    }
    if (tab !== "abilities") {
      this.hoveredAbilityId = null;
    }
    if (tab !== "professions") {
      this.selectedProfessionId = null;
    }
  }

  public isHovering(): boolean {
    if (!this.isOpen()) return false;
    if (!this.lastW || !this.lastH) return false;
    // Use the latest raw canvas mouse position captured by the HUD instead of the
    // gameplay aim position. The latter intentionally stops updating while the
    // inventory is hovered, which can otherwise latch hover/aim state incorrectly.
    return this.isPointOverUi(this._mx, this._my, this.lastW, this.lastH);
  }

  private getBagSlotCount(): number {
    const p = this.deps.getMyPlayer();
    const totalSlots = p?.getMaxInventorySlots() ?? getConfig().player.MAX_INVENTORY_SLOTS;
    return getMaxVisibleBagSlots(totalSlots);
  }

  private getUnlockedVisibleBagSlotCount(player: PlayerClient | null = this.deps.getMyPlayer()): number {
    if (player) {
      return player.getUnlockedVisibleBagSlotCount();
    }
    return this.getBagSlotCount();
  }

  private getStorageBagIndexForVisibleSlot(
    visibleBagIndex: number,
    player: PlayerClient | null = this.deps.getMyPlayer(),
  ): number {
    const unlockedVisibleSlots = this.getUnlockedVisibleBagSlotCount(player);
    return visibleBagIndex < unlockedVisibleSlots
      ? visibleBagIndex
      : visibleBagIndex + LOADOUT_RESERVED_BAG_SLOT_COUNT;
  }

  private isVisibleBagSlotLocked(
    visibleBagIndex: number,
    player: PlayerClient | null = this.deps.getMyPlayer(),
  ): boolean {
    return visibleBagIndex >= this.getUnlockedVisibleBagSlotCount(player);
  }

  private layout(
    canvasWidth: number,
    canvasHeight: number,
    bagSlotCount: number = getMaxVisibleBagSlots(getConfig().player.MAX_INVENTORY_SLOTS),
  ) {
    const pad = LAYOUT_PAD_PX;
    const rightW = Math.min(canvasWidth * PANEL_WIDTH_RATIO, canvasWidth - pad * 2);
    const rightX = canvasWidth - rightW - pad;
    const rightY = pad;
    const rightH = canvasHeight - pad * 2;

    const tabTop = rightY;
    const contentTop = tabTop + TAB_BAR_H;
    const contentH = rightH - TAB_BAR_H;

    const sectionTop = contentTop + PANEL_TAB_CONTENT_GAP + 6;
    const sectionBottom = rightY + rightH - 36;
    const sectionTitleY = sectionTop + 14;
    const sectionContentTop = sectionTop + 26;
    const sectionGap = Math.max(12, Math.min(20, Math.round(rightW * 0.02)));
    const sectionPadX = Math.max(12, Math.round(rightW * 0.02));
    const sectionInnerW = rightW - sectionPadX * 2;
    const inventorySectionW = Math.floor((sectionInnerW - sectionGap) * 0.6);
    const equipmentSectionW = sectionInnerW - inventorySectionW - sectionGap;
    const inventorySectionX = rightX + sectionPadX;
    const equipmentSectionX = inventorySectionX + inventorySectionW + sectionGap;
    const gridCols = inventorySectionW >= 260 ? WIDE_GRID_COLS : NARROW_GRID_COLS;
    const gridRows = Math.max(1, Math.ceil(bagSlotCount / gridCols));
    const cellGap = 6;
    const gridAvailH = Math.max(72, sectionBottom - sectionContentTop);
    const cellSize = Math.min(
      56,
      Math.floor((inventorySectionW - cellGap * (gridCols - 1)) / gridCols),
      Math.floor((gridAvailH - cellGap * (gridRows - 1)) / gridRows),
    );
    const gridW = gridCols * cellSize + (gridCols - 1) * cellGap;
    const gridH = gridRows * cellSize + (gridRows - 1) * cellGap;
    const gridLeft = inventorySectionX;
    const gridTop = sectionContentTop + Math.max(0, Math.floor((sectionBottom - sectionContentTop - gridH) / 2));

    // Labels sit at rect.y-8; keep enough vertical gap so the next label does not clip the slot above.
    const equipColGap = Math.max(10, Math.round(Math.max(32, equipmentSectionW * 0.06)));
    const maxEquipCellByWidth = Math.floor((equipmentSectionW - equipColGap * 2) / 3);
    const maxEquipCellByHeight = Math.floor((sectionBottom - sectionContentTop) / 6.6);
    const equipCell = Math.max(22, Math.min(54, maxEquipCellByWidth, maxEquipCellByHeight));
    const rowGap = Math.max(14, Math.round(equipCell * 0.38));
    const colGap = Math.max(10, Math.round(equipCell * 0.22));
    const equipUsedH = equipCell * 5 + rowGap * 4;
    const equipTop = sectionContentTop + Math.max(0, Math.floor((sectionBottom - sectionContentTop - equipUsedH) / 2));
    const cx = equipmentSectionX + equipmentSectionW * 0.5;

    let y = equipTop;
    const headRect: EquipRect = { x: cx - equipCell / 2, y, w: equipCell, h: equipCell };
    y += equipCell + rowGap;

    const shouldersRect: EquipRect = { x: cx - equipCell / 2, y, w: equipCell, h: equipCell };
    y += equipCell + rowGap;

    const torsoRowY = y;
    const handsRect: EquipRect = {
      x: cx - equipCell / 2 - colGap - equipCell,
      y: torsoRowY,
      w: equipCell,
      h: equipCell,
    };
    const torsoRect: EquipRect = { x: cx - equipCell / 2, y: torsoRowY, w: equipCell, h: equipCell };
    const backRect: EquipRect = {
      x: cx + equipCell / 2 + colGap,
      y: torsoRowY,
      w: equipCell,
      h: equipCell,
    };
    y += equipCell + rowGap;

    const legsRect: EquipRect = { x: cx - equipCell / 2, y, w: equipCell, h: equipCell };
    y += equipCell + rowGap;

    const shoesRect: EquipRect = { x: cx - equipCell / 2, y, w: equipCell, h: equipCell };
    y += equipCell + rowGap;

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
      sectionTitleY,
      inventorySectionX,
      inventorySectionW,
      equipmentSectionX,
      equipmentSectionW,
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
      gridCols,
      gridRows,
      bagSlotCount,
      skillsOriginX: rightX + 24,
      skillsOriginY: contentTop + PANEL_TAB_CONTENT_GAP + 8,
    };
  }

  private abilityCardRects(L: ReturnType<InventoryScreenUI["layout"]>) {
    const rows = Math.max(1, Math.ceil(ABILITY_TREE_NODES.length / ABILITY_CARD_COLS));
    const startX = L.rightX + 12;
    const startY = L.contentTop + PANEL_TAB_CONTENT_GAP + 96;
    const availableW = L.rightW - 24;
    const availableH = L.rightY + L.rightH - 18 - startY;
    const cardW = Math.floor(
      (availableW - ABILITY_CARD_GAP * (ABILITY_CARD_COLS - 1)) / ABILITY_CARD_COLS,
    );
    const cardH = Math.max(96, Math.floor((availableH - ABILITY_CARD_GAP * (rows - 1)) / rows));
    return ABILITY_TREE_NODES.map((node, index) => {
      const col = index % ABILITY_CARD_COLS;
      const row = Math.floor(index / ABILITY_CARD_COLS);
      return {
        id: node.id,
        x: startX + col * (cardW + ABILITY_CARD_GAP),
        y: startY + row * (cardH + ABILITY_CARD_GAP),
        w: cardW,
        h: cardH,
      };
    });
  }

  private layoutBank(canvasWidth: number, canvasHeight: number) {
    const pad = LAYOUT_PAD_PX;
    const rightW = Math.min(canvasWidth * PANEL_WIDTH_RATIO, canvasWidth - pad * 2);
    const rightH = canvasHeight - pad * 2;
    const rightY = pad;
    const bankX = pad;
    const bankCols = WIDE_GRID_COLS;
    const bankSlots = playerConfig.MAX_BANK_SLOTS;
    const bankRows = Math.max(1, Math.ceil(bankSlots / bankCols));
    const tabTop = rightY;
    const contentTop = tabTop + TAB_BAR_H;
    const sectionContentTop = contentTop + PANEL_TAB_CONTENT_GAP + 32;
    const sectionBottom = rightY + rightH - 36;
    const sectionPadX = Math.max(12, Math.round(rightW * 0.02));
    const innerW = rightW - sectionPadX * 2;
    const cellGap = 6;
    const gridAvailH = Math.max(72, sectionBottom - sectionContentTop);
    const cellSize = Math.min(
      56,
      Math.floor((innerW - cellGap * (bankCols - 1)) / bankCols),
      Math.floor((gridAvailH - cellGap * (bankRows - 1)) / bankRows),
    );
    const gridW = bankCols * cellSize + (bankCols - 1) * cellGap;
    const gridH = bankRows * cellSize + (bankRows - 1) * cellGap;
    const gridLeft =
      bankX + sectionPadX + Math.max(0, Math.floor((innerW - gridW) / 2));
    const gridTop = sectionContentTop + Math.max(0, Math.floor((sectionBottom - sectionContentTop - gridH) / 2));
    const titleY = contentTop + 12;
    return {
      bankX,
      bankY: rightY,
      bankW: rightW,
      bankH: rightH,
      titleY,
      gridLeft,
      gridTop,
      cellSize,
      cellGap,
      gridCols: bankCols,
      gridRows: bankRows,
      bankSlots,
    };
  }

  /** Horizontal translate for bank layer: negative while closed so the panel sits off the left edge. */
  private getBankSlideOffsetPx(bankW: number): number {
    const eased = easeOutCubic(this.bankVisibilityProgress);
    return -Math.round((1 - eased) * (bankW + LAYOUT_PAD_PX));
  }

  private bankPanelContainsScreenPoint(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
  ): boolean {
    if (this.activeTab !== "inventory" || this.bankVisibilityProgress <= 0.001) {
      return false;
    }
    const B = this.layoutBank(canvasWidth, canvasHeight);
    const left = LAYOUT_PAD_PX + this.getBankSlideOffsetPx(B.bankW);
    return (
      x >= left &&
      x <= left + B.bankW &&
      y >= B.bankY &&
      y <= B.bankY + B.bankH
    );
  }

  private stepBankVisibility(now: number): void {
    const wantBank =
      (this.bankLockerId != null || this.auctionHouseId != null || this.merchantId != null) &&
      this.activeTab === "inventory";
    const target = wantBank ? 1 : 0;
    const dtSeconds =
      this.lastBankVisibilityAnimationAt > 0
        ? Math.min(0.05, (now - this.lastBankVisibilityAnimationAt) / 1000)
        : 1 / 60;
    this.lastBankVisibilityAnimationAt = now;

    const speed = wantBank ? INVENTORY_PANEL_OPEN_SPEED : INVENTORY_PANEL_CLOSE_SPEED;
    const step = dtSeconds * speed;

    if (this.bankVisibilityProgress < target) {
      this.bankVisibilityProgress = Math.min(target, this.bankVisibilityProgress + step);
    } else if (this.bankVisibilityProgress > target) {
      this.bankVisibilityProgress = Math.max(target, this.bankVisibilityProgress - step);
    }
  }

  private getBankSlotIndexAt(
    screenX: number,
    screenY: number,
    B: ReturnType<InventoryScreenUI["layoutBank"]>,
  ): number | null {
    const x = screenX - this.getBankSlideOffsetPx(B.bankW);
    for (let row = 0; row < B.gridRows; row++) {
      for (let col = 0; col < B.gridCols; col++) {
        const idx = row * B.gridCols + col;
        if (idx >= B.bankSlots) {
          continue;
        }
        const sx = B.gridLeft + col * (B.cellSize + B.cellGap);
        const sy = B.gridTop + row * (B.cellSize + B.cellGap);
        if (x >= sx && x <= sx + B.cellSize && screenY >= sy && screenY <= sy + B.cellSize) {
          return idx;
        }
      }
    }
    return null;
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

    if (!isOpen && this.visibilityProgress <= 0.001) {
      this.visibilityProgress = 0;
      this.lastVisibilityAnimationAt = 0;
      this.inventoryOpenedViaBankOnly = false;
      this.bankVisibilityProgress = 0;
      this.lastBankVisibilityAnimationAt = 0;
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
      for (let col = 0; col < L.gridCols; col++) {
        const visibleBagIndex = row * L.gridCols + col;
        if (visibleBagIndex >= L.bagSlotCount) continue;
        const sx = L.gridLeft + col * (L.cellSize + L.cellGap);
        const sy = L.gridTop + row * (L.cellSize + L.cellGap);
        if (x >= sx && x <= sx + L.cellSize && y >= sy && y <= sy + L.cellSize) {
          if (this.isVisibleBagSlotLocked(visibleBagIndex, player)) {
            return null;
          }
          const storageBagIndex = this.getStorageBagIndexForVisibleSlot(visibleBagIndex, player);
          if (player && this.bagSlotBackedByAnyLoadout(storageBagIndex, player)) {
            return null;
          }
          return storageBagIndex;
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

  /** Bag cells assigned to the bottom quick bar are hidden from the bag grid. */
  private bagSlotBackedByAnyLoadout(bagIdx0: number, p: PlayerClient): boolean {
    const b = bagIdx0 + 1;
    const pBag = (p as any).weaponLoadoutPrimary ?? 0;
    const sBag = (p as any).weaponLoadoutSecondary ?? 0;
    const mBag = (p as any).weaponLoadoutMelee ?? 0;
    const c4 = (p as any).loadoutConsumable4 ?? 0;
    const c5 = (p as any).loadoutConsumable5 ?? 0;
    return pBag === b || sBag === b || mBag === b || c4 === b || c5 === b;
  }

  private getFirstEmptyVisibleBagIndex(): number | null {
    const items = this.deps.getInventory();
    const player = this.deps.getMyPlayer();
    const unlockedVisibleSlots = this.getUnlockedVisibleBagSlotCount(player);
    for (let visibleBagIndex = 0; visibleBagIndex < unlockedVisibleSlots; visibleBagIndex++) {
      const storageBagIndex = this.getStorageBagIndexForVisibleSlot(visibleBagIndex, player);
      if (items[storageBagIndex] != null) {
        continue;
      }
      if (player && this.bagSlotBackedByAnyLoadout(storageBagIndex, player)) {
        continue;
      }
      return storageBagIndex;
    }
    return null;
  }

  private canSplitBagStack(item: InventoryItem | null): boolean {
    if (!item || !isStackableInventoryItem(item)) {
      return false;
    }
    const stackCount = item.state?.count ?? 1;
    return stackCount > 1 && this.getFirstEmptyVisibleBagIndex() != null;
  }

  private canDropOneFromBagStack(item: InventoryItem | null): boolean {
    if (!item || !isStackableInventoryItem(item)) {
      return false;
    }
    return (item.state?.count ?? 1) > 1;
  }

  /** Double-click bag slot: weapons -> loadout, wearables -> equipment, consumables -> quick bar. */
  private tryQuickEquipFromBag(bagIdx: number, item: InventoryItem): boolean {
    const t = item.itemType;
    if (t === "skateboard") {
      this.deps.sendConsumeItem(null, bagIdx);
      return true;
    }
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
    if (itemMatchesConsumableLoadout(t)) {
      const p = this.deps.getMyPlayer();
      if (!p) return false;
      const c4 = (p as any).loadoutConsumable4 ?? 0;
      const c5 = (p as any).loadoutConsumable5 ?? 0;
      if (c4 === 0) {
        this.deps.sendSetWeaponLoadoutSlot(3, bagIdx + 1);
        return true;
      }
      if (c5 === 0) {
        this.deps.sendSetWeaponLoadoutSlot(4, bagIdx + 1);
        return true;
      }
      this.deps.sendSetWeaponLoadoutSlot(3, bagIdx + 1);
      return true;
    }
    return false;
  }

  private tryUnequipToBag(slot: EquipmentSlotKey): boolean {
    const bagIdx = this.getFirstEmptyVisibleBagIndex();
    if (bagIdx == null) {
      return false;
    }
    this.dragState = null;
    this.deps.sendSwapBagAndEquipment(bagIdx, slot);
    return true;
  }

  private drawTabBar(
    ctx: CanvasRenderingContext2D,
    L: ReturnType<InventoryScreenUI["layout"]>,
    player: PlayerClient,
  ): void {
    const hudScale = calculateHudScale(ctx.canvas.width, ctx.canvas.height);
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

      const badgeR = Math.max(4, Math.round(Math.min(6, 4.5 * hudScale)));
      const badgePad = Math.max(2, Math.round(1.5 * hudScale));
      const badgeCx = x + w - badgePad - badgeR;
      const badgeCy = y + badgePad + badgeR;
      if (t.id === "character" && player.getAvailableCharacterPoints() > 0) {
        renderUnspentProgressionBadge(ctx, badgeCx, badgeCy, badgeR);
      } else if (
        t.id === "abilities" &&
        player.getAvailableAbilityPoints() > 0 &&
        ABILITY_IDS.some((abilityId) => player.getAbilityRank(abilityId) < MAX_RANK_PER_ABILITY)
      ) {
        renderUnspentProgressionBadge(ctx, badgeCx, badgeCy, badgeR);
      }
    }
    ctx.textBaseline = "alphabetic";
  }

  /**
   * Positions for the character stats tab: loop groups, then rows in display order.
   */
  private characterStatPanelLayout(
    contentTop: number,
    rightX: number,
  ): {
    rows: Array<{ key: CharacterStatKey; rowLabelY: number }>;
    groups: Array<{
      title: string;
      infoLines: readonly string[];
      titleBaselineY: number;
      infoBadge: { cx: number; cy: number; r: number };
    }>;
    firstSummaryY: number;
  } {
    const rows: Array<{ key: CharacterStatKey; rowLabelY: number }> = [];
    const groups: Array<{
      title: string;
      infoLines: readonly string[];
      titleBaselineY: number;
      infoBadge: { cx: number; cy: number; r: number };
    }> = [];
    let y = contentTop + PANEL_TAB_CONTENT_GAP + 36;
    const titleLeftX = rightX + 16;
    for (const g of CHARACTER_STAT_LOOP_GROUPS) {
      const titleW = measureBold14GeorgiaWidth(g.title);
      const badgeCx =
        titleLeftX +
        titleW +
        CHARACTER_STAT_GROUP_TITLE_TO_INFO_GAP_PX +
        CHARACTER_STAT_INFO_BADGE_RADIUS;
      groups.push({
        title: g.title,
        infoLines: g.infoLines,
        titleBaselineY: y,
        infoBadge: {
          cx: badgeCx,
          cy: y - 6,
          r: CHARACTER_STAT_INFO_BADGE_RADIUS,
        },
      });
      y += CHARACTER_STAT_GROUP_HEADER_BLOCK_PX;
      for (const key of g.keys) {
        rows.push({ key, rowLabelY: y });
        y += CHARACTER_STAT_ROW_STEP_PX;
      }
    }
    return { rows, groups, firstSummaryY: y };
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

    const layout = this.characterStatPanelLayout(L.contentTop, L.rightX);
    const statIconSheet = this.characterStatIconSheet;
    const statIconsReady =
      statIconSheet && statIconSheet.complete && statIconSheet.naturalWidth > 0;
    const statLabelX =
      L.rightX + 16 + CHARACTER_STAT_ICON_DRAW_PX + CHARACTER_STAT_ICON_TEXT_GAP;
    const groupTitleLeftX = L.rightX + 16;

    let rowIdx = 0;
    for (let gi = 0; gi < CHARACTER_STAT_LOOP_GROUPS.length; gi++) {
      const gDef = CHARACTER_STAT_LOOP_GROUPS[gi]!;
      const gLayout = layout.groups[gi]!;
      const groupHover = this.hoveredCharacterStatGroupIndex === gi;
      ctx.font = "bold 14px Georgia";
      ctx.fillStyle = RPG_PROMPT_GOLD;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(gLayout.title, groupTitleLeftX, gLayout.titleBaselineY);
      ctx.beginPath();
      ctx.arc(gLayout.infoBadge.cx, gLayout.infoBadge.cy, gLayout.infoBadge.r, 0, Math.PI * 2);
      ctx.fillStyle = groupHover ? RPG_PROMPT_GOLD : "rgba(28, 34, 52, 0.98)";
      ctx.fill();
      ctx.strokeStyle = groupHover ? RPG_TITLE_CREAM : RPG_SLOT_STROKE;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = groupHover ? "rgba(15, 18, 26, 0.98)" : RPG_BODY_TEXT;
      ctx.fillText("?", gLayout.infoBadge.cx, gLayout.infoBadge.cy + 0.5);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      for (let ki = 0; ki < gDef.keys.length; ki++) {
        const row = layout.rows[rowIdx]!;
        rowIdx++;
        const key = row.key;
        y = row.rowLabelY;
        const val = player.getCharacterStat(key);
        const isAtMax = val >= MAX_POINTS_PER_CHARACTER_STAT;
        const si = CHARACTER_STAT_KEYS.indexOf(key);
        if (statIconsReady && si >= 0) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            statIconSheet,
            si * CHARACTER_STAT_ICON_SHEET_PX,
            0,
            CHARACTER_STAT_ICON_SHEET_PX,
            CHARACTER_STAT_ICON_SHEET_PX,
            L.rightX + 16,
            y - 22,
            CHARACTER_STAT_ICON_DRAW_PX,
            CHARACTER_STAT_ICON_DRAW_PX,
          );
          ctx.restore();
        }
        ctx.font = "15px Arial";
        ctx.fillStyle = RPG_TITLE_CREAM;
        const labelStr = STAT_LABELS[key];
        ctx.fillText(labelStr, statLabelX, y);
        const inlineSummary = formatCharacterStatInlineSummary(key, player);
        const labelW = ctx.measureText(labelStr).width;
        ctx.fillStyle = RPG_METADATA_MUTED;
        ctx.font = "13px Arial";
        ctx.fillText(`  ·  ${inlineSummary}`, statLabelX + labelW, y);
        const infoBadge = characterStatInfoBadge(L.rightX, L.rightW, y);
        const infoHover = this.hoveredCharacterStatKey === key;
        ctx.beginPath();
        ctx.arc(infoBadge.cx, infoBadge.cy, infoBadge.r, 0, Math.PI * 2);
        ctx.fillStyle = infoHover ? RPG_PROMPT_GOLD : "rgba(28, 34, 52, 0.98)";
        ctx.fill();
        ctx.strokeStyle = infoHover ? RPG_TITLE_CREAM : RPG_SLOT_STROKE;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = infoHover ? "rgba(15, 18, 26, 0.98)" : RPG_BODY_TEXT;
        ctx.fillText("?", infoBadge.cx, infoBadge.cy + 0.5);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = "15px Arial";
        ctx.fillStyle = RPG_METADATA_MUTED;
        ctx.textAlign = "right";
        ctx.fillText(`${val}`, L.rightX + L.rightW - 120, y);
        ctx.textAlign = "left";
        const { plus } = characterStatPlusMinusRects(L.rightX, L.rightW, y);
        if (!isAtMax && avail > 0) {
          drawCanvasUiButton(ctx, plus, "+", "compact");
        }
      }
    }

    y = layout.firstSummaryY;
    y += 8;
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

  }

  private renderAbilitiesTab(
    ctx: CanvasRenderingContext2D,
    L: ReturnType<InventoryScreenUI["layout"]>,
    player: PlayerClient,
  ): void {
    const xp = player.getTotalExperience();
    const budget = getProgressionPointsBudget(xp);
    const avail = player.getAvailableAbilityPoints();
    const focusedAbilityId = this.hoveredAbilityId ?? ABILITY_TREE_NODES[0]?.id ?? "sprint";
    const focusedAbility = ABILITY_DEFINITIONS[focusedAbilityId];
    ctx.font = "16px Arial";
    ctx.fillStyle = RPG_BODY_TEXT;
    ctx.textAlign = "left";
    let ty = L.contentTop + PANEL_TAB_CONTENT_GAP;
    ctx.fillText(`Abilities   (available ${avail} / budget ${budget})`, L.rightX + 12, ty);
    ty += 24;
    ctx.font = "13px Arial";
    ctx.fillStyle = avail > 0 ? RPG_PROMPT_TYPING : RPG_METADATA_MUTED;
    ctx.fillText("Click a locked card to spend 1 point and unlock it.", L.rightX + 12, ty);
    ty += 18;
    ctx.font = "bold 13px Georgia";
    ctx.fillStyle = focusedAbility.accentColor;
    ctx.fillText(focusedAbility.label, L.rightX + 12, ty);
    ty += 16;
    ctx.font = "12px Arial";
    ctx.fillStyle = RPG_METADATA_MUTED;
    for (const line of wrapTextLines(ctx, focusedAbility.description, L.rightW - 24, 2)) {
      ctx.fillText(line, L.rightX + 12, ty);
      ty += 14;
    }

    for (const card of this.abilityCardRects(L)) {
      const def = ABILITY_DEFINITIONS[card.id];
      const unlocked = player.getAbilityRank(card.id) > 0;
      const hover = this.hoveredAbilityId === card.id;
      const fill = ctx.createLinearGradient(card.x, card.y, card.x, card.y + card.h);
      fill.addColorStop(0, unlocked ? hexToRgba(def.accentColor, 0.32) : "rgba(26, 29, 38, 0.98)");
      fill.addColorStop(1, unlocked ? hexToRgba(def.accentColor, 0.14) : "rgba(12, 14, 20, 0.98)");
      ctx.fillStyle = fill;
      ctx.fillRect(card.x, card.y, card.w, card.h);
      if (!unlocked) {
        ctx.fillStyle = "rgba(6, 8, 16, 0.35)";
        ctx.fillRect(card.x, card.y, card.w, card.h);
      }
      ctx.strokeStyle = hover
        ? def.accentColor
        : unlocked
          ? hexToRgba(def.accentColor, 0.92)
          : RPG_SLOT_STROKE;
      ctx.lineWidth = hover || unlocked ? 2 : 1;
      ctx.strokeRect(card.x, card.y, card.w, card.h);

      const iconSize = Math.max(30, Math.min(44, card.w - 24, Math.floor(card.h * 0.3)));
      const iconX = card.x + Math.floor((card.w - iconSize) / 2);
      const iconY = card.y + 12;
      const sheet = this.abilityIconSheet;
      const sheetReady = Boolean(sheet && sheet.complete && sheet.naturalWidth > 0);
      if (sheetReady) {
        const fi = getAbilityIconSheetFrameIndex(card.id);
        const sx = fi * ABILITY_ICON_SHEET_TILE_PX;
        ctx.save();
        ctx.globalAlpha = unlocked ? 1 : 0.72;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          sheet!,
          sx,
          0,
          ABILITY_ICON_SHEET_TILE_PX,
          ABILITY_ICON_SHEET_TILE_PX,
          iconX,
          iconY,
          iconSize,
          iconSize,
        );
        ctx.restore();
      } else {
        ctx.fillStyle = hexToRgba(def.accentColor, unlocked ? 0.28 : 0.18);
        ctx.fillRect(iconX, iconY, iconSize, iconSize);
        ctx.strokeStyle = hexToRgba(def.accentColor, 0.8);
        ctx.lineWidth = 1;
        ctx.strokeRect(iconX, iconY, iconSize, iconSize);
        ctx.font = `bold ${Math.max(16, Math.floor(iconSize * 0.44))}px Georgia`;
        ctx.fillStyle = unlocked ? RPG_TITLE_CREAM : RPG_METADATA_MUTED;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(def.label.charAt(0), iconX + iconSize / 2, iconY + iconSize / 2 + 1);
      }

      const textX = card.x + 10;
      let textY = iconY + iconSize + 18;
      ctx.font = "bold 13px Georgia";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = RPG_BODY_TEXT;
      const labelLines = wrapTextLines(ctx, def.label, card.w - 20, 2);
      for (const line of labelLines) {
        fillTextStroked(ctx, line, card.x + card.w / 2, textY, RPG_BODY_TEXT, 1);
        textY += 15;
      }

      ctx.font = "11px Arial";
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.textAlign = "left";
      const descMaxLines = Math.max(1, Math.floor((card.y + card.h - 38 - textY) / 13));
      for (const line of wrapTextLines(ctx, def.description, card.w - 20, descMaxLines)) {
        ctx.fillText(line, textX, textY);
        textY += 13;
      }

      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = unlocked ? def.accentColor : avail > 0 ? RPG_PROMPT_GOLD : RPG_METADATA_MUTED;
      ctx.fillText(
        unlocked ? "Unlocked" : avail > 0 ? "1 point to unlock" : "Locked",
        card.x + card.w / 2,
        card.y + card.h - 10,
      );
    }
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
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
    gameState: GameState,
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
        const stepLine = getQuestObjectiveLine(def, st, qid, gameState);

        ctx.fillStyle = RPG_BODY_TEXT;
        if (!nextBlock(lineMain)) break;
        ctx.fillText(title, padX, y);
        y += lineMain;

        ctx.fillStyle = RPG_METADATA_MUTED;
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
    this.latestGameState = gameState;
    this.lastW = ctx.canvas.width;
    this.lastH = ctx.canvas.height;

    if (this.visibilityProgress <= 0.001) {
      return;
    }

    const player = getPlayer(gameState);
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    if (!player || !(player instanceof PlayerClient)) {
      if (this.bankLockerId != null || this.auctionHouseId != null || this.merchantId != null) {
        this.closeBank();
      }
      if (this.open) {
        return;
      }
      const L = this.layout(w, h, this.getBagSlotCount());
      const slidePx = this.getPanelSlidePxFromRightW(L.rightW);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(slidePx, 0);
      drawRpgMainPanel(ctx, L.rightX, L.rightY, L.rightW, L.rightH);
      ctx.restore();
      return;
    }

    this.maybeCloseBankIfOutOfRange(gameState, player);

    const L = this.layout(w, h, this.getBagSlotCount());
    const slidePx = this.getPanelSlidePxFromRightW(L.rightW);

    if (this.activeTab === "inventory" && this.bankVisibilityProgress > 0.001) {
      const B = this.layoutBank(w, h);
      const bankSlide = this.getBankSlideOffsetPx(B.bankW);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(bankSlide, 0);
      drawRpgMainPanel(ctx, B.bankX, B.bankY, B.bankW, B.bankH);
      ctx.font = "14px Arial";
      ctx.fillStyle = RPG_TITLE_CREAM;
      ctx.textAlign = "left";
      if (this.auctionHouseId != null) {
        ctx.fillText("Auction House", B.bankX + 12, B.titleY);
        const snap = this.deps.getAuctionSnapshot();
        const claimable = snap?.claimableCoins ?? 0;
        this.auctionTabRects = this.layoutAuctionCategoryTabs(
          B,
          claimable > 0 ? AUCTION_TAB_RIGHT_RESERVE_FOR_CLAIM : 0,
        );
        for (const tab of this.auctionTabRects) {
          const on = tab.id === this.auctionCategoryFilter;
          ctx.fillStyle = on ? RPG_TAB_ACTIVE_FILL : RPG_TAB_INACTIVE_FILL;
          ctx.fillRect(tab.x, tab.y, tab.w, tab.h);
          ctx.strokeStyle = on ? RPG_TAB_ACTIVE_STROKE : RPG_TAB_INACTIVE_STROKE;
          ctx.strokeRect(tab.x, tab.y, tab.w, tab.h);
          ctx.fillStyle = RPG_TITLE_CREAM;
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            tab.id === "all" ? "All" : tab.id === "weapon" ? "Weapon" : tab.id === "ammo" ? "Ammo" : tab.id === "resource" ? "Res" : "Item",
            tab.x + tab.w / 2,
            tab.y + 15,
          );
        }
        const listings = this.getFilteredAuctionListings();
        this.claimButtonRect = null;
        if (claimable > 0) {
          const cx = B.bankX + B.bankW - AUCTION_CLAIM_BTN_W - AUCTION_CLAIM_BTN_RIGHT_INSET;
          const cy = B.bankY + AUCTION_CLAIM_BTN_TOP;
          this.claimButtonRect = {
            x: cx,
            y: cy,
            w: AUCTION_CLAIM_BTN_W,
            h: AUCTION_CLAIM_BTN_H,
          };
          ctx.fillStyle = RPG_TAB_INACTIVE_FILL;
          ctx.fillRect(cx, cy, AUCTION_CLAIM_BTN_W, AUCTION_CLAIM_BTN_H);
          ctx.strokeStyle = RPG_TAB_ACTIVE_STROKE;
          ctx.strokeRect(cx, cy, AUCTION_CLAIM_BTN_W, AUCTION_CLAIM_BTN_H);
          ctx.fillStyle = RPG_COUNTER_GOLD;
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            `Claim ${claimable}`,
            cx + AUCTION_CLAIM_BTN_W / 2,
            cy + 16,
          );
        }
        ctx.textAlign = "left";
        for (let row = 0; row < B.gridRows; row++) {
          for (let col = 0; col < B.gridCols; col++) {
            const idx = row * B.gridCols + col;
            if (idx >= B.bankSlots) {
              continue;
            }
            const sx = B.gridLeft + col * (B.cellSize + B.cellGap);
            const sy = B.gridTop + row * (B.cellSize + B.cellGap);
            const listing = listings[idx];
            const isHover = this.hoveredBankSlotIndex === idx && !this.dragState?.isDragging;
            const invItem: InventoryItem | null = listing
              ? { itemType: listing.itemType, ...(listing.itemState ? { state: listing.itemState } : {}) }
              : null;
            let blocked = false;
            if (listing && !listing.isOwnListing) {
              blocked = this.isAuctionListingBlocked(listing, player);
            }
            ctx.fillStyle = blocked ? "rgba(80, 24, 24, 0.55)" : RPG_SLOT_FILL_DIM;
            ctx.fillRect(sx, sy, B.cellSize, B.cellSize);
            ctx.strokeStyle = isHover ? RPG_TAB_ACTIVE_STROKE : RPG_SLOT_STROKE;
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, B.cellSize, B.cellSize);
            if (invItem) {
              const img = this.deps.assetManager.get(getItemAssetKey(invItem));
              if (img) {
                const pad = 6;
                ctx.drawImage(img, sx + pad, sy + pad, B.cellSize - pad * 2, B.cellSize - pad * 2);
              }
              if (invItem.state?.count) {
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "right";
                ctx.fillStyle = RPG_BODY_TEXT;
                ctx.strokeStyle = "rgba(6,8,16,0.9)";
                ctx.lineWidth = 2;
                ctx.strokeText(`${invItem.state.count}`, sx + B.cellSize - 4, sy + B.cellSize - 4);
                ctx.fillText(`${invItem.state.count}`, sx + B.cellSize - 4, sy + B.cellSize - 4);
              }
            }
            if (listing) {
              ctx.font = "bold 11px Arial";
              ctx.textAlign = "center";
              ctx.fillStyle = blocked ? "rgba(255,160,160,0.95)" : RPG_COUNTER_GOLD;
              ctx.strokeStyle = "rgba(6,8,16,0.85)";
              ctx.lineWidth = 2;
              const p = listing.price;
              const pt = `${p}c`;
              ctx.strokeText(pt, sx + B.cellSize / 2, sy + 12);
              ctx.fillText(pt, sx + B.cellSize / 2, sy + 12);
            }
          }
        }
      } else if (this.merchantId != null) {
        ctx.fillText("Merchant", B.bankX + 12, B.titleY);
        ctx.font = "12px Arial";
        ctx.textAlign = "right";
        ctx.fillStyle = RPG_COUNTER_GOLD;
        ctx.fillText(`${player.getCoins()}c`, B.bankX + B.bankW - 12, B.titleY);
        ctx.textAlign = "left";
        this.merchantTabRects = this.layoutMerchantCategoryTabs(B);
        for (const tab of this.merchantTabRects) {
          const on = tab.id === this.merchantCategoryFilter;
          ctx.fillStyle = on ? RPG_TAB_ACTIVE_FILL : RPG_TAB_INACTIVE_FILL;
          ctx.fillRect(tab.x, tab.y, tab.w, tab.h);
          ctx.strokeStyle = on ? RPG_TAB_ACTIVE_STROKE : RPG_TAB_INACTIVE_STROKE;
          ctx.strokeRect(tab.x, tab.y, tab.w, tab.h);
          ctx.fillStyle = RPG_TITLE_CREAM;
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            tab.id === "all" ? "All" : tab.id === "weapon" ? "Weapon" : tab.id === "ammo" ? "Ammo" : "Item",
            tab.x + tab.w / 2,
            tab.y + 15,
          );
        }
        const merchantEntries = this.getMerchantFilteredShopEntries();
        const maxFirst = Math.max(0, merchantEntries.length - B.bankSlots);
        this.merchantShopScrollFirstIndex = Math.min(this.merchantShopScrollFirstIndex, maxFirst);
        ctx.textAlign = "left";
        for (let row = 0; row < B.gridRows; row++) {
          for (let col = 0; col < B.gridCols; col++) {
            const idx = row * B.gridCols + col;
            if (idx >= B.bankSlots) {
              continue;
            }
            const sx = B.gridLeft + col * (B.cellSize + B.cellGap);
            const sy = B.gridTop + row * (B.cellSize + B.cellGap);
            const dataIdx = this.merchantShopScrollFirstIndex + idx;
            const entry = merchantEntries[dataIdx];
            const isHover = this.hoveredBankSlotIndex === idx && !this.dragState?.isDragging;
            const invItem: InventoryItem | null = entry ? { itemType: entry.itemType } : null;
            const blocked = entry ? player.getCoins() < entry.buyPrice : false;
            ctx.fillStyle = blocked ? "rgba(80, 24, 24, 0.55)" : RPG_SLOT_FILL_DIM;
            ctx.fillRect(sx, sy, B.cellSize, B.cellSize);
            ctx.strokeStyle = isHover ? RPG_TAB_ACTIVE_STROKE : RPG_SLOT_STROKE;
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, B.cellSize, B.cellSize);
            if (invItem) {
              const img = this.deps.assetManager.get(getItemAssetKey(invItem));
              if (img) {
                const pad = 6;
                ctx.drawImage(img, sx + pad, sy + pad, B.cellSize - pad * 2, B.cellSize - pad * 2);
              }
            }
            if (entry) {
              ctx.font = "bold 11px Arial";
              ctx.textAlign = "center";
              ctx.fillStyle = blocked ? "rgba(255,160,160,0.95)" : RPG_COUNTER_GOLD;
              ctx.strokeStyle = "rgba(6,8,16,0.85)";
              ctx.lineWidth = 2;
              const pt = `${entry.buyPrice}c`;
              ctx.strokeText(pt, sx + B.cellSize / 2, sy + 12);
              ctx.fillText(pt, sx + B.cellSize / 2, sy + 12);
            }
          }
        }
      } else {
        ctx.fillText("Bank", B.bankX + 12, B.titleY);
        const bankItems = this.deps.getBank();
        for (let row = 0; row < B.gridRows; row++) {
          for (let col = 0; col < B.gridCols; col++) {
            const idx = row * B.gridCols + col;
            if (idx >= B.bankSlots) {
              continue;
            }
            const sx = B.gridLeft + col * (B.cellSize + B.cellGap);
            const sy = B.gridTop + row * (B.cellSize + B.cellGap);
            const invItem = bankItems[idx] ?? null;
            const isHover = this.hoveredBankSlotIndex === idx && !this.dragState?.isDragging;
            ctx.fillStyle = RPG_SLOT_FILL_DIM;
            ctx.fillRect(sx, sy, B.cellSize, B.cellSize);
            ctx.strokeStyle = isHover ? RPG_TAB_ACTIVE_STROKE : RPG_SLOT_STROKE;
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, B.cellSize, B.cellSize);
            if (invItem) {
              const img = this.deps.assetManager.get(getItemAssetKey(invItem));
              if (img) {
                const pad = 6;
                ctx.drawImage(img, sx + pad, sy + pad, B.cellSize - pad * 2, B.cellSize - pad * 2);
              }
              if (invItem.state?.count) {
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "right";
                ctx.fillStyle = RPG_BODY_TEXT;
                ctx.strokeStyle = "rgba(6,8,16,0.9)";
                ctx.lineWidth = 2;
                ctx.strokeText(`${invItem.state.count}`, sx + B.cellSize - 4, sy + B.cellSize - 4);
                ctx.fillText(`${invItem.state.count}`, sx + B.cellSize - 4, sy + B.cellSize - 4);
              }
            }
          }
        }
      }
      ctx.restore();
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(slidePx, 0);

    drawRpgMainPanel(ctx, L.rightX, L.rightY, L.rightW, L.rightH);

    this.drawTabBar(ctx, L, player);

    if (this.activeTab === "inventory") {
      const items = this.deps.getInventory();
      const equipment = this.deps.getEquipment();

      ctx.font = "14px Arial";
      ctx.fillStyle = RPG_TITLE_CREAM;
      ctx.textAlign = "left";
      const totalKg = computeInventoryWeightKg(items, equipment ?? createEmptyEquipment());
      ctx.fillText("Inventory", L.inventorySectionX, L.sectionTitleY);
      ctx.textAlign = "right";
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.fillText(
        `Weight: ${totalKg.toFixed(1)} kg`,
        L.inventorySectionX + L.inventorySectionW,
        L.sectionTitleY,
      );
      ctx.textAlign = "left";

      ctx.font = "14px Arial";
      ctx.fillStyle = RPG_TITLE_CREAM;
      ctx.fillText("Equipment", L.equipmentSectionX, L.sectionTitleY);

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
        for (let col = 0; col < L.gridCols; col++) {
          const visibleBagIndex = row * L.gridCols + col;
          if (visibleBagIndex >= slots) continue;
          const storageBagIndex = this.getStorageBagIndexForVisibleSlot(visibleBagIndex, player);
          const sx = L.gridLeft + col * (L.cellSize + L.cellGap);
          const sy = L.gridTop + row * (L.cellSize + L.cellGap);
          const isLockedVisibleSlot = this.isVisibleBagSlotLocked(visibleBagIndex, player);
          const isHiddenLoadoutBagSlot = this.bagSlotBackedByAnyLoadout(storageBagIndex, player);
          const rawBagItem = items[storageBagIndex];
          const invItem = rawBagItem && !isHiddenLoadoutBagSlot && !isLockedVisibleSlot ? rawBagItem : null;
          const isActive = !isHiddenLoadoutBagSlot && !isLockedVisibleSlot && activeIdx === storageBagIndex;
          const isHover =
            !isHiddenLoadoutBagSlot &&
            !isLockedVisibleSlot &&
            this.hoveredBagIndex === storageBagIndex &&
            !this.dragState?.isDragging;
          const isDragSource =
            !isHiddenLoadoutBagSlot &&
            !isLockedVisibleSlot &&
            this.dragState?.isDragging &&
            this.dragState.source.kind === "bag" &&
            this.dragState.source.index === storageBagIndex;
          const isTarget =
            !isHiddenLoadoutBagSlot &&
            !isLockedVisibleSlot &&
            this.dragState?.isDragging &&
            this.dragState.targetBagIndex === storageBagIndex &&
            this.dragState.source.kind === "bag" &&
            this.dragState.source.index !== storageBagIndex;

          const skateboardRidingHere =
            !isHiddenLoadoutBagSlot &&
            !isLockedVisibleSlot &&
            invItem?.itemType === "skateboard" &&
            ((player as any).skateboardBagIndex1Based ?? 0) === storageBagIndex + 1;

          ctx.fillStyle = isLockedVisibleSlot ? "rgba(18, 20, 28, 0.96)" : RPG_SLOT_FILL_DIM;
          ctx.fillRect(sx, sy, L.cellSize, L.cellSize);

          if (skateboardRidingHere) {
            ctx.fillStyle = "rgba(50, 200, 90, 0.28)";
            ctx.fillRect(sx, sy, L.cellSize, L.cellSize);
          }

          if (isDragSource) {
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect(sx, sy, L.cellSize, L.cellSize);
          }

          ctx.strokeStyle = isTarget
            ? "rgba(100, 200, 255, 0.95)"
            : skateboardRidingHere
              ? "rgba(72, 220, 120, 0.98)"
              : isActive
                ? "rgba(255, 234, 182, 0.95)"
                : isHover
                  ? RPG_TAB_ACTIVE_STROKE
                  : RPG_SLOT_STROKE;
          ctx.lineWidth = isActive || isTarget || skateboardRidingHere ? 2 : 1;
          ctx.strokeRect(sx, sy, L.cellSize, L.cellSize);

          if (isLockedVisibleSlot) {
            ctx.font = "bold 10px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(170, 176, 190, 0.58)";
            ctx.fillText("Locked", sx + L.cellSize / 2, sy + L.cellSize / 2 + 4);
            continue;
          }

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
              const magazineSize = getWeaponMagazineSize(invItem.itemType);
              if (ammoType && magazineSize != null) {
                const rawLoaded = invItem.state?.loadedAmmo;
                const clipCount =
                  typeof rawLoaded === "number" && Number.isFinite(rawLoaded)
                    ? Math.max(0, Math.min(magazineSize, Math.floor(rawLoaded)))
                    : magazineSize;
                ctx.font = "bold 11px Arial";
                ctx.textAlign = "right";
                ctx.fillStyle =
                  clipCount > 0 ? "rgba(255, 255, 120, 1)" : "rgba(255, 100, 100, 1)";
                ctx.strokeStyle = "rgba(0,0,0,0.8)";
                ctx.lineWidth = 2;
                const ax = sx + L.cellSize - 4;
                const ay = sy + 14;
                ctx.strokeText(`${clipCount}`, ax, ay);
                ctx.fillText(`${clipCount}`, ax, ay);
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
      this.renderQuestsTab(ctx, L, player, gameState);
    }

    ctx.restore();
    if (this.activeTab === "character") {
      if (this.hoveredCharacterStatKey) {
        this.renderCharacterStatTooltip(ctx, player);
      } else if (this.hoveredCharacterStatGroupIndex !== null) {
        this.renderCharacterStatGroupTooltip(ctx);
      }
    }
    this.renderContextMenu(ctx);
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
      this.hoveredBagIndex = null;
      this.hoveredEquipSlot = null;
      this.hoveredAbilityId = null;
      this.hoveredCharacterStatKey = null;
      this.hoveredCharacterStatGroupIndex = null;
      return;
    }
    const L = this.layout(canvasWidth, canvasHeight, this.getBagSlotCount());
    const lx = this.toPanelLocalX(x, L.rightW);
    this.hoveredAbilityId = null;
    this.hoveredCharacterStatKey = null;
    this.hoveredCharacterStatGroupIndex = null;
    if (this.activeTab === "inventory") {
      this.hoveredBagIndex = this.getBagIndexAt(lx, y, L);
      this.hoveredEquipSlot = this.getEquipAt(lx, y, L);
      if (this.bankLockerId != null || this.auctionHouseId != null || this.merchantId != null) {
        const B = this.layoutBank(canvasWidth, canvasHeight);
        this.hoveredBankSlotIndex = this.getBankSlotIndexAt(x, y, B);
      } else {
        this.hoveredBankSlotIndex = null;
      }
    } else {
      this.hoveredBagIndex = null;
      this.hoveredEquipSlot = null;
      this.hoveredBankSlotIndex = null;
    }
    if (this.activeTab === "character") {
      const statLayout = this.characterStatPanelLayout(L.contentTop, L.rightX);
      for (const row of statLayout.rows) {
        const infoBadge = characterStatInfoBadge(L.rightX, L.rightW, row.rowLabelY);
        if (uiCircleContains(infoBadge.cx, infoBadge.cy, infoBadge.r, lx, y)) {
          this.hoveredCharacterStatKey = row.key;
          break;
        }
      }
      if (this.hoveredCharacterStatKey === null) {
        for (let gi = 0; gi < statLayout.groups.length; gi++) {
          const b = statLayout.groups[gi]!.infoBadge;
          if (uiCircleContains(b.cx, b.cy, b.r, lx, y)) {
            this.hoveredCharacterStatGroupIndex = gi;
            break;
          }
        }
      }
    }
    if (this.activeTab === "abilities") {
      for (const card of this.abilityCardRects(L)) {
        if (uiRectContains(card, lx, y)) {
          this.hoveredAbilityId = card.id;
          break;
        }
      }
    }
    if (this.dragState?.isDragging) {
      this.dragState.currentX = x;
      this.dragState.currentY = y;
      this.dragState.targetBagIndex = this.hoveredBagIndex;
      this.dragState.targetEquipSlot = this.hoveredEquipSlot;
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
    let auctionPriceLine: string | null = null;
    if (this.hoveredBagIndex !== null) {
      hovered = items[this.hoveredBagIndex] ?? null;
    } else if (this.hoveredEquipSlot) {
      hovered = equipment?.[this.hoveredEquipSlot] ?? null;
    } else if (this.hoveredBankSlotIndex !== null) {
      if (this.auctionHouseId != null) {
        const list = this.getFilteredAuctionListings()[this.hoveredBankSlotIndex];
        if (list) {
          hovered = {
            itemType: list.itemType,
            ...(list.itemState ? { state: list.itemState } : {}),
          };
          const p = list.price;
          auctionPriceLine = `Price: ${p}c${list.isOwnListing ? " (yours)" : ""}`;
        }
      } else if (this.merchantId != null) {
        const entries = this.getMerchantFilteredShopEntries();
        const dataIdx = this.merchantShopScrollFirstIndex + this.hoveredBankSlotIndex;
        const entry = entries[dataIdx];
        if (entry) {
          hovered = { itemType: entry.itemType };
          auctionPriceLine = `Buy: ${entry.buyPrice}c`;
        }
      } else {
        hovered = this.deps.getBank()[this.hoveredBankSlotIndex] ?? null;
      }
    }
    if (!hovered) return;

    const name =
      getSignInventoryDisplayName(hovered) ?? formatDisplayName(hovered.itemType);
    const kindLine = getItemKindLabel(hovered.itemType);
    const stackKg =
      getItemWeightKg(hovered.itemType) * (hovered.state?.count ?? 1);
    const weightLine = `${stackKg.toFixed(1)} kg`;
    const armorEvadeLine =
      itemRegistry.get(hovered.itemType)?.category === "armor"
        ? `Evade (vs zombies): +${formatTooltipPercent(CHARACTER_STAT_MODIFIERS.armorEvadeChancePerEquippedPiece, 1)} while equipped`
        : null;

    ctx.textAlign = "center";
    ctx.font = "bold 16px Arial";
    const priceLine = auctionPriceLine ?? "";
    const wName = ctx.measureText(name).width;
    ctx.font = "14px Arial";
    const wKind = ctx.measureText(kindLine).width;
    const wWeight = ctx.measureText(weightLine).width;
    const wArmor = armorEvadeLine ? ctx.measureText(armorEvadeLine).width : 0;
    const wPrice = priceLine ? ctx.measureText(priceLine).width : 0;

    const pad = 8;
    const bw = Math.max(wName, wKind, wWeight, wPrice, wArmor) + pad * 2;
    const bh = 60 + (armorEvadeLine ? 22 : 0) + (priceLine ? 18 : 0);
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
    ctx.fillText(kindLine, this._mx, by + 36);
    ctx.fillText(weightLine, this._mx, by + 52);
    if (armorEvadeLine) {
      ctx.fillText(armorEvadeLine, this._mx, by + 68);
    }
    if (priceLine) {
      ctx.fillStyle = RPG_COUNTER_GOLD;
      ctx.fillText(priceLine, this._mx, by + (armorEvadeLine ? 86 : 70));
    }
  }

  private renderCharacterStatTooltip(ctx: CanvasRenderingContext2D, player: PlayerClient): void {
    const key = this.hoveredCharacterStatKey;
    if (!key) {
      return;
    }

    const points = player.getCharacterStat(key);
    const title = `${STAT_LABELS[key]} · ${points}/${MAX_POINTS_PER_CHARACTER_STAT} pts`;
    const lines = getCharacterStatTooltipLines(key, points, player);
    const pad = 10;
    const titleLineHeight = 20;
    const bodyLineHeight = 17;
    const minWidth = 250;

    ctx.save();
    ctx.font = "bold 15px Georgia";
    let boxWidth = ctx.measureText(title).width;
    ctx.font = "13px Arial";
    for (const line of lines) {
      boxWidth = Math.max(boxWidth, ctx.measureText(line).width);
    }
    boxWidth = Math.max(minWidth, boxWidth + pad * 2);
    const boxHeight = pad * 2 + titleLineHeight + lines.length * bodyLineHeight;

    let boxX = Math.min(this._mx + 16, this.lastW - boxWidth - 8);
    boxX = Math.max(8, boxX);
    let boxY = this._my - boxHeight - 12;
    if (boxY < 8) {
      boxY = Math.min(this._my + 16, this.lastH - boxHeight - 8);
    }
    boxY = Math.max(8, boxY);

    ctx.fillStyle = "rgba(6, 8, 16, 0.96)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = RPG_SLOT_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.font = "bold 15px Georgia";
    ctx.fillStyle = RPG_TITLE_CREAM;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(title, boxX + pad, boxY + pad + 14);

    ctx.font = "13px Arial";
    ctx.fillStyle = RPG_BODY_TEXT;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, boxX + pad, boxY + pad + titleLineHeight + 14 + i * bodyLineHeight);
    }
    ctx.restore();
  }

  private renderCharacterStatGroupTooltip(ctx: CanvasRenderingContext2D): void {
    const gi = this.hoveredCharacterStatGroupIndex;
    if (gi === null) return;
    const g = CHARACTER_STAT_LOOP_GROUPS[gi];
    if (!g) return;

    const title = g.title;
    const lines = g.infoLines;
    const pad = 10;
    const titleLineHeight = 20;
    const bodyLineHeight = 17;
    const minWidth = 260;

    ctx.save();
    ctx.font = "bold 15px Georgia";
    let boxWidth = ctx.measureText(title).width;
    ctx.font = "13px Arial";
    for (const line of lines) {
      boxWidth = Math.max(boxWidth, ctx.measureText(line).width);
    }
    boxWidth = Math.max(minWidth, boxWidth + pad * 2);
    const boxHeight = pad * 2 + titleLineHeight + lines.length * bodyLineHeight;

    let boxX = Math.min(this._mx + 16, this.lastW - boxWidth - 8);
    boxX = Math.max(8, boxX);
    let boxY = this._my - boxHeight - 12;
    if (boxY < 8) {
      boxY = Math.min(this._my + 16, this.lastH - boxHeight - 8);
    }
    boxY = Math.max(8, boxY);

    ctx.fillStyle = "rgba(6, 8, 16, 0.96)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = RPG_SLOT_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.font = "bold 15px Georgia";
    ctx.fillStyle = RPG_TITLE_CREAM;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(title, boxX + pad, boxY + pad + 14);

    ctx.font = "13px Arial";
    ctx.fillStyle = RPG_BODY_TEXT;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, boxX + pad, boxY + pad + titleLineHeight + 14 + i * bodyLineHeight);
    }
    ctx.restore();
  }

  public handleClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    clickCount: number = 1
  ): boolean {
    if (!this.isOpen()) return false;
    if (this.ctxMenu && this.handleContextMenuClick(x, y)) {
      return true;
    }
    const L = this.layout(canvasWidth, canvasHeight, this.getBagSlotCount());
    const lx = this.toPanelLocalX(x, L.rightW);
    const inPanel =
      lx >= L.rightX &&
      lx <= L.rightX + L.rightW &&
      y >= L.rightY &&
      y <= L.rightY + L.rightH;
    const onBankPanel =
      this.isBankOpen() && this.bankPanelContainsScreenPoint(x, y, canvasWidth, canvasHeight);

    if (!inPanel && !onBankPanel) {
      this.ctxMenu = null;
      return false;
    }

    if (onBankPanel && this.activeTab === "inventory") {
      if (this.auctionHouseId != null) {
        const p = this.deps.getMyPlayer();
        if (this.hitTestClaimButton(x, y, canvasWidth, canvasHeight)) {
          this.deps.sendAuctionAction({
            auctionHouseEntityId: this.auctionHouseId,
            kind: "claim",
            bagSlotIndex: 0,
            price: 0,
            listingId: "",
            listQuantity: 0,
          });
          return true;
        }
        const tab = this.hitTestAuctionTab(x, y, canvasWidth, canvasHeight);
        if (tab != null) {
          this.auctionCategoryFilter = tab;
          return true;
        }
        const B = this.layoutBank(canvasWidth, canvasHeight);
        const bIdx = this.getBankSlotIndexAt(x, y, B);
        if (bIdx !== null && clickCount >= 2 && p) {
          const list = this.getFilteredAuctionListings()[bIdx];
          if (list && !list.isOwnListing && !this.isAuctionListingBlocked(list, p)) {
            this.deps.sendAuctionAction({
              auctionHouseEntityId: this.auctionHouseId,
              kind: "buy",
              bagSlotIndex: 0,
              price: 0,
              listingId: list.id,
              listQuantity: 0,
            });
          }
          return true;
        }
        this.ctxMenu = null;
        if (!inPanel) {
          return true;
        }
      } else if (this.merchantId != null) {
        const tab = this.hitTestMerchantTab(x, y, canvasWidth, canvasHeight);
        if (tab != null) {
          this.merchantCategoryFilter = tab;
          this.merchantShopScrollFirstIndex = 0;
          return true;
        }
        const pMerchant = this.deps.getMyPlayer();
        const Bm = this.layoutBank(canvasWidth, canvasHeight);
        const bIdxM = this.getBankSlotIndexAt(x, y, Bm);
        if (bIdxM !== null && clickCount >= 2 && pMerchant && this.merchantId != null) {
          const entries = this.getMerchantFilteredShopEntries();
          const dataIdx = this.merchantShopScrollFirstIndex + bIdxM;
          const entry = entries[dataIdx];
          if (entry && pMerchant.getCoins() >= entry.buyPrice) {
            this.deps.sendMerchantBuy(this.merchantId, entry.originalIndex);
          }
          return true;
        }
        this.ctxMenu = null;
        if (!inPanel) {
          return true;
        }
      } else if (this.bankLockerId != null) {
        const B = this.layoutBank(canvasWidth, canvasHeight);
        const bIdx = this.getBankSlotIndexAt(x, y, B);
        if (bIdx !== null && clickCount >= 2) {
          this.deps.sendBankAction({
            lockerEntityId: this.bankLockerId,
            action: 1,
            source: 1,
            slotIndex: bIdx,
            equipSlotIndex: 255,
          });
          return true;
        }
        this.ctxMenu = null;
        if (!inPanel) {
          return true;
        }
      }
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
      const statLayout = this.characterStatPanelLayout(L.contentTop, L.rightX);
      for (const row of statLayout.rows) {
        const key = row.key;
        const { plus } = characterStatPlusMinusRects(L.rightX, L.rightW, row.rowLabelY);
        if (
          player.getAvailableCharacterPoints() > 0 &&
          player.getCharacterStat(key) < MAX_POINTS_PER_CHARACTER_STAT &&
          uiRectContains(plus, lx, y)
        ) {
          const m = buildCharacterMapFromPlayer(player);
          m[key] = Math.min(MAX_POINTS_PER_CHARACTER_STAT, (m[key] ?? 0) + 1);
          this.deps.sendProgressionAllocations("character", m);
          return true;
        }
      }
      return true;
    }

    if (this.activeTab === "abilities") {
      for (const card of this.abilityCardRects(L)) {
        if (uiRectContains(card, lx, y)) {
          const abilities = buildAbilityMapFromPlayer(player);
          if ((abilities[card.id] ?? 0) > 0) return true;
          if (player.getAvailableAbilityPoints() <= 0) return true;
          abilities[card.id] = 1;
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

    const bagIdx = this.getBagIndexAt(lx, y, L);
    const eq = this.getEquipAt(lx, y, L);
    if (bagIdx !== null) {
      const item = this.deps.getInventory()[bagIdx];
      if (item && clickCount >= 2 && this.bankLockerId != null) {
        this.deps.sendBankAction({
          lockerEntityId: this.bankLockerId,
          action: 0,
          source: 0,
          slotIndex: bagIdx,
          equipSlotIndex: 255,
        });
        return true;
      }
      if (item && clickCount >= 2 && this.auctionHouseId != null && canListItemFromBag(item)) {
        this.openAuctionSellForBagIndex(bagIdx);
        return true;
      }
      if (
        item &&
        clickCount >= 2 &&
        this.merchantId != null &&
        canSellItemToMerchant(item, this.getMerchantShopItemsFromState())
      ) {
        this.deps.sendMerchantSell(this.merchantId, bagIdx);
        return true;
      }
      if (item && clickCount >= 2 && this.tryQuickEquipFromBag(bagIdx, item)) {
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
        };
      }
      return true;
    }
    if (eq) {
      const item = this.deps.getEquipment()?.[eq];
      if (item && clickCount >= 2 && this.tryUnequipToBag(eq)) {
        return true;
      }
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
    if (lx >= L.rightX && lx <= L.rightX + L.rightW && y >= L.rightY && y <= L.rightY + L.rightH) {
      return true;
    }
    if (this.bankPanelContainsScreenPoint(x, y, canvasWidth, canvasHeight)) {
      return true;
    }
    if (this.ctxMenu) {
      const { menuX, menuY, menuW, menuH } = this.getContextMenuRect();
      return x >= menuX && x <= menuX + menuW && y >= menuY && y <= menuY + menuH;
    }
    return false;
  }

  public handleRightClick(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.isOpen() || this.activeTab !== "inventory") {
      return false;
    }
    const L = this.layout(canvasWidth, canvasHeight, this.getBagSlotCount());
    const lx = this.toPanelLocalX(x, L.rightW);
    const onBank = this.isBankOpen() && this.bankPanelContainsScreenPoint(x, y, canvasWidth, canvasHeight);
    if (onBank && this.auctionHouseId != null) {
      const B = this.layoutBank(canvasWidth, canvasHeight);
      const idx = this.getBankSlotIndexAt(x, y, B);
      const list = idx != null ? this.getFilteredAuctionListings()[idx] : undefined;
      this.ctxMenu =
        list && idx != null ? { x, y, target: { kind: "auction", listingIndex: idx } } : null;
      return true;
    }
    if (onBank && this.bankLockerId != null) {
      const B = this.layoutBank(canvasWidth, canvasHeight);
      const idx = this.getBankSlotIndexAt(x, y, B);
      const it = idx != null ? this.deps.getBank()[idx] : null;
      this.ctxMenu = it && idx != null ? { x, y, target: { kind: "bank", index: idx } } : null;
      return true;
    }
    const bagIdx = this.getBagIndexAt(lx, y, L);
    if (bagIdx !== null) {
      const it = this.deps.getInventory()[bagIdx];
      this.ctxMenu = it ? { x, y, target: { kind: "bag", index: bagIdx } } : null;
      return true;
    }
    const eq = this.getEquipAt(lx, y, L);
    if (eq) {
      const it = this.deps.getEquipment()?.[eq];
      this.ctxMenu = it ? { x, y, target: { kind: "equip", slot: eq } } : null;
      return true;
    }
    this.ctxMenu = null;
    return false;
  }

  private getContextMenuRect(): { menuX: number; menuY: number; menuW: number; menuH: number } {
    const rowH = 26;
    const pad = 6;
    const labels = this.ctxMenu ? this.buildContextMenuLabels(this.ctxMenu.target) : [];
    const menuW = 140;
    const menuH = pad * 2 + labels.length * rowH;
    let menuX = this.ctxMenu!.x;
    let menuY = this.ctxMenu!.y;
    if (menuX + menuW > this.lastW - 4) {
      menuX = this.lastW - menuW - 4;
    }
    if (menuY + menuH > this.lastH - 4) {
      menuY = this.lastH - menuH - 4;
    }
    return { menuX, menuY, menuW, menuH };
  }

  private buildContextMenuLabels(target: BankCtxTarget): string[] {
    const lockerId = this.bankLockerId;
    const rows: string[] = [];
    if (target.kind === "bank") {
      rows.push("Withdraw", "Drop");
      const it = this.deps.getBank()[target.index];
      if (it && itemRegistry.get(it.itemType)?.category === "consumable") {
        rows.push("Use");
      }
      const eqIdx = it ? this.resolveEquipMenuIndex(it) : null;
      if (eqIdx != null) {
        rows.push("Equip");
      }
      return rows;
    }
    if (target.kind === "auction") {
      const list = this.getFilteredAuctionListings()[target.listingIndex];
      if (!list) {
        return [];
      }
      return list.isOwnListing ? ["Retrieve"] : ["Buy"];
    }
    if (target.kind === "bag") {
      const it = this.deps.getInventory()[target.index];
      if (lockerId != null) {
        rows.push("Stash");
      }
      if (this.auctionHouseId != null) {
        if (it && canListItemFromBag(it)) {
          rows.push("Sell");
        }
      }
      if (this.merchantId != null) {
        if (it && canSellItemToMerchant(it, this.getMerchantShopItemsFromState())) {
          rows.push("Sell");
        }
      }
      if (this.canSplitBagStack(it)) {
        rows.push("Split");
      }
      if (this.canDropOneFromBagStack(it)) {
        rows.push("Drop 1");
      }
      rows.push("Drop");
      if (it?.itemType === "sign") {
        rows.push("Write");
      } else if (it?.itemType === "skateboard") {
        const p = this.deps.getMyPlayer();
        const idx1 = target.index + 1;
        const riding = p && ((p as any).skateboardBagIndex1Based ?? 0) === idx1;
        rows.push(riding ? "Get off" : "Ride");
      } else if (it && itemRegistry.get(it.itemType)?.category === "consumable") {
        rows.push("Use");
      }
      const eqIdx = it ? this.resolveEquipMenuIndex(it) : null;
      if (eqIdx != null) {
        rows.push("Equip");
      }
      return rows;
    }
    if (target.kind === "equip") {
      if (lockerId != null) {
        rows.push("Stash");
      }
      if (this.getFirstEmptyVisibleBagIndex() != null) {
        rows.push("Unequip");
      }
      rows.push("Drop");
      return rows;
    }
    return rows;
  }

  /**
   * Bank action 4 equip indices: armor0–6, weapon/consumable loadout rows 7–11.
   * Only weapons (loadout) and armor are "Equip" in the menu; consumables use Use or double-click → quick bar.
   */
  private resolveEquipMenuIndex(item: InventoryItem): number | null {
    const t = item.itemType;
    const loadoutKey = getWeaponLoadoutSlotKey(t);
    if (loadoutKey !== null) {
      return 7 + weaponLoadoutSlotKeyToIndex(loadoutKey);
    }
    for (const slot of EQUIPMENT_SLOT_KEYS) {
      if (canItemGoInEquipmentSlot(t, slot)) {
        return encodeEquipmentSlotKey(slot);
      }
    }
    return null;
  }

  private handleContextMenuClick(x: number, y: number): boolean {
    if (!this.ctxMenu) {
      return false;
    }
    const lid = this.bankLockerId;
    const { menuX, menuY, menuW, menuH } = this.getContextMenuRect();
    if (x < menuX || x > menuX + menuW || y < menuY || y > menuY + menuH) {
      this.ctxMenu = null;
      return false;
    }
    const rowH = 26;
    const pad = 6;
    const labels = this.buildContextMenuLabels(this.ctxMenu.target);
    const relY = y - menuY - pad;
    const row = Math.floor(relY / rowH);
    if (row < 0 || row >= labels.length) {
      return true;
    }
    const label = labels[row]!;
    const t = this.ctxMenu.target;
    const send = (data: BankActionEventData) => this.deps.sendBankAction(data);

    if (t.kind === "auction") {
      const ah = this.auctionHouseId;
      const list = this.getFilteredAuctionListings()[t.listingIndex];
      if (ah && list) {
        if (label === "Buy" && !list.isOwnListing) {
          const p = this.deps.getMyPlayer();
          if (p && !this.isAuctionListingBlocked(list, p)) {
            this.deps.sendAuctionAction({
              auctionHouseEntityId: ah,
              kind: "buy",
              bagSlotIndex: 0,
              price: 0,
              listingId: list.id,
              listQuantity: 0,
            });
          }
        } else if (label === "Retrieve" && list.isOwnListing) {
          this.deps.sendAuctionAction({
            auctionHouseEntityId: ah,
            kind: "cancel",
            bagSlotIndex: 0,
            price: 0,
            listingId: list.id,
            listQuantity: 0,
          });
        }
      }
      this.ctxMenu = null;
      return true;
    }

    const item =
      t.kind === "bank"
        ? this.deps.getBank()[t.index]
        : t.kind === "bag"
          ? this.deps.getInventory()[t.index]
          : this.deps.getEquipment()?.[t.slot] ?? null;

    if (label === "Unequip" && t.kind === "equip") {
      this.tryUnequipToBag(t.slot);
      this.ctxMenu = null;
      return true;
    }

    if (!lid) {
      if (label === "Sell" && t.kind === "bag" && this.merchantId != null) {
        const itSell = this.deps.getInventory()[t.index];
        if (
          itSell &&
          canSellItemToMerchant(itSell, this.getMerchantShopItemsFromState()) &&
          this.merchantId != null
        ) {
          this.deps.sendMerchantSell(this.merchantId, t.index);
        }
      } else if (label === "Sell" && t.kind === "bag" && this.auctionHouseId != null) {
        this.openAuctionSellForBagIndex(t.index);
      } else if (label === "Split" && t.kind === "bag") {
        this.openSplitStackForBagIndex(t.index);
      } else if (label === "Drop 1" && t.kind === "bag") {
        this.deps.sendDropItem(t.index, 1);
      } else if (label === "Drop" && t.kind === "bag") {
        this.deps.sendDropItem(t.index);
      } else if (label === "Drop" && t.kind === "equip") {
        this.deps.sendDropFromEquipment(t.slot);
      } else if (label === "Write" && item?.itemType === "sign" && t.kind === "bag") {
        this.openSignTextForBagIndex(t.index);
      } else if (label === "Use" && item && t.kind === "bag") {
        this.deps.sendConsumeItem(null, t.index);
      } else if (
        (label === "Ride" || label === "Get off") &&
        item?.itemType === "skateboard" &&
        t.kind === "bag"
      ) {
        this.deps.sendConsumeItem(null, t.index);
      } else if (label === "Equip" && item && t.kind === "bag") {
        const eqIdx = this.resolveEquipMenuIndex(item);
        if (eqIdx != null) {
          if (eqIdx <= 6) {
            const slot = decodeEquipmentSlotKey(eqIdx);
            if (slot) {
              this.deps.sendSwapBagAndEquipment(t.index, slot);
            }
          } else if (eqIdx >= 7 && eqIdx <= 11) {
            this.deps.sendSetWeaponLoadoutSlot(
              (eqIdx - 7) as 0 | 1 | 2 | 3 | 4,
              t.index + 1,
            );
          }
        }
      }
      this.ctxMenu = null;
      return true;
    }

    if (label === "Sell" && t.kind === "bag" && this.merchantId != null) {
      const itSell2 = this.deps.getInventory()[t.index];
      if (
        itSell2 &&
        canSellItemToMerchant(itSell2, this.getMerchantShopItemsFromState()) &&
        this.merchantId != null
      ) {
        this.deps.sendMerchantSell(this.merchantId, t.index);
      }
    } else if (label === "Sell" && t.kind === "bag" && this.auctionHouseId != null) {
      this.openAuctionSellForBagIndex(t.index);
    } else if (label === "Split" && t.kind === "bag") {
      this.openSplitStackForBagIndex(t.index);
    } else if (label === "Drop 1" && t.kind === "bag") {
      this.deps.sendDropItem(t.index, 1);
    } else if (label === "Withdraw" && t.kind === "bank") {
      send({ lockerEntityId: lid, action: 1, source: 1, slotIndex: t.index, equipSlotIndex: 255 });
    } else if (label === "Stash" && t.kind === "bag") {
      send({ lockerEntityId: lid, action: 0, source: 0, slotIndex: t.index, equipSlotIndex: 255 });
    } else if (label === "Stash" && t.kind === "equip") {
      send({
        lockerEntityId: lid,
        action: 0,
        source: 2,
        slotIndex: encodeEquipmentSlotKey(t.slot),
        equipSlotIndex: 255,
      });
    } else if (label === "Drop") {
      if (t.kind === "bank") {
        send({ lockerEntityId: lid, action: 2, source: 1, slotIndex: t.index, equipSlotIndex: 255 });
      } else if (t.kind === "bag") {
        send({ lockerEntityId: lid, action: 2, source: 0, slotIndex: t.index, equipSlotIndex: 255 });
      } else {
        send({
          lockerEntityId: lid,
          action: 2,
          source: 2,
          slotIndex: encodeEquipmentSlotKey(t.slot),
          equipSlotIndex: 255,
        });
      }
    } else if (label === "Use" && item) {
      if (t.kind === "bank") {
        send({ lockerEntityId: lid, action: 3, source: 1, slotIndex: t.index, equipSlotIndex: 255 });
      } else if (t.kind === "bag") {
        send({ lockerEntityId: lid, action: 3, source: 0, slotIndex: t.index, equipSlotIndex: 255 });
      }
    } else if (
      (label === "Ride" || label === "Get off") &&
      item?.itemType === "skateboard" &&
      t.kind === "bag"
    ) {
      this.deps.sendConsumeItem(null, t.index);
    } else if (label === "Equip" && item) {
      const eqIdx = this.resolveEquipMenuIndex(item);
      if (eqIdx != null) {
        if (t.kind === "bank") {
          send({ lockerEntityId: lid, action: 4, source: 1, slotIndex: t.index, equipSlotIndex: eqIdx });
        } else if (t.kind === "bag") {
          send({ lockerEntityId: lid, action: 4, source: 0, slotIndex: t.index, equipSlotIndex: eqIdx });
        }
      }
    }

    this.ctxMenu = null;
    return true;
  }

  private openAuctionSellForBagIndex(bagIndex: number): void {
    if (this.auctionHouseId == null) {
      return;
    }
    const item = this.deps.getInventory()[bagIndex] ?? null;
    if (!item) {
      return;
    }
    const stackCount = item.state?.count ?? 1;
    const showQuantity = isStackableInventoryItem(item) && stackCount > 1;
    this.closeInventoryModals();
    const ah = this.auctionHouseId;
    this.auctionPriceModal = new AuctionPriceModal(
      {
        showQuantity,
        maxStackQuantity: stackCount,
        onConfirm: (price, listQuantity) => {
          this.deps.sendAuctionAction({
            auctionHouseEntityId: ah,
            kind: "list",
            bagSlotIndex: bagIndex,
            price,
            listingId: "",
            listQuantity,
          });
          this.auctionPriceModal = null;
        },
      },
      () => {
        this.auctionPriceModal = null;
      },
    );
    this.auctionPriceModal.open();
  }

  private openSplitStackForBagIndex(bagIndex: number): void {
    const item = this.deps.getInventory()[bagIndex] ?? null;
    if (!item || !this.canSplitBagStack(item)) {
      return;
    }
    const stackCount = Math.max(1, Math.floor(item.state?.count ?? 1));
    const maxSplitQuantity = stackCount - 1;
    this.closeInventoryModals();
    this.splitStackModal = new SplitStackQuantityModal(
      {
        maxSplitQuantity,
        onConfirm: (quantity) => {
          this.deps.sendSplitInventoryStack({
            slotIndex: bagIndex,
            quantity,
          });
          this.splitStackModal = null;
        },
      },
      () => {
        this.splitStackModal = null;
      },
    );
    this.splitStackModal.open();
  }

  private openSignTextForBagIndex(bagIndex: number): void {
    const item = this.deps.getInventory()[bagIndex] ?? null;
    if (!item || item.itemType !== "sign") {
      return;
    }
    this.closeInventoryModals();
    this.signTextModal = new SignTextModal(
      {
        initialMessage: typeof item.state?.message === "string" ? item.state.message : "",
        onConfirm: (message) => {
          this.deps.sendSetSignText({
            slotIndex: bagIndex,
            message,
          });
          this.deps.sendDropItem(bagIndex);
          this.signTextModal = null;
        },
      },
      () => {
        this.signTextModal = null;
      },
    );
    this.signTextModal.open();
  }

  private getFilteredAuctionListings(): AuctionListingSnapshot[] {
    const snap = this.deps.getAuctionSnapshot();
    if (!snap?.listings) {
      return [];
    }
    if (this.auctionCategoryFilter === "all") {
      return snap.listings;
    }
    return snap.listings.filter(
      (l: AuctionListingSnapshot) => l.itemCategory === this.auctionCategoryFilter,
    );
  }

  private isAuctionListingBlocked(listing: AuctionListingSnapshot, player: PlayerClient): boolean {
    if (listing.isOwnListing) {
      return false;
    }
    const invItems = player.getInventory();
    const maxSlots = player.getAccessibleInventorySlotCount();
    const bought: InventoryItem = {
      itemType: listing.itemType,
      ...(listing.itemState ? { state: listing.itemState } : {}),
    };
    if (player.getCoins() < listing.price) {
      return true;
    }
    return !canBagAcceptItem(invItems, maxSlots, bought);
  }

  private layoutAuctionCategoryTabs(
    B: ReturnType<InventoryScreenUI["layoutBank"]>,
    /** Horizontal space to leave empty on the right (e.g. for the claim button). */
    rightReservePx: number,
  ): { id: AuctionItemCategory | "all"; x: number; y: number; w: number; h: number }[] {
    const ids: (AuctionItemCategory | "all")[] = ["all", "weapon", "ammo", "item", "resource"];
    const gap = 4;
    const h = 20;
    const leftPad = 12;
    const rightPad = 12 + Math.max(0, rightReservePx);
    const w = Math.floor(
      (B.bankW - leftPad - rightPad - gap * (ids.length - 1)) / ids.length,
    );
    let x = B.bankX + leftPad;
    const y = B.titleY + 8;
    return ids.map((id) => {
      const r = { id, x, y, w, h };
      x += w + gap;
      return r;
    });
  }

  private hitTestAuctionTab(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
  ): (AuctionItemCategory | "all") | null {
    if (this.auctionHouseId == null) {
      return null;
    }
    const B = this.layoutBank(canvasWidth, canvasHeight);
    const lx = screenX - this.getBankSlideOffsetPx(B.bankW);
    const ly = screenY;
    for (const t of this.auctionTabRects) {
      if (lx >= t.x && lx <= t.x + t.w && ly >= t.y && ly <= t.y + t.h) {
        return t.id;
      }
    }
    return null;
  }

  private hitTestClaimButton(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
  ): boolean {
    const r = this.claimButtonRect;
    if (!r || this.auctionHouseId == null) {
      return false;
    }
    const B = this.layoutBank(canvasWidth, canvasHeight);
    const lx = screenX - this.getBankSlideOffsetPx(B.bankW);
    const ly = screenY;
    return lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h;
  }

  private renderContextMenu(ctx: CanvasRenderingContext2D): void {
    if (!this.ctxMenu) {
      return;
    }
    const { menuX, menuY, menuW, menuH } = this.getContextMenuRect();
    const labels = this.buildContextMenuLabels(this.ctxMenu.target);
    const rowH = 26;
    const pad = 6;
    ctx.fillStyle = "rgba(6, 8, 16, 0.96)";
    ctx.fillRect(menuX, menuY, menuW, menuH);
    ctx.strokeStyle = RPG_SLOT_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(menuX, menuY, menuW, menuH);
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    for (let i = 0; i < labels.length; i++) {
      const ly = menuY + pad + i * rowH + 18;
      ctx.fillStyle = RPG_TITLE_CREAM;
      ctx.fillText(labels[i]!, menuX + 8, ly);
    }
  }
}

/** Lightweight DOM overlay for auction listing price (game keys ignored while input focused). */
class AuctionPriceModal {
  private root: HTMLDivElement | null = null;

  constructor(
    private readonly opts: {
      showQuantity: boolean;
      maxStackQuantity: number;
      onConfirm: (price: number, listQuantity: number) => void;
    },
    private readonly onCancel: () => void,
  ) {}

  open(): void {
    if (typeof document === "undefined") {
      return;
    }
    const inputStyle = auctionModalTextInputStyle();
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:fixed;inset:0;background:${RPG_MODAL_SCRIM};z-index:99999;display:flex;align-items:center;justify-content:center;`;
    const box = document.createElement("div");
    box.style.cssText = `background:linear-gradient(180deg, rgba(16,18,31,0.98) 0%, rgba(6,8,16,0.95) 100%);border:2px solid ${RPG_BORDER_GOLD};padding:16px;border-radius:8px;min-width:280px;color:${RPG_TITLE_CREAM};font-family:Georgia,system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,0.45);`;
    const title = document.createElement("div");
    title.textContent = "Sell at auction";
    title.style.cssText = `margin-bottom:10px;font-weight:600;color:${RPG_TITLE_CREAM};`;
    const priceLabel = document.createElement("label");
    priceLabel.textContent = "Price (coins)";
    priceLabel.style.cssText = `display:block;font-size:13px;margin-bottom:4px;color:${RPG_METADATA_MUTED};`;
    const priceInput = document.createElement("input");
    priceInput.type = "text";
    priceInput.inputMode = "numeric";
    priceInput.autocomplete = "off";
    priceInput.value = "10";
    priceInput.style.cssText = inputStyle;

    const errEl = document.createElement("div");
    errEl.style.cssText = `min-height:18px;margin-top:8px;font-size:12px;color:${AUCTION_MODAL_INPUT_INVALID_BORDER};line-height:1.35;`;

    const clearFieldAlert = (el: HTMLInputElement) => {
      el.style.border = `1px solid ${RPG_SLOT_STROKE}`;
    };
    const showFieldAlert = (el: HTMLInputElement) => {
      el.style.border = `1px solid ${AUCTION_MODAL_INPUT_INVALID_BORDER}`;
    };

    let qtyInput: HTMLInputElement | null = null;
    const stackMax = Math.max(1, Math.floor(this.opts.maxStackQuantity));

    if (this.opts.showQuantity) {
      const qtyLabel = document.createElement("label");
      qtyLabel.textContent = `Quantity (1–${stackMax})`;
      qtyLabel.style.cssText = `display:block;font-size:13px;margin:10px 0 4px;color:${RPG_METADATA_MUTED};`;
      qtyInput = document.createElement("input");
      qtyInput.type = "text";
      qtyInput.inputMode = "numeric";
      qtyInput.autocomplete = "off";
      qtyInput.value = String(stackMax);
      qtyInput.style.cssText = inputStyle;
      qtyInput.addEventListener("input", () => {
        errEl.textContent = "";
        clearFieldAlert(qtyInput!);
      });
      box.appendChild(title);
      box.appendChild(priceLabel);
      box.appendChild(priceInput);
      box.appendChild(qtyLabel);
      box.appendChild(qtyInput);
    } else {
      box.appendChild(title);
      box.appendChild(priceLabel);
      box.appendChild(priceInput);
    }

    priceInput.addEventListener("input", () => {
      errEl.textContent = "";
      clearFieldAlert(priceInput);
    });

    const trySubmit = (): boolean => {
      errEl.textContent = "";
      clearFieldAlert(priceInput);
      if (qtyInput) {
        clearFieldAlert(qtyInput);
      }

      const priceParsed = parseAuctionModalUintString(priceInput.value);
      if (!priceParsed.ok) {
        errEl.textContent =
          priceInput.value.trim() === ""
            ? "Enter a price in coins."
            : "Price must be a whole number (no decimals or symbols).";
        showFieldAlert(priceInput);
        return false;
      }
      if (priceParsed.value < AUCTION_MIN_PRICE) {
        errEl.textContent = `Price is too low (minimum ${AUCTION_MIN_PRICE.toLocaleString()}).`;
        showFieldAlert(priceInput);
        return false;
      }
      if (priceParsed.value > AUCTION_MAX_PRICE) {
        errEl.textContent = `Price cannot exceed ${AUCTION_MAX_PRICE.toLocaleString()} coins.`;
        showFieldAlert(priceInput);
        return false;
      }

      let listQuantity = 0;
      if (qtyInput) {
        const qParsed = parseAuctionModalUintString(qtyInput.value);
        if (!qParsed.ok) {
          errEl.textContent =
            qtyInput.value.trim() === ""
              ? "Enter how many to list."
              : "Quantity must be a whole number (no decimals or symbols).";
          showFieldAlert(qtyInput);
          return false;
        }
        if (qParsed.value < 1 || qParsed.value > stackMax) {
          errEl.textContent = `Quantity must be between 1 and ${stackMax}.`;
          showFieldAlert(qtyInput);
          return false;
        }
        listQuantity = qParsed.value;
      }

      this.close();
      this.opts.onConfirm(priceParsed.value, listQuantity);
      return true;
    };

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px;margin-top:14px;justify-content:flex-end;align-items:center;";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.type = "button";
    styleAuctionModalButton(cancel, "secondary");
    const ok = document.createElement("button");
    ok.textContent = "List";
    ok.type = "button";
    styleAuctionModalButton(ok, "primary");

    const finishCancel = () => {
      this.close();
      this.onCancel();
    };
    ok.onclick = () => {
      trySubmit();
    };
    cancel.onclick = finishCancel;
    wrap.onclick = (e) => {
      if (e.target === wrap) {
        finishCancel();
      }
    };
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        trySubmit();
      }
    });
    row.appendChild(cancel);
    row.appendChild(ok);
    box.appendChild(errEl);
    box.appendChild(row);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    this.root = wrap;
    queueMicrotask(() => priceInput.focus());
  }

  close(): void {
    this.root?.remove();
    this.root = null;
  }
}

class SplitStackQuantityModal {
  private root: HTMLDivElement | null = null;

  constructor(
    private readonly opts: {
      maxSplitQuantity: number;
      onConfirm: (quantity: number) => void;
    },
    private readonly onCancel: () => void,
  ) {}

  open(): void {
    if (typeof document === "undefined") {
      return;
    }
    const maxSplitQuantity = Math.max(1, Math.floor(this.opts.maxSplitQuantity));
    const inputStyle = auctionModalTextInputStyle();
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:fixed;inset:0;background:${RPG_MODAL_SCRIM};z-index:99999;display:flex;align-items:center;justify-content:center;`;
    const box = document.createElement("div");
    box.style.cssText = `background:linear-gradient(180deg, rgba(16,18,31,0.98) 0%, rgba(6,8,16,0.95) 100%);border:2px solid ${RPG_BORDER_GOLD};padding:16px;border-radius:8px;min-width:280px;color:${RPG_TITLE_CREAM};font-family:Georgia,system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,0.45);`;

    const title = document.createElement("div");
    title.textContent = "Split stack";
    title.style.cssText = `margin-bottom:10px;font-weight:600;color:${RPG_TITLE_CREAM};`;

    const qtyLabel = document.createElement("label");
    qtyLabel.textContent = `Quantity (1-${maxSplitQuantity})`;
    qtyLabel.style.cssText = `display:block;font-size:13px;margin-bottom:4px;color:${RPG_METADATA_MUTED};`;

    const qtyInput = document.createElement("input");
    qtyInput.type = "text";
    qtyInput.inputMode = "numeric";
    qtyInput.autocomplete = "off";
    qtyInput.value = String(Math.max(1, Math.floor(maxSplitQuantity / 2)));
    qtyInput.style.cssText = inputStyle;

    const errEl = document.createElement("div");
    errEl.style.cssText = `min-height:18px;margin-top:8px;font-size:12px;color:${AUCTION_MODAL_INPUT_INVALID_BORDER};line-height:1.35;`;

    const clearFieldAlert = () => {
      qtyInput.style.border = `1px solid ${RPG_SLOT_STROKE}`;
    };
    const showFieldAlert = () => {
      qtyInput.style.border = `1px solid ${AUCTION_MODAL_INPUT_INVALID_BORDER}`;
    };

    qtyInput.addEventListener("input", () => {
      errEl.textContent = "";
      clearFieldAlert();
    });

    const trySubmit = (): boolean => {
      errEl.textContent = "";
      clearFieldAlert();
      const parsed = parseAuctionModalUintString(qtyInput.value);
      if (!parsed.ok) {
        errEl.textContent =
          qtyInput.value.trim() === ""
            ? "Enter how many to split."
            : "Quantity must be a whole number (no decimals or symbols).";
        showFieldAlert();
        return false;
      }
      if (parsed.value < 1 || parsed.value > maxSplitQuantity) {
        errEl.textContent = `Quantity must be between 1 and ${maxSplitQuantity}.`;
        showFieldAlert();
        return false;
      }
      this.close();
      this.opts.onConfirm(parsed.value);
      return true;
    };

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px;margin-top:14px;justify-content:flex-end;align-items:center;";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.type = "button";
    styleAuctionModalButton(cancel, "secondary");
    const ok = document.createElement("button");
    ok.textContent = "Split";
    ok.type = "button";
    styleAuctionModalButton(ok, "primary");

    const finishCancel = () => {
      this.close();
      this.onCancel();
    };

    ok.onclick = () => {
      trySubmit();
    };
    cancel.onclick = finishCancel;
    wrap.onclick = (e) => {
      if (e.target === wrap) {
        finishCancel();
      }
    };
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        trySubmit();
      }
    });

    box.appendChild(title);
    box.appendChild(qtyLabel);
    box.appendChild(qtyInput);
    row.appendChild(cancel);
    row.appendChild(ok);
    box.appendChild(errEl);
    box.appendChild(row);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    this.root = wrap;
    queueMicrotask(() => {
      qtyInput.focus();
      qtyInput.select();
    });
  }

  close(): void {
    this.root?.remove();
    this.root = null;
  }
}
