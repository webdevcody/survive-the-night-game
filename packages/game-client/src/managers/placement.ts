import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";
import { ItemType, InventoryItem } from "@shared/util/inventory";
import { itemRegistry } from "@shared/entities/item-registry";
import { CameraManager } from "./camera";
import { MapManager } from "./map";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { ClientSentEvents } from "@shared/events/events";
import { PlayerClient } from "@/entities/player";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientPositionable, ClientInventory } from "@/extensions";
import { entityBlocksPlacement } from "@shared/entities/decal-registry";
import { distance } from "@shared/util/physics";

/**
 * Check if placing an item on an existing entity would trigger an upgrade.
 */
function canUpgradeEntity(placingItemType: ItemType, existingEntityType: string): boolean {
  const itemConfig = itemRegistry.get(placingItemType);
  if (!itemConfig?.upgradeTo) {
    return false;
  }
  // Can upgrade if placing the same type on itself (e.g., wall on wall)
  return existingEntityType === placingItemType;
}

const { TILE_SIZE, MAX_PLACEMENT_RANGE } = getConfig().world;

/**
 * Manages structure placement preview and validation
 */
export class PlacementManager {
  private mouseWorldPos: Vector2 | null = null;
  private isValidPlacement = false;
  private ghostPosition: Vector2 | null = null;
  private skipClickUntil = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private cameraManager: CameraManager,
    private mapManager: MapManager,
    private getPlayer: () => PlayerClient | null,
    private getEntities: () => ClientEntityBase[],
    private getSocket: () => ISocketAdapter
  ) {
    this.setupMouseTracking();
  }

  /**
   * Set up mouse move and click tracking
   */
  private setupMouseTracking(): void {
    // Track mouse movement
    this.canvas.addEventListener("mousemove", (e) => {
      this.updateMousePosition(e);
    });

    // Handle clicks for placement
    this.canvas.addEventListener("click", (e) => {
      const now = performance.now();
      if (this.skipClickUntil > 0) {
        if (now <= this.skipClickUntil) {
          this.skipClickUntil = 0;
          return;
        }
        this.skipClickUntil = 0;
      }
      this.handleClick(e);
    });
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  private screenToWorld(screenX: number, screenY: number): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const canvasX = (screenX - rect.left) * scaleX;
    const canvasY = (screenY - rect.top) * scaleY;

    const cameraScale = this.cameraManager.getScale();
    const cameraPos = this.cameraManager.getPosition();
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const worldX = (canvasX - centerX) / cameraScale + cameraPos.x;
    const worldY = (canvasY - centerY) / cameraScale + cameraPos.y;

    return PoolManager.getInstance().vector2.claim(worldX, worldY);
  }

  /**
   * Snap position to grid
   */
  private snapToGrid(pos: Vector2): Vector2 {
    const gridX = Math.floor(pos.x / TILE_SIZE) * TILE_SIZE;
    const gridY = Math.floor(pos.y / TILE_SIZE) * TILE_SIZE;
    return PoolManager.getInstance().vector2.claim(gridX, gridY);
  }

  /**
   * Update mouse position and calculate ghost position
   */
  private updateMousePosition(e: MouseEvent): void {
    this.mouseWorldPos = this.screenToWorld(e.clientX, e.clientY);

    // Calculate grid-snapped ghost position
    if (this.mouseWorldPos) {
      this.ghostPosition = this.snapToGrid(this.mouseWorldPos);
      const selectedItem = this.getSelectedPlaceableItem();
      this.isValidPlacement = this.validatePlacement(this.ghostPosition, selectedItem ?? undefined);
    }
  }

  /**
   * Validate if placement is allowed at the given position
   */
  private validatePlacement(position: Vector2, placingItemType?: ItemType): boolean {
    const player = this.getPlayer();
    if (!player) {
      return false;
    }

    // Defensive check: ensure player has positionable extension
    if (!player.hasExt(ClientPositionable)) {
      return false;
    }

    const playerPos = player.getCenterPosition();

    // Check distance from player (center to center of ghost tile)
    const poolManager = PoolManager.getInstance();
    const ghostCenter = poolManager.vector2.claim(
      position.x + TILE_SIZE / 2,
      position.y + TILE_SIZE / 2
    );
    const dist = distance(playerPos, ghostCenter);
    if (dist > MAX_PLACEMENT_RANGE) {
      return false;
    }

    // Check if grid cell is clear (no collidables)
    const gridX = Math.floor(position.x / TILE_SIZE);
    const gridY = Math.floor(position.y / TILE_SIZE);

    const mapData = this.mapManager.getMapData();
    if (!mapData || !mapData.collidables || !mapData.collidables.length) {
      return false;
    }

    // Check if position is within map bounds
    if (
      gridY < 0 ||
      gridY >= mapData.collidables.length ||
      gridX < 0 ||
      gridX >= mapData.collidables[0]?.length
    ) {
      return false;
    }

    // Check if any entities are at this position that could be upgraded
    const entities = this.getEntities();
    const wallCenter = poolManager.vector2.claim(
      position.x + TILE_SIZE / 2,
      position.y + TILE_SIZE / 2
    );

    // First pass: check if there's an upgradeable entity at this position
    let hasUpgradeableEntity = false;
    for (const entity of entities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const entityType = entity.getType();
      // Skip entities that don't block placement (e.g., visual-only decals)
      if (!entityBlocksPlacement(entityType)) continue;

      const entityPos = entity.getExt(ClientPositionable).getCenterPosition();
      const dist = distance(entityPos, wallCenter);

      // If entity is within a tile size, check if it can be upgraded
      if (dist < TILE_SIZE) {
        if (placingItemType && canUpgradeEntity(placingItemType, entityType)) {
          hasUpgradeableEntity = true;
        } else {
          // Blocked by a non-upgradeable entity
          return false;
        }
      }
    }

    // If there's an upgradeable entity, allow placement (skip collidables check for entity-placed structures)
    if (hasUpgradeableEntity) {
      return true;
    }

    // No upgradeable entity found, check if there's a map collidable at this position
    const collidableValue = mapData.collidables[gridY][gridX];
    if (collidableValue !== -1) {
      return false;
    }

    return true;
  }

  /**
   * Check if the selected inventory item is placeable (wall)
   */
  private getSelectedPlaceableItem(): ItemType | null {
    const player = this.getPlayer();
    if (!player) return null;

    // Defensive check: ensure player has inventory extension
    if (!player.hasExt(ClientInventory)) {
      return null;
    }

    // Safely get inventory - check if method exists (player might not be fully initialized)
    let inventory: InventoryItem[] = [];
    if (typeof player.getInventory === "function") {
      inventory = player.getInventory();
    } else {
      // Fallback: get inventory directly from extension if method doesn't exist
      inventory = player.getExt(ClientInventory).getItems();
    }

    if (!inventory || !Array.isArray(inventory)) {
      return null;
    }

    const selectedSlot = player.getSelectedInventorySlot();

    if (selectedSlot < 0 || selectedSlot >= inventory.length) {
      return null;
    }

    const item = inventory[selectedSlot];
    if (!item) return null;

    const itemConfig = itemRegistry.get(item.itemType);
    if (itemConfig?.placeable) {
      return item.itemType;
    }

    return null;
  }

  /**
   * Handle click events for placement
   */
  private handleClick(e: MouseEvent): void {
    const selectedItem = this.getSelectedPlaceableItem();
    if (!selectedItem) return;

    if (!this.ghostPosition || !this.isValidPlacement) return;

    // Send placement request to server
    this.getSocket().emit(ClientSentEvents.PLACE_STRUCTURE, {
      itemType: selectedItem,
      position: {
        x: this.ghostPosition.x,
        y: this.ghostPosition.y,
      },
    });
  }

  public skipNextClick(): void {
    this.skipClickUntil = performance.now() + 200;
  }

  /**
   * Render ghost template if a placeable item is selected
   */
  public render(ctx: CanvasRenderingContext2D): void {
    const selectedItem = this.getSelectedPlaceableItem();
    if (!selectedItem || !this.ghostPosition) return;

    const wallSize = TILE_SIZE;

    // Draw ghost template
    ctx.save();
    ctx.globalAlpha = 0.5;

    // Color based on validity
    if (this.isValidPlacement) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
    } else {
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    }

    ctx.fillRect(this.ghostPosition.x, this.ghostPosition.y, wallSize, wallSize);
    ctx.lineWidth = 2;
    ctx.strokeRect(this.ghostPosition.x, this.ghostPosition.y, wallSize, wallSize);

    ctx.restore();

    // Draw range indicator circle around player
    const player = this.getPlayer();
    if (player && player.hasExt(ClientPositionable)) {
      const playerPos = player.getCenterPosition();
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(playerPos.x, playerPos.y, MAX_PLACEMENT_RANGE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    // Remove event listeners if needed
    // Note: In a real implementation, you'd want to store bound function references
    // to properly remove them
  }
}
