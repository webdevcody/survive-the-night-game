import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { PlayerClient } from "@/entities/player";
import { CrateClient } from "@/entities/items/crate";
import { SurvivorClient } from "@/entities/environment/survivor";
import { MapManager } from "@/managers/map";
import { perfTimer } from "@shared/util/performance";
import { getConfig } from "@shared/config";
import { ClientIlluminated } from "@/extensions/illuminated";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { scaleHudValue } from "@/util/hud-scale";
import { getEntityMapColor } from "@/util/entity-map-colors";
import { Renderer } from "@/renderer";
import { SpatialGrid } from "@shared/util/spatial-grid";
import { ClientEntityBase } from "@/extensions/client-entity";
import { distance } from "@shared/util/physics";
import { calculateLightSources, getCampsiteMapMarkerWorldPosition } from "./utils/map-rendering-utils";
import { prerenderCollidables, renderCollidablesFromCanvas } from "./utils/map-collidable-renderer";
import { renderMinimapFogOfWar } from "./utils/map-fog-of-war-renderer";
import type { MinimapScreenRect } from "./minimap-hud-group-layout";
import { calculateHudScale } from "@/util/hud-scale";
import { RPG_BORDER_GOLD, RPG_MINIMAP_BACKGROUND } from "@/ui/rpg-hud-theme";

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
  ENTITIES: 300,

  // Maximum world distance (in pixels) to check for collidable tiles
  // Same calculation as entities
  // Lower values = better performance, but tiles may pop in/out
  COLLIDABLES: 300,

  // Maximum world distance (in pixels) to check for ground tiles (if needed)
  GROUND: 300,
};

