import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { CrateClient } from "@/entities/items/crate";
import { SurvivorClient } from "@/entities/environment/survivor";
import { PlayerClient } from "@/entities/player";
import { ToxicBiomeZoneClient } from "@/entities/environment/toxic-biome-zone";
import { MapManager } from "@/managers/map";
import { getConfig } from "@shared/config";
import { ClientIlluminated } from "@/extensions/illuminated";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { MINIMAP_SETTINGS } from "./minimap";
import { getEntityMapColor } from "@/util/entity-map-colors";
import { distance } from "@shared/util/physics";
import { calculateLightSources } from "./utils/map-rendering-utils";
import { prerenderCollidables, renderCollidablesFromCanvas } from "./utils/map-collidable-renderer";
import { renderFullscreenMapFogOfWar } from "./utils/map-fog-of-war-renderer";
import { renderToxicZones } from "./utils/map-toxic-zone-renderer";

const FULLSCREEN_MAP_SETTINGS = {
  padding: 180, // Padding from screen edges
  background: "rgba(0, 0, 0, 0.95)",
  borderColor: "rgba(255, 255, 255, 0.8)",
  borderWidth: 3,
  headerHeight: 60,
  headerBackground: "rgba(0, 0, 0, 0.95)",
  headerFont: "bold 28px Arial",
  headerColor: "white",
  buttonFont: "24px Arial",
  buttonColor: "white",
  buttonHoverColor: "rgba(255, 255, 255, 0.2)",
  buttonPadding: 12,
  buttonGap: 10,
  zoomLevels: [0.3, 0.5, 0.7, 1.0, 1.5, 2.0], // Available zoom levels
  defaultZoomIndex: 0, // Start at 0.7 (index 2)
  colors: {
    ...MINIMAP_SETTINGS.colors,
    toxicGas: "rgba(0, 255, 0, 0.5)",
  },
  indicators: {
    ...MINIMAP_SETTINGS.indicators,
    toxicGas: {
      shape: "rectangle",
      size: 4,
    },
  },
  biomeIndicators: MINIMAP_SETTINGS.biomeIndicators,
  fogOfWar: MINIMAP_SETTINGS.fogOfWar,
};

// LightSource interface moved to map-rendering-utils

