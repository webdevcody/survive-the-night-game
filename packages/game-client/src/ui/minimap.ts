import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { PlayerClient } from "@/entities/player";
import { WallClient } from "@/entities/items/wall";
import { ClientCarryable } from "@/extensions/carryable";
import { MapManager } from "@/managers/map";
import { AcidProjectileClient } from "@/entities/acid-projectile";
import { ClientDestructible } from "@/extensions/destructible";
import { EntityCategories } from "@shared/entities";
import { perfTimer } from "@shared/util/performance";

// Performance optimization constants - adjust these to balance quality vs performance
// To view performance stats in console, run:
//   perfTimer.logStats("minimap:total")
//   perfTimer.logStats("minimap:collidables")
//   perfTimer.logStats("minimap:entities")
//   perfTimer.logStats("minimap:biomes")
//   perfTimer.logStats("minimap:playerIndicators")
export const MINIMAP_RENDER_DISTANCE = {
  // Maximum world distance (in pixels) to check for entities on minimap
  // Calculated as: (minimap size / 2) / scale + buffer
  // Default: (400 / 2) / 0.7 + 100 = ~385 pixels
  // Lower values = better performance, but entities may pop in/out
  ENTITIES: 400,

  // Maximum world distance (in pixels) to check for collidable tiles
  // Same calculation as entities
  // Lower values = better performance, but tiles may pop in/out
  COLLIDABLES: 400,

  // Maximum world distance (in pixels) to check for ground tiles (if needed)
  GROUND: 400,
};

export const MINIMAP_SETTINGS = {
  size: 400,
  left: 40,
  bottom: 40,
  background: "rgba(0, 0, 0, 0.7)",
  scale: 0.7,
  colors: {
    enemy: "red",
    deadEnemy: "gray",
    player: "green",
    wall: "white",
    item: "yellow",
    tree: "gray",
    acid: "green",
    bat: "blue",
    spitter: "purple",
  },
  indicators: {
    acid: {
      shape: "circle",
      size: 6,
    },
    enemy: {
      shape: "circle",
      size: 6,
    },
    player: {
      shape: "rectangle",
      size: 8,
    },
    wall: {
      shape: "rectangle",
      size: 8,
    },
    item: {
      shape: "circle",
      size: 6,
    },
    tree: {
      shape: "rectangle",
      size: 8,
    },
  },
  biomeIndicators: {
    farm: {
      label: "F",
      color: "#8B4513",
      iconColor: "#FFFFFF",
    },
    city: {
      label: "C",
      color: "#4169E1",
      iconColor: "#FFFFFF",
    },
    gasStation: {
      label: "G",
      color: "#FFD700",
      iconColor: "#000000",
    },
    campsite: {
      label: "H",
      color: "#228B22",
      iconColor: "#FFFFFF",
    },
    merchant: {
      label: "M",
      color: "#FF8C00",
      iconColor: "#FFFFFF",
    },
    dock: {
      label: "D",
      color: "#4682B4",
      iconColor: "#FFFFFF",
    },
    shed: {
      label: "S",
      color: "#8B7355",
      iconColor: "#FFFFFF",
    },
  },
};

export class Minimap {
  private mapManager: MapManager;
  // Pre-rendered canvas for collidables indicators (at world coordinates, 1:1 scale)
  private collidablesCanvas: HTMLCanvasElement | null = null;
  private readonly tileSize = 16; // Match MapManager tile size

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;

    // Pre-render collidables when map data is available
    this.prerenderCollidables();

