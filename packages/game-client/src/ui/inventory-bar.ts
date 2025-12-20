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
import { HeartsPanel } from "./panels/hearts-panel";
import { StaminaPanel } from "./panels/stamina-panel";
import { calculateHudScale } from "@/util/hud-scale";
import { formatDisplayName } from "@/util/format";
import { distance } from "@shared/util/physics";
import Vector2 from "@shared/util/vector2";

const HOTBAR_SETTINGS = {
  Inventory: {
    screenMarginBottom: 32,
    padding: {
      bottom: 12,
      left: 12,
      right: 12,
      top: 12,
    },
    slotsGap: 8,
    slotSize: 60, // Reduced from 70 (was 96 originally)
    containerBackground: "rgba(0, 0, 0, 0.8)",
    slotBackground: "rgba(40, 40, 40, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    activeBorderColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 2,
    activeBorderWidth: 3,
  },
  Hearts: {
    marginBottom: 12,
    heartSize: 28, // Reduced from 32
    heartGap: 3,
    font: "28px Arial", // Reduced from 32px
  },
  StaminaBar: {
    marginBottom: 6,
    width: 180, // Reduced from 200
    height: 20, // Reduced from 24
    padding: 6, // Reduced from 8
    iconSize: 28, // Reduced from 32
    iconGap: 6, // Reduced from 8
    font: "28px Arial", // Reduced from 32px
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    barBackgroundColor: "rgba(40, 40, 40, 0.9)",
    barColor: "rgba(255, 255, 100, 0.9)",
    borderWidth: 2,
  },
  CoinCounter: {
    marginBottom: 6,
    padding: 6, // Reduced from 8
    background: "rgba(0, 0, 0, 0.7)",
    font: "20px Arial", // Reduced from 32px
    spriteSize: 20, // Reduced from 32
    iconGap: 6, // Reduced from 8
  },
};

const DRAG_START_THRESHOLD = 12;

type HotbarMetrics = {
  hotbarX: number;
  hotbarY: number;
  hotbarWidth: number;
  hotbarHeight: number;
  slotsLeft: number;
  slotsTop: number;
  slotSize: number;
  slotsGap: number;
  slotsNumber: number;
};

type DragState = {
  slotIndex: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  targetSlotIndex: number | null; // Slot being hovered over during drag
};

export class InventoryBarUI implements Renderable {
  private assetManager: AssetManager;
  private inputManager: InputManager;
  private getInventory: () => InventoryItem[];
  private sendDropItem: (slotIndex: number) => void;
  private sendSwapItems: (fromSlotIndex: number, toSlotIndex: number) => void;
  private heartsPanel: HeartsPanel;
  private staminaPanel: StaminaPanel;
  private hoveredSlot: number | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private dragState: DragState | null = null;
  private lastCanvasWidth: number = 0;
  private lastCanvasHeight: number = 0;

  public constructor(
    assetManager: AssetManager,
    inputManager: InputManager,
    getInventory: () => InventoryItem[],
    sendDropItem: (slotIndex: number) => void,
    sendSwapItems: (fromSlotIndex: number, toSlotIndex: number) => void
  ) {
    this.assetManager = assetManager;
    this.inputManager = inputManager;
    this.getInventory = getInventory;
    this.sendDropItem = sendDropItem;
    this.sendSwapItems = sendSwapItems;

    // Initialize panels with settings
    this.heartsPanel = new HeartsPanel({
      padding: 8,
      background: "rgba(0, 0, 0, 0.7)",
      borderColor: "rgba(255, 255, 255, 0.5)",
      borderWidth: 2,
      marginBottom: HOTBAR_SETTINGS.Hearts.marginBottom,
      heartSize: HOTBAR_SETTINGS.Hearts.heartSize,
      heartGap: HOTBAR_SETTINGS.Hearts.heartGap,
      font: HOTBAR_SETTINGS.Hearts.font,
      inventorySettings: HOTBAR_SETTINGS.Inventory,
    });

    this.staminaPanel = new StaminaPanel({
      padding: 8,
      background: HOTBAR_SETTINGS.StaminaBar.backgroundColor,
      borderColor: HOTBAR_SETTINGS.StaminaBar.borderColor,
      borderWidth: HOTBAR_SETTINGS.StaminaBar.borderWidth,
      marginBottom: HOTBAR_SETTINGS.StaminaBar.marginBottom,
      width: HOTBAR_SETTINGS.StaminaBar.width,
      height: HOTBAR_SETTINGS.StaminaBar.height,
      iconSize: HOTBAR_SETTINGS.StaminaBar.iconSize,
      iconGap: HOTBAR_SETTINGS.StaminaBar.iconGap,
      font: HOTBAR_SETTINGS.StaminaBar.font,
      barBackgroundColor: HOTBAR_SETTINGS.StaminaBar.barBackgroundColor,
      barColor: HOTBAR_SETTINGS.StaminaBar.barColor,
      inventorySettings: HOTBAR_SETTINGS.Inventory,
    });

    // Coins panel removed - coins are now displayed in the resources panel at the top
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.renderInventory(ctx, gameState);
    this.heartsPanel.render(ctx, gameState);
    this.staminaPanel.render(ctx, gameState);
    // Coins panel removed - coins are now displayed in the resources panel at the top
    this.renderTooltip(ctx, gameState);
  }

