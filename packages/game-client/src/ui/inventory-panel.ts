import { GameState } from "@/state";
import { InputManager } from "@/managers/input";
import { Z_INDEX } from "@shared/map";
import { Renderable } from "@/entities/util";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import {
  InventoryItem,
  isWeapon,
  getWeaponAmmoType,
} from "../../../game-shared/src/util/inventory";
import { getConfig } from "@shared/config";
import { calculateHudScale } from "@/util/hud-scale";
import { formatDisplayName } from "@/util/format";

const INVENTORY_PANEL_SETTINGS = {
  columns: 8,
  rows: 2,
  slotSize: 60,
  slotsGap: 8,
  padding: {
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
  },
  containerBackground: "rgba(0, 0, 0, 0.85)",
  slotBackground: "rgba(40, 40, 40, 0.9)",
  borderColor: "rgba(255, 255, 255, 0.5)",
  activeBorderColor: "rgba(255, 255, 255, 0.9)",
  borderWidth: 2,
  headerHeight: 32,
  headerFont: "bold 18px Arial",
  headerText: "Inventory [X]",
};

const DRAG_START_THRESHOLD = 12;
const DRAG_START_THRESHOLD_SQUARED = DRAG_START_THRESHOLD * DRAG_START_THRESHOLD;

type PanelMetrics = {
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  slotsLeft: number;
  slotsTop: number;
  slotSize: number;
  slotsGap: number;
  columns: number;
  rows: number;
};

type DragState = {
  slotIndex: number; // Actual inventory index (10-25)
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  targetSlotIndex: number | null;
};

export class InventoryPanelUI implements Renderable {
  private assetManager: AssetManager;
  private inputManager: InputManager;
  private getInventory: () => InventoryItem[];
  private sendSwapItems: (fromSlotIndex: number, toSlotIndex: number) => void;
  private isOpen: boolean = false;
  private hoveredSlot: number | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private dragState: DragState | null = null;
  private lastCanvasWidth: number = 0;
  private lastCanvasHeight: number = 0;

  // External drag state (from hotbar)
  private externalDragSlot: number | null = null;
  private externalDragX: number = 0;
  private externalDragY: number = 0;

  constructor(
    assetManager: AssetManager,
    inputManager: InputManager,
    getInventory: () => InventoryItem[],
    sendSwapItems: (fromSlotIndex: number, toSlotIndex: number) => void
  ) {
    this.assetManager = assetManager;
    this.inputManager = inputManager;
    this.getInventory = getInventory;
    this.sendSwapItems = sendSwapItems;
  }

