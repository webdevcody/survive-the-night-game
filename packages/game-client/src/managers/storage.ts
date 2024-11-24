const STORAGE_KEY_SCALE = "scale";

export class StorageManager {
  public getScale(fallback: number): number {
    const value = this.getItem(STORAGE_KEY_SCALE) ?? fallback.toString();
    return Number.parseInt(value, 10);
  }

  public setScale(value: number): void {
    this.setItem(STORAGE_KEY_SCALE, value.toString());
  }

  public getItem(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  public setItem(key: string, value: string): void {
    return window.localStorage.setItem(key, value);
  }
}