  /**
   * Render only the health and stamina bars (used for zombie players in infection mode)
   */
  public renderHealthAndStamina(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.heartsPanel.render(ctx, gameState);
    this.staminaPanel.render(ctx, gameState);
  }

  public isHovering(): boolean {
    return this.hoveredSlot !== null;
  }

  public getZIndex(): number {
    return Z_INDEX.UI;
  }

  public updateMousePosition(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.mouseX = x;
    this.mouseY = y;
    this.lastCanvasWidth = canvasWidth;
    this.lastCanvasHeight = canvasHeight;

    if (this.dragState) {
      this.dragState.currentX = x;
      this.dragState.currentY = y;
      if (this.dragState.isDragging) {
        // Track target slot during drag for visual feedback
        const metrics = this.getHotbarMetrics(canvasWidth, canvasHeight);
        if (metrics) {
          const targetSlot = this.getSlotIndexAtPosition(x, y, metrics);
          this.dragState.targetSlotIndex = targetSlot;
        } else {
          this.dragState.targetSlotIndex = null;
        }
        this.hoveredSlot = null;
        return;
      }
    }

    const metrics = this.getHotbarMetrics(canvasWidth, canvasHeight);
    if (!metrics) {
      this.hoveredSlot = null;
      return;
    }

    this.hoveredSlot = this.getSlotIndexAtPosition(x, y, metrics);
  }

  public handleClick(x: number, y: number, canvasWidth: number, canvasHeight: number, shiftHeld: boolean = false): boolean {
    this.lastCanvasWidth = canvasWidth;
    this.lastCanvasHeight = canvasHeight;

    const metrics = this.getHotbarMetrics(canvasWidth, canvasHeight);
    if (!metrics) {
      this.dragState = null;
      return false;
    }

    const slotIndex = this.getSlotIndexAtPosition(x, y, metrics);
    if (slotIndex === null) {
      this.dragState = null;
      return false; // Click was not on inventory
    }

    // Shift+click: quick move to inventory panel
    if (shiftHeld) {
      const items = this.getInventory();
      const item = items[slotIndex];
      if (item) {
        const targetSlot = this.findTargetSlotInInventory(slotIndex, items);
        if (targetSlot !== null) {
          this.sendSwapItems(slotIndex, targetSlot);
          return true;
        }
      }
    }

    // Click is on slot i, select it (convert to 1-indexed)
    this.inputManager.setInventorySlot(slotIndex + 1);
    this.prepareDragState(slotIndex, x, y);
    return true;
  }

