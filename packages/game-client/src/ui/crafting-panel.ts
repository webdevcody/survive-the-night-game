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

  private panelBounds: PanelRect | null = null;
  private closeButtonRect: PanelRect | null = null;
  private craftButtonRect: PanelRect | null = null;
  private filterRects: Array<{ rect: PanelRect; filter: FilterValue }> = [];
  private entryRects: Array<{ rect: PanelRect; key: string }> = [];
  private wheelHandler: ((e: WheelEvent) => void) | null = null;

  constructor(
    private assetManager: AssetManager,
    private options: CraftingPanelOptions,
  ) {}

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
    this.panelBounds = null;
    this.closeButtonRect = null;
    this.craftButtonRect = null;
    this.filterRects = [];
    this.entryRects = [];
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
        this.selectedEntryKey = null;
        return true;
      }
    }

    for (const entryRegion of this.entryRects) {
      if (this.contains(entryRegion.rect, x, y)) {
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

    const listY = leftY + PANEL.headerHeight + PANEL.filterHeight + PANEL.filterGap * 2;
    const listH = leftH - PANEL.headerHeight - PANEL.filterHeight - PANEL.filterGap * 2;
    const visibleRows = Math.max(
      1,
      Math.floor((listH + PANEL.entryGap) / (PANEL.entryHeight + PANEL.entryGap)),
    );
    const maxScroll = Math.max(0, entries.length - visibleRows);
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
    for (const filter of filters) {
      const label = filter === "all" ? "All" : getProfessionLabel(filter);
      const width = Math.max(64, label.length * 8 + 24);
      const rect = { x: filterX, y: filterY, w: width, h: PANEL.filterHeight };
      this.filterRects.push({ rect, filter });
      const active = this.activeFilter === filter;
      ctx.fillStyle = active ? "rgba(255, 203, 102, 0.92)" : "rgba(46, 58, 78, 0.95)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = active ? "rgba(255, 232, 182, 0.95)" : "rgba(123, 138, 165, 0.6)";
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.font = "bold 12px Arial";
      ctx.fillStyle = active ? "#1b2532" : "#d9e4f2";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
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
      ctx.fillText(
        `Showing ${this.scrollOffset + 1}-${Math.min(entries.length, this.scrollOffset + visibleRows)} of ${entries.length}`,
        leftX + 10,
        listY + listH - 10,
      );
    }

    ctx.fillStyle = "rgba(16, 22, 32, 0.82)";
    ctx.fillRect(rightX, leftY, rightW, leftH);
    ctx.strokeStyle = "rgba(115, 129, 154, 0.55)";
    ctx.strokeRect(rightX, leftY, rightW, leftH);

    if (!selectedEntry) {
      ctx.font = "16px Arial";
      ctx.fillStyle = "#d2d9e6";
      ctx.fillText("No recipes available at this station yet.", rightX + 20, leftY + 36);
      ctx.restore();
      return;
    }

    const actionEnabled = this.canExecuteEntry(selectedEntry, inventory, player);
    this.renderDetails(
      ctx,
      rightX,
      leftY,
      rightW,
      leftH,
      selectedEntry,
      inventory,
      player,
      actionEnabled,
    );

    this.craftButtonRect = {
      x: rightX + rightW - 220,
      y: leftY + leftH - PANEL.buttonHeight - 18,
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

  private getPanelBounds(canvasWidth: number, canvasHeight: number): PanelRect {
    return {
      x: Math.floor((canvasWidth - PANEL.width) / 2),
      y: Math.floor((canvasHeight - PANEL.height) / 2),
      w: PANEL.width,
      h: PANEL.height,
    };
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

    return entries.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === "recipe" ? -1 : 1;
      }
      if (left.kind === "recipe" && right.kind === "recipe") {
        if (left.recipe.unlockLevel !== right.recipe.unlockLevel) {
          return left.recipe.unlockLevel - right.recipe.unlockLevel;
        }
        return formatDisplayName(left.recipe.result.type).localeCompare(
          formatDisplayName(right.recipe.result.type),
        );
      }
      return formatDisplayName((left as ScrapEntry).item.itemType).localeCompare(
        formatDisplayName((right as ScrapEntry).item.itemType),
      );
    });
  }

  private ensureSelectedEntry(entries: CraftingEntry[]): CraftingEntry | null {
    if (entries.length === 0) {
      this.selectedEntryKey = null;
      return null;
    }

    const current =
      (this.selectedEntryKey && entries.find((entry) => entry.key === this.selectedEntryKey)) ?? null;
    if (current) {
      return current;
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
    ctx.fillStyle = selected
      ? "rgba(62, 84, 116, 0.95)"
      : "rgba(30, 38, 53, 0.94)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = selected ? "rgba(255, 211, 120, 0.95)" : "rgba(110, 126, 148, 0.5)";
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    const iconItemType = entry.kind === "recipe" ? entry.recipe.result.type : entry.item.itemType;
    this.drawItemIcon(ctx, iconItemType, rect.x + 10, rect.y + 8, 44);

    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#f4f7fb";
    ctx.textAlign = "left";
    ctx.fillText(
      entry.kind === "recipe" ? formatDisplayName(entry.recipe.result.type) : `Scrap ${formatDisplayName(entry.item.itemType)}`,
      rect.x + 62,
      rect.y + 21,
    );

    ctx.font = "12px Arial";
    ctx.fillStyle = "#b8c6d9";
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

      if (this.panelBounds) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        if (!this.contains(this.panelBounds, x, y)) {
          return;
        }
      }

      event.preventDefault();
      const delta = event.deltaY > 0 ? 1 : -1;
      this.scrollOffset = Math.max(0, this.scrollOffset + delta);
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