    // Listen for map updates to re-render
    // Note: This assumes setMap is called on MapManager - we'll check on first render
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    perfTimer.start("minimap:total");
    const settings = MINIMAP_SETTINGS;
    const myPlayer = getPlayer(gameState);
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable)) {
      perfTimer.end("minimap:total");
      return;
    }

    const playerPos = myPlayer.getExt(ClientPositionable).getPosition();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Calculate position from bottom
    const top = ctx.canvas.height - settings.bottom - settings.size;

    // Create circular clip
    ctx.beginPath();
    ctx.arc(
      settings.left + settings.size / 2,
      top + settings.size / 2,
      settings.size / 2,
      0,
      Math.PI * 2
    );
    ctx.clip();

    // Draw minimap background
    ctx.fillStyle = settings.background;
    ctx.fillRect(settings.left, top, settings.size, settings.size);

    // Draw collidable tiles (obstacles like trees, walls, water)
    perfTimer.start("minimap:collidables");
    this.renderCollidables(ctx, playerPos, settings, top);
    perfTimer.end("minimap:collidables");

    // Loop through all entities and draw them on minimap
    perfTimer.start("minimap:entities");
    const maxEntityDistanceSquared =
      MINIMAP_RENDER_DISTANCE.ENTITIES * MINIMAP_RENDER_DISTANCE.ENTITIES;

    for (const entity of gameState.entities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getPosition();

      // Calculate relative position to player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;

      // Early distance check using squared distance (faster than sqrt)
      const distanceSquared = relativeX * relativeX + relativeY * relativeY;
      if (distanceSquared > maxEntityDistanceSquared) continue;

      // Convert to minimap coordinates (centered on player)
      const minimapX = settings.left + settings.size / 2 + relativeX * settings.scale;
      const minimapY = top + settings.size / 2 + relativeY * settings.scale;

      // Determine indicator settings based on entity category
      let indicator = null;
      let color = null;

      const category = entity.getCategory();

      if (category === EntityCategories.ZOMBIE) {
        indicator = settings.indicators.enemy;
        // Check if zombie is dead
        if (entity.hasExt(ClientDestructible) && entity.getExt(ClientDestructible).isDead()) {
          color = settings.colors.deadEnemy;
        } else {
          color = settings.colors.enemy;
        }
      } else if (entity instanceof PlayerClient) {
        color = settings.colors.player;
        indicator = settings.indicators.player;
      } else if (entity instanceof WallClient) {
        color = settings.colors.wall;
        indicator = settings.indicators.wall;
      } else if (entity.hasExt(ClientCarryable)) {
        color = settings.colors.item;
        indicator = settings.indicators.item;
      } else if (entity instanceof AcidProjectileClient) {
        color = settings.colors.acid;
        indicator = settings.indicators.acid;
      }

      if (color && indicator) {
        ctx.fillStyle = color;
        const size = indicator.size;
        const halfSize = size / 2;

        // Draw indicator based on shape
        if (indicator.shape === "circle") {
          ctx.beginPath();
          ctx.arc(minimapX, minimapY, halfSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(minimapX - halfSize, minimapY - halfSize, size, size);
        }
      }
    }
    perfTimer.end("minimap:entities");

    // Draw radar circle border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      settings.left + settings.size / 2,
      top + settings.size / 2,
      settings.size / 2,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Draw crosshair at center (player position)
    const crosshairSize = 6;
    ctx.strokeStyle = settings.colors.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(settings.left + settings.size / 2 - crosshairSize, top + settings.size / 2);
    ctx.lineTo(settings.left + settings.size / 2 + crosshairSize, top + settings.size / 2);
    ctx.moveTo(settings.left + settings.size / 2, top + settings.size / 2 - crosshairSize);
    ctx.lineTo(settings.left + settings.size / 2, top + settings.size / 2 + crosshairSize);
    ctx.stroke();

    // Draw biome directional indicators
    perfTimer.start("minimap:biomes");
    this.renderBiomeIndicators(ctx, playerPos, settings, top);
    perfTimer.end("minimap:biomes");

    // Draw player directional indicators
    perfTimer.start("minimap:playerIndicators");
    this.renderPlayerIndicators(ctx, gameState, playerPos, settings, top);
    perfTimer.end("minimap:playerIndicators");

    ctx.restore();
    perfTimer.end("minimap:total");
  }

  private renderBiomeIndicators(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number
  ): void {
    const biomePositions = this.mapManager.getBiomePositions();
    if (!biomePositions) return;

    const BIOME_SIZE = 16; // tiles
    const TILE_SIZE = 16; // pixels
    const centerX = settings.left + settings.size / 2;
    const centerY = top + settings.size / 2;
    const radius = settings.size / 2;

    const biomes = [
      { name: "farm", position: biomePositions.farm, config: settings.biomeIndicators.farm },
      { name: "city", position: biomePositions.city, config: settings.biomeIndicators.city },
      {
        name: "gasStation",
        position: biomePositions.gasStation,
        config: settings.biomeIndicators.gasStation,
      },
      {
        name: "campsite",
        position: biomePositions.campsite,
        config: settings.biomeIndicators.campsite,
      },
      {
        name: "dock",
        position: biomePositions.dock,
        config: settings.biomeIndicators.dock,
      },
      {
        name: "shed",
        position: biomePositions.shed,
        config: settings.biomeIndicators.shed,
      },
    ];

    // Add merchant positions (there can be multiple)
    if (biomePositions.merchants) {
      biomePositions.merchants.forEach((merchantPos) => {
        biomes.push({
          name: "merchant",
          position: merchantPos,
          config: settings.biomeIndicators.merchant,
        });
      });
    }

    biomes.forEach(({ position, config }) => {
      if (!position) return;

      // Convert biome position to world coordinates (center of biome)
      const biomeWorldX = (position.x * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;
      const biomeWorldY = (position.y * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;

      // Calculate relative position to player
      const relativeX = biomeWorldX - playerPos.x;
      const relativeY = biomeWorldY - playerPos.y;

      // Calculate angle from player to biome
      const angle = Math.atan2(relativeY, relativeX);

      // Calculate distance from center of minimap
      const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY) * settings.scale;

      // If the biome is within the minimap view, skip directional indicator
      if (distance < radius - 30) return;

      // Calculate position on the edge of the minimap circle
      const edgeX = centerX + Math.cos(angle) * (radius - 20);
      const edgeY = centerY + Math.sin(angle) * (radius - 20);

      // Draw the indicator circle
      const indicatorSize = 24;
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.arc(edgeX, edgeY, indicatorSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(edgeX, edgeY, indicatorSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Draw the label text
      ctx.fillStyle = config.iconColor;
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(config.label, edgeX, edgeY);
    });
  }

  private renderPlayerIndicators(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number
  ): void {
    const centerX = settings.left + settings.size / 2;
    const centerY = top + settings.size / 2;
    const radius = settings.size / 2;

    // Loop through all entities to find other players
    for (const entity of gameState.entities) {
      if (!(entity instanceof PlayerClient)) continue;
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getPosition();

      // Calculate relative position to my player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;

      // Skip if this is the current player (distance ~0)
      const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      if (distance < 10) continue; // Skip if very close (likely the same player)

      // Calculate scaled distance on minimap
      const scaledDistance = distance * settings.scale;

      // If the player is within the minimap view, skip directional indicator
      // (they're already shown as a regular indicator on the minimap)
      if (scaledDistance < radius - 30) continue;

      // Calculate angle from my player to other player
      const angle = Math.atan2(relativeY, relativeX);

      // Calculate position on the edge of the minimap circle
      const edgeX = centerX + Math.cos(angle) * (radius - 20);
      const edgeY = centerY + Math.sin(angle) * (radius - 20);

      // Draw the indicator - use a triangle pointing in the direction
      const indicatorSize = 12;

      // Draw filled triangle
      ctx.fillStyle = settings.colors.player;
      ctx.beginPath();
      ctx.moveTo(edgeX + Math.cos(angle) * indicatorSize, edgeY + Math.sin(angle) * indicatorSize);
      ctx.lineTo(
        edgeX + Math.cos(angle + (2 * Math.PI) / 3) * indicatorSize,
        edgeY + Math.sin(angle + (2 * Math.PI) / 3) * indicatorSize
      );
      ctx.lineTo(
        edgeX + Math.cos(angle - (2 * Math.PI) / 3) * indicatorSize,
        edgeY + Math.sin(angle - (2 * Math.PI) / 3) * indicatorSize
      );
      ctx.closePath();
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(edgeX + Math.cos(angle) * indicatorSize, edgeY + Math.sin(angle) * indicatorSize);
      ctx.lineTo(
        edgeX + Math.cos(angle + (2 * Math.PI) / 3) * indicatorSize,
        edgeY + Math.sin(angle + (2 * Math.PI) / 3) * indicatorSize
      );
      ctx.lineTo(
        edgeX + Math.cos(angle - (2 * Math.PI) / 3) * indicatorSize,
        edgeY + Math.sin(angle - (2 * Math.PI) / 3) * indicatorSize
      );
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Pre-render all collidables as simplified indicator shapes into a canvas
  private prerenderCollidables(): void {
    const mapData = this.mapManager.getMapData();
    if (!mapData || !mapData.collidables) return;

    const collidables = mapData.collidables;
    const rows = collidables.length;
    const cols = collidables[0]?.length ?? 0;

    if (rows === 0 || cols === 0) return;

    // Create a canvas at world coordinates (1:1 scale)
    const canvas = document.createElement("canvas");
    canvas.width = cols * this.tileSize;
    canvas.height = rows * this.tileSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Use a semi-transparent fill so overlapping tiles don't completely obscure each other
    ctx.fillStyle = MINIMAP_SETTINGS.colors.tree;
    const treeIndicator = MINIMAP_SETTINGS.indicators.tree;
    const size = treeIndicator.size;
    const halfSize = size / 2;

    // Render all collidables as simplified shapes
    for (let y = 0; y < rows; y++) {
      const row = collidables[y];
      if (!row) continue;

      for (let x = 0; x < cols; x++) {
        const cell = row[x];
        // If there's a collidable (anything other than -1), draw it
        if (cell !== -1) {
          const worldX = x * this.tileSize;
          const worldY = y * this.tileSize;

          // Draw obstacle indicator based on shape at world coordinates
          if (treeIndicator.shape === "circle") {
            ctx.beginPath();
            ctx.arc(worldX, worldY, halfSize, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(worldX - halfSize, worldY - halfSize, size, size);
          }
        }
      }
    }

    this.collidablesCanvas = canvas;
  }

  // Render collidables using pre-rendered canvas or fallback
  private renderCollidables(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number
  ): void {
    const mapData = this.mapManager.getMapData();
    if (!mapData || !mapData.collidables) return;

    // Check if canvas needs to be created or recreated (if map dimensions changed)
    const expectedWidth = (mapData.collidables[0]?.length ?? 0) * this.tileSize;
    const expectedHeight = mapData.collidables.length * this.tileSize;

    if (
      !this.collidablesCanvas ||
      this.collidablesCanvas.width !== expectedWidth ||
      this.collidablesCanvas.height !== expectedHeight
    ) {
      this.prerenderCollidables();
    }

    // If still not available, use fallback rendering
    if (!this.collidablesCanvas) {
      this.renderCollidablesFallback(ctx, playerPos, settings, top, mapData.collidables);
      return;
    }

    // Pre-calculate squared distance for performance
    const maxDistanceSquared =
      MINIMAP_RENDER_DISTANCE.COLLIDABLES * MINIMAP_RENDER_DISTANCE.COLLIDABLES;

    // Calculate tile range to check based on player position and max distance
    const playerTileX = Math.floor(playerPos.x / this.tileSize);
    const playerTileY = Math.floor(playerPos.y / this.tileSize);
    const tileRange = Math.ceil(MINIMAP_RENDER_DISTANCE.COLLIDABLES / this.tileSize);

    const minX = Math.max(0, playerTileX - tileRange);
    const maxX = Math.min(mapData.collidables[0]?.length ?? 0, playerTileX + tileRange);
    const minY = Math.max(0, playerTileY - tileRange);
    const maxY = Math.min(mapData.collidables.length, playerTileY + tileRange);

    // Calculate world coordinates bounds
    const worldMinX = minX * this.tileSize;
    const worldMinY = minY * this.tileSize;
    const worldMaxX = maxX * this.tileSize;
    const worldMaxY = maxY * this.tileSize;

    // Calculate source region in pre-rendered canvas
    const sourceX = worldMinX;
    const sourceY = worldMinY;
    const sourceWidth = worldMaxX - worldMinX;
    const sourceHeight = worldMaxY - worldMinY;

    // Calculate center point for minimap (where player is)
    const centerX = settings.left + settings.size / 2;
    const centerY = top + settings.size / 2;

    // Calculate player position in world coordinates relative to source region
    const playerOffsetX = playerPos.x - worldMinX;
    const playerOffsetY = playerPos.y - worldMinY;

    // Calculate destination: centered on player, scaled down
    const destX = centerX - playerOffsetX * settings.scale;
    const destY = centerY - playerOffsetY * settings.scale;
    const destWidth = sourceWidth * settings.scale;
    const destHeight = sourceHeight * settings.scale;

    // Save context state
    ctx.save();

    // Set fill style for indicators
    ctx.fillStyle = settings.colors.tree;

    // Draw the subsection of the pre-rendered canvas, scaled and positioned
    ctx.drawImage(
      this.collidablesCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destX,
      destY,
      destWidth,
      destHeight
    );

    ctx.restore();
  }

  // Fallback rendering when pre-rendered canvas isn't available
  private renderCollidablesFallback(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number,
    collidables: number[][]
  ): void {
    ctx.fillStyle = settings.colors.tree;

    // Pre-calculate squared distance for performance
    const maxDistanceSquared =
      MINIMAP_RENDER_DISTANCE.COLLIDABLES * MINIMAP_RENDER_DISTANCE.COLLIDABLES;

    // Calculate tile range to check based on player position and max distance
    const playerTileX = Math.floor(playerPos.x / this.tileSize);
    const playerTileY = Math.floor(playerPos.y / this.tileSize);
    const tileRange = Math.ceil(MINIMAP_RENDER_DISTANCE.COLLIDABLES / this.tileSize);

    const minX = Math.max(0, playerTileX - tileRange);
    const maxX = Math.min(collidables[0]?.length ?? 0, playerTileX + tileRange);
    const minY = Math.max(0, playerTileY - tileRange);
    const maxY = Math.min(collidables.length, playerTileY + tileRange);

    // Only iterate through tiles within range
    for (let y = minY; y < maxY; y++) {
      const row = collidables[y];
      if (!row) continue;

      for (let x = minX; x < maxX; x++) {
        const cell = row[x];
        // If there's a collidable (anything other than -1), draw it
        if (cell !== -1) {
          const worldX = x * this.tileSize;
          const worldY = y * this.tileSize;

          // Calculate relative position to player
          const relativeX = worldX - playerPos.x;
          const relativeY = worldY - playerPos.y;

          // Early distance check using squared distance (faster than sqrt)
          const distanceSquared = relativeX * relativeX + relativeY * relativeY;
          if (distanceSquared > maxDistanceSquared) continue;

          // Convert to minimap coordinates (centered on player)
          const minimapX = settings.left + settings.size / 2 + relativeX * settings.scale;
          const minimapY = top + settings.size / 2 + relativeY * settings.scale;

          const treeIndicator = settings.indicators.tree;
          const size = treeIndicator.size;
          const halfSize = size / 2;

          // Draw obstacle indicator based on shape
          if (treeIndicator.shape === "circle") {
            ctx.beginPath();
            ctx.arc(minimapX, minimapY, halfSize, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(minimapX - halfSize, minimapY - halfSize, size, size);
          }
        }
      }
    }
  }
}