  // Find target slot in extended inventory for quick move
  private findTargetSlotInInventory(fromSlot: number, items: InventoryItem[]): number | null {
    const hotbarSlots = getConfig().player.HOTBAR_SLOTS;
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    
    // Preferred slot: corresponding position in inventory (slot 0 -> 10, slot 1 -> 11, etc.)
    const preferredSlot = hotbarSlots + fromSlot;
    
    // If preferred slot is empty or within range, use it
    if (preferredSlot < maxSlots && !items[preferredSlot]) {
      return preferredSlot;
    }
    
    // Otherwise find first empty slot in inventory range
    for (let i = hotbarSlots; i < maxSlots; i++) {
      if (!items[i]) {
        return i;
      }
    }
    
    // No empty slot, swap with preferred slot anyway
    if (preferredSlot < maxSlots) {
      return preferredSlot;
    }
    
    return null;
  }

  public handleMouseMove(x: number, y: number, canvasWidth?: number, canvasHeight?: number): void {
    if (canvasWidth !== undefined && canvasHeight !== undefined) {
      this.lastCanvasWidth = canvasWidth;
      this.lastCanvasHeight = canvasHeight;
    }

    if (!this.dragState) {
      return;
    }

    this.dragState.currentX = x;
    this.dragState.currentY = y;

    if (!this.dragState.isDragging) {
      const startPos = new Vector2(this.dragState.startX, this.dragState.startY);
      const currentPos = new Vector2(x, y);
      const dist = distance(startPos, currentPos);
      if (dist >= DRAG_START_THRESHOLD) {
        this.dragState.isDragging = true;
        this.hoveredSlot = null;
      }
    }

    // Track target slot during drag
    if (this.dragState.isDragging) {
      const metrics = this.getHotbarMetrics(canvasWidth, canvasHeight);
      if (metrics) {
        const targetSlot = this.getSlotIndexAtPosition(x, y, metrics);
        this.dragState.targetSlotIndex = targetSlot;
      } else {
        this.dragState.targetSlotIndex = null;
      }
    }
  }

  public handleMouseUp(x: number, y: number, canvasWidth?: number, canvasHeight?: number): void {
    if (canvasWidth !== undefined && canvasHeight !== undefined) {
      this.lastCanvasWidth = canvasWidth;
      this.lastCanvasHeight = canvasHeight;
    }
    const metrics = this.getHotbarMetrics(canvasWidth, canvasHeight);
    const dragState = this.dragState;
    this.dragState = null;

    if (!dragState || !metrics) {
      return;
    }

    if (!dragState.isDragging) {
      return;
    }

    const isInsideHotbar = this.isPointInsideHotbar(x, y, metrics);
    if (isInsideHotbar) {
      // Check if we're over a different slot (can be empty or occupied)
      const targetSlotIndex = this.getSlotIndexAtPosition(x, y, metrics);
      if (targetSlotIndex !== null && targetSlotIndex !== dragState.slotIndex) {
        // Move/swap items between slots (works for both empty and occupied slots)
        this.swapSlots(dragState.slotIndex, targetSlotIndex);
      }
      // If targetSlotIndex is null or same as dragState.slotIndex, do nothing (cancel drag)
    } else {
      // Drop item outside hotbar
      this.dropSlot(dragState.slotIndex);
    }
  }

