export interface CropOptions {
  flipX: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // angle in degrees
  tintColor?: string; // hex color for tinting (e.g., "#FF4444")
}

export class ImageManager {
  public async crop(
    image: HTMLImageElement,
    { flipX, x, y, width, height, rotation = 0, tintColor }: CropOptions
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

    // Apply color tinting if specified
    if (tintColor) {
      this.applyColorTint(sourceCtx, width, height, tintColor);
    }

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

  /**
   * Apply a color tint to an image using HSL color replacement.
   * This preserves the luminance (shadows/highlights) while shifting the hue.
   */
  private applyColorTint(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    hexColor: string
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Parse hex color to RGB
    const tintR = parseInt(hexColor.slice(1, 3), 16);
    const tintG = parseInt(hexColor.slice(3, 5), 16);
    const tintB = parseInt(hexColor.slice(5, 7), 16);

    // Convert tint color to HSL
    const tintHsl = this.rgbToHsl(tintR, tintG, tintB);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip fully transparent pixels
      if (a === 0) continue;

      // Convert original pixel to HSL
      const originalHsl = this.rgbToHsl(r, g, b);

      // Apply tint: use tint's hue and saturation, keep original luminance
      // Blend saturation based on original saturation to preserve grayscale areas
      const newSaturation = originalHsl.s * tintHsl.s;

      // Convert back to RGB with new hue/saturation
      const newRgb = this.hslToRgb(tintHsl.h, newSaturation, originalHsl.l);

      data[i] = newRgb.r;
      data[i + 1] = newRgb.g;
      data[i + 2] = newRgb.b;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h, s, l };
  }

  /**
   * Convert HSL to RGB
   */
  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
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
