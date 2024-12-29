const flashCanvas = document.createElement("canvas");
const flashCtx = flashCanvas.getContext("2d")!;

export function createFlashEffect(
  image: HTMLImageElement,
  color: string = "rgba(255, 0, 0, 0.5)"
): HTMLCanvasElement {
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
