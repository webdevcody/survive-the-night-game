/**
 * Persistent minimap / fullscreen map exploration: sparse chunk bitsets.
 * Chunks are keyed "chunkX,chunkY" in tile-chunk space (each chunk is chunkSize × chunkSize tiles).
 */

import type { WorldConfig } from "../config/world-config";

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin);
}

function base64ToBytes(base64: string, byteLength: number): Uint8Array {
  const out = new Uint8Array(byteLength);
  if (typeof Buffer !== "undefined") {
    const raw = Buffer.from(base64, "base64");
    out.set(raw.subarray(0, byteLength));
    return out;
  }
  const bin = atob(base64);
  for (let i = 0; i < Math.min(bin.length, byteLength); i++) {
    out[i] = bin.charCodeAt(i) & 0xff;
  }
  return out;
}

export const MAP_EXPLORATION_FORMAT_VERSION = 1 as const;

export interface MapExplorationPersistedPayload {
  v: typeof MAP_EXPLORATION_FORMAT_VERSION;
  /** Stable key when world dimensions / seed change; clients discard mismatched data. */
  worldKey: string;
  chunkSize: number;
  rows: number;
  cols: number;
  chunks: Record<string, string>;
}

export function buildMapExplorationWorldKey(world: Pick<WorldConfig, "BIOME_SIZE" | "MAP_SIZE" | "MAP_SEED">): string {
  const n = world.BIOME_SIZE * world.MAP_SIZE;
  return `v1:${world.BIOME_SIZE}x${world.MAP_SIZE}:${world.MAP_SEED}:${n}`;
}

export function getDefaultMapExplorationPayload(
  world: Pick<WorldConfig, "BIOME_SIZE" | "MAP_SIZE" | "MAP_SEED">,
  chunkSize: number,
): MapExplorationPersistedPayload {
  const rows = world.BIOME_SIZE * world.MAP_SIZE;
  const cols = rows;
  return {
    v: MAP_EXPLORATION_FORMAT_VERSION,
    worldKey: buildMapExplorationWorldKey(world),
    chunkSize,
    rows,
    cols,
    chunks: {},
  };
}

function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

/** Base64 (standard) of chunk bits; little-endian within each byte, row-major within chunk. */
export function encodeChunkBits(bits: Uint8Array): string {
  return bytesToBase64(bits);
}

export function decodeChunkBitsToBuffer(base64: string, byteLength: number): Uint8Array {
  return base64ToBytes(base64, byteLength);
}

function getChunkByteSize(chunkSize: number): number {
  const tiles = chunkSize * chunkSize;
  return Math.ceil(tiles / 8);
}

export function isCompatibleExplorationPayload(
  payload: MapExplorationPersistedPayload | null | undefined,
  worldKey: string,
  rows: number,
  cols: number,
  chunkSize: number,
): payload is MapExplorationPersistedPayload {
  if (!payload || payload.v !== MAP_EXPLORATION_FORMAT_VERSION) return false;
  if (payload.worldKey !== worldKey) return false;
  if (payload.chunkSize !== chunkSize || payload.rows !== rows || payload.cols !== cols) return false;
  return true;
}

/**
 * Merge incoming chunk strings into target (mutates target.chunks).
 */
export function mergeExplorationChunks(
  target: MapExplorationPersistedPayload,
  incoming: Record<string, string>,
): void {
  for (const k of Object.keys(incoming)) {
    const v = incoming[k];
    if (typeof v === "string" && v.length > 0) {
      target.chunks[k] = v;
    }
  }
}

/**
 * Reveal all tiles whose centers fall within a circle in world pixels. Mutates chunk buffers in payload.chunks.
 * Returns list of chunk keys that were modified (for persistence).
 */