export const MINIMAP_SETTINGS = {
  size: 240, // Reduced from 280 (was 400 originally)
  /** Inset from screen right; screen position comes from minimap-hud-group-layout + Hud. */
  right: 52,
  background: RPG_MINIMAP_BACKGROUND,
  scale: 0.35,
  fogOfWar: {
    enabled: true,
    fogColor: "rgba(0, 0, 0, 1.0)", // Fully opaque black for unexplored areas
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
    merchantNpc: "#FF8C00",
    dialogueNpc: "#BA55D3",
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
      size: 16,
    },
    npc: {
      shape: "circle",
      size: 7,
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

// LightSource interface moved to map-rendering-utils

export class Minimap {
  private mapManager: MapManager;
  private renderer: Renderer | null = null;
  // Pre-rendered canvas for collidables indicators (at world coordinates, 1:1 scale)
  private collidablesCanvas: HTMLCanvasElement | null = null;
  private readonly tileSize = getConfig().world.TILE_SIZE;
  private cachedCollidablesReference: number[][] | null = null; // Track which map data we've cached

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;

    // Pre-render collidables when map data is available
    this.prerenderCollidables();

    // Listen for map updates to re-render
    // Note: This assumes setMap is called on MapManager - we'll check on first render
  }

  public setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }

  private getSpatialGrid(): SpatialGrid<ClientEntityBase> | null {
    // Access spatial grid through renderer
    // We'll use a getter method on renderer to access the private spatialGrid
    return (this.renderer as any)?.spatialGrid ?? null;
  }

  // Light source calculation moved to map-rendering-utils

  public render(ctx: CanvasRenderingContext2D, gameState: GameState, screenRect: MinimapScreenRect): void {
    perfTimer.start("minimap:total");
    const settings = MINIMAP_SETTINGS;
    const myPlayer = getPlayer(gameState);
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable)) {
      perfTimer.end("minimap:total");
      return;
    }

    const playerPos = myPlayer.getExt(ClientPositionable).getCenterPosition();

    // Fetch entities once using spatial grid
    const spatialGrid = this.getSpatialGrid();
    if (!spatialGrid) {
      perfTimer.end("minimap:total");
      return;
    }

    const excludeSet = new Set([
      "boundary" as const,
      "zombie_spawn_point" as const,
      "item_spawn_point" as const,
    ]);
    const allEntities = spatialGrid.getNearbyEntities(
      playerPos,
      MINIMAP_RENDER_DISTANCE.ENTITIES,
      undefined,
      excludeSet
    );

    const extendedEntities = new Set<ClientEntityBase>(allEntities);

    // Filter entities into specific categories for efficient rendering
    const playerEntities: PlayerClient[] = [];
    const crateEntities: CrateClient[] = [];
    const survivorEntities: SurvivorClient[] = [];
    for (const entity of extendedEntities) {
      if (entity instanceof PlayerClient) {
        playerEntities.push(entity);
      } else if (entity instanceof CrateClient) {
        crateEntities.push(entity);
      } else if (entity instanceof SurvivorClient) {
        survivorEntities.push(entity);
      }
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const scaledLeft = screenRect.left;
    const top = screenRect.top;
    const scaledSize = screenRect.size;

    // Create circular clip using scaled values
    ctx.beginPath();
    ctx.arc(scaledLeft + scaledSize / 2, top + scaledSize / 2, scaledSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw minimap background using scaled values
    ctx.fillStyle = settings.background;
    ctx.fillRect(scaledLeft, top, scaledSize, scaledSize);

    // Draw collidable tiles (obstacles like trees, walls, water)
    perfTimer.start("minimap:collidables");
    this.renderCollidables(ctx, playerPos, settings, top, scaledLeft, scaledSize);
    perfTimer.end("minimap:collidables");

    // Loop through nearby entities and draw them on minimap
    perfTimer.start("minimap:entities");
    const maxEntityDistance = MINIMAP_RENDER_DISTANCE.ENTITIES;

    for (const entity of extendedEntities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getCenterPosition();

      // Calculate relative position to player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;
      const poolManager = PoolManager.getInstance();
      const playerWorldPos = poolManager.vector2.claim(playerPos.x, playerPos.y);
      const entityWorldPos = poolManager.vector2.claim(position.x, position.y);
      const dist = distance(playerWorldPos, entityWorldPos);
      poolManager.vector2.release(playerWorldPos);
      poolManager.vector2.release(entityWorldPos);

      if (dist > maxEntityDistance) continue;

      // Convert to minimap coordinates (centered on player) using scaled values
      const minimapX = scaledLeft + scaledSize / 2 + relativeX * settings.scale;
      const minimapY = top + scaledSize / 2 + relativeY * settings.scale;

      // Get entity color and indicator using shared utility
      const mapIndicator = getEntityMapColor(entity, settings, {
        gameState,
        myPlayerId: gameState.playerId,
        myPlayerIsZombie: myPlayer.isZombiePlayer(),
      });
      if (!mapIndicator) {
        // Skip entities that return null (e.g., crates)
        continue;
      }

      const { color, indicator } = mapIndicator;

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

    // Draw fog of war overlay
    perfTimer.start("minimap:fogOfWar");
    const lightSources = calculateLightSources(Array.from(extendedEntities), gameState);
    const fogCenterX = scaledLeft + scaledSize / 2;
    const fogCenterY = top + scaledSize / 2;
    const radius = scaledSize / 2;
    renderMinimapFogOfWar(
      ctx,
      playerPos,
      lightSources,
      settings.fogOfWar,
      fogCenterX,
      fogCenterY,
      radius,
      settings.scale,
      top,
      scaledLeft,
      scaledSize,
      canvasWidth,
      canvasHeight
    );
    perfTimer.end("minimap:fogOfWar");

    // Draw crate indicators (after fog of war so they're always visible)
    perfTimer.start("minimap:crates");
    this.renderCrateIndicators(ctx, crateEntities, playerPos, settings, top, scaledLeft, scaledSize);
    perfTimer.end("minimap:crates");

    // Draw survivor indicators (after fog of war so they're always visible)
    perfTimer.start("minimap:survivors");
    this.renderSurvivorIndicators(ctx, survivorEntities, playerPos, settings, top, scaledLeft, scaledSize);
    perfTimer.end("minimap:survivors");

    // Draw radar circle border using scaled values
    ctx.strokeStyle = RPG_BORDER_GOLD;
    ctx.lineWidth = Math.max(2, Math.round(2 * calculateHudScale(canvasWidth, canvasHeight)));
    ctx.beginPath();
    ctx.arc(scaledLeft + scaledSize / 2, top + scaledSize / 2, scaledSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Draw crosshair at center (player / respawn-bind reference) before biome POIs so campsite H paints on top
    const crosshairSize = scaleHudValue(6, canvasWidth, canvasHeight);
    ctx.strokeStyle = settings.colors.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaledLeft + scaledSize / 2 - crosshairSize, top + scaledSize / 2);
    ctx.lineTo(scaledLeft + scaledSize / 2 + crosshairSize, top + scaledSize / 2);
    ctx.moveTo(scaledLeft + scaledSize / 2, top + scaledSize / 2 - crosshairSize);
    ctx.lineTo(scaledLeft + scaledSize / 2, top + scaledSize / 2 + crosshairSize);
    ctx.stroke();

    // Draw player directional indicators before biome markers so H (campsite) stays on top
    perfTimer.start("minimap:playerIndicators");
    this.renderPlayerIndicators(
      ctx,
      playerEntities,
      playerPos,
      settings,
      top,
      scaledLeft,
      scaledSize,
      gameState,
      myPlayer
    );
    perfTimer.end("minimap:playerIndicators");

    // Biome indicators last among icons so the campsite H is never covered by the center cross or edge arrows
    perfTimer.start("minimap:biomes");
    this.renderBiomeIndicators(ctx, gameState, playerPos, settings, top, scaledLeft, scaledSize);
    perfTimer.end("minimap:biomes");

    ctx.restore();
    perfTimer.end("minimap:total");
  }

  private renderBiomeIndicators(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number,
    scaledLeft: number,
    scaledSize: number
  ): void {
    const biomePositions = this.mapManager.getBiomePositions();
    if (!biomePositions) return;

    const { BIOME_SIZE, TILE_SIZE } = getConfig().world;
    const centerX = scaledLeft + scaledSize / 2;
    const centerY = top + scaledSize / 2;
    const radius = scaledSize / 2;

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

    biomes.forEach(({ name, position, config }) => {
      if (!position) return;

      const worldPos =
        name === "campsite"
          ? getCampsiteMapMarkerWorldPosition(gameState, position, BIOME_SIZE, TILE_SIZE)
          : {
              x: (position.x * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE,
              y: (position.y * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE,
            };
      const biomeWorldX = worldPos.x;
      const biomeWorldY = worldPos.y;

      // Calculate relative position to player
      const relativeX = biomeWorldX - playerPos.x;
      const relativeY = biomeWorldY - playerPos.y;

      // Project biome to minimap; clamp to inner circle edge when off-screen (same inset as before)
      const angle = Math.atan2(relativeY, relativeX);
      const minimapBiomeX = centerX + relativeX * settings.scale;
      const minimapBiomeY = centerY + relativeY * settings.scale;
      const edgeInset = 20;
      const maxDist = radius - edgeInset;
      const distFromCenter = Math.hypot(minimapBiomeX - centerX, minimapBiomeY - centerY);
      const drawX =
        distFromCenter <= maxDist
          ? minimapBiomeX
          : centerX + Math.cos(angle) * maxDist;
      const drawY =
        distFromCenter <= maxDist
          ? minimapBiomeY
          : centerY + Math.sin(angle) * maxDist;

      // Draw the indicator circle
      const indicatorSize = 18;
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, indicatorSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawX, drawY, indicatorSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Draw the label text
      ctx.fillStyle = config.iconColor;
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(config.label, drawX, drawY);
    });
  }

  private renderPlayerIndicators(
    ctx: CanvasRenderingContext2D,
    playerEntities: PlayerClient[],
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number,
    scaledLeft: number,
    scaledSize: number,
    gameState: GameState,
    myPlayer: PlayerClient
  ): void {
    const centerX = scaledLeft + scaledSize / 2;
    const centerY = top + scaledSize / 2;
    const radius = scaledSize / 2;

    // Loop through player entities
    for (const entity of playerEntities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getCenterPosition();

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

      const indicatorColor = settings.colors.player;

      // Draw filled triangle
      ctx.fillStyle = indicatorColor;
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
    crateEntities: CrateClient[],
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number,
    scaledLeft: number,
    scaledSize: number
  ): void {
    const centerX = scaledLeft + scaledSize / 2;
    const centerY = top + scaledSize / 2;
    const maxDistance = MINIMAP_RENDER_DISTANCE.ENTITIES;

    // Loop through crate entities
    for (const entity of crateEntities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getCenterPosition();

      // Calculate relative position to player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;
      const poolManager = PoolManager.getInstance();
      const playerWorldPos = poolManager.vector2.claim(playerPos.x, playerPos.y);
      const entityWorldPos = poolManager.vector2.claim(position.x, position.y);
      const dist = distance(playerWorldPos, entityWorldPos);
      poolManager.vector2.release(playerWorldPos);
      poolManager.vector2.release(entityWorldPos);
      if (dist > maxDistance) continue;

      // Convert to minimap coordinates (centered on player) - using scaled center
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

  private renderSurvivorIndicators(
    ctx: CanvasRenderingContext2D,
    survivorEntities: SurvivorClient[],
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number,
    scaledLeft: number,
    scaledSize: number
  ): void {
    const centerX = scaledLeft + scaledSize / 2;
    const centerY = top + scaledSize / 2;
    const maxDistance = MINIMAP_RENDER_DISTANCE.ENTITIES;

    // Loop through survivor entities
    for (const entity of survivorEntities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getCenterPosition();

      // Calculate relative position to player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;
      const poolManager = PoolManager.getInstance();
      const playerWorldPos = poolManager.vector2.claim(playerPos.x, playerPos.y);
      const entityWorldPos = poolManager.vector2.claim(position.x, position.y);
      const dist = distance(playerWorldPos, entityWorldPos);
      poolManager.vector2.release(playerWorldPos);
      poolManager.vector2.release(entityWorldPos);
      if (dist > maxDistance) continue;

      // Convert to minimap coordinates (centered on player) - using scaled center
      const minimapX = centerX + relativeX * settings.scale;
      const minimapY = centerY + relativeY * settings.scale;

      const isRescued = entity.getIsRescued();
      const iconSize = 16;
      const halfIcon = iconSize / 2;

      // Draw green circle around survivor only if not rescued
      if (!isRescued) {
        const circleRadius = 24;
        ctx.strokeStyle = "rgba(50, 255, 50, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(minimapX, minimapY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner filled circle for visibility
        ctx.fillStyle = "rgba(50, 255, 50, 0.15)";
        ctx.beginPath();
        ctx.arc(minimapX, minimapY, circleRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw survivor icon (simple person shape)
      ctx.fillStyle = "#4CAF50";
      ctx.beginPath();
      // Head (circle)
      ctx.arc(minimapX, minimapY - halfIcon / 2, iconSize / 4, 0, Math.PI * 2);
      ctx.fill();
      // Body (rectangle)
      ctx.fillRect(minimapX - iconSize / 6, minimapY - iconSize / 6, iconSize / 3, iconSize / 2);

      // Draw white border around icon for visibility
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(minimapX, minimapY - halfIcon / 2, iconSize / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(minimapX - iconSize / 6, minimapY - iconSize / 6, iconSize / 3, iconSize / 2);
    }
  }

  // renderToxicZones and renderFogOfWar moved to shared utilities

  // Pre-render all collidables as simplified indicator shapes into a canvas
  private prerenderCollidables(): void {
    const mapData = this.mapManager.getMapData();
    if (!mapData || !mapData.collidables) return;

    // Cache the reference to the current collidables array so we can detect when it changes
    this.cachedCollidablesReference = mapData.collidables;

    const canvas = prerenderCollidables(this.mapManager, {
      colors: { tree: MINIMAP_SETTINGS.colors.tree },
      indicators: {
        tree: {
          shape: MINIMAP_SETTINGS.indicators.tree.shape as "circle" | "rectangle",
          size: MINIMAP_SETTINGS.indicators.tree.size,
        },
      },
    });

    if (canvas) {
      this.collidablesCanvas = canvas;
    }
  }

  // Render collidables using pre-rendered canvas or fallback
  private renderCollidables(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number,
    scaledLeft: number,
    scaledSize: number
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
      this.renderCollidablesFallback(ctx, playerPos, settings, top, scaledLeft, scaledSize, mapData.collidables);
      return;
    }

    // Pre-calculate max distance for performance
    const maxDistance = MINIMAP_RENDER_DISTANCE.COLLIDABLES;

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

    // Calculate center point for minimap (where player is) using scaled values
    const centerX = scaledLeft + scaledSize / 2;
    const centerY = top + scaledSize / 2;

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
    scaledLeft: number,
    scaledSize: number,
    collidables: number[][]
  ): void {
    ctx.fillStyle = settings.colors.tree;

    // Pre-calculate max distance for performance
    const maxDistance = MINIMAP_RENDER_DISTANCE.COLLIDABLES;

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
          const poolManager = PoolManager.getInstance();
          const playerWorldPos = poolManager.vector2.claim(playerPos.x, playerPos.y);
          const tileWorldPos = poolManager.vector2.claim(worldX, worldY);
          const dist = distance(playerWorldPos, tileWorldPos);
          poolManager.vector2.release(playerWorldPos);
          poolManager.vector2.release(tileWorldPos);
          if (dist > maxDistance) continue;

          const minimapX = scaledLeft + scaledSize / 2 + relativeX * settings.scale;
          const minimapY = top + scaledSize / 2 + relativeY * settings.scale;

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
