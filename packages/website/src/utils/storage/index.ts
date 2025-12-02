import type { IStorage } from "./storage.interface";
import { R2Storage } from "./r2";

let storage: IStorage | null = null;

// Storage provider factory/singleton - R2 only
export function getStorage(): { storage: IStorage; type: "r2" } {
  if (!storage) {
    storage = new R2Storage();
  }

  return { storage, type: "r2" };
}