export function revealTilesInCircle(
  payload: MapExplorationPersistedPayload,
  centerX: number,
  centerY: number,
  radiusPx: number,
  tileSize: number,
): string[] {
  const { chunkSize, rows, cols } = payload;
  const byteLen = getChunkByteSize(chunkSize);
  const rTiles = radiusPx / tileSize;
  const cxCenter = centerX / tileSize;
  const cyCenter = centerY / tileSize;
  const t0x = Math.floor(cxCenter - rTiles);
  const t0y = Math.floor(cyCenter - rTiles);
  const t1x = Math.ceil(cxCenter + rTiles);
  const t1y = Math.ceil(cyCenter + rTiles);

  const chunkBuffers = new Map<string, Uint8Array>();
  const modifiedKeys: string[] = [];

  const getBuffer = (ck: string): Uint8Array => {
    let buf = chunkBuffers.get(ck);
    if (!buf) {
      const existing = payload.chunks[ck];
      if (existing) {
        buf = decodeChunkBitsToBuffer(existing, byteLen);
      } else {
        buf = new Uint8Array(byteLen);
      }
      chunkBuffers.set(ck, buf);
    }
    return buf;
  };

  const r2 = rTiles * rTiles;

  for (let ty = Math.max(0, t0y); ty < Math.min(rows, t1y); ty++) {
    for (let tx = Math.max(0, t0x); tx < Math.min(cols, t1x); tx++) {
      const dx = tx + 0.5 - cxCenter;
      const dy = ty + 0.5 - cyCenter;
      if (dx * dx + dy * dy > r2) continue;

      const cx = Math.floor(tx / chunkSize);
      const cy = Math.floor(ty / chunkSize);
      const lx = tx - cx * chunkSize;
      const ly = ty - cy * chunkSize;
      const bitIndex = ly * chunkSize + lx;
      const byteIndex = bitIndex >> 3;
      const bit = bitIndex & 7;
      const ck = chunkKey(cx, cy);
      const buf = getBuffer(ck);
      const mask = 1 << bit;
      if ((buf[byteIndex]! & mask) !== 0) continue;
      buf[byteIndex]! |= mask;
      if (!modifiedKeys.includes(ck)) {
        modifiedKeys.push(ck);
      }
    }
  }

  for (const ck of modifiedKeys) {
    const buf = chunkBuffers.get(ck);
    if (buf) {
      payload.chunks[ck] = encodeChunkBits(buf);
    }
  }

  return modifiedKeys;
}

export function isTileExplored(
  payload: MapExplorationPersistedPayload,
  tileX: number,
  tileY: number,
): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= payload.cols || tileY >= payload.rows) return false;
  const { chunkSize } = payload;
  const cx = Math.floor(tileX / chunkSize);
  const cy = Math.floor(tileY / chunkSize);
  const lx = tileX - cx * chunkSize;
  const ly = tileY - cy * chunkSize;
  const ck = chunkKey(cx, cy);
  const b64 = payload.chunks[ck];
  if (!b64) return false;
  const byteLen = getChunkByteSize(chunkSize);
  const buf = decodeChunkBitsToBuffer(b64, byteLen);
  const bitIndex = ly * chunkSize + lx;
  const byteIndex = bitIndex >> 3;
  const bit = bitIndex & 7;
  return ((buf[byteIndex] ?? 0) & (1 << bit)) !== 0;
}

export function coerceMapExplorationPayload(raw: unknown): MapExplorationPersistedPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== MAP_EXPLORATION_FORMAT_VERSION) return null;
  if (typeof o.worldKey !== "string" || !o.worldKey) return null;
  if (typeof o.chunkSize !== "number" || !Number.isFinite(o.chunkSize) || o.chunkSize < 4 || o.chunkSize > 64) {
    return null;
  }
  if (typeof o.rows !== "number" || typeof o.cols !== "number") return null;
  if (!o.chunks || typeof o.chunks !== "object") return null;
  const chunks: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.chunks as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 0) {
      chunks[k] = v;
    }
  }
  return {
    v: MAP_EXPLORATION_FORMAT_VERSION,
    worldKey: o.worldKey,
    chunkSize: Math.floor(o.chunkSize),
    rows: Math.floor(o.rows),
    cols: Math.floor(o.cols),
    chunks,
  };
}
