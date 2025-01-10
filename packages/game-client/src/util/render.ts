let flashCanvas: HTMLCanvasElement;
let flashCtx: CanvasRenderingContext2D;

if (typeof window !== "undefined") {
  flashCanvas = document.createElement("canvas");
  flashCtx = flashCanvas.getContext("2d")!;
}

export function createFlashEffect(
  image: HTMLImageElement,
  color: string = "rgba(255, 0, 0, 0.5)"
): HTMLCanvasElement {
  if (!flashCanvas || !flashCtx) {
    throw new Error("Flash effect can only be used in browser environment");
  }

  if (flashCanvas.width !== image.width || flashCanvas.height !== image.height) {
    flashCanvas.width = image.width;
    flashCanvas.height = image.height;
  }

  flashCtx.clearRect(0, 0, flashCanvas.width, flashCanvas.height);
  flashCtx.fillStyle = color;
  flashCtx.fillRect(0, 0, image.width, image.height);
  flashCtx.globalCompositeOperation = "destination-in";
  flashCtx.drawImage(image, 0, 0);
  flashCtx.globalCompositeOperation = "source-over";

  return flashCanvas;
}
