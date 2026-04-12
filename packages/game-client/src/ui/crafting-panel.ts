import { Renderable } from "@/entities/util";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { PlayerClient } from "@/entities/player";
import { GameState, getEntityById } from "@/state";
import { ClientPositionable } from "@/extensions";
import { formatDisplayName } from "@/util/format";
import { getConfig } from "@shared/config";
import type { CraftRequestEventData } from "@shared/events/client-sent/events/craft-request";
import { Z_INDEX } from "@shared/map";
import {
  CRAFTING_STATION_LABELS,
  type CraftingStationId,
} from "@shared/util/crafting-stations";
import type { ProfessionId } from "@shared/util/professions";
import {
  PROFESSION_DEFINITIONS,
  PROFESSION_IDS,
  getProfessionLabel,
} from "@shared/util/professions";
import {
  getRecipesForStation,
  getScrapOutputsForItem,
  isRecipeUnlocked,
  recipeCanBeCrafted,
  type Recipe,
  type RecipeComponent,
} from "@shared/util/recipes";
import { distance } from "@shared/util/physics";
import { type InventoryItem, type ItemType } from "@shared/util/inventory";

type PanelRect = { x: number; y: number; w: number; h: number };
type FilterValue = "all" | ProfessionId;

/** 144×16 strip: frame0 = All, then PROFESSION_IDS order (see generate-crafting-tab-icons.py). */
const CRAFTING_TAB_ICON_URL = "/ui/crafting-tab-icons.png";
const CRAFTING_TAB_ICON_SHEET_PX = 16;
const CRAFTING_TAB_ICON_DRAW_PX = 24;

function craftingTabIconSheetIndex(filter: FilterValue): number {
  if (filter === "all") return 0;
  const i = PROFESSION_IDS.indexOf(filter);
  return i < 0 ? 0 : i + 1;
}

type RecipeEntry = {
  key: string;
  kind: "recipe";
  recipe: Recipe;
};

type ScrapEntry = {
  key: string;
  kind: "scrap";
  slotIndex: number;
  item: InventoryItem;
  outputs: NonNullable<ReturnType<typeof getScrapOutputsForItem>>;
};

type CraftingEntry = RecipeEntry | ScrapEntry;

type CraftingPanelOptions = {
  getPlayer: () => PlayerClient | null;
  onCraft: (request: CraftRequestEventData) => void;
  onOpen?: () => void;
  onClose?: () => void;
  getCanvas: () => HTMLCanvasElement | null;
};

