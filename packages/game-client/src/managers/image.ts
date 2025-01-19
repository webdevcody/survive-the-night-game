export interface CropOptions {
  flipX: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // angle in degrees
}

export class ImageManager {
  public async crop(
    image: HTMLImageElement,
    { flipX, x, y, width, height, rotation = 0 }: CropOptions
  ): Promise<HTMLImageElement> {
    // Create a temporary canvas at a larger scale for rotation
    const scale = 4; // Increased scale for sharper rotation
    const canvas = document.createElement("canvas");

    // Set up the initial canvas for the source sprite
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d", { alpha: true })!;
    sourceCtx.imageSmoothingEnabled = false;
    sourceCtx.drawImage(image, x, y, width, height, 0, 0, width, height);

    // Create an upscaled version
    const upscaledCanvas = document.createElement("canvas");
    upscaledCanvas.width = width * scale;
    upscaledCanvas.height = height * scale;
    const upscaledCtx = upscaledCanvas.getContext("2d", { alpha: true })!;
    upscaledCtx.imageSmoothingEnabled = false;
    upscaledCtx.drawImage(sourceCanvas, 0, 0, width * scale, height * scale);

    // Set up the rotation canvas
    if (rotation !== 0) {
      const diagonal = Math.ceil(
        Math.sqrt(width * scale * (width * scale) + height * scale * (height * scale))
      );
      canvas.width = diagonal;
      canvas.height = diagonal;
    } else {
      canvas.width = width * scale;
      canvas.height = height * scale;
    }

    const ctx = canvas.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = false;

    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (rotation !== 0) {
      // Center and rotate
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-(width * scale) / 2, -(height * scale) / 2);
    }

    if (flipX) {
      if (rotation === 0) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.scale(-1, 1);
        ctx.translate(-(width * scale), 0);
      }
    }

    // Draw the upscaled image
    ctx.drawImage(upscaledCanvas, 0, 0);

    // Create final canvas at original size
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = width;
    finalCanvas.height = height;
    const finalCtx = finalCanvas.getContext("2d", { alpha: true })!;
    finalCtx.imageSmoothingEnabled = false;

    // Draw rotated image back down to original size
    if (rotation !== 0) {
      const offsetX = (canvas.width - width * scale) / 2;
      const offsetY = (canvas.height - height * scale) / 2;
      finalCtx.drawImage(
        canvas,
        offsetX,
        offsetY,
        width * scale,
        height * scale,
        0,
        0,
        width,
        height
      );
    } else {
      finalCtx.drawImage(canvas, 0, 0, width, height);
    }

    const url = finalCanvas.toDataURL("image/png");
    return await this.load(url);
  }

  public async load(path: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.style.imageRendering = "pixelated";
    image.style.imageRendering = "-moz-crisp-edges";
    image.style.imageRendering = "crisp-edges";
    image.src = path;

    return await new Promise((resolve, reject) => {
      image.onload = () => {
        resolve(image);
      };

      image.onerror = (err) => {
        reject(err);
      };
    });
  }
}
