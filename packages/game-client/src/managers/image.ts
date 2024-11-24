export interface CropOptions {
  flipX: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ImageManager {
  public async crop(
    image: HTMLImageElement,
    { flipX, x, y, width, height }: CropOptions
  ): Promise<HTMLImageElement> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (flipX) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(image, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

    const url = canvas.toDataURL();
    return await this.load(url);
  }

  public async load(path: string): Promise<HTMLImageElement> {
    const image = new Image();
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
