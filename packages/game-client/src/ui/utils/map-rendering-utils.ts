import { GameState, getEntitiesByType } from "@/state";
import { ClientPositionable } from "@/extensions/positionable";

/**
 * World positions for campsite (H) map markers: one per `campsite_fire` entity when present,
 * otherwise a single fallback at the biome cell center.
 */
export function getCampsiteMapMarkerWorldPositions(
  gameState: GameState,
  campsiteBiomeCell: { x: number; y: number },
  biomeSize: number,
  tileSize: number,
): Array<{ x: number; y: number }> {
  const fires = getEntitiesByType(gameState, "campsite_fire");
  const out: Array<{ x: number; y: number }> = [];
  for (const entity of fires) {
    if (entity.hasExt(ClientPositionable)) {
      const c = entity.getExt(ClientPositionable).getCenterPosition();
      out.push({ x: c.x, y: c.y });
    }
  }
  if (out.length > 0) {
    return out;
  }
  return [
    {
      x: (campsiteBiomeCell.x * biomeSize + biomeSize / 2) * tileSize,
      y: (campsiteBiomeCell.y * biomeSize + biomeSize / 2) * tileSize,
    },
  ];
}

export function getCampsiteMapMarkerWorldPosition(
  gameState: GameState,
  campsiteBiomeCell: { x: number; y: number },
  biomeSize: number,
  tileSize: number,
): { x: number; y: number } {
  return getCampsiteMapMarkerWorldPositions(gameState, campsiteBiomeCell, biomeSize, tileSize)[0];
}

export function worldToMapCoordinates(
  worldX: number,
  worldY: number,
  playerPos: { x: number; y: number },
  centerX: number,
  centerY: number,
  scale: number,
): { x: number; y: number } {
  const relativeX = worldX - playerPos.x;
  const relativeY = worldY - playerPos.y;
  return {
    x: centerX + relativeX * scale,
    y: centerY + relativeY * scale,
  };
}

export function mapToWorldCoordinates(
  mapX: number,
  mapY: number,
  playerPos: { x: number; y: number },
  centerX: number,
  centerY: number,
  scale: number,
): { x: number; y: number } {
  const relativeX = (mapX - centerX) / scale;
  const relativeY = (mapY - centerY) / scale;
  return {
    x: playerPos.x + relativeX,
    y: playerPos.y + relativeY,
  };
}
