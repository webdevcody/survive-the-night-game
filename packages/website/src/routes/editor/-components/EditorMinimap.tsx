import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "../-store";
import { getMapSideLength } from "../-utils";

const MINIMAP_CSS_PX = 220;
/** Full minimap cache rebuild is O(mapSize²); debounce so rapid painting does not block the main thread every stroke. */
const MINIMAP_CACHE_DEBOUNCE_MS = 150;

function groundFillStyle(tileId: number): string {
  const h = (tileId * 47) % 360;
  return `hsl(${h} 32% 36%)`;
}

function collidableFillStyle(tileId: number): string {
  const h = (tileId * 59) % 360;
  return `hsla(${h} 45% 28% / 0.88)`;
}

export function EditorMinimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<HTMLCanvasElement | null>(null);
  const groundGridRef = useRef<number[][]>([]);
  const collidablesGridRef = useRef<number[][]>([]);
  const minimapFirstCacheDoneRef = useRef(false);

  const groundGrid = useEditorStore((s) => s.groundGrid);
  const collidablesGrid = useEditorStore((s) => s.collidablesGrid);
  groundGridRef.current = groundGrid;
  collidablesGridRef.current = collidablesGrid;
  const cameraX = useEditorStore((s) => s.cameraX);
  const cameraY = useEditorStore((s) => s.cameraY);
  const viewportWidthTiles = useEditorStore((s) => s.viewportWidthTiles);
  const viewportHeightTiles = useEditorStore((s) => s.viewportHeightTiles);
  const setCamera = useEditorStore((s) => s.setCamera);

  const mapSize = getMapSideLength(groundGrid);

  const paintFromCache = useCallback(() => {
    const canvas = canvasRef.current;
    const cache = cacheRef.current;
    if (!canvas || !cache) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = MINIMAP_CSS_PX;
    if (canvas.width !== Math.round(size * dpr) || canvas.height !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cache, 0, 0, canvas.width, canvas.height);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vx = (cameraX / mapSize) * size;
    const vy = (cameraY / mapSize) * size;
    const vw = (viewportWidthTiles / mapSize) * size;
    const vh = (viewportHeightTiles / mapSize) * size;

    ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(vx + 0.5, vy + 0.5, Math.max(0, vw - 1), Math.max(0, vh - 1));

    ctx.fillStyle = "rgba(250, 204, 21, 0.12)";
    ctx.fillRect(vx, vy, vw, vh);
  }, [
    cameraX,
    cameraY,
    viewportWidthTiles,
    viewportHeightTiles,
    mapSize,
  ]);

  const paintRef = useRef(paintFromCache);
  paintRef.current = paintFromCache;

  useEffect(() => {
    const delay = minimapFirstCacheDoneRef.current ? MINIMAP_CACHE_DEBOUNCE_MS : 0;
    const id = window.setTimeout(() => {
      const g = groundGridRef.current;
      const c = collidablesGridRef.current;
      const ms = getMapSideLength(g);

      const size = MINIMAP_CSS_PX;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(size * dpr);
      const h = Math.round(size * dpr);

      let off = cacheRef.current;
      if (!off) {
        off = document.createElement("canvas");
        cacheRef.current = off;
      }
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      if (!octx) return;

      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.fillStyle = "rgba(0, 0, 0, 0.75)";
      octx.fillRect(0, 0, size, size);

      const tileW = size / ms;
      const tileH = size / ms;
      const pad = 0.6;

      for (let r = 0; r < ms; r++) {
        const rowG = g[r];
        const rowC = c[r];
        if (!rowG || !rowC) continue;
        for (let col = 0; col < ms; col++) {
          const x = col * tileW;
          const y = r * tileH;
          octx.fillStyle = groundFillStyle(rowG[col] ?? 0);
          octx.fillRect(x, y, tileW + pad, tileH + pad);
          const cid = rowC[col];
          if (cid !== undefined && cid !== -1) {
            octx.fillStyle = collidableFillStyle(cid);
            octx.fillRect(x, y, tileW + pad, tileH + pad);
          }
        }
      }

      minimapFirstCacheDoneRef.current = true;
      paintRef.current();
    }, delay);
    return () => window.clearTimeout(id);
  }, [groundGrid, collidablesGrid, mapSize]);

  useEffect(() => {
    paintFromCache();
  }, [paintFromCache]);

  useEffect(() => {
    const onResize = () => paintFromCache();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [paintFromCache]);

  const navigateToClient = useCallback(
    (clientX: number, clientY: number, target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      const clampedNx = Math.min(1, Math.max(0, nx));
      const clampedNy = Math.min(1, Math.max(0, ny));
      const tileX = clampedNx * mapSize;
      const tileY = clampedNy * mapSize;
      setCamera(
        Math.round(tileX - viewportWidthTiles / 2),
        Math.round(tileY - viewportHeightTiles / 2),
      );
    },
    [mapSize, setCamera, viewportWidthTiles, viewportHeightTiles],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    navigateToClient(e.clientX, e.clientY, e.currentTarget);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if ((e.buttons & 1) === 0) return;
    e.preventDefault();
    navigateToClient(e.clientX, e.clientY, e.currentTarget);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 z-30 rounded-none border border-gray-600 bg-black/80 shadow-lg ring-1 ring-gray-700/80">
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair"
        width={MINIMAP_CSS_PX}
        height={MINIMAP_CSS_PX}
        style={{ width: MINIMAP_CSS_PX, height: MINIMAP_CSS_PX }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
    </div>
  );
}
