import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useEditorStore } from "../-store";
import { getConfig } from "@survive-the-night/game-shared/config";
import { getMapSideLength } from "../-utils";
import {
  SPAWN_PALETTE_ENTRIES,
  getSpawnTileShortLabel,
  isNpcDialogueSpawnTile,
} from "@survive-the-night/game-shared/map/spawn-palette";
import {
  DECAL_PALETTE_ENTRIES,
  DECAL_TILE_MESSAGE,
  getDecalPaletteShortLabel,
} from "@survive-the-night/game-shared/map/decal-palette";
import { getMessageDecalLines } from "@survive-the-night/game-shared/map/world-map-types";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

/** Full-viewport map canvas only — UI lives in overlay panels. */
export function TileMapEditor() {
  const activeLayer = useEditorStore((state) => state.activeLayer);

  const handleGridCellClick = useEditorStore((state) => state.handleGridCellClick);
  const saveToHistory = useEditorStore((state) => state.saveToHistory);
  const setIsDragging = useEditorStore((state) => state.setIsDragging);
  const setHasModifiedDuringDrag = useEditorStore((state) => state.setHasModifiedDuringDrag);
  const isDragging = useEditorStore((state) => state.isDragging);
  const panCamera = useEditorStore((state) => state.panCamera);
  const setViewportSize = useEditorStore((state) => state.setViewportSize);
  const editorTilePixelSize = useEditorStore((state) => state.editorTilePixelSize);
  const adjustEditorTilePixelSizeFromWheelPixelDelta = useEditorStore(
    (state) => state.adjustEditorTilePixelSizeFromWheelPixelDelta,
  );
  const isFillBucketMode = useEditorStore((state) => state.isFillBucketMode);
  const clipboard = useEditorStore((state) => state.clipboard);
  const sidebarSection = useEditorStore((state) => state.sidebarSection);
  const questWaypointPickTarget = useEditorStore((state) => state.questWaypointPickTarget);
  const spawnerSidebarMode = useEditorStore((state) => state.spawnerSidebarMode);
  const spawnerPlaceTileId = useEditorStore((state) => state.spawnerPlaceTileId);
  const canPaintTiles = sidebarSection === "tiles";
  const questWaypointPickActive = Boolean(questWaypointPickTarget);
  const spawnerPlaceActive =
    sidebarSection === "spawners" &&
    spawnerSidebarMode === "place" &&
    spawnerPlaceTileId != null &&
    spawnerPlaceTileId > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverCellRef = useRef<{ row: number; col: number } | null>(null);
  const lastDragCellRef = useRef<{ row: number; col: number } | null>(null);
  const schedulePaintRef = useRef<() => void>(() => {});

  /** Cell where pointer went down — `mouseEnter` does not fire for that cell until leaving and re-entering. */
  const dragStartCellRef = useRef<{ row: number; col: number } | null>(null);
  const dragPaintedInitialRef = useRef(false);
  /** After a drag stroke, suppress the synthetic `click` so collidable/spawn toggle logic does not double-apply. */
  const suppressNextCellClickRef = useRef(false);

  /** Shift+primary-drag pans the camera; pan is decided by shift at pointerdown only. */
  const isPanningRef = useRef(false);
  const panLastClientRef = useRef({ x: 0, y: 0 });
  const panPixelAccRef = useRef({ x: 0, y: 0 });
  /** Trackpad / mouse wheel: accumulate pixel deltas, convert to tile steps (same scale as shift-drag). */
  const wheelPanAccRef = useRef({ x: 0, y: 0 });

  const [shiftHeld, setShiftHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  /** Map tile under the cursor (full map row/col); cleared when pointer leaves the canvas. */
  const [hoverTileCoords, setHoverTileCoords] = useState<{ row: number; col: number } | null>(null);
  const [spawnPopover, setSpawnPopover] = useState<{
    clientX: number;
    clientY: number;
    row: number;
    col: number;
  } | null>(null);
  const [tileContextMenu, setTileContextMenu] = useState<{
    clientX: number;
    clientY: number;
    row: number;
    col: number;
  } | null>(null);
  const tileContextMenuRef = useRef<HTMLDivElement>(null);

  const tilePx = editorTilePixelSize;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const cols = Math.max(1, Math.floor(w / tilePx));
      const rows = Math.max(1, Math.floor(h / tilePx));
      setViewportSize(cols, rows);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setViewportSize, tilePx]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        const st = useEditorStore.getState();
        if (st.dialogueNpcRelocateFrom) {
          e.preventDefault();
          st.cancelDialogueNpcRelocate();
          return;
        }
        if (st.spawnerRelocateFrom) {
          e.preventDefault();
          st.cancelSpawnerRelocate();
          return;
        }
        if (st.questWaypointPickTarget) {
          e.preventDefault();
          st.cancelQuestWaypointPick();
          return;
        }
        if (
          st.sidebarSection === "spawners" &&
          st.spawnerSidebarMode === "place" &&
          st.spawnerPlaceTileId != null
        ) {
          e.preventDefault();
          st.setSpawnerPlaceTileId(null);
          return;
        }
      }
      if (!e.ctrlKey && !e.metaKey && useEditorStore.getState().sidebarSection === "tiles") {
        const incBrush = e.code === "NumpadAdd" || e.code === "Equal";
        const decBrush =
          e.code === "NumpadSubtract" || e.code === "Minus";
        if (incBrush) {
          e.preventDefault();
          useEditorStore.getState().incrementBrushSize();
          return;
        }
        if (decBrush) {
          e.preventDefault();
          useEditorStore.getState().decrementBrushSize();
          return;
        }
      }
      const step = e.shiftKey ? 8 : 2;
      const k = e.key;
      if (k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight") {
        e.preventDefault();
        if (k === "ArrowUp") panCamera(0, -step);
        else if (k === "ArrowDown") panCamera(0, step);
        else if (k === "ArrowLeft") panCamera(-step, 0);
        else panCamera(step, 0);
        return;
      }
      const lower = k.toLowerCase();
      if (lower === "p") {
        if (useEditorStore.getState().sidebarSection !== "tiles") return;
        e.preventDefault();
        const hover = hoverCellRef.current;
        if (hover) {
          useEditorStore.getState().handleGridCellClick(hover.row, hover.col, true, true, {
            skipClipboard: true,
            skipFillBucket: true,
          });
        }
        return;
      }
      if (lower === "e") {
        if (useEditorStore.getState().sidebarSection !== "tiles") return;
        e.preventDefault();
        const hover = hoverCellRef.current;
        if (hover) {
          const { brushSize } = useEditorStore.getState();
          if (brushSize > 1) {
            useEditorStore.getState().eraseGridBrush(hover.row, hover.col);
          } else {
            useEditorStore.getState().eraseGridCell(hover.row, hover.col);
          }
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const st = useEditorStore.getState();
        if (
          st.sidebarSection === "tiles" &&
          st.activeLayer === "decals" &&
          st.selectedDecalCell
        ) {
          e.preventDefault();
          const { row, col } = st.selectedDecalCell;
          useEditorStore.getState().eraseGridCell(row, col);
          return;
        }
      }
      if (lower !== "w" && lower !== "a" && lower !== "s" && lower !== "d") return;
      e.preventDefault();
      if (lower === "w") panCamera(0, -step);
      if (lower === "s") panCamera(0, step);
      if (lower === "a") panCamera(-step, 0);
      if (lower === "d") panCamera(step, 0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panCamera]);

  useEffect(() => {
    if (!tileContextMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (tileContextMenuRef.current?.contains(e.target as Node)) return;
      setTileContextMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTileContextMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [tileContextMenu]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        let dy = e.deltaY;
        if (e.deltaMode === 1) {
          dy *= 16;
        } else if (e.deltaMode === 2) {
          dy *= canvas.clientHeight || 1;
        }
        adjustEditorTilePixelSizeFromWheelPixelDelta(dy);
        const el = containerRef.current;
        if (el) {
          const w = el.clientWidth;
          const h = el.clientHeight;
          if (w > 0 && h > 0) {
            const tp = useEditorStore.getState().editorTilePixelSize;
            const cols = Math.max(1, Math.floor(w / tp));
            const rows = Math.max(1, Math.floor(h / tp));
            setViewportSize(cols, rows);
          }
        }
        return;
      }

      e.preventDefault();

      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        const line = 16;
        dx *= line;
        dy *= line;
      } else if (e.deltaMode === 2) {
        dx *= canvas.clientWidth || 1;
        dy *= canvas.clientHeight || 1;
      }

      const acc = wheelPanAccRef.current;
      acc.x += dx;
      acc.y += dy;
      const tp = useEditorStore.getState().editorTilePixelSize;
      const tilesX = Math.trunc(acc.x / tp);
      const tilesY = Math.trunc(acc.y / tp);
      acc.x -= tilesX * tp;
      acc.y -= tilesY * tp;
      if (tilesX !== 0 || tilesY !== 0) {
        panCamera(tilesX, tilesY);
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [
    panCamera,
    tilePx,
    setViewportSize,
    adjustEditorTilePixelSizeFromWheelPixelDelta,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    const onBlur = () => setShiftHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const handleCellMouseDown = () => {
    saveToHistory();
    setIsDragging(true);
    setHasModifiedDuringDrag(false);
    dragPaintedInitialRef.current = false;
    lastDragCellRef.current = null;
  };

  const handleCellMouseDownOnTile = (row: number, col: number) => {
    if (useEditorStore.getState().questWaypointPickTarget) return;
    dragStartCellRef.current = { row, col };
    handleCellMouseDown();
    if (activeLayer === "ground" && !isFillBucketMode && !clipboard) {
      handleGridCellClick(row, col, false, false);
      dragPaintedInitialRef.current = true;
      lastDragCellRef.current = { row, col };
      setHasModifiedDuringDrag(true);
    }
  };

  const handleDragEnd = useCallback(() => {
    const didPaintDuringDrag = useEditorStore.getState().hasModifiedDuringDrag;
    setIsDragging(false);
    setHasModifiedDuringDrag(false);
    dragStartCellRef.current = null;
    dragPaintedInitialRef.current = false;
    lastDragCellRef.current = null;
    if (didPaintDuringDrag) {
      suppressNextCellClickRef.current = true;
    }
  }, [setHasModifiedDuringDrag, setIsDragging]);

  const endPan = useCallback((canvas: HTMLCanvasElement, pointerId: number) => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    setIsPanning(false);
    panPixelAccRef.current = { x: 0, y: 0 };
    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }, []);

  const handleDragStrokeAt = (row: number, col: number) => {
    if (useEditorStore.getState().questWaypointPickTarget) return;
    if (!useEditorStore.getState().isDragging) return;
    if (!dragPaintedInitialRef.current && dragStartCellRef.current) {
      const { row: sr, col: sc } = dragStartCellRef.current;
      handleGridCellClick(sr, sc, false, true);
      dragPaintedInitialRef.current = true;
      setHasModifiedDuringDrag(true);
      lastDragCellRef.current = { row: sr, col: sc };
    }
    const last = lastDragCellRef.current;
    if (last && last.row === row && last.col === col) return;
    handleGridCellClick(row, col, false, true);
    setHasModifiedDuringDrag(true);
    lastDragCellRef.current = { row, col };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onUp = () => handleDragEnd();
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [isDragging, handleDragEnd]);

  const handleGridCellClickMaybeSuppress = (row: number, col: number) => {
    if (suppressNextCellClickRef.current) {
      suppressNextCellClickRef.current = false;
      return;
    }
    handleGridCellClick(row, col, false);
  };

  const clientToTile = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
      const localCol = Math.floor(x / tilePx);
      const localRow = Math.floor(y / tilePx);
      const s = useEditorStore.getState();
      const ms = getMapSideLength(s.groundGrid);
      const er = Math.min(s.cameraY + s.viewportHeightTiles, ms);
      const ec = Math.min(s.cameraX + s.viewportWidthTiles, ms);
      const vrc = Math.max(0, er - s.cameraY);
      const vcc = Math.max(0, ec - s.cameraX);
      if (localCol < 0 || localRow < 0 || localCol >= vcc || localRow >= vrc) return null;
      return { row: s.cameraY + localRow, col: s.cameraX + localCol };
    },
    [tilePx],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const TILE = getConfig().world.TILE_SIZE;

    const paint = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const s = useEditorStore.getState();
      const tilePx = s.editorTilePixelSize;
      const ground = s.groundSheetImage;
      const collidable = s.collidablesSheetImage;
      if (!ground?.complete || !collidable?.complete) return;

      const ms = getMapSideLength(s.groundGrid);
      const er = Math.min(s.cameraY + s.viewportHeightTiles, ms);
      const ec = Math.min(s.cameraX + s.viewportWidthTiles, ms);
      const vrc = Math.max(0, er - s.cameraY);
      const vcc = Math.max(0, ec - s.cameraX);
      const cssW = vcc * tilePx;
      const cssH = vrc * tilePx;
      if (cssW <= 0 || cssH <= 0) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.imageSmoothingEnabled = false;

      for (let vi = 0; vi < vrc; vi++) {
        for (let vj = 0; vj < vcc; vj++) {
          const rowIdx = s.cameraY + vi;
          const colIdx = s.cameraX + vj;
          const dx = vj * tilePx;
          const dy = vi * tilePx;

          const groundTileId = s.groundGrid[rowIdx]?.[colIdx] ?? 0;
          const gc = groundTileId % s.groundDimensions.cols;
          const gr = Math.floor(groundTileId / s.groundDimensions.cols);
          ctx.drawImage(ground, gc * TILE, gr * TILE, TILE, TILE, dx, dy, tilePx, tilePx);

          const collidableTileId = s.collidablesGrid[rowIdx]?.[colIdx] ?? -1;
          if (collidableTileId !== -1) {
            const cc = collidableTileId % s.collidablesDimensions.cols;
            const cr = Math.floor(collidableTileId / s.collidablesDimensions.cols);
            ctx.drawImage(collidable, cc * TILE, cr * TILE, TILE, TILE, dx, dy, tilePx, tilePx);
          }

          const spawnTileId = s.spawnsGrid[rowIdx]?.[colIdx] ?? 0;
          if (spawnTileId > 0) {
            const spawnEntry = SPAWN_PALETTE_ENTRIES.find((e) => e.id === spawnTileId);
            if (spawnEntry && spawnEntry.id !== 0) {
              ctx.save();
              ctx.globalAlpha = s.activeLayer === "spawns" ? 0.65 : 0.38;
              ctx.fillStyle = spawnEntry.color;
              ctx.fillRect(dx, dy, tilePx, tilePx);
              ctx.restore();
              const short = (() => {
                if (isNpcDialogueSpawnTile(spawnTileId)) {
                  const npc = s.dialogueNpcs.find(
                    (e) => e.row === rowIdx && e.col === colIdx,
                  );
                  const n = npc?.name?.trim();
                  if (n) {
                    const maxLen = Math.max(4, Math.floor(tilePx / 5));
                    return n.length <= maxLen
                      ? n
                      : `${n.slice(0, Math.max(1, maxLen - 1))}…`;
                  }
                }
                return getSpawnTileShortLabel(spawnTileId);
              })();
              if (short) {
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.fillStyle = "rgba(255,255,255,0.92)";
                ctx.strokeStyle = "rgba(0,0,0,0.55)";
                ctx.lineWidth = 2;
                const fs = Math.max(8, Math.floor(tilePx * 0.2));
                ctx.font = `600 ${fs}px ui-monospace, monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                const tx = dx + tilePx / 2;
                const ty = dy + tilePx - 2;
                ctx.strokeText(short, tx, ty);
                ctx.fillText(short, tx, ty);
                ctx.restore();
              }
            }
          }

          const decalTileId = s.decalsGrid[rowIdx]?.[colIdx] ?? 0;
          if (decalTileId > 0) {
            const decalEntry = DECAL_PALETTE_ENTRIES.find((e) => e.id === decalTileId);
            if (decalEntry && decalEntry.id !== 0) {
              ctx.save();
              ctx.globalCompositeOperation = "screen";
              ctx.globalAlpha = s.activeLayer === "decals" ? 0.55 : 0.22;
              ctx.fillStyle = decalEntry.color;
              ctx.fillRect(dx, dy, tilePx, tilePx);
              ctx.restore();
              let decalShort =
                decalTileId === DECAL_TILE_MESSAGE
                  ? (() => {
                      const entry = s.messageDecals.find(
                        (e) => e.row === rowIdx && e.col === colIdx,
                      );
                      const first = getMessageDecalLines(
                        entry ?? { row: rowIdx, col: colIdx, lines: ["…"] },
                      )[0]?.trim();
                      const t = first && first.length > 0 ? first : "…";
                      const maxLen = Math.max(4, Math.floor(tilePx / 5));
                      return t.length <= maxLen ? t : `${t.slice(0, Math.max(1, maxLen - 1))}…`;
                    })()
                  : getDecalPaletteShortLabel(decalTileId);
              if (decalShort) {
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.fillStyle = "rgba(255,255,255,0.92)";
                ctx.strokeStyle = "rgba(0,0,0,0.55)";
                ctx.lineWidth = 2;
                const fs = Math.max(8, Math.floor(tilePx * 0.2));
                ctx.font = `600 ${fs}px ui-monospace, monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                const tx = dx + tilePx / 2;
                const ty = dy + tilePx - 2;
                ctx.strokeText(decalShort, tx, ty);
                ctx.fillText(decalShort, tx, ty);
                ctx.restore();
              }
            } else {
              ctx.save();
              ctx.globalCompositeOperation = "screen";
              ctx.globalAlpha = s.activeLayer === "decals" ? 0.45 : 0.2;
              ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
              ctx.fillRect(dx, dy, tilePx, tilePx);
              ctx.restore();
              ctx.save();
              ctx.globalAlpha = 1;
              ctx.fillStyle = "rgba(255,255,255,0.92)";
              ctx.strokeStyle = "rgba(0,0,0,0.55)";
              ctx.lineWidth = 2;
              const fs = Math.max(8, Math.floor(tilePx * 0.2));
              ctx.font = `600 ${fs}px ui-monospace, monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              const tx = dx + tilePx / 2;
              const ty = dy + tilePx - 2;
              ctx.strokeText("?", tx, ty);
              ctx.fillText("?", tx, ty);
              ctx.restore();
            }
          }
        }
      }

      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 1;
      for (let c = 0; c <= vcc; c++) {
        const x = c * tilePx + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssH);
        ctx.stroke();
      }
      for (let r = 0; r <= vrc; r++) {
        const y = r * tilePx + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cssW, y);
        ctx.stroke();
      }

      const sel = s.selectedSpawnCell;
      if (sel) {
        const localRow = sel.row - s.cameraY;
        const localCol = sel.col - s.cameraX;
        if (localRow >= 0 && localCol >= 0 && localRow < vrc && localCol < vcc) {
          const sx = localCol * tilePx;
          const sy = localRow * tilePx;
          ctx.strokeStyle = "rgba(34, 211, 238, 0.95)";
          ctx.lineWidth = 3;
          ctx.strokeRect(sx + 1.5, sy + 1.5, tilePx - 3, tilePx - 3);
        }
      }

      const dsel = s.selectedDecalCell;
      if (dsel && s.activeLayer === "decals") {
        const dlRow = dsel.row - s.cameraY;
        const dlCol = dsel.col - s.cameraX;
        if (dlRow >= 0 && dlCol >= 0 && dlRow < vrc && dlCol < vcc) {
          const sx = dlCol * tilePx;
          const sy = dlRow * tilePx;
          ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
          ctx.lineWidth = 3;
          ctx.strokeRect(sx + 1.5, sy + 1.5, tilePx - 3, tilePx - 3);
        }
      }

      const relocateNpc = s.dialogueNpcRelocateFrom;
      if (relocateNpc) {
        const lr = relocateNpc.row - s.cameraY;
        const lc = relocateNpc.col - s.cameraX;
        if (lr >= 0 && lc >= 0 && lr < vrc && lc < vcc) {
          const rx = lc * tilePx;
          const ry = lr * tilePx;
          ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
          ctx.lineWidth = 3;
          ctx.strokeRect(rx + 1.5, ry + 1.5, tilePx - 3, tilePx - 3);
        }
      }

      const relocateSpawner = s.spawnerRelocateFrom;
      if (relocateSpawner) {
        const lr = relocateSpawner.row - s.cameraY;
        const lc = relocateSpawner.col - s.cameraX;
        if (lr >= 0 && lc >= 0 && lr < vrc && lc < vcc) {
          const rx = lc * tilePx;
          const ry = lr * tilePx;
          ctx.strokeStyle = "rgba(167, 139, 250, 0.95)";
          ctx.lineWidth = 3;
          ctx.strokeRect(rx + 1.5, ry + 1.5, tilePx - 3, tilePx - 3);
        }
      }

      const hoverPickCell = hoverCellRef.current;
      if (s.questWaypointPickTarget && hoverPickCell) {
        const lr = hoverPickCell.row - s.cameraY;
        const lc = hoverPickCell.col - s.cameraX;
        if (lr >= 0 && lc >= 0 && lr < vrc && lc < vcc) {
          const rx = lc * tilePx;
          const ry = lr * tilePx;
          ctx.strokeStyle = "rgba(129, 140, 248, 0.95)";
          ctx.lineWidth = 3;
          ctx.strokeRect(rx + 1.5, ry + 1.5, tilePx - 3, tilePx - 3);
        }
      }

      const placeSpawnerPick =
        s.sidebarSection === "spawners" &&
        s.spawnerSidebarMode === "place" &&
        s.spawnerPlaceTileId != null &&
        s.spawnerPlaceTileId > 0;
      if (placeSpawnerPick && hoverPickCell) {
        const lr = hoverPickCell.row - s.cameraY;
        const lc = hoverPickCell.col - s.cameraX;
        if (lr >= 0 && lc >= 0 && lr < vrc && lc < vcc) {
          const rx = lc * tilePx;
          const ry = lr * tilePx;
          ctx.strokeStyle = "rgba(167, 139, 250, 0.95)";
          ctx.lineWidth = 3;
          ctx.strokeRect(rx + 1.5, ry + 1.5, tilePx - 3, tilePx - 3);
        }
      }

      const hover = hoverCellRef.current;
      if (hover && s.sidebarSection === "tiles") {
        const localRow = hover.row - s.cameraY;
        const localCol = hover.col - s.cameraX;
        const brushSize = s.brushSize;
        const px0 = localCol * tilePx;
        const py0 = localRow * tilePx;
        const px1 = (localCol + brushSize) * tilePx;
        const py1 = (localRow + brushSize) * tilePx;
        const x0 = Math.max(0, px0);
        const y0 = Math.max(0, py0);
        const x1 = Math.min(cssW, px1);
        const y1 = Math.min(cssH, py1);
        if (x0 < x1 && y0 < y1) {
          ctx.strokeStyle = "rgba(234, 179, 8, 0.8)";
          ctx.lineWidth = 2;
          ctx.strokeRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
        }
      }
    };

    const schedulePaint = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (document.hidden) return;
        paint();
      });
    };
    schedulePaintRef.current = schedulePaint;

    const unsub = useEditorStore.subscribe(schedulePaint);
    const onResize = () => schedulePaint();
    window.addEventListener("resize", onResize);
    schedulePaint();
    return () => {
      unsub();
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe + getState() keeps paint fresh; avoid re-subscribing on every grid/camera change
  }, []);

  const onCanvasPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const last = panLastClientRef.current;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      const acc = panPixelAccRef.current;
      acc.x += dx;
      acc.y += dy;
      const tp = useEditorStore.getState().editorTilePixelSize;
      const tilesX = Math.trunc(acc.x / tp);
      const tilesY = Math.trunc(acc.y / tp);
      acc.x -= tilesX * tp;
      acc.y -= tilesY * tp;
      if (tilesX !== 0 || tilesY !== 0) {
        panCamera(-tilesX, -tilesY);
      }
      return;
    }
    if (useEditorStore.getState().isDragging) {
      const t = clientToTile(e.clientX, e.clientY);
      if (t) {
        handleDragStrokeAt(t.row, t.col);
        const prev = hoverCellRef.current;
        if (!prev || prev.row !== t.row || prev.col !== t.col) {
          hoverCellRef.current = { row: t.row, col: t.col };
          setHoverTileCoords({ row: t.row, col: t.col });
          schedulePaintRef.current();
        }
      }
      setSpawnPopover(null);
      return;
    }
    const t = clientToTile(e.clientX, e.clientY);
    const prev = hoverCellRef.current;
    if (t) {
      if (!prev || prev.row !== t.row || prev.col !== t.col) {
        hoverCellRef.current = { row: t.row, col: t.col };
        setHoverTileCoords({ row: t.row, col: t.col });
        schedulePaintRef.current();
      }
      const st = useEditorStore.getState();
      const sid = st.spawnsGrid[t.row]?.[t.col] ?? 0;
      if (sid > 0) {
        setSpawnPopover((p) => {
          const next = { clientX: e.clientX + 14, clientY: e.clientY + 14, row: t.row, col: t.col };
          if (p?.row === next.row && p?.col === next.col && p.clientX === next.clientX && p.clientY === next.clientY) {
            return p;
          }
          return next;
        });
      } else {
        setSpawnPopover(null);
      }
    } else if (prev) {
      hoverCellRef.current = null;
      setHoverTileCoords(null);
      schedulePaintRef.current();
      setSpawnPopover(null);
    }
  };

  const onCanvasPointerLeave = () => {
    if (isPanningRef.current) {
      if (hoverCellRef.current) {
        hoverCellRef.current = null;
        setHoverTileCoords(null);
        schedulePaintRef.current();
      }
      return;
    }
    if (hoverCellRef.current) {
      hoverCellRef.current = null;
      setHoverTileCoords(null);
      schedulePaintRef.current();
    }
    setSpawnPopover(null);
    handleDragEnd();
  };

  const popoverContent = (() => {
    if (!spawnPopover) return null;
    const st = useEditorStore.getState();
    const sid = st.spawnsGrid[spawnPopover.row]?.[spawnPopover.col] ?? 0;
    if (sid <= 0) return null;
    const entry = SPAWN_PALETTE_ENTRIES.find((e) => e.id === sid);
    const label = entry?.label ?? `spawn ${sid}`;
    const npc = st.dialogueNpcs.find(
      (d) => d.row === spawnPopover.row && d.col === spawnPopover.col,
    );
    const extra: string[] = [`tile (${spawnPopover.row},${spawnPopover.col})`, `id ${sid}`];
    if (npc?.name) extra.push(`name: ${npc.name}`);
    if (npc?.grantQuestId) extra.push(`grants quest: ${npc.grantQuestId}`);

    return (
      <div
        className="pointer-events-none fixed z-50 max-w-[220px] rounded border border-gray-600 bg-gray-900/98 px-2 py-1.5 text-[10px] text-gray-100 shadow-xl"
        style={{ left: spawnPopover.clientX, top: spawnPopover.clientY }}
      >
        <p className="font-semibold text-violet-200">{label}</p>
        <ul className="mt-0.5 list-inside list-disc text-gray-400">
          {extra.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    );
  })();

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 h-full w-full overflow-hidden bg-gray-950"
    >
      <div
        className="pointer-events-none absolute left-2 top-2 z-20 select-none rounded border border-gray-600 bg-gray-900/92 px-2 py-1 font-mono text-[11px] tabular-nums text-gray-200 shadow-md"
        aria-live="polite"
      >
        {hoverTileCoords ? (
          <>
            <span className="text-gray-500">tile </span>
            <span className="text-cyan-200/95">
              ({hoverTileCoords.row}, {hoverTileCoords.col})
            </span>
          </>
        ) : (
          <span className="text-gray-500">tile —</span>
        )}
      </div>
      <div className="absolute inset-0 overflow-auto flex items-start justify-start">
        <div className="inline-block border-2 border-gray-700 bg-black shrink-0 m-0">
          <canvas
            ref={canvasRef}
            className={`block select-none ${
              isPanning
                ? "cursor-grabbing"
                : shiftHeld
                  ? "cursor-grab"
                  : canPaintTiles || questWaypointPickActive || spawnerPlaceActive
                    ? "cursor-crosshair"
                    : "cursor-default"
            }`}
            onPointerMove={onCanvasPointerMove}
            onPointerDown={(e) => {
              setTileContextMenu(null);
              if (e.button === 0 && e.shiftKey) {
                e.preventDefault();
                isPanningRef.current = true;
                setIsPanning(true);
                panLastClientRef.current = { x: e.clientX, y: e.clientY };
                panPixelAccRef.current = { x: 0, y: 0 };
                suppressNextCellClickRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                return;
              }
              if (e.button !== 0) return;
              const t = clientToTile(e.clientX, e.clientY);
              if (!t) return;
              if (canPaintTiles) {
                handleCellMouseDownOnTile(t.row, t.col);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              const t = clientToTile(e.clientX, e.clientY);
              if (!t) return;
              setSpawnPopover(null);
              setTileContextMenu({
                clientX: e.clientX,
                clientY: e.clientY,
                row: t.row,
                col: t.col,
              });
            }}
            onPointerUp={(e) => {
              endPan(e.currentTarget, e.pointerId);
            }}
            onPointerCancel={(e) => {
              endPan(e.currentTarget, e.pointerId);
            }}
            onClick={(e) => {
              const t = clientToTile(e.clientX, e.clientY);
              if (t) handleGridCellClickMaybeSuppress(t.row, t.col);
            }}
            onPointerLeave={onCanvasPointerLeave}
          />
        </div>
      </div>
      {popoverContent}
      {tileContextMenu ? (
        <div
          ref={tileContextMenuRef}
          className="pointer-events-auto fixed z-[60] min-w-[10rem] rounded border border-gray-600 bg-gray-900 py-1 text-[11px] text-gray-100 shadow-xl"
          style={{ left: tileContextMenu.clientX, top: tileContextMenu.clientY }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-gray-800"
            onClick={() => {
              useEditorStore.getState().addDialogueNpcAtTile(tileContextMenu.row, tileContextMenu.col);
              setTileContextMenu(null);
            }}
          >
            Add NPC
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-gray-800"
            onClick={() => {
              useEditorStore.getState().addItemSpawnerAtTile(tileContextMenu.row, tileContextMenu.col);
              setTileContextMenu(null);
            }}
          >
            Add spawner
          </button>
        </div>
      ) : null}
    </div>
  );
}
