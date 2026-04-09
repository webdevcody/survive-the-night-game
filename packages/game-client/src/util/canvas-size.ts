/**
 * Syncs canvas backing store and CSS size to the window viewport (1:1 pixels).
 * Used before GameClient's Renderer exists (e.g. LoadingScene) so UI is not drawn
 * at the default 300×150 buffer and stretched by CSS.
 */
export function resizeCanvasToWindow(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
}
