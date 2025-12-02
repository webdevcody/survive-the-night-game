import type { KeyBindConfig } from "./keybinds";
import { loadKeyBinds, saveKeyBinds } from "./keybinds";

type KeybindChangeListener = (keybinds: KeyBindConfig) => void;

class KeybindStore {
  private keybinds: KeyBindConfig;
  private listeners: Set<KeybindChangeListener> = new Set();

  constructor() {
    this.keybinds = loadKeyBinds();
    
    // Listen for storage events from other tabs/windows
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === "KEYBINDING_SETTINGS") {
          this.keybinds = loadKeyBinds();
          this.notifyListeners();
        }
      });
    }
  }

  getKeybinds(): KeyBindConfig {
    return { ...this.keybinds };
  }

  updateKeybinds(changes: Partial<KeyBindConfig>): KeyBindConfig {
    this.keybinds = saveKeyBinds(changes);
    this.notifyListeners();
    return this.getKeybinds();
  }

  subscribe(listener: KeybindChangeListener): () => void {
    this.listeners.add(listener);
    // Immediately call listener with current keybinds
    listener(this.getKeybinds());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentKeybinds = this.getKeybinds();
    this.listeners.forEach((listener) => {
      listener(currentKeybinds);
    });
  }
}

// Singleton instance
let keybindStoreInstance: KeybindStore | null = null;

export function getKeybindStore(): KeybindStore {
  if (!keybindStoreInstance) {
    keybindStoreInstance = new KeybindStore();
  }
  return keybindStoreInstance;
}