const PANEL = {
  width: 980,
  /** Fixed target height; details scroll instead of resizing the panel. */
  height: 680,
  padding: 22,
  gutter: 20,
  leftWidth: 360,
  headerHeight: 72,
  filterHeight: 32,
  filterGap: 8,
  entryHeight: 60,
  entryGap: 8,
  buttonHeight: 48,
  /** Minimum list viewport so a few recipe rows stay visible when the panel compacts. */
  listViewportMinHeight: 340,
  /** Strip at the bottom of the list when scrollable; keeps "Showing x–y of z" off the last row. */
  listScrollFooterHeight: 24,
  detailButtonGap: 12,
  detailBottomPadding: 18,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function compactInventory(items: (InventoryItem | null)[]): InventoryItem[] {
  return items.filter((item): item is InventoryItem => item !== null);
}

function countItemInInventory(items: (InventoryItem | null)[], itemType: ItemType): number {
  let total = 0;
  for (const item of items) {
    if (item?.itemType === itemType) {
      total += item.state?.count ?? 1;
    }
  }
  return total;
}

function summarizeComponents(components: RecipeComponent[]): string {
  return components.map((component) => `${component.count ?? 1}x ${formatDisplayName(component.type)}`).join(", ");
}

export class CraftingPanel implements Renderable {
  private stationEntityId: number | null = null;
  private stationId: CraftingStationId | null = null;
  private activeFilter: FilterValue = "all";
  private selectedEntryKey: string | null = null;
  private scrollOffset = 0;
  private detailScrollOffset = 0;

  private panelBounds: PanelRect | null = null;
  private listViewportRect: PanelRect | null = null;
  private detailViewportRect: PanelRect | null = null;
  private closeButtonRect: PanelRect | null = null;
  private craftButtonRect: PanelRect | null = null;
  private filterRects: Array<{ rect: PanelRect; filter: FilterValue }> = [];
  private entryRects: Array<{ rect: PanelRect; key: string }> = [];
  private listMaxScroll = 0;
  private detailMaxScroll = 0;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private craftingTabIconSheet: HTMLImageElement | null = null;
  private craftingTabIconsPreloadStarted = false;

  constructor(
    private assetManager: AssetManager,
    private options: CraftingPanelOptions,
  ) {
    this.preloadCraftingTabIcons();
  }

  private preloadCraftingTabIcons(): void {
    if (this.craftingTabIconsPreloadStarted) return;
    this.craftingTabIconsPreloadStarted = true;
    const img = new Image();
    img.decoding = "async";
    img.src = CRAFTING_TAB_ICON_URL;
    img.onload = () => {
      this.craftingTabIconSheet = img;
    };
  }

  public getZIndex(): number {
    return Z_INDEX.UI + 1;
  }

  public isVisible(): boolean {
    return this.stationEntityId !== null && this.stationId !== null;
  }

  public open(stationEntityId: number, stationId: CraftingStationId): void {
    const wasVisible = this.isVisible();
    this.stationEntityId = stationEntityId;
    this.stationId = stationId;
    const stationProfessions = this.getStationProfessions(stationId);
    this.activeFilter = stationProfessions.length > 1 ? "all" : (stationProfessions[0] ?? "all");
    this.scrollOffset = 0;
    this.detailScrollOffset = 0;
    this.selectedEntryKey = null;
    this.setupWheelHandler();
    if (!wasVisible) {
      this.options.onOpen?.();
    }
  }

  public close(): void {
    const wasVisible = this.isVisible();
    this.stationEntityId = null;
    this.stationId = null;
    this.activeFilter = "all";
    this.selectedEntryKey = null;
    this.scrollOffset = 0;
    this.detailScrollOffset = 0;
    this.panelBounds = null;
    this.listViewportRect = null;
    this.detailViewportRect = null;
    this.closeButtonRect = null;
    this.craftButtonRect = null;
    this.filterRects = [];
    this.entryRects = [];
    this.listMaxScroll = 0;
    this.detailMaxScroll = 0;
    this.removeWheelHandler();
    if (wasVisible) {
      this.options.onClose?.();
    }
  }

  public handleKeyDown(key: string): void {
    if (!this.isVisible()) {
      return;
    }

    if (key === "Escape" || key === "e" || key === "E") {
      this.close();
    }
  }

  public handleClick(x: number, y: number): boolean {
    if (!this.isVisible()) {
      return false;
    }

    if (!this.panelBounds) {
      return true;
    }

    const inPanel =
      x >= this.panelBounds.x &&
      x <= this.panelBounds.x + this.panelBounds.w &&
      y >= this.panelBounds.y &&
      y <= this.panelBounds.y + this.panelBounds.h;

    if (!inPanel) {
      this.close();
      return true;
    }

    if (this.closeButtonRect && this.contains(this.closeButtonRect, x, y)) {
      this.close();
      return true;
    }

    for (const filterRegion of this.filterRects) {
      if (this.contains(filterRegion.rect, x, y)) {
        this.activeFilter = filterRegion.filter;
        this.scrollOffset = 0;
        this.detailScrollOffset = 0;
        this.selectedEntryKey = null;
        return true;
      }
    }

    for (const entryRegion of this.entryRects) {
      if (this.contains(entryRegion.rect, x, y)) {
        if (this.selectedEntryKey !== entryRegion.key) {
          this.detailScrollOffset = 0;
        }
        this.selectedEntryKey = entryRegion.key;
        return true;
      }
    }

    if (this.craftButtonRect && this.contains(this.craftButtonRect, x, y)) {
      this.executeSelectedEntry();
      return true;
    }

    return true;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isVisible()) {
      return;
    }

    if (!this.ensureStationAvailable(gameState)) {
      return;
    }

    const player = this.options.getPlayer();
    const stationId = this.stationId;
    const stationEntityId = this.stationEntityId;
    if (!player || !stationId || stationEntityId === null) {
      this.close();
      return;
    }

    const inventory = player.getInventory();
    const entries = this.buildEntries(inventory);
    const selectedEntry = this.ensureSelectedEntry(entries);

    const bounds = this.getPanelBounds(ctx.canvas.width, ctx.canvas.height);
    this.panelBounds = bounds;

    const leftX = bounds.x + PANEL.padding;
    const leftY = bounds.y + PANEL.padding;
    const leftH = bounds.h - PANEL.padding * 2;
    const rightX = leftX + PANEL.leftWidth + PANEL.gutter;
    const rightW = bounds.w - PANEL.padding * 2 - PANEL.leftWidth - PANEL.gutter;

    const headerBlock = PANEL.headerHeight + PANEL.filterHeight + PANEL.filterGap * 2;
    const listY = leftY + headerBlock;
    const listH = leftH - headerBlock;
    this.listViewportRect = { x: leftX, y: listY, w: PANEL.leftWidth, h: listH };
    const rowStride = PANEL.entryHeight + PANEL.entryGap;
    const visibleRowsIfFull = Math.max(1, Math.floor((listH + PANEL.entryGap) / rowStride));
    let visibleRows = visibleRowsIfFull;
    if (entries.length > visibleRowsIfFull) {
      const listBodyH = listH - PANEL.listScrollFooterHeight;
      visibleRows = Math.max(1, Math.floor((listBodyH + PANEL.entryGap) / rowStride));
    }
    const maxScroll = Math.max(0, entries.length - visibleRows);
    this.listMaxScroll = maxScroll;
    this.scrollOffset = clamp(this.scrollOffset, 0, maxScroll);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const panelGradient = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h);
    panelGradient.addColorStop(0, "#0d1724");
    panelGradient.addColorStop(1, "#182538");
    ctx.fillStyle = panelGradient;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.strokeStyle = "rgba(141, 166, 196, 0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

    ctx.font = "bold 26px Arial";
    ctx.fillStyle = "#f4f7fb";
    ctx.textAlign = "left";
    ctx.fillText(`${CRAFTING_STATION_LABELS[stationId]} Crafting`, leftX, leftY + 28);
    ctx.font = "13px Arial";
    ctx.fillStyle = "#9fb1c8";
    ctx.fillText(
      "Crafting is station-bound. Locked recipes show the profession level required.",
      leftX,
      leftY + 50,
    );

    this.closeButtonRect = {
      x: bounds.x + bounds.w - PANEL.padding - 34,
      y: bounds.y + PANEL.padding - 2,
      w: 34,
      h: 34,
    };
    this.drawButton(ctx, this.closeButtonRect, "X", true, "compact");

    const filters = this.getStationFilters(stationId);
    this.filterRects = [];
    let filterX = leftX;
    const filterY = leftY + PANEL.headerHeight;
    const iconSheet = this.craftingTabIconSheet;
    const iconsReady = iconSheet && iconSheet.complete && iconSheet.naturalWidth > 0;
    const iconDraw = CRAFTING_TAB_ICON_DRAW_PX;
    const iconPadL = 6;
    const iconGap = 6;
    const iconPadR = 8;
    ctx.font = "bold 12px Arial";
    for (const filter of filters) {
      const label = filter === "all" ? "All" : getProfessionLabel(filter);
      const labelW = ctx.measureText(label).width;
      const width = Math.ceil(
        Math.max(72, iconPadL + iconDraw + iconGap + labelW + iconPadR),
      );
      const rect = { x: filterX, y: filterY, w: width, h: PANEL.filterHeight };
      this.filterRects.push({ rect, filter });
      const active = this.activeFilter === filter;
      ctx.fillStyle = active ? "rgba(255, 203, 102, 0.92)" : "rgba(46, 58, 78, 0.95)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = active ? "rgba(255, 232, 182, 0.95)" : "rgba(123, 138, 165, 0.6)";
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      const midY = rect.y + rect.h / 2;
      if (iconsReady) {
        const si = craftingTabIconSheetIndex(filter);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          iconSheet,
          si * CRAFTING_TAB_ICON_SHEET_PX,
          0,
          CRAFTING_TAB_ICON_SHEET_PX,
          CRAFTING_TAB_ICON_SHEET_PX,
          rect.x + iconPadL,
          midY - iconDraw / 2,
          iconDraw,
          iconDraw,
        );
        ctx.restore();
      }
      ctx.font = "bold 12px Arial";
      ctx.fillStyle = active ? "#1b2532" : "#d9e4f2";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, rect.x + iconPadL + iconDraw + iconGap, midY);
      filterX += rect.w + PANEL.filterGap;
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "rgba(16, 22, 32, 0.82)";
    ctx.fillRect(leftX, listY, PANEL.leftWidth, listH);
    ctx.strokeStyle = "rgba(115, 129, 154, 0.55)";
    ctx.strokeRect(leftX, listY, PANEL.leftWidth, listH);

    this.entryRects = [];
    const visibleEntries = entries.slice(this.scrollOffset, this.scrollOffset + visibleRows);
    for (let i = 0; i < visibleEntries.length; i++) {
      const entry = visibleEntries[i]!;
      const y = listY + i * (PANEL.entryHeight + PANEL.entryGap);
      const rect = { x: leftX + 8, y: y + 8, w: PANEL.leftWidth - 16, h: PANEL.entryHeight };
      this.entryRects.push({ rect, key: entry.key });
      const selected = selectedEntry?.key === entry.key;
      this.drawEntryCard(ctx, rect, entry, inventory, player, selected);
    }

    if (entries.length > visibleRows) {
      ctx.font = "11px Arial";
      ctx.fillStyle = "#90a4be";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        `Showing ${this.scrollOffset + 1}-${Math.min(entries.length, this.scrollOffset + visibleRows)} of ${entries.length}`,
        leftX + 10,
        listY + listH - 6,
      );
      ctx.textBaseline = "alphabetic";
    }

    ctx.fillStyle = "rgba(16, 22, 32, 0.82)";
    ctx.fillRect(rightX, listY, rightW, listH);
    ctx.strokeStyle = "rgba(115, 129, 154, 0.55)";
    ctx.strokeRect(rightX, listY, rightW, listH);

    const craftButtonY = listY + listH - PANEL.buttonHeight - PANEL.detailBottomPadding;
    const detailViewportH = Math.max(0, craftButtonY - listY - PANEL.detailButtonGap);
    this.detailViewportRect = { x: rightX, y: listY, w: rightW, h: detailViewportH };

    if (!selectedEntry) {
      this.detailScrollOffset = 0;
      this.detailMaxScroll = 0;
      this.craftButtonRect = null;
      ctx.font = "16px Arial";
      ctx.fillStyle = "#d2d9e6";
      ctx.fillText("No recipes available at this station yet.", rightX + 20, listY + 36);
      ctx.restore();
      return;
    }

    const detailsSpan = this.getDetailsInnerHeight(selectedEntry);
    this.detailMaxScroll = Math.max(0, detailsSpan - detailViewportH);
    this.detailScrollOffset = clamp(this.detailScrollOffset, 0, this.detailMaxScroll);

    const actionEnabled = this.canExecuteEntry(selectedEntry, inventory, player);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rightX + 1, listY + 1, Math.max(0, rightW - 2), Math.max(0, detailViewportH - 2));
    ctx.clip();
    this.renderDetails(
      ctx,
      rightX,
      listY - this.detailScrollOffset,
      rightW,
      detailViewportH,
      selectedEntry,
      inventory,
      player,
      actionEnabled,
    );
    ctx.restore();

    if (this.detailMaxScroll > 0) {
      const track = {
        x: rightX + rightW - 9,
        y: listY + 10,
        w: 4,
        h: Math.max(24, detailViewportH - 20),
      };
      ctx.fillStyle = "rgba(115, 129, 154, 0.28)";
      ctx.fillRect(track.x, track.y, track.w, track.h);
      const thumbH = Math.max(24, Math.round((detailViewportH / detailsSpan) * track.h));
      const thumbTravel = Math.max(0, track.h - thumbH);
      const thumbY =
        track.y + (this.detailScrollOffset / Math.max(1, this.detailMaxScroll)) * thumbTravel;
      ctx.fillStyle = "rgba(255, 211, 120, 0.88)";
      ctx.fillRect(track.x, thumbY, track.w, thumbH);
    }

    this.craftButtonRect = {
      x: rightX + rightW - 220,
      y: craftButtonY,
      w: 196,
      h: PANEL.buttonHeight,
    };
    this.drawButton(
      ctx,
      this.craftButtonRect,
      selectedEntry.kind === "scrap" ? "Scrap Item" : "Craft Item",
      actionEnabled,
      "wide",
    );

    ctx.restore();
  }

  private getPanelBounds(
    canvasWidth: number,
    canvasHeight: number,
  ): PanelRect {
    const panelH = Math.min(PANEL.height, canvasHeight - PANEL.padding * 2);
    return {
      x: Math.floor((canvasWidth - PANEL.width) / 2),
      y: Math.floor((canvasHeight - panelH) / 2),
      w: PANEL.width,
      h: panelH,
    };
  }

  /** Pixel height of the detail block from its top `y` through the last status line (matches `renderDetails`). */
  private getDetailsInnerHeight(entry: CraftingEntry): number {
    if (entry.kind === "recipe") {
      const n = entry.recipe.components.length;
      return 225 + 22 * n;
    }
    const m = entry.outputs.components.length;
    return 256 + 22 * m;
  }

  private contains(rect: PanelRect, x: number, y: number): boolean {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  private getStationProfessions(stationId: CraftingStationId): ProfessionId[] {
    return PROFESSION_IDS.filter((professionId) => PROFESSION_DEFINITIONS[professionId].station === stationId);
  }

  private getStationFilters(stationId: CraftingStationId): FilterValue[] {
    const stationProfessions = this.getStationProfessions(stationId);
    if (stationProfessions.length <= 1) {
      return stationProfessions;
    }
    return ["all", ...stationProfessions];
  }

  private buildEntries(inventory: (InventoryItem | null)[]): CraftingEntry[] {
    if (!this.stationId) {
      return [];
    }

    const entries: CraftingEntry[] = [];
    for (const recipe of getRecipesForStation(this.stationId)) {
      if (this.activeFilter !== "all" && recipe.profession !== this.activeFilter) {
        continue;
      }
      entries.push({
        key: recipe.id,
        kind: "recipe",
        recipe,
      });
    }

    if (this.stationId === "workbench" && (this.activeFilter === "all" || this.activeFilter === "scrapping")) {
      inventory.forEach((item, slotIndex) => {
        if (!item) {
          return;
        }
        const outputs = getScrapOutputsForItem(item.itemType);
        if (!outputs) {
          return;
        }
        entries.push({
          key: `scrap:${slotIndex}`,
          kind: "scrap",
          slotIndex,
          item,
          outputs,
        });
      });
    }

    const getEntrySortLevel = (entry: CraftingEntry): number => {
      if (entry.kind === "recipe") {
        return entry.recipe.unlockLevel;
      }
      // Scrap actions have no profession-gated unlock in the current UI, so keep them in
      // the lowest bucket instead of inheriting the source item's recipe level.
      return 1;
    };

    const getEntrySortLabel = (entry: CraftingEntry): string => {
      return entry.kind === "recipe"
        ? formatDisplayName(entry.recipe.result.type)
        : `Scrap ${formatDisplayName(entry.item.itemType)}`;
    };

    return entries.sort((left, right) => {
      const leftLevel = getEntrySortLevel(left);
      const rightLevel = getEntrySortLevel(right);
      if (leftLevel !== rightLevel) {
        return leftLevel - rightLevel;
      }
      return getEntrySortLabel(left).localeCompare(getEntrySortLabel(right));
    });
  }

  private ensureSelectedEntry(entries: CraftingEntry[]): CraftingEntry | null {
    if (entries.length === 0) {
      this.selectedEntryKey = null;
      this.detailScrollOffset = 0;
      return null;
    }

    const current =
      (this.selectedEntryKey && entries.find((entry) => entry.key === this.selectedEntryKey)) ?? null;
    if (current) {
      return current;
    }

    if (this.selectedEntryKey !== entries[0]!.key) {
      this.detailScrollOffset = 0;
    }
    this.selectedEntryKey = entries[0]!.key;
    return entries[0]!;
  }

  private canExecuteEntry(
    entry: CraftingEntry,
    inventory: (InventoryItem | null)[],
    player: PlayerClient,
  ): boolean {
    if (entry.kind === "scrap") {
      return true;
    }

    return (
      isRecipeUnlocked(entry.recipe, (professionId) => player.getProfessionLevel(professionId)) &&
      recipeCanBeCrafted(entry.recipe, compactInventory(inventory))
    );
  }

  private executeSelectedEntry(): void {
    if (!this.stationId || this.stationEntityId === null || !this.selectedEntryKey) {
      return;
    }

    const player = this.options.getPlayer();
    if (!player) {
      return;
    }

    const inventory = player.getInventory();
    const entries = this.buildEntries(inventory);
    const selectedEntry = this.ensureSelectedEntry(entries);
    if (!selectedEntry) {
      return;
    }

    if (!this.canExecuteEntry(selectedEntry, inventory, player)) {
      return;
    }

    const recipeId =
      selectedEntry.kind === "scrap" ? `scrap:${selectedEntry.slotIndex}` : selectedEntry.recipe.id;
    this.options.onCraft({
      recipeId,
      stationEntityId: this.stationEntityId,
    });
  }

  private drawEntryCard(
    ctx: CanvasRenderingContext2D,
    rect: PanelRect,
    entry: CraftingEntry,
    inventory: (InventoryItem | null)[],
    player: PlayerClient,
    selected: boolean,
  ): void {
    const enabled = this.canExecuteEntry(entry, inventory, player);
    const professionLocked =
      entry.kind === "recipe" &&
      !isRecipeUnlocked(entry.recipe, (professionId) => player.getProfessionLevel(professionId));
    const missingMaterials = entry.kind === "recipe" && !professionLocked && !enabled;

    if (professionLocked) {
      ctx.fillStyle = selected
        ? "rgba(44, 50, 60, 0.96)"
        : "rgba(22, 26, 32, 0.94)";
      ctx.strokeStyle = selected ? "rgba(200, 175, 115, 0.65)" : "rgba(88, 98, 112, 0.45)";
    } else if (missingMaterials) {
      ctx.fillStyle = selected
        ? "rgba(108, 64, 72, 0.96)"
        : "rgba(56, 31, 37, 0.94)";
      ctx.strokeStyle = selected ? "rgba(255, 179, 179, 0.92)" : "rgba(194, 110, 110, 0.55)";
    } else {
      ctx.fillStyle = selected
        ? "rgba(62, 84, 116, 0.95)"
        : "rgba(30, 38, 53, 0.94)";
      ctx.strokeStyle = selected ? "rgba(255, 211, 120, 0.95)" : "rgba(110, 126, 148, 0.5)";
    }
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    const iconItemType = entry.kind === "recipe" ? entry.recipe.result.type : entry.item.itemType;
    if (professionLocked) {
      ctx.save();
      ctx.filter = "grayscale(1) brightness(0.72)";
    }
    this.drawItemIcon(ctx, iconItemType, rect.x + 10, rect.y + 8, 44);
    if (professionLocked) {
      ctx.restore();
    }

    ctx.font = "bold 14px Arial";
    ctx.fillStyle = professionLocked ? "#8f9bab" : missingMaterials ? "#ffb6b6" : "#f4f7fb";
    ctx.textAlign = "left";
    ctx.fillText(
      entry.kind === "recipe" ? formatDisplayName(entry.recipe.result.type) : `Scrap ${formatDisplayName(entry.item.itemType)}`,
      rect.x + 62,
      rect.y + 21,
    );

    ctx.font = "12px Arial";
    ctx.fillStyle = professionLocked ? "#6c788a" : missingMaterials ? "#f0b0b0" : "#b8c6d9";
    if (entry.kind === "recipe") {
      const status = enabled
        ? "Ready to craft"
        : player.getProfessionLevel(entry.recipe.profession!) < entry.recipe.unlockLevel
          ? `Locked until ${getProfessionLabel(entry.recipe.profession!)} Lv ${entry.recipe.unlockLevel}`
          : "Missing materials";
      ctx.fillText(status, rect.x + 62, rect.y + 40);
      ctx.fillText(getProfessionLabel(entry.recipe.profession!), rect.x + 62, rect.y + 56);
    } else {
      ctx.fillText(`Outputs: ${summarizeComponents(entry.outputs.components)}`, rect.x + 62, rect.y + 40);
      ctx.fillText(entry.outputs.hasRareOutput ? "Rare salvage chance included" : "Basic salvage", rect.x + 62, rect.y + 56);
    }
  }

  private renderDetails(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    entry: CraftingEntry,
    inventory: (InventoryItem | null)[],
    player: PlayerClient,
    actionEnabled: boolean,
  ): void {
    const titleItemType = entry.kind === "recipe" ? entry.recipe.result.type : entry.item.itemType;
    this.drawItemIcon(ctx, titleItemType, x + 20, y + 20, 72);

    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#f5f7fb";
    ctx.fillText(
      entry.kind === "recipe"
        ? formatDisplayName(entry.recipe.result.type)
        : `Scrap ${formatDisplayName(entry.item.itemType)}`,
      x + 108,
      y + 36,
    );

    ctx.font = "13px Arial";
    ctx.fillStyle = "#a9b7cb";
    if (entry.kind === "recipe") {
      const professionLabel = entry.recipe.profession
        ? getProfessionLabel(entry.recipe.profession)
        : "Unassigned";
      ctx.fillText(
        `${professionLabel} • Unlock Lv ${entry.recipe.unlockLevel} • ${CRAFTING_STATION_LABELS[entry.recipe.station!]}`,
        x + 108,
        y + 60,
      );
      ctx.fillText(`Craft grants ${entry.recipe.professionXp} profession XP`, x + 108, y + 80);
    } else {
      ctx.fillText("Scrapping • Workbench", x + 108, y + 60);
      ctx.fillText(
        entry.outputs.hasRareOutput ? "Produces rare salvage as part of the breakdown." : "Produces basic salvage parts.",
        x + 108,
        y + 80,
      );
    }

    let currentY = y + 126;
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = "#f0f4fa";
    ctx.fillText(entry.kind === "recipe" ? "Required Ingredients" : "Consumes", x + 20, currentY);
    currentY += 26;

    ctx.font = "13px Arial";
    if (entry.kind === "recipe") {
      for (const component of entry.recipe.components) {
        const required = component.count ?? 1;
        const owned = countItemInInventory(inventory, component.type);
        ctx.fillStyle = owned >= required ? "#bde9c2" : "#f1a4a4";
        ctx.fillText(
          `${formatDisplayName(component.type)}   ${owned}/${required}`,
          x + 28,
          currentY,
        );
        currentY += 22;
      }
    } else {
      ctx.fillStyle = "#d9e4f2";
      ctx.fillText(`1x ${formatDisplayName(entry.item.itemType)}`, x + 28, currentY);
      currentY += 30;
      ctx.font = "bold 15px Arial";
      ctx.fillStyle = "#f0f4fa";
      ctx.fillText("Salvage Output", x + 20, currentY);
      currentY += 26;
      ctx.font = "13px Arial";
      for (const component of entry.outputs.components) {
        ctx.fillStyle = "#bde9c2";
        ctx.fillText(
          `${component.count ?? 1}x ${formatDisplayName(component.type)}`,
          x + 28,
          currentY,
        );
        currentY += 22;
      }
    }

    currentY += 8;
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = "#f0f4fa";
    ctx.fillText(entry.kind === "recipe" ? "Result" : "Notes", x + 20, currentY);
    currentY += 26;
    ctx.font = "13px Arial";

    if (entry.kind === "recipe") {
      ctx.fillStyle = "#d9e4f2";
      ctx.fillText(
        `${entry.recipe.result.count ?? 1}x ${formatDisplayName(entry.recipe.result.type)}`,
        x + 28,
        currentY,
      );
      currentY += 24;

      const professionLevel = entry.recipe.profession
        ? player.getProfessionLevel(entry.recipe.profession)
        : entry.recipe.unlockLevel;
      const locked = professionLevel < entry.recipe.unlockLevel;
      ctx.fillStyle = locked ? "#f0b0b0" : actionEnabled ? "#bde9c2" : "#f3d58d";
      ctx.fillText(
        locked
          ? `Requires ${getProfessionLabel(entry.recipe.profession!)} level ${entry.recipe.unlockLevel}.`
          : actionEnabled
            ? "All requirements met."
            : "You need more ingredients to craft this recipe.",
        x + 28,
        currentY,
      );
    } else {
      ctx.fillStyle = "#d9e4f2";
      ctx.fillText(
        "Scrapping destroys the source item and returns base materials immediately.",
        x + 28,
        currentY,
      );
    }
  }

  private drawItemIcon(
    ctx: CanvasRenderingContext2D,
    itemType: string,
    x: number,
    y: number,
    size: number,
  ): void {
    ctx.fillStyle = "rgba(20, 28, 39, 0.95)";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "rgba(123, 138, 165, 0.55)";
    ctx.strokeRect(x, y, size, size);

    const image = this.assetManager.get(
      getItemAssetKey({
        itemType: itemType as ItemType,
      }),
    );
    if (!image) {
      return;
    }

    const pad = Math.max(4, Math.floor(size * 0.16));
    ctx.drawImage(image, x + pad, y + pad, size - pad * 2, size - pad * 2);
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    rect: PanelRect,
    label: string,
    enabled: boolean,
    variant: "compact" | "wide",
  ): void {
    ctx.fillStyle = enabled ? "rgba(255, 199, 102, 0.95)" : "rgba(83, 96, 117, 0.88)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = enabled ? "rgba(255, 235, 184, 0.95)" : "rgba(125, 139, 160, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.font = variant === "compact" ? "bold 14px Arial" : "bold 17px Arial";
    ctx.fillStyle = enabled ? "#1c2734" : "#d0d7e4";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  private ensureStationAvailable(gameState: GameState): boolean {
    const player = this.options.getPlayer();
    const stationEntityId = this.stationEntityId;
    if (!player || stationEntityId === null) {
      this.close();
      return false;
    }

    const stationEntity = getEntityById(gameState, stationEntityId);
    if (!stationEntity || !stationEntity.hasExt(ClientPositionable) || !player.hasExt(ClientPositionable)) {
      this.close();
      return false;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();
    const stationPos = stationEntity.getExt(ClientPositionable).getCenterPosition();
    if (distance(playerPos, stationPos) > getConfig().player.MAX_INTERACT_RADIUS) {
      this.close();
      return false;
    }

    return true;
  }

  private setupWheelHandler(): void {
    this.removeWheelHandler();
    const canvas = this.options.getCanvas();
    if (!canvas) {
      return;
    }

    this.wheelHandler = (event: WheelEvent) => {
      if (!this.isVisible()) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      if (this.panelBounds && !this.contains(this.panelBounds, x, y)) {
        return;
      }

      if (this.detailViewportRect && this.contains(this.detailViewportRect, x, y) && this.detailMaxScroll > 0) {
        event.preventDefault();
        this.detailScrollOffset = clamp(
          this.detailScrollOffset + event.deltaY,
          0,
          this.detailMaxScroll,
        );
        return;
      }

      if (this.listMaxScroll > 0) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? 1 : -1;
        this.scrollOffset = clamp(this.scrollOffset + delta, 0, this.listMaxScroll);
      }
    };

    canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
  }

  private removeWheelHandler(): void {
    if (!this.wheelHandler) {
      return;
    }

    const canvas = this.options.getCanvas();
    if (canvas) {
      canvas.removeEventListener("wheel", this.wheelHandler);
    }
    this.wheelHandler = null;
  }
}