export class FullScreenMap {
  private mapManager: MapManager;
  private isVisible: boolean = false;
  private currentZoomIndex: number = FULLSCREEN_MAP_SETTINGS.defaultZoomIndex;
  private collidablesCanvas: HTMLCanvasElement | null = null;
  private readonly tileSize = getConfig().world.TILE_SIZE;
  private cachedCollidablesReference: number[][] | null = null;
  private zoomInButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private zoomOutButtonBounds: { x: number; y: number; width: number; height: number } | null =
    null;
  private mapOffset: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private isDragging: boolean = false;
  private dragStartPos: { x: number; y: number } | null = null;
  private dragStartOffset: Vector2 | null = null;

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;
    this.prerenderCollidables();
  }

  public toggle(): void {
    const wasVisible = this.isVisible;
    this.isVisible = !this.isVisible;

    // Reset offset when closing map
    if (wasVisible && !this.isVisible) {
      this.mapOffset = PoolManager.getInstance().vector2.claim(0, 0);
      this.isDragging = false;
      this.dragStartPos = null;
      this.dragStartOffset = null;
    }
  }

  public show(): void {
    this.isVisible = true;
  }

  public hide(): void {
    this.isVisible = false;
    // Reset offset when closing map
    this.mapOffset = PoolManager.getInstance().vector2.claim(0, 0);
    this.isDragging = false;
    this.dragStartPos = null;
    this.dragStartOffset = null;
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public zoomIn(): void {
    if (this.currentZoomIndex < FULLSCREEN_MAP_SETTINGS.zoomLevels.length - 1) {
      this.currentZoomIndex++;
    }
  }

  public zoomOut(): void {
    if (this.currentZoomIndex > 0) {
      this.currentZoomIndex--;
    }
  }

  private getCurrentZoom(): number {
    return FULLSCREEN_MAP_SETTINGS.zoomLevels[this.currentZoomIndex];
  }

  // Light source calculation moved to map-rendering-utils

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isVisible) return;

    const settings = FULLSCREEN_MAP_SETTINGS;
    const myPlayer = getPlayer(gameState);
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable)) return;

    const playerPos = myPlayer.getExt(ClientPositionable).getCenterPosition();
    const zoom = this.getCurrentZoom();

    // Calculate effective center position with offset
    const effectiveCenterPos = {
      x: playerPos.x + this.mapOffset.x,
      y: playerPos.y + this.mapOffset.y,
    };

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Calculate map area dimensions
    const mapX = settings.padding;
    const mapY = settings.padding + settings.headerHeight;
    const mapWidth = canvasWidth - settings.padding * 2;
    const mapHeight = canvasHeight - settings.padding * 2 - settings.headerHeight;

    // Draw header background
    ctx.fillStyle = settings.headerBackground;
    ctx.fillRect(settings.padding, settings.padding, mapWidth, settings.headerHeight);

    // Draw header border
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = settings.borderWidth;
    ctx.strokeRect(settings.padding, settings.padding, mapWidth, settings.headerHeight);

    // Draw header text
    ctx.fillStyle = settings.headerColor;
    ctx.font = settings.headerFont;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const headerY = settings.padding + settings.headerHeight / 2;
    ctx.fillText("Map (Press M to close)", settings.padding + 20, headerY);

    // Draw zoom controls in header (right side)
    this.renderZoomControls(ctx, canvasWidth, headerY);

    // Draw map background
    ctx.fillStyle = settings.background;
    ctx.fillRect(mapX, mapY, mapWidth, mapHeight);

    // Clip to map area
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapX, mapY, mapWidth, mapHeight);
    ctx.clip();

    // Calculate center of map area
    const centerX = mapX + mapWidth / 2;
    const centerY = mapY + mapHeight / 2;

    // Draw collidable tiles
    this.renderCollidables(ctx, effectiveCenterPos, zoom, centerX, centerY, mapWidth, mapHeight);

    // Draw toxic biome zones (large areas covering entire biomes)
    const toxicZoneEntities = gameState.entities.filter(
      (e): e is ToxicBiomeZoneClient => e instanceof ToxicBiomeZoneClient
    );
    renderToxicZones(
      ctx,
      toxicZoneEntities,
      effectiveCenterPos,
      { colors: { toxicGas: settings.colors.toxicGas } },
      centerX,
      centerY,
      zoom
    );

    // Draw entities
    this.renderEntities(
      ctx,
      gameState,
      effectiveCenterPos,
      zoom,
      centerX,
      centerY,
      mapWidth,
      mapHeight
    );

    // Draw fog of war
    const lightSources = calculateLightSources(gameState.entities, gameState);
    renderFullscreenMapFogOfWar(
      ctx,
      effectiveCenterPos,
      lightSources,
      settings.fogOfWar,
      zoom,
      centerX,
      centerY,
      mapWidth,
      mapHeight,
      mapX,
      mapY
    );

    // Draw crate indicators (after fog of war so they're always visible)
    this.renderCrateIndicators(
      ctx,
      gameState,
      effectiveCenterPos,
      zoom,
      centerX,
      centerY,
      mapWidth,
      mapHeight
    );

    // Draw survivor indicators (after fog of war so they're always visible)
    this.renderSurvivorIndicators(
      ctx,
      gameState,
      effectiveCenterPos,
      zoom,
      centerX,
      centerY,
      mapWidth,
      mapHeight
    );

    // Draw biome indicators
    this.renderBiomeIndicators(
      ctx,
      effectiveCenterPos,
      zoom,
      centerX,
      centerY,
      mapWidth,
      mapHeight
    );

    ctx.restore(); // Restore from clip

    // Draw map border
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = settings.borderWidth;
    ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);

    // Draw player indicator at actual player position (crosshair)
    const relativeX = playerPos.x - effectiveCenterPos.x;
    const relativeY = playerPos.y - effectiveCenterPos.y;
    const playerScreenX = centerX + relativeX * zoom;
    const playerScreenY = centerY + relativeY * zoom;
    const crosshairSize = 8;
    ctx.strokeStyle = settings.colors.player;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playerScreenX - crosshairSize, playerScreenY);
    ctx.lineTo(playerScreenX + crosshairSize, playerScreenY);
    ctx.moveTo(playerScreenX, playerScreenY - crosshairSize);
    ctx.lineTo(playerScreenX, playerScreenY + crosshairSize);
    ctx.stroke();

    ctx.restore();
  }

  private renderZoomControls(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    headerY: number
  ): void {
    const settings = FULLSCREEN_MAP_SETTINGS;
    const buttonY = headerY;

    ctx.font = settings.buttonFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Calculate the rightmost position for the zoom controls (inside the map bounds)
    const mapRight = canvasWidth - settings.padding;
    const buttonSize = 30;

    // Zoom level text
    const zoomText = `Zoom: ${Math.round(this.getCurrentZoom() * 100)}%`;
    const zoomTextWidth = ctx.measureText(zoomText).width;

    // Position everything from right to left, ensuring it stays within bounds
    // Start with zoom in button at the right edge (with some padding)
    const zoomInX = mapRight - buttonSize - 20;
    const zoomInY = buttonY - buttonSize / 2;

    this.zoomInButtonBounds = {
      x: zoomInX,
      y: zoomInY,
      width: buttonSize,
      height: buttonSize,
    };

    ctx.fillStyle =
      this.currentZoomIndex < FULLSCREEN_MAP_SETTINGS.zoomLevels.length - 1
        ? settings.buttonColor
        : "rgba(255, 255, 255, 0.3)";
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(zoomInX, zoomInY, buttonSize, buttonSize);
    ctx.fillText("+", zoomInX + buttonSize / 2, buttonY);

    // Zoom text to the left of the + button
    const zoomTextX = zoomInX - settings.buttonGap - zoomTextWidth / 2;
    ctx.fillStyle = settings.buttonColor;
    ctx.fillText(zoomText, zoomTextX, buttonY);

    // Zoom out button to the left of the text
    const zoomOutX = zoomTextX - zoomTextWidth / 2 - settings.buttonGap - buttonSize;
    const zoomOutY = buttonY - buttonSize / 2;

    this.zoomOutButtonBounds = {
      x: zoomOutX,
      y: zoomOutY,
      width: buttonSize,
      height: buttonSize,
    };

    ctx.fillStyle = this.currentZoomIndex > 0 ? settings.buttonColor : "rgba(255, 255, 255, 0.3)";
    ctx.strokeStyle = settings.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(zoomOutX, zoomOutY, buttonSize, buttonSize);
    ctx.fillText("-", zoomOutX + buttonSize / 2, buttonY);
  }

  private prerenderCollidables(): void {
    const mapData = this.mapManager.getMapData();
    if (!mapData || !mapData.collidables) return;

    // Cache the reference to the current collidables array so we can detect when it changes
    this.cachedCollidablesReference = mapData.collidables;

    const canvas = prerenderCollidables(this.mapManager, {
      colors: { tree: FULLSCREEN_MAP_SETTINGS.colors.tree },
      indicators: {
        tree: {
          shape: FULLSCREEN_MAP_SETTINGS.indicators.tree.shape as "circle" | "rectangle",
          size: FULLSCREEN_MAP_SETTINGS.indicators.tree.size,
        },
      },
    });

    if (canvas) {
      this.collidablesCanvas = canvas;
    }
  }

  private renderCollidables(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    zoom: number,
    centerX: number,
    centerY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    const mapData = this.mapManager.getMapData();
    if (!mapData || !mapData.collidables) return;

    // Check if canvas needs recreation
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

    if (!this.collidablesCanvas) return;

    renderCollidablesFromCanvas(
      ctx,
      this.collidablesCanvas,
      playerPos,
      centerX,
      centerY,
      zoom,
      mapWidth,
      mapHeight
    );
  }

  private renderEntities(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    playerPos: { x: number; y: number },
    zoom: number,
    centerX: number,
    centerY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    const settings = FULLSCREEN_MAP_SETTINGS;
    const maxDistance = Math.sqrt(((mapWidth / zoom) ** 2 + (mapHeight / zoom) ** 2) / 4);

    // Battle Royale: limit player visibility range (approx 200 pixels / ~12 tiles)
    const isBattleRoyale = gameState.gameMode === "battle_royale";
    const isInfection = gameState.gameMode === "infection";
    const playerVisibilityRange = 200;

    // Get the actual player position for distance calculations (not the map center)
    const myPlayer = getPlayer(gameState);
    const myPlayerIsZombie = myPlayer?.isZombiePlayer() ?? false;
    const myPlayerPos = myPlayer?.hasExt(ClientPositionable)
      ? myPlayer.getExt(ClientPositionable).getCenterPosition()
      : playerPos;

    for (const entity of gameState.entities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getCenterPosition();

      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;
      const poolManager = PoolManager.getInstance();
      const relativePos = poolManager.vector2.claim(relativeX, relativeY);
      const playerWorldPos = poolManager.vector2.claim(playerPos.x, playerPos.y);
      const entityWorldPos = poolManager.vector2.claim(position.x, position.y);
      const dist = distance(playerWorldPos, entityWorldPos);
      poolManager.vector2.release(relativePos);
      poolManager.vector2.release(playerWorldPos);
      poolManager.vector2.release(entityWorldPos);

      // In Infection mode, zombie players can see ALL human players anywhere on the map
      let shouldRender = dist <= maxDistance;
      if (!shouldRender && isInfection && myPlayerIsZombie && entity instanceof PlayerClient) {
        const otherPlayerIsZombie = entity.isZombiePlayer();
        // Zombies can see all human players regardless of distance
        if (!otherPlayerIsZombie) {
          shouldRender = true;
        }
      }

      if (!shouldRender) continue;

      // In Battle Royale, only show other players if they're within visibility range of the actual player
      if (
        isBattleRoyale &&
        entity instanceof PlayerClient &&
        entity.getId() !== gameState.playerId
      ) {
        const myPlayerWorldPos = poolManager.vector2.claim(myPlayerPos.x, myPlayerPos.y);
        const entityWorldPos = poolManager.vector2.claim(position.x, position.y);
        const playerDist = distance(myPlayerWorldPos, entityWorldPos);
        poolManager.vector2.release(myPlayerWorldPos);
        poolManager.vector2.release(entityWorldPos);
        if (playerDist > playerVisibilityRange) continue;
      }

      const mapX = centerX + relativeX * zoom;
      const mapY = centerY + relativeY * zoom;

      // Get entity color and indicator using shared utility
      const mapIndicator = getEntityMapColor(entity, settings, {
        gameState,
        myPlayerId: gameState.playerId,
        myPlayerIsZombie: myPlayer?.isZombiePlayer() ?? false,
      });
      if (!mapIndicator) {
        // Skip entities that return null (e.g., crates)
        continue;
      }

      const { color, indicator } = mapIndicator;

      if (color && indicator) {
        ctx.fillStyle = color;
        const size = indicator.size * Math.max(1, zoom);
        const halfSize = size / 2;

        if (indicator.shape === "circle") {
          ctx.beginPath();
          ctx.arc(mapX, mapY, halfSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(mapX - halfSize, mapY - halfSize, size, size);
        }
      }
    }
  }

  // renderFogOfWar moved to shared utilities

  private renderCrateIndicators(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    playerPos: { x: number; y: number },
    zoom: number,
    centerX: number,
    centerY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    const maxDistance = Math.sqrt(((mapWidth / zoom) ** 2 + (mapHeight / zoom) ** 2) / 4);

    // Loop through all entities to find crates
    for (const entity of gameState.entities) {
      if (!(entity instanceof CrateClient)) continue;
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getCenterPosition();

      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;
      const poolManager = PoolManager.getInstance();
      const playerWorldPos = poolManager.vector2.claim(playerPos.x, playerPos.y);
      const entityWorldPos = poolManager.vector2.claim(position.x, position.y);
      const dist = distance(playerWorldPos, entityWorldPos);
      poolManager.vector2.release(playerWorldPos);
      poolManager.vector2.release(entityWorldPos);
      if (dist > maxDistance) continue;

      const mapX = centerX + relativeX * zoom;
      const mapY = centerY + relativeY * zoom;

      // Draw crate indicator with red circle
      const iconSize = 24 * Math.max(0.5, zoom);
      const halfIcon = iconSize / 2;

      // Draw red circle around crate first
      const circleRadius = 40 * Math.max(0.5, zoom);
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 2 * Math.max(0.5, zoom);
      ctx.beginPath();
      ctx.arc(mapX, mapY, circleRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw inner filled circle for visibility
      ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
      ctx.beginPath();
      ctx.arc(mapX, mapY, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw crate background (brown/tan color)
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(mapX - halfIcon, mapY - halfIcon, iconSize, iconSize);

      // Draw crate border/outline
      ctx.strokeStyle = "#654321";
      ctx.lineWidth = 1.5 * Math.max(0.5, zoom);
      ctx.strokeRect(mapX - halfIcon, mapY - halfIcon, iconSize, iconSize);

      // Draw crate details (horizontal planks)
      ctx.strokeStyle = "#654321";
      ctx.lineWidth = 1 * Math.max(0.5, zoom);
      const plankOffset = iconSize / 3;
      ctx.beginPath();
      ctx.moveTo(mapX - halfIcon, mapY - halfIcon + plankOffset);
      ctx.lineTo(mapX + halfIcon, mapY - halfIcon + plankOffset);
      ctx.moveTo(mapX - halfIcon, mapY - halfIcon + plankOffset * 2);
      ctx.lineTo(mapX + halfIcon, mapY - halfIcon + plankOffset * 2);
      ctx.stroke();

      // Draw white border around icon for visibility
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2 * Math.max(0.5, zoom);
      ctx.strokeRect(mapX - halfIcon, mapY - halfIcon, iconSize, iconSize);
    }
  }

  private renderSurvivorIndicators(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    playerPos: { x: number; y: number },
    zoom: number,
    centerX: number,
    centerY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    const maxDistance = Math.sqrt(((mapWidth / zoom) ** 2 + (mapHeight / zoom) ** 2) / 4);

    // Loop through all entities to find survivors
    for (const entity of gameState.entities) {
      if (!(entity instanceof SurvivorClient)) continue;
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getCenterPosition();

      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;
      const poolManager = PoolManager.getInstance();
      const playerWorldPos = poolManager.vector2.claim(playerPos.x, playerPos.y);
      const entityWorldPos = poolManager.vector2.claim(position.x, position.y);
      const dist = distance(playerWorldPos, entityWorldPos);
      poolManager.vector2.release(playerWorldPos);
      poolManager.vector2.release(entityWorldPos);
      if (dist > maxDistance) continue;

      const mapX = centerX + relativeX * zoom;
      const mapY = centerY + relativeY * zoom;

      const isRescued = entity.getIsRescued();
      const iconSize = 24 * Math.max(0.5, zoom);
      const halfIcon = iconSize / 2;

      // Draw green circle around survivor only if not rescued
      if (!isRescued) {
        const circleRadius = 40 * Math.max(0.5, zoom);
        ctx.strokeStyle = "rgba(50, 255, 50, 0.8)";
        ctx.lineWidth = 2 * Math.max(0.5, zoom);
        ctx.beginPath();
        ctx.arc(mapX, mapY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner filled circle for visibility
        ctx.fillStyle = "rgba(50, 255, 50, 0.15)";
        ctx.beginPath();
        ctx.arc(mapX, mapY, circleRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw survivor icon (simple person shape)
      ctx.fillStyle = "#4CAF50";
      ctx.beginPath();
      // Head (circle)
      ctx.arc(mapX, mapY - halfIcon / 2, iconSize / 4, 0, Math.PI * 2);
      ctx.fill();
      // Body (rectangle)
      ctx.fillRect(mapX - iconSize / 6, mapY - iconSize / 6, iconSize / 3, iconSize / 2);

      // Draw white border around icon for visibility
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2 * Math.max(0.5, zoom);
      ctx.beginPath();
      ctx.arc(mapX, mapY - halfIcon / 2, iconSize / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(mapX - iconSize / 6, mapY - iconSize / 6, iconSize / 3, iconSize / 2);
    }
  }

  private renderBiomeIndicators(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    zoom: number,
    centerX: number,
    centerY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    const biomePositions = this.mapManager.getBiomePositions();
    if (!biomePositions) return;

    const settings = FULLSCREEN_MAP_SETTINGS;
    const { BIOME_SIZE, TILE_SIZE } = getConfig().world;

    const biomes = [
      { position: biomePositions.farm, config: settings.biomeIndicators.farm },
      { position: biomePositions.city, config: settings.biomeIndicators.city },
      { position: biomePositions.gasStation, config: settings.biomeIndicators.gasStation },
      { position: biomePositions.campsite, config: settings.biomeIndicators.campsite },
      { position: biomePositions.dock, config: settings.biomeIndicators.dock },
      { position: biomePositions.shed, config: settings.biomeIndicators.shed },
    ];

    if (biomePositions.merchants) {
      biomePositions.merchants.forEach((merchantPos) => {
        biomes.push({
          position: merchantPos,
          config: settings.biomeIndicators.merchant,
        });
      });
    }

    biomes.forEach(({ position, config }) => {
      if (!position) return;

      const biomeWorldX = (position.x * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;
      const biomeWorldY = (position.y * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;

      const relativeX = biomeWorldX - playerPos.x;
      const relativeY = biomeWorldY - playerPos.y;

      const biomeX = centerX + relativeX * zoom;
      const biomeY = centerY + relativeY * zoom;

      // Only draw if within map bounds
      const indicatorSize = 28 * Math.max(0.5, zoom);
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.arc(biomeX, biomeY, indicatorSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(biomeX, biomeY, indicatorSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = config.iconColor;
      ctx.font = `bold ${Math.round(18 * Math.max(0.5, zoom))}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(config.label, biomeX, biomeY);
    });
  }

  // renderToxicZones moved to shared utilities

  public handleClick(x: number, y: number): boolean {
    if (!this.isVisible) return false;

    // Check zoom in button
    if (this.zoomInButtonBounds) {
      const { x: btnX, y: btnY, width, height } = this.zoomInButtonBounds;
      if (x >= btnX && x <= btnX + width && y >= btnY && y <= btnY + height) {
        this.zoomIn();
        return true;
      }
    }

    // Check zoom out button
    if (this.zoomOutButtonBounds) {
      const { x: btnX, y: btnY, width, height } = this.zoomOutButtonBounds;
      if (x >= btnX && x <= btnX + width && y >= btnY && y <= btnY + height) {
        this.zoomOut();
        return true;
      }
    }

    // Try to start drag if click is in map area
    return this.handleMouseDown(x, y);
  }

  public handleMouseDown(x: number, y: number): boolean {
    if (!this.isVisible) return false;

    const settings = FULLSCREEN_MAP_SETTINGS;
    const mapX = settings.padding;
    const mapY = settings.padding + settings.headerHeight;

    // Check if click is within map bounds (excluding header)
    // We need canvas dimensions, but we can estimate or store them
    // For now, we'll check if it's below the header
    if (y < mapY) return false; // Above map area (header)

    // Check if click is on zoom buttons (already handled in handleClick)
    if (this.zoomInButtonBounds) {
      const { x: btnX, y: btnY, width, height } = this.zoomInButtonBounds;
      if (x >= btnX && x <= btnX + width && y >= btnY && y <= btnY + height) {
        return false; // Clicked on zoom button
      }
    }

    if (this.zoomOutButtonBounds) {
      const { x: btnX, y: btnY, width, height } = this.zoomOutButtonBounds;
      if (x >= btnX && x <= btnX + width && y >= btnY && y <= btnY + height) {
        return false; // Clicked on zoom button
      }
    }

    // Start drag
    this.isDragging = true;
    this.dragStartPos = { x, y };
    const poolManager = PoolManager.getInstance();
    this.dragStartOffset = poolManager.vector2.claim(this.mapOffset.x, this.mapOffset.y);
    return true;
  }

  public handleMouseMove(x: number, y: number): void {
    if (!this.isVisible || !this.isDragging || !this.dragStartPos || !this.dragStartOffset) {
      return;
    }

    // Calculate screen movement
    const dx = x - this.dragStartPos.x;
    const dy = y - this.dragStartPos.y;

    // Convert screen movement to world movement based on zoom
    const zoom = this.getCurrentZoom();
    const worldDx = -dx / zoom; // Negative because dragging right should move map left
    const worldDy = -dy / zoom;

    // Update offset
    this.mapOffset.x = this.dragStartOffset.x + worldDx;
    this.mapOffset.y = this.dragStartOffset.y + worldDy;
  }

  public handleMouseUp(): void {
    if (!this.isVisible) return;
    this.isDragging = false;
    this.dragStartPos = null;
    this.dragStartOffset = null;
  }
}