  public toggle(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.dragState = null;
      this.hoveredSlot = null;
    }
  }

  public open(): void {
    this.isOpen = true;
  }

  public close(): void {
    this.isOpen = false;
    this.dragState = null;
    this.hoveredSlot = null;
  }

  public isVisible(): boolean {
    return this.isOpen;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isOpen) return;

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const settings = INVENTORY_PANEL_SETTINGS;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Scale dimensions
    const scaledSlotSize = settings.slotSize * hudScale;
    const scaledSlotsGap = settings.slotsGap * hudScale;
    const scaledPadding = {
      top: settings.padding.top * hudScale,
      bottom: settings.padding.bottom * hudScale,
      left: settings.padding.left * hudScale,
      right: settings.padding.right * hudScale,
    };
    const scaledBorderWidth = settings.borderWidth * hudScale;
    const scaledHeaderHeight = settings.headerHeight * hudScale;

    // Calculate panel dimensions
    const panelWidth =
      settings.columns * scaledSlotSize +
      (settings.columns - 1) * scaledSlotsGap +
      scaledPadding.left +
      scaledPadding.right;
    const panelHeight =
      settings.rows * scaledSlotSize +
      (settings.rows - 1) * scaledSlotsGap +
      scaledPadding.top +
      scaledPadding.bottom +
      scaledHeaderHeight;

    // Center panel on screen
    const panelX = (canvasWidth - panelWidth) / 2;
    const panelY = (canvasHeight - panelHeight) / 2 - 50 * hudScale; // Slightly above center

    // Draw panel background
    ctx.fillStyle = settings.containerBackground;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Draw panel border
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = scaledBorderWidth;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw header
    const headerFontSize = 18 * hudScale;
    ctx.font = `bold ${headerFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(
      settings.headerText,
      panelX + panelWidth / 2,
      panelY + scaledHeaderHeight / 2 + headerFontSize / 3
    );

    // Draw header separator
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = 1 * hudScale;
    ctx.beginPath();
    ctx.moveTo(panelX, panelY + scaledHeaderHeight);
    ctx.lineTo(panelX + panelWidth, panelY + scaledHeaderHeight);
    ctx.stroke();

    const slotsLeft = panelX + scaledPadding.left;
    const slotsTop = panelY + scaledHeaderHeight + scaledPadding.top;
    const items = this.getInventory();
    const dragState = this.dragState;
    const isDragging = !!dragState?.isDragging;
    const draggingSlotIndex = isDragging ? dragState?.slotIndex ?? null : null;
    const targetSlotIndex = isDragging ? dragState?.targetSlotIndex ?? null : null;

    // Extended inventory starts at slot index 10
    const startSlotIndex = getConfig().player.HOTBAR_SLOTS;

    for (let row = 0; row < settings.rows; row++) {
      for (let col = 0; col < settings.columns; col++) {
        const localIndex = row * settings.columns + col;
        const slotIndex = startSlotIndex + localIndex; // Actual inventory index

        const slotLeft = slotsLeft + col * (scaledSlotSize + scaledSlotsGap);
        const slotTop = slotsTop + row * (scaledSlotSize + scaledSlotsGap);
        const slotBottom = slotTop + scaledSlotSize;
        const slotRight = slotLeft + scaledSlotSize;

        const isDraggingSlot = isDragging && draggingSlotIndex === slotIndex;
        const isTargetSlot =
          isDragging && targetSlotIndex === slotIndex && targetSlotIndex !== draggingSlotIndex;
        const isHovered = this.hoveredSlot === slotIndex && !isDragging;

        // Draw slot background
        ctx.fillStyle = settings.slotBackground;
        ctx.fillRect(slotLeft, slotTop, scaledSlotSize, scaledSlotSize);

        if (isDraggingSlot) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
          ctx.fillRect(slotLeft, slotTop, scaledSlotSize, scaledSlotSize);
        }

        // Draw slot border
        if (isTargetSlot) {
          ctx.strokeStyle = "rgba(100, 200, 255, 0.9)";
          ctx.lineWidth = scaledBorderWidth * 1.5;
          ctx.strokeRect(slotLeft, slotTop, scaledSlotSize, scaledSlotSize);
        } else if (isHovered) {
          ctx.strokeStyle = settings.activeBorderColor;
          ctx.lineWidth = scaledBorderWidth * 1.5;
          ctx.strokeRect(slotLeft, slotTop, scaledSlotSize, scaledSlotSize);
        } else {
          ctx.strokeStyle = settings.borderColor;
          ctx.lineWidth = scaledBorderWidth;
          ctx.strokeRect(slotLeft, slotTop, scaledSlotSize, scaledSlotSize);
        }

        const inventoryItem = items[slotIndex];
        const image = inventoryItem && this.assetManager.get(getItemAssetKey(inventoryItem));

        if (image) {
          const imagePadding = 8 * hudScale;
          if (isDraggingSlot) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.drawImage(
              image,
              slotLeft + imagePadding,
              slotTop + imagePadding,
              scaledSlotSize - imagePadding * 2,
              scaledSlotSize - imagePadding * 2
            );
            ctx.restore();
          } else {
            ctx.drawImage(
              image,
              slotLeft + imagePadding,
              slotTop + imagePadding,
              scaledSlotSize - imagePadding * 2,
              scaledSlotSize - imagePadding * 2
            );
          }
        }

        // Draw item count
        const slotFontSize = 20 * hudScale;
        if (inventoryItem?.state?.count) {
          ctx.font = `bold ${slotFontSize}px Arial`;
          ctx.textAlign = "right";
          ctx.fillStyle = "white";
          ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
          ctx.lineWidth = 3 * hudScale;
          const countX = slotRight - 6 * hudScale;
          const countY = slotBottom - 6 * hudScale;
          ctx.strokeText(`${inventoryItem.state.count}`, countX, countY);
          ctx.fillText(`${inventoryItem.state.count}`, countX, countY);
        }

        // Draw ammo count for weapons
        if (isWeapon(inventoryItem?.itemType)) {
          const ammoType = getWeaponAmmoType(inventoryItem.itemType);
          if (ammoType) {
            const ammoItem = this.getInventory().find(
              (item) => item?.itemType === getWeaponAmmoType(inventoryItem.itemType)
            );
            const ammoCount = ammoItem?.state?.count ?? 0;
            const ammoFontSize = slotFontSize * 0.7;
            ctx.font = `bold ${ammoFontSize}px Arial`;
            ctx.textAlign = "right";
            ctx.fillStyle = ammoCount > 0 ? "rgba(255, 255, 0, 1)" : "rgba(255, 100, 100, 1)";
            ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
            ctx.lineWidth = 2 * hudScale;
            const ammoX = slotRight - 6 * hudScale;
            const ammoY = slotBottom - 6 * hudScale;
            ctx.strokeText(`${ammoCount}`, ammoX, ammoY);
            ctx.fillText(`${ammoCount}`, ammoX, ammoY);
          }
        }
      }
    }

    this.renderDragPreview(ctx, scaledSlotSize);
    this.renderTooltip(ctx, scaledSlotSize);
    ctx.restore();
  }

  private renderTooltip(ctx: CanvasRenderingContext2D, scaledSlotSize: number): void {
    if (this.dragState?.isDragging || this.hoveredSlot === null) return;

    const items = this.getInventory();
    const hoveredItem = items[this.hoveredSlot];
    if (!hoveredItem) return;

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const metrics = this.getPanelMetrics(canvasWidth, canvasHeight);
    if (!metrics) return;

    const startSlotIndex = getConfig().player.HOTBAR_SLOTS;
    const localIndex = this.hoveredSlot - startSlotIndex;
    const row = Math.floor(localIndex / metrics.columns);
    const col = localIndex % metrics.columns;

    const slotLeft = metrics.slotsLeft + col * (metrics.slotSize + metrics.slotsGap);
    const slotTop = metrics.slotsTop + row * (metrics.slotSize + metrics.slotsGap);
    const slotCenterX = slotLeft + metrics.slotSize / 2;

    const itemName = formatDisplayName(hoveredItem.itemType);
    const tooltipFontSize = 18 * hudScale;
    ctx.font = `bold ${tooltipFontSize}px Arial`;
    ctx.textAlign = "center";
    const textMetrics = ctx.measureText(itemName);
    const textWidth = textMetrics.width;

    const tooltipPadding = 8 * hudScale;
    const tooltipWidth = textWidth + tooltipPadding * 2;
    const tooltipHeight = tooltipFontSize + tooltipPadding * 2;
    const tooltipX = slotCenterX - tooltipWidth / 2;
    const tooltipY = slotTop - tooltipHeight - 8 * hudScale;

    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2 * hudScale;
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    ctx.fillStyle = "white";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 3 * hudScale;
    const textY = tooltipY + tooltipPadding + tooltipFontSize - 4 * hudScale;
    ctx.strokeText(itemName, slotCenterX, textY);
    ctx.fillText(itemName, slotCenterX, textY);
  }

  private renderDragPreview(ctx: CanvasRenderingContext2D, scaledSlotSize: number): void {
    if (!this.dragState?.isDragging) return;

    const items = this.getInventory();
    const draggedItem = items[this.dragState.slotIndex];
    if (!draggedItem) return;

    const image = this.assetManager.get(getItemAssetKey(draggedItem));
    if (!image) return;

    const previewSize = scaledSlotSize * 0.85;
    const drawX = this.dragState.currentX - previewSize / 2;
    const drawY = this.dragState.currentY - previewSize / 2;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(image, drawX, drawY, previewSize, previewSize);
    ctx.restore();
  }

  public getZIndex(): number {
    return Z_INDEX.UI + 10; // Above hotbar
  }

  public isHovering(): boolean {
    return this.isOpen && this.hoveredSlot !== null;
  }

  public updateMousePosition(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.isOpen) return;

    this.mouseX = x;
    this.mouseY = y;
    this.lastCanvasWidth = canvasWidth;
    this.lastCanvasHeight = canvasHeight;

    if (this.dragState) {
      this.dragState.currentX = x;
      this.dragState.currentY = y;
      if (this.dragState.isDragging) {
        const metrics = this.getPanelMetrics(canvasWidth, canvasHeight);
        if (metrics) {
          this.dragState.targetSlotIndex = this.getSlotIndexAtPosition(x, y, metrics);
        }
        this.hoveredSlot = null;
        return;
      }
    }

    const metrics = this.getPanelMetrics(canvasWidth, canvasHeight);
    if (!metrics) {
      this.hoveredSlot = null;
      return;
    }

    this.hoveredSlot = this.getSlotIndexAtPosition(x, y, metrics);
  }

  public handleClick(x: number, y: number, canvasWidth: number, canvasHeight: number, shiftHeld: boolean = false): boolean {
    if (!this.isOpen) return false;

    this.lastCanvasWidth = canvasWidth;
    this.lastCanvasHeight = canvasHeight;

    const metrics = this.getPanelMetrics(canvasWidth, canvasHeight);
    if (!metrics) {
      this.dragState = null;
      return false;
    }

    // Check if click is inside panel
    if (!this.isPointInsidePanel(x, y, metrics)) {
      this.dragState = null;
      return false;
    }

    const slotIndex = this.getSlotIndexAtPosition(x, y, metrics);
    if (slotIndex === null) {
      this.dragState = null;
      return true; // Clicked inside panel but not on slot
    }

    // Shift+click: quick move to hotbar
    if (shiftHeld) {
      const items = this.getInventory();
      const item = items[slotIndex];
      if (item) {
        const targetSlot = this.findTargetSlotInHotbar(slotIndex, items);
        if (targetSlot !== null) {
          this.sendSwapItems(slotIndex, targetSlot);
          return true;
        }
      }
    }

    this.prepareDragState(slotIndex, x, y);
    return true;
  }

  // Find target slot in hotbar for quick move
  private findTargetSlotInHotbar(fromSlot: number, items: InventoryItem[]): number | null {
    const hotbarSlots = getConfig().player.HOTBAR_SLOTS;
    
    // Preferred slot: corresponding position in hotbar (slot 10 -> 0, slot 11 -> 1, etc.)
    const preferredSlot = fromSlot - hotbarSlots;
    
    // If preferred slot is valid and empty, use it
    if (preferredSlot >= 0 && preferredSlot < hotbarSlots && !items[preferredSlot]) {
      return preferredSlot;
    }
    
    // Otherwise find first empty slot in hotbar range
    for (let i = 0; i < hotbarSlots; i++) {
      if (!items[i]) {
        return i;
      }
    }
    
    // No empty slot, swap with preferred slot anyway (if valid)
    if (preferredSlot >= 0 && preferredSlot < hotbarSlots) {
      return preferredSlot;
    }
    
    // Fallback to first hotbar slot
    return 0;
  }

  public handleMouseMove(x: number, y: number, canvasWidth?: number, canvasHeight?: number): void {
    if (!this.isOpen) return;

    if (canvasWidth !== undefined && canvasHeight !== undefined) {
      this.lastCanvasWidth = canvasWidth;
      this.lastCanvasHeight = canvasHeight;
    }

    if (!this.dragState) return;

    this.dragState.currentX = x;
    this.dragState.currentY = y;

    if (!this.dragState.isDragging) {
      const dx = x - this.dragState.startX;
      const dy = y - this.dragState.startY;
      if (dx * dx + dy * dy >= DRAG_START_THRESHOLD_SQUARED) {
        this.dragState.isDragging = true;
        this.hoveredSlot = null;
      }
    }

    if (this.dragState.isDragging) {
      const metrics = this.getPanelMetrics(this.lastCanvasWidth, this.lastCanvasHeight);
      if (metrics) {
        this.dragState.targetSlotIndex = this.getSlotIndexAtPosition(x, y, metrics);
      }
    }
  }

  public handleMouseUp(x: number, y: number, canvasWidth?: number, canvasHeight?: number): void {
    if (!this.isOpen) return;

    if (canvasWidth !== undefined && canvasHeight !== undefined) {
      this.lastCanvasWidth = canvasWidth;
      this.lastCanvasHeight = canvasHeight;
    }

    const dragState = this.dragState;
    this.dragState = null;

    if (!dragState || !dragState.isDragging) return;

    const metrics = this.getPanelMetrics(this.lastCanvasWidth, this.lastCanvasHeight);
    if (!metrics) return;

    const targetSlotIndex = this.getSlotIndexAtPosition(x, y, metrics);
    if (targetSlotIndex !== null && targetSlotIndex !== dragState.slotIndex) {
      this.sendSwapItems(dragState.slotIndex, targetSlotIndex);
    }
  }

  // Handle external drag from hotbar ending on this panel
  public handleExternalDrop(fromSlotIndex: number, x: number, y: number): boolean {
    if (!this.isOpen) return false;

    const metrics = this.getPanelMetrics(this.lastCanvasWidth, this.lastCanvasHeight);
    if (!metrics) return false;

    if (!this.isPointInsidePanel(x, y, metrics)) return false;

    const targetSlotIndex = this.getSlotIndexAtPosition(x, y, metrics);
    if (targetSlotIndex !== null) {
      this.sendSwapItems(fromSlotIndex, targetSlotIndex);
      return true;
    }

    return false;
  }

  // Get target slot index for external drag preview
  public getTargetSlotForExternalDrag(x: number, y: number): number | null {
    if (!this.isOpen) return null;

    const metrics = this.getPanelMetrics(this.lastCanvasWidth, this.lastCanvasHeight);
    if (!metrics) return null;

    if (!this.isPointInsidePanel(x, y, metrics)) return null;

    return this.getSlotIndexAtPosition(x, y, metrics);
  }

  public setExternalDrag(slotIndex: number | null, x: number, y: number): void {
    this.externalDragSlot = slotIndex;
    this.externalDragX = x;
    this.externalDragY = y;
  }

  public isDragging(): boolean {
    return this.dragState?.isDragging ?? false;
  }

  public getDragState(): DragState | null {
    return this.dragState;
  }

  private prepareDragState(slotIndex: number, startX: number, startY: number): void {
    const items = this.getInventory();
    const item = items[slotIndex];
    if (!item) {
      this.dragState = null;
      return;
    }

    this.dragState = {
      slotIndex,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      isDragging: false,
      targetSlotIndex: null,
    };
  }

  private getPanelMetrics(canvasWidth?: number, canvasHeight?: number): PanelMetrics | null {
    const width = canvasWidth ?? this.lastCanvasWidth;
    const height = canvasHeight ?? this.lastCanvasHeight;

    if (!width || !height) return null;

    const hudScale = calculateHudScale(width, height);
    const settings = INVENTORY_PANEL_SETTINGS;

    const scaledSlotSize = settings.slotSize * hudScale;
    const scaledSlotsGap = settings.slotsGap * hudScale;
    const scaledPadding = {
      top: settings.padding.top * hudScale,
      bottom: settings.padding.bottom * hudScale,
      left: settings.padding.left * hudScale,
      right: settings.padding.right * hudScale,
    };
    const scaledHeaderHeight = settings.headerHeight * hudScale;

    const panelWidth =
      settings.columns * scaledSlotSize +
      (settings.columns - 1) * scaledSlotsGap +
      scaledPadding.left +
      scaledPadding.right;
    const panelHeight =
      settings.rows * scaledSlotSize +
      (settings.rows - 1) * scaledSlotsGap +
      scaledPadding.top +
      scaledPadding.bottom +
      scaledHeaderHeight;

    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2 - 50 * hudScale;

    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      slotsLeft: panelX + scaledPadding.left,
      slotsTop: panelY + scaledHeaderHeight + scaledPadding.top,
      slotSize: scaledSlotSize,
      slotsGap: scaledSlotsGap,
      columns: settings.columns,
      rows: settings.rows,
    };
  }

  private getSlotIndexAtPosition(x: number, y: number, metrics: PanelMetrics): number | null {
    const startSlotIndex = getConfig().player.HOTBAR_SLOTS;

    for (let row = 0; row < metrics.rows; row++) {
      for (let col = 0; col < metrics.columns; col++) {
        const slotLeft = metrics.slotsLeft + col * (metrics.slotSize + metrics.slotsGap);
        const slotTop = metrics.slotsTop + row * (metrics.slotSize + metrics.slotsGap);
        const slotRight = slotLeft + metrics.slotSize;
        const slotBottom = slotTop + metrics.slotSize;

        if (x >= slotLeft && x <= slotRight && y >= slotTop && y <= slotBottom) {
          return startSlotIndex + row * metrics.columns + col;
        }
      }
    }

    return null;
  }

  private isPointInsidePanel(x: number, y: number, metrics: PanelMetrics): boolean {
    return (
      x >= metrics.panelX &&
      x <= metrics.panelX + metrics.panelWidth &&
      y >= metrics.panelY &&
      y <= metrics.panelY + metrics.panelHeight
    );
  }
}
