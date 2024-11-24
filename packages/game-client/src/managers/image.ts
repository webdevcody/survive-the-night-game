export interface CropOptions {
  flipX: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ImageManager {
  private canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  private image = new Image();

  public async crop(
    image: HTMLImageElement,
    { flipX, x, y, width, height }: CropOptions
  ): Promise<HTMLImageElement> {
    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (flipX) {
      this.ctx.translate(this.canvas.width, 0);
      this.ctx.scale(-1, 1);
    }

    this.ctx.drawImage(
      image,
      x,
      y,
      image.width,
      image.height,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    const url = this.canvas.toDataURL();
    return await this.load(url);
  }

  public async load(path: string): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
      this.image.src = path;

      this.image.onload = () => {
        resolve(this.image);
      };

      this.image.onerror = (err) => {
        reject(err);
      };
    });
  }
}
