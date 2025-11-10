import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { PlayerClient } from "@/entities/player";
import { WallClient } from "@/entities/items/wall";
import { TreeClient } from "@/entities/items/tree";
import { ClientCarryable } from "@/extensions/carryable";
import { MapManager } from "@/managers/map";
import { AcidProjectileClient } from "@/entities/acid-projectile";
import { ClientDestructible } from "@/extensions/destructible";
import { EntityCategories } from "@shared/entities";
import { CrateClient } from "@/entities/items/crate";
import { perfTimer } from "@shared/util/performance";
import { getConfig } from "@shared/config";
import { ClientIlluminated } from "@/extensions/illuminated";
import Vector2 from "@shared/util/vector2";

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
  fogOfWar: {
    enabled: true,
    fogColor: "rgba(0, 0, 0, 0.95)", // Nearly opaque black for unexplored areas
  },
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

interface LightSource {
  position: Vector2;
  radius: number;
}

export class Minimap {
  private mapManager: MapManager;
  // Pre-rendered canvas for collidables indicators (at world coordinates, 1:1 scale)
  private collidablesCanvas: HTMLCanvasElement | null = null;
  private readonly tileSize = 16; // Match MapManager tile size
  private cachedCollidablesReference: number[][] | null = null; // Track which map data we've cached

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;

    // Pre-render collidables when map data is available
    this.prerenderCollidables();