  private renderInventory(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

    // Scale inventory bar based on screen width for responsive design
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const settings = HOTBAR_SETTINGS.Inventory;
    const slotsNumber = getConfig().player.HOTBAR_SLOTS;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Scale all dimensions by HUD scale
    const scaledSlotSize = settings.slotSize * hudScale;
    const scaledSlotsGap = settings.slotsGap * hudScale;
    const scaledPadding = {
      left: settings.padding.left * hudScale,
      right: settings.padding.right * hudScale,
      top: settings.padding.top * hudScale,
      bottom: settings.padding.bottom * hudScale,
    };
    const scaledScreenMarginBottom = settings.screenMarginBottom * hudScale;
    const scaledBorderWidth = settings.borderWidth * hudScale;
    const scaledActiveBorderWidth = settings.activeBorderWidth * hudScale;

    const hotbarWidth =
      slotsNumber * scaledSlotSize +
      (slotsNumber - 1) * scaledSlotsGap +
      scaledPadding.left +
      scaledPadding.right;
    const hotbarHeight = scaledSlotSize + scaledPadding.top + scaledPadding.bottom;

    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - scaledScreenMarginBottom;

    // Draw container background
    ctx.fillStyle = settings.containerBackground;
    ctx.fillRect(hotbarX, hotbarY, hotbarWidth, hotbarHeight);

    // Draw container border
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = scaledBorderWidth;
    ctx.strokeRect(hotbarX, hotbarY, hotbarWidth, hotbarHeight);

    const slotsLeft = hotbarX + scaledPadding.left;
    const slotsTop = hotbarY + scaledPadding.top;
    const slotsBottom = slotsTop + scaledSlotSize;
    const items = this.getInventory();
    const activeItemIdx = this.inputManager.getCurrentInventorySlot() - 1;
    const dragState = this.dragState;
    const isDragging = !!dragState?.isDragging;
    const draggingSlotIndex = isDragging ? dragState?.slotIndex ?? null : null;
    const targetSlotIndex = isDragging ? dragState?.targetSlotIndex ?? null : null;

    for (let i = 0; i < slotsNumber; i++) {
      const slotLeft = slotsLeft + i * (scaledSlotSize + scaledSlotsGap);
      const slotRight = slotLeft + scaledSlotSize;
      const isActive = activeItemIdx === i;
      const isDraggingSlot = isDragging && draggingSlotIndex === i;
      const isTargetSlot =
        isDragging && targetSlotIndex === i && targetSlotIndex !== draggingSlotIndex;

      // Draw slot background
      ctx.fillStyle = settings.slotBackground;
      ctx.fillRect(slotLeft, slotsTop, scaledSlotSize, scaledSlotSize);

      if (isDraggingSlot) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(slotLeft, slotsTop, scaledSlotSize, scaledSlotSize);
      }

      // Draw slot border
      if (isTargetSlot) {
        // Highlight target slot with a distinct color during drag
        ctx.strokeStyle = "rgba(100, 200, 255, 0.9)"; // Light blue highlight
        ctx.lineWidth = scaledActiveBorderWidth;
        ctx.strokeRect(slotLeft, slotsTop, scaledSlotSize, scaledSlotSize);
        // Draw inner glow effect
        ctx.strokeStyle = "rgba(100, 200, 255, 0.4)";
        ctx.lineWidth = scaledBorderWidth * 2;
        ctx.strokeRect(slotLeft + 2, slotsTop + 2, scaledSlotSize - 4, scaledSlotSize - 4);
      } else {
        ctx.strokeStyle = isActive ? settings.activeBorderColor : settings.borderColor;
        ctx.lineWidth = isActive ? scaledActiveBorderWidth : scaledBorderWidth;
        ctx.strokeRect(slotLeft, slotsTop, scaledSlotSize, scaledSlotSize);
      }

      const inventoryItem = items[i];

      const image = inventoryItem && this.assetManager.get(getItemAssetKey(inventoryItem));

      if (image) {
        const imagePadding = 8 * hudScale;
        if (isDraggingSlot) {
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.drawImage(
            image,
            slotLeft + imagePadding,
            slotsTop + imagePadding,
            scaledSlotSize - imagePadding * 2,
            scaledSlotSize - imagePadding * 2
          );
          ctx.restore();
        } else {
          ctx.drawImage(
            image,
            slotLeft + imagePadding,
            slotsTop + imagePadding,
            scaledSlotSize - imagePadding * 2,
            scaledSlotSize - imagePadding * 2
          );
        }
      }

      // Draw slot number (show "0" for slot 10)
      const slotLabel = i === 9 ? "0" : `${i + 1}`;
      const slotFontSize = 24 * hudScale;
      ctx.font = `bold ${slotFontSize}px Arial`;
      ctx.textAlign = "left";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 3 * hudScale;
      const slotLabelX = slotLeft + 6 * hudScale;
      const slotLabelY = slotsTop + 26 * hudScale;
      ctx.strokeText(slotLabel, slotLabelX, slotLabelY);
      ctx.fillText(slotLabel, slotLabelX, slotLabelY);

      // Draw item count
      if (inventoryItem?.state?.count) {
        ctx.font = `bold ${slotFontSize}px Arial`;
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 3 * hudScale;
        const countX = slotRight - 6 * hudScale;
        const countY = slotsBottom - 6 * hudScale;
        ctx.strokeText(`${inventoryItem.state.count}`, countX, countY);
        ctx.fillText(`${inventoryItem.state.count}`, countX, countY);
      }

      if (isWeapon(inventoryItem?.itemType)) {
        const ammoType = getWeaponAmmoType(inventoryItem.itemType);
        if (ammoType) {
          const ammoItem = this.getInventory().find(
            (item) => item?.itemType == getWeaponAmmoType(inventoryItem.itemType)
          );
          const ammoCount = ammoItem?.state?.count ?? 0;
          const ammoFontSize = slotFontSize * 0.7;
          ctx.font = `bold ${ammoFontSize}px Arial`;
          ctx.textAlign = "right";
          ctx.fillStyle = ammoCount > 0 ? "rgba(255, 255, 0, 1)" : "rgba(255, 100, 100, 1)";
          ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
          ctx.lineWidth = 2 * hudScale;
          const ammoX = slotRight - 6 * hudScale; // right padding
          const ammoY = slotsBottom - 6 * hudScale; // bottom padding
          ctx.strokeText(`${ammoCount}`, ammoX, ammoY);
          ctx.fillText(`${ammoCount}`, ammoX, ammoY);
        }
      }
    }

