import { MapManager } from "@/managers/map";
import { getConfig } from "@shared/config";

export interface CollidableRendererSettings {
  colors: {
    tree: string;
  };
  indicators: {
    tree: {
      shape: "circle" | "rectangle";
      size: number;
    };
  };
}

/**
 * Pre-renders collidables as simplified indicator shapes into a canvas
 */
export function prerenderCollidables(
  mapManager: MapManager,
  settings: CollidableRendererSettings
): HTMLCanvasElement | null {
  const mapData = mapManager.getMapData();
  if (!mapData || !mapData.collidables) return null;

  const collidables = mapData.collidables;
  const tileSize = getConfig().world.TILE_SIZE;
  const rows = collidables.length;
  const cols = collidables[0]?.length ?? 0;

  if (rows === 0 || cols === 0) return null;

  // Create a canvas at world coordinates (1:1 scale)
  const canvas = document.createElement("canvas");
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  // Use a semi-transparent fill so overlapping tiles don't completely obscure each other
  ctx.fillStyle = settings.colors.tree;
  const treeIndicator = settings.indicators.tree;
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
        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;

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

  return canvas;
}

/**
 * Render collidables using pre-rendered canvas
 */
export function renderCollidablesFromCanvas(
  ctx: CanvasRenderingContext2D,
  collidablesCanvas: HTMLCanvasElement,
  playerPos: { x: number; y: number },
  centerX: number,
  centerY: number,
  scale: number,
  mapWidth: number,
  mapHeight: number
): void {
  const tileSize = getConfig().world.TILE_SIZE;

  // Calculate visible area in world coordinates
  const visibleWorldWidth = mapWidth / scale;
  const visibleWorldHeight = mapHeight / scale;

  const worldMinX = playerPos.x - visibleWorldWidth / 2;
  const worldMinY = playerPos.y - visibleWorldHeight / 2;
  const worldMaxX = playerPos.x + visibleWorldWidth / 2;
  const worldMaxY = playerPos.y + visibleWorldHeight / 2;

  // Clamp to canvas bounds
  const sourceX = Math.max(0, worldMinX);
  const sourceY = Math.max(0, worldMinY);
  const sourceWidth = Math.min(collidablesCanvas.width - sourceX, worldMaxX - sourceX);
  const sourceHeight = Math.min(collidablesCanvas.height - sourceY, worldMaxY - sourceY);

  // Calculate destination
  const offsetX = (playerPos.x - sourceX) * scale;
  const offsetY = (playerPos.y - sourceY) * scale;
  const destX = centerX - offsetX;
  const destY = centerY - offsetY;
  const destWidth = sourceWidth * scale;
  const destHeight = sourceHeight * scale;

  ctx.save();
  ctx.drawImage(
    collidablesCanvas,
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
