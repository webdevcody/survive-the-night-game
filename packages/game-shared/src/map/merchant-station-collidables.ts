/**
 * Collidable tile ids that form the merchant stall graphic on `collidables.png`.
 * - Rows with 205–208 / 217–220: 4×2 station used on the authored world map.
 * - Rows with 241–243 / 253–255: 3×2 station used in the procedural merchant biome.
 * The map layer draws these; the merchant entity must not paint a single-tile overlay on top.
 */
export const MERCHANT_STATION_COLLIDABLE_IDS: ReadonlySet<number> = new Set([
  205, 206, 207, 208,
  217, 218, 219, 220,
  241, 242, 243,
  253, 254, 255,
]);