    this.renderDragPreview(ctx, scaledSlotSize);
    ctx.restore();
  }

  private renderTooltip(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (this.dragState?.isDragging) {
      return;
    }

    if (this.hoveredSlot === null) {
      return;
    }

    const items = this.getInventory();
    const hoveredItem = items[this.hoveredSlot];
    if (!hoveredItem) {
      return;
    }

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const settings = HOTBAR_SETTINGS.Inventory;
    const slotsNumber = getConfig().player.HOTBAR_SLOTS;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Use scaled values (same as in renderInventory)
    const scaledSlotSize = settings.slotSize * hudScale;
    const scaledSlotsGap = settings.slotsGap * hudScale;
    const scaledPadding = {
      left: settings.padding.left * hudScale,
      right: settings.padding.right * hudScale,
      top: settings.padding.top * hudScale,
      bottom: settings.padding.bottom * hudScale,
    };
    const scaledScreenMarginBottom = settings.screenMarginBottom * hudScale;

    const hotbarWidth =
      slotsNumber * scaledSlotSize +
      (slotsNumber - 1) * scaledSlotsGap +
      scaledPadding.left +
      scaledPadding.right;
    const hotbarHeight = scaledSlotSize + scaledPadding.top + scaledPadding.bottom;

    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - scaledScreenMarginBottom;

    const slotsLeft = hotbarX + scaledPadding.left;
    const slotsTop = hotbarY + scaledPadding.top;

    const slotLeft = slotsLeft + this.hoveredSlot * (scaledSlotSize + scaledSlotsGap);
    const slotCenterX = slotLeft + scaledSlotSize / 2;

    // Get item name and format it
    const itemName = formatDisplayName(hoveredItem.itemType);

    // Measure text for tooltip background
    const tooltipFontSize = 20 * hudScale;
    ctx.font = `bold ${tooltipFontSize}px Arial`;
    ctx.textAlign = "center";
    const textMetrics = ctx.measureText(itemName);
    const textWidth = textMetrics.width;
    const textHeight = tooltipFontSize;

    const tooltipPadding = 8 * hudScale;
    const tooltipWidth = textWidth + tooltipPadding * 2;
    const tooltipHeight = textHeight + tooltipPadding * 2;
    const tooltipX = slotCenterX - tooltipWidth / 2;
    const tooltipY = slotsTop - tooltipHeight - 8 * hudScale; // 8px gap above slot

    // Draw tooltip background
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Draw tooltip border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2 * hudScale;
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

    // Draw item name
    ctx.fillStyle = "white";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 3 * hudScale;
    const textY = tooltipY + tooltipPadding + textHeight - 4 * hudScale;
    ctx.strokeText(itemName, slotCenterX, textY);
    ctx.fillText(itemName, slotCenterX, textY);

    ctx.restore();
  }

  private renderDragPreview(ctx: CanvasRenderingContext2D, scaledSlotSize: number): void {
    if (!this.dragState?.isDragging) {
      return;
    }

    const items = this.getInventory();
    const draggedItem = items[this.dragState.slotIndex];
    if (!draggedItem) {
      return;
    }

    const image = this.assetManager.get(getItemAssetKey(draggedItem));
    if (!image) {
      return;
    }

    const previewSize = scaledSlotSize * 0.85;
    const drawX = this.dragState.currentX - previewSize / 2;
    const drawY = this.dragState.currentY - previewSize / 2;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(image, drawX, drawY, previewSize, previewSize);
    ctx.restore();
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

  private dropSlot(slotIndex: number): void {
    const inventory = this.getInventory();
    if (!inventory[slotIndex]) {
      return;
    }

    // Send drop event immediately
    this.sendDropItem(slotIndex);
  }

  private swapSlots(fromSlotIndex: number, toSlotIndex: number): void {
    // Send swap event immediately
    this.sendSwapItems(fromSlotIndex, toSlotIndex);
  }

  private getHotbarMetrics(canvasWidth?: number, canvasHeight?: number): HotbarMetrics | null {
    const width = canvasWidth ?? this.lastCanvasWidth;
    const height = canvasHeight ?? this.lastCanvasHeight;

    if (!width || !height) {
      return null;
    }

    return this.calculateHotbarMetrics(width, height);
  }

  private calculateHotbarMetrics(canvasWidth: number, canvasHeight: number): HotbarMetrics {
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const cfg = HOTBAR_SETTINGS.Inventory;
    const slots = getConfig().player.HOTBAR_SLOTS;

    // Scale only what is actually needed
    const slotSize = cfg.slotSize * hudScale;
    const gap = cfg.slotsGap * hudScale;

    const padLeft = cfg.padding.left * hudScale;
    const padRight = cfg.padding.right * hudScale;
    const padTop = cfg.padding.top * hudScale;
    const padBottom = cfg.padding.bottom * hudScale;

    const marginBottom = cfg.screenMarginBottom * hudScale;

    // Compute width/height directly
    const width = slots * slotSize + (slots - 1) * gap + padLeft + padRight;
    const height = slotSize + padTop + padBottom;

    // Center horizontally / place above bottom
    const x = (canvasWidth - width) * 0.5;
    const y = canvasHeight - height - marginBottom;

    return {
      hotbarX: x,
      hotbarY: y,
      hotbarWidth: width,
      hotbarHeight: height,
      slotsLeft: x + padLeft,
      slotsTop: y + padTop,
      slotSize,
      slotsGap: gap,
      slotsNumber: slots,
    };
  }

  private getSlotIndexAtPosition(x: number, y: number, metrics: HotbarMetrics): number | null {
    const slotBottom = metrics.slotsTop + metrics.slotSize;
    for (let i = 0; i < metrics.slotsNumber; i++) {
      const slotLeft = metrics.slotsLeft + i * (metrics.slotSize + metrics.slotsGap);
      const slotRight = slotLeft + metrics.slotSize;

      if (x >= slotLeft && x <= slotRight && y >= metrics.slotsTop && y <= slotBottom) {
        return i;
      }
    }

    return null;
  }

  private isPointInsideHotbar(x: number, y: number, metrics: HotbarMetrics): boolean {
    return (
      x >= metrics.hotbarX &&
      x <= metrics.hotbarX + metrics.hotbarWidth &&
      y >= metrics.hotbarY &&
      y <= metrics.hotbarY + metrics.hotbarHeight
    );
  }

  // Handle external drag from inventory panel ending on this hotbar
  public handleExternalDrop(fromSlotIndex: number, x: number, y: number): boolean {
    const metrics = this.getHotbarMetrics(this.lastCanvasWidth, this.lastCanvasHeight);
    if (!metrics) return false;

    if (!this.isPointInsideHotbar(x, y, metrics)) return false;

    const targetSlotIndex = this.getSlotIndexAtPosition(x, y, metrics);
    if (targetSlotIndex !== null) {
      this.sendSwapItems(fromSlotIndex, targetSlotIndex);
      return true;
    }

    return false;
  }
}
