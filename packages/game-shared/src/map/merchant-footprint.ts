/**
 * World-map shopkeeper decal (and standalone `COLLIDABLE_TILE_MERCHANT`) is placed on the
 * **bottom-right** tile of the stall. The stall art and collision cover a 3×2 tile rectangle
 * extending left and up from that anchor tile.
 */
export const MERCHANT_FOOTPRINT_TILES_W = 3;
export const MERCHANT_FOOTPRINT_TILES_H = 2;

/** Anchor tile (x, y) → footprint top-left tile (x + dx, y + dy). */
export const MERCHANT_FOOTPRINT_TOP_LEFT_TILE_DX = -(MERCHANT_FOOTPRINT_TILES_W - 1);
export const MERCHANT_FOOTPRINT_TOP_LEFT_TILE_DY = -(MERCHANT_FOOTPRINT_TILES_H - 1);