    // Listen for map updates to re-render
    // Note: This assumes setMap is called on MapManager - we'll check on first render
  }

  // Get all light sources from entities and decals
  private getLightSources(gameState: GameState): LightSource[] {
    const sources: LightSource[] = [];

    // Add entity light sources (torches, campfires, etc.)
    for (const entity of gameState.entities) {
      if (entity.hasExt(ClientIlluminated) && entity.hasExt(ClientPositionable)) {
        const radius = entity.getExt(ClientIlluminated).getRadius() / 2;
        // Skip entities with no light (radius 0 or very small)
        if (radius <= 0) continue;
        const position = entity.getExt(ClientPositionable).getCenterPosition();
        sources.push({ position, radius });
      }
    }

    // Add decal light sources (campfires, etc.)
    const mapData = this.mapManager.getMapData();
    if (mapData?.decals) {
      mapData.decals.forEach((decal) => {
        if (decal.light) {
          const intensity = decal.light.intensity ?? 1.0;
          const radius = decal.light.radius * intensity;

          // Convert grid position to world position (center of tile)
          const position = new Vector2(
            decal.position.x * this.tileSize + this.tileSize / 2,
            decal.position.y * this.tileSize + this.tileSize / 2
          );

          sources.push({ position, radius });
        }
      });
    }

    return sources;
  }

  // Check if a world position is visible (within any light source radius)
  private isPositionVisible(worldPos: Vector2, lightSources: LightSource[]): boolean {
    for (const source of lightSources) {
      const dx = worldPos.x - source.position.x;
      const dy = worldPos.y - source.position.y;
      const distanceSquared = dx * dx + dy * dy;
      const radiusSquared = source.radius * source.radius;

      if (distanceSquared <= radiusSquared) {
        return true;
      }
    }
    return false;
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
      } else if (entity instanceof TreeClient) {
        color = settings.colors.tree;
        indicator = settings.indicators.tree;
      } else if (entity instanceof CrateClient) {
        // Skip crates - they will be rendered after fog of war
        continue;
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

    // Draw fog of war overlay (only during nighttime)
    if (!gameState.isDay) {
      perfTimer.start("minimap:fogOfWar");
      const lightSources = this.getLightSources(gameState);
      this.renderFogOfWar(ctx, playerPos, lightSources, settings, top);
      perfTimer.end("minimap:fogOfWar");
    }

    // Draw crate indicators (after fog of war so they're always visible)
    perfTimer.start("minimap:crates");
    this.renderCrateIndicators(ctx, gameState, playerPos, settings, top);
    perfTimer.end("minimap:crates");

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
      const biomeWorldX = (position.x * BIOME_SIZE + BIOME_SIZE / 2) * getConfig().world.TILE_SIZE;
      const biomeWorldY = (position.y * BIOME_SIZE + BIOME_SIZE / 2) * getConfig().world.TILE_SIZE;

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

  private renderCrateIndicators(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number
  ): void {
    const centerX = settings.left + settings.size / 2;
    const centerY = top + settings.size / 2;
    const maxDistanceSquared =
      MINIMAP_RENDER_DISTANCE.ENTITIES * MINIMAP_RENDER_DISTANCE.ENTITIES;

    // Loop through all entities to find crates
    for (const entity of gameState.entities) {
      if (!(entity instanceof CrateClient)) continue;
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getPosition();

      // Calculate relative position to player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;

      // Early distance check using squared distance (faster than sqrt)
      const distanceSquared = relativeX * relativeX + relativeY * relativeY;
      if (distanceSquared > maxDistanceSquared) continue;

      // Convert to minimap coordinates (centered on player)
      const minimapX = centerX + relativeX * settings.scale;
      const minimapY = centerY + relativeY * settings.scale;

      // Draw crate indicator with red circle
      const iconSize = 16;
      const halfIcon = iconSize / 2;

      // Draw red circle around crate first
      const circleRadius = 24;
      ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(minimapX, minimapY, circleRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw inner filled circle for visibility
      ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
      ctx.beginPath();
      ctx.arc(minimapX, minimapY, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw crate background (brown/tan color)
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(minimapX - halfIcon, minimapY - halfIcon, iconSize, iconSize);

      // Draw crate border/outline
      ctx.strokeStyle = "#654321";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(minimapX - halfIcon, minimapY - halfIcon, iconSize, iconSize);

      // Draw crate details (horizontal planks)
      ctx.strokeStyle = "#654321";
      ctx.lineWidth = 1;
      const plankOffset = iconSize / 3;
      ctx.beginPath();
      ctx.moveTo(minimapX - halfIcon, minimapY - halfIcon + plankOffset);
      ctx.lineTo(minimapX + halfIcon, minimapY - halfIcon + plankOffset);
      ctx.moveTo(minimapX - halfIcon, minimapY - halfIcon + plankOffset * 2);
      ctx.lineTo(minimapX + halfIcon, minimapY - halfIcon + plankOffset * 2);
      ctx.stroke();

      // Draw white border around icon for visibility
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(minimapX - halfIcon, minimapY - halfIcon, iconSize, iconSize);
    }
  }

  // Render fog of war overlay - darken areas not in light
  private renderFogOfWar(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    lightSources: LightSource[],
    settings: typeof MINIMAP_SETTINGS,
    top: number
  ): void {
    if (!settings.fogOfWar.enabled) return;

    const centerX = settings.left + settings.size / 2;
    const centerY = top + settings.size / 2;
    const radius = settings.size / 2;

    // We'll render fog by checking a grid of points on the minimap
    // For better performance, we'll check at lower resolution and draw tiles
    const gridSize = 8; // Size of fog tiles in minimap pixels
    const tilesPerRow = Math.ceil(settings.size / gridSize);

    for (let ty = 0; ty < tilesPerRow; ty++) {
      for (let tx = 0; tx < tilesPerRow; tx++) {
        // Calculate minimap coordinates for this fog tile
        const minimapX = settings.left + tx * gridSize + gridSize / 2;
        const minimapY = top + ty * gridSize + gridSize / 2;

        // Check if this position is within the circular minimap bounds
        const dx = minimapX - centerX;
        const dy = minimapY - centerY;
        if (dx * dx + dy * dy > radius * radius) continue;

        // Convert minimap coordinates back to world coordinates
        const relativeX = (minimapX - centerX) / settings.scale;
        const relativeY = (minimapY - centerY) / settings.scale;
        const worldX = playerPos.x + relativeX;
        const worldY = playerPos.y + relativeY;

        const worldPos = new Vector2(worldX, worldY);

        // Check if this world position is visible
        if (!this.isPositionVisible(worldPos, lightSources)) {
          // Draw fog tile
          ctx.fillStyle = settings.fogOfWar.fogColor;
          ctx.fillRect(minimapX - gridSize / 2, minimapY - gridSize / 2, gridSize, gridSize);
        }
      }
    }
  }

  // Pre-render all collidables as simplified indicator shapes into a canvas
  private prerenderCollidables(): void {
    const mapData = this.mapManager.getMapData();
    if (!mapData || !mapData.collidables) return;

    const collidables = mapData.collidables;

    // Cache the reference to the current collidables array so we can detect when it changes
    this.cachedCollidablesReference = collidables;
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
    // Note: Draw at tile corner positions (the canvas represents world coordinates)
    for (let y = 0; y < rows; y++) {
      const row = collidables[y];
      if (!row) continue;

      for (let x = 0; x < cols; x++) {
        const cell = row[x];
        // If there's a collidable (anything other than -1), draw it
        if (cell !== -1) {
          // Draw at tile corner (not center) - the canvas represents world coordinates 1:1
          const worldX = x * this.tileSize + this.tileSize / 2;
          const worldY = y * this.tileSize + this.tileSize / 2;

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

    // Check if canvas needs to be created or recreated
    // This handles: (1) no canvas exists, (2) map dimensions changed, (3) map data changed (new game)
    const expectedWidth = (mapData.collidables[0]?.length ?? 0) * this.tileSize;
    const expectedHeight = mapData.collidables.length * this.tileSize;
    const mapDataChanged = this.cachedCollidablesReference !== mapData.collidables;

    if (
      !this.collidablesCanvas ||
      this.collidablesCanvas.width !== expectedWidth ||
      this.collidablesCanvas.height !== expectedHeight ||
      mapDataChanged
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
          // Use the center of the tile for accurate positioning
          const worldX = x * this.tileSize + this.tileSize / 2;
          const worldY = y * this.tileSize + this.tileSize / 2;

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
