import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import type { KeyBindConfig } from "@shared/config/keybinds";

interface InstructionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  keybinds: KeyBindConfig;
  onUpdateKeybinds: (changes: Partial<KeyBindConfig>) => void;
}

// Helper function to format key code for display
function formatKeyCode(code: string): string {
  // Remove "Key" prefix for letter keys
  if (code.startsWith("Key")) {
    return code.slice(3);
  }
  // Remove "Digit" prefix for number keys
  if (code.startsWith("Digit")) {
    return code.slice(5);
  }
  // Handle special keys
  const specialKeys: Record<string, string> = {
    Space: "SPACE",
    Tab: "TAB",
    Escape: "ESC",
    ShiftLeft: "SHIFT",
    ShiftRight: "SHIFT",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };
  return specialKeys[code] || code;
}

// Helper function to find duplicate keys
function findDuplicates(keybinds: KeyBindConfig): Set<string> {
  const keyCounts = new Map<string, number>();
  const values = Object.values(keybinds);
  
  values.forEach((key) => {
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  });
  
  const duplicates = new Set<string>();
  keyCounts.forEach((count, key) => {
    if (count > 1) {
      duplicates.add(key);
    }
  });
  
  return duplicates;
}

/**
 * Panel displaying game controls and instructions
 */
export function InstructionPanel({
  isOpen,
  onClose,
  keybinds,
  onUpdateKeybinds,
}: InstructionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Add a small delay to prevent immediate closing when opening
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Find duplicate keys
  const duplicates = useMemo(() => findDuplicates(keybinds), [keybinds]);

  if (!isOpen) return null;

  function KeyBindRow({
    label,
    bind,
    onRebind,
    isDuplicate,
  }: {
    label: string;
    bind: string;
    onRebind: (newKey: string) => void;
    isDuplicate: boolean;
  }) {
    const [waiting, setWaiting] = useState(false);

    useEffect(() => {
      if (!waiting) return;
      const handler = (e: KeyboardEvent) => {
        e.preventDefault();
        onRebind(e.code);
        setWaiting(false);
      };

      window.addEventListener("keydown", handler, { once: true });
      return () => window.removeEventListener("keydown", handler);
    }, [waiting, onRebind]);

    return (
      <div className="flex items-center gap-3">
        <span className="text-gray-300">{label}</span>
        <button
          className={`px-3 py-1 rounded-md text-white font-mono transition-colors ${
            isDuplicate
              ? "bg-red-600 hover:bg-red-700 border-2 border-red-400"
              : waiting
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
          }`}
          onClick={() => setWaiting(true)}
          title={isDuplicate ? "This key is bound to multiple actions!" : ""}
        >
          {waiting ? "Press any key..." : formatKeyCode(bind)}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-4 top-20 z-[9999]">
      <div
        ref={panelRef}
        className="bg-gray-900 opacity-100 border border-gray-700 rounded-lg p-6 shadow-xl max-w-2xl w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-2xl">Game Controls</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {duplicates.size > 0 && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-md">
            <p className="text-red-300 text-sm font-semibold mb-1">
              ⚠️ Duplicate Key Bindings Detected!
            </p>
            <p className="text-red-400 text-xs">
              Some keys are bound to multiple actions. Please change the highlighted bindings.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-blue-400 mb-2">Movement</h3>
            <div className="space-y-2 text-sm">
              <KeyBindRow
                label="Move up"
                bind={keybinds.moveUp}
                onRebind={(code) => onUpdateKeybinds({ moveUp: code })}
                isDuplicate={duplicates.has(keybinds.moveUp)}
              />
              <KeyBindRow
                label="Move down"
                bind={keybinds.moveDown}
                onRebind={(code) => onUpdateKeybinds({ moveDown: code })}
                isDuplicate={duplicates.has(keybinds.moveDown)}
              />
              <KeyBindRow
                label="Move left"
                bind={keybinds.moveLeft}
                onRebind={(code) => onUpdateKeybinds({ moveLeft: code })}
                isDuplicate={duplicates.has(keybinds.moveLeft)}
              />
              <KeyBindRow
                label="Move right"
                bind={keybinds.moveRight}
                onRebind={(code) => onUpdateKeybinds({ moveRight: code })}
                isDuplicate={duplicates.has(keybinds.moveRight)}
              />
              <KeyBindRow
                label="Sprint"
                bind={keybinds.sprint}
                onRebind={(code) => onUpdateKeybinds({ sprint: code })}
                isDuplicate={duplicates.has(keybinds.sprint)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-blue-400 mb-2">Combat</h3>
            <div className="space-y-2 text-sm">
              <KeyBindRow
                label="Fire Weapon"
                bind={keybinds.fire}
                onRebind={(code) => onUpdateKeybinds({ fire: code })}
                isDuplicate={duplicates.has(keybinds.fire)}
              />
              <div className="flex justify-between">
                <span className="text-gray-300">Fire Weapon (Alt):</span>
                <span className="font-mono text-gray-500">LEFT CLICK</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-blue-400 mb-2">Actions</h3>
            <div className="space-y-2 text-sm">
              <KeyBindRow
                label="Interact"
                bind={keybinds.interact}
                onRebind={(code) => onUpdateKeybinds({ interact: code })}
                isDuplicate={duplicates.has(keybinds.interact)}
              />
              <KeyBindRow
                label="Teleport to Base"
                bind={keybinds.teleport}
                onRebind={(code) => onUpdateKeybinds({ teleport: code })}
                isDuplicate={duplicates.has(keybinds.teleport)}
              />
              <KeyBindRow
                label="Quick Heal"
                bind={keybinds.quickHeal}
                onRebind={(code) => onUpdateKeybinds({ quickHeal: code })}
                isDuplicate={duplicates.has(keybinds.quickHeal)}
              />
              <KeyBindRow
                label="Drop Item"
                bind={keybinds.drop}
                onRebind={(code) => onUpdateKeybinds({ drop: code })}
                isDuplicate={duplicates.has(keybinds.drop)}
              />
              <KeyBindRow
                label="Split Drop Item"
                bind={keybinds.splitDrop}
                onRebind={(code) => onUpdateKeybinds({ splitDrop: code })}
                isDuplicate={duplicates.has(keybinds.splitDrop)}
              />
              <KeyBindRow
                label="Weapons HUD"
                bind={keybinds.weaponsHud}
                onRebind={(code) => onUpdateKeybinds({ weaponsHud: code })}
                isDuplicate={duplicates.has(keybinds.weaponsHud)}
              />
              <KeyBindRow
                label="Quick Switch Weapon"
                bind={keybinds.quickSwitch}
                onRebind={(code) => onUpdateKeybinds({ quickSwitch: code })}
                isDuplicate={duplicates.has(keybinds.quickSwitch)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-blue-400 mb-2">Interface</h3>
            <div className="space-y-2 text-sm">
              <KeyBindRow
                label="Chat"
                bind={keybinds.chat}
                onRebind={(code) => onUpdateKeybinds({ chat: code })}
                isDuplicate={duplicates.has(keybinds.chat)}
              />
              <KeyBindRow
                label="Player List"
                bind={keybinds.playerList}
                onRebind={(code) => onUpdateKeybinds({ playerList: code })}
                isDuplicate={duplicates.has(keybinds.playerList)}
              />
              <KeyBindRow
                label="Mute Sound"
                bind={keybinds.toggleMute}
                onRebind={(code) => onUpdateKeybinds({ toggleMute: code })}
                isDuplicate={duplicates.has(keybinds.toggleMute)}
              />
              <KeyBindRow
                label="Controls"
                bind={keybinds.toggleInstructions}
                onRebind={(code) => onUpdateKeybinds({ toggleInstructions: code })}
                isDuplicate={duplicates.has(keybinds.toggleInstructions)}
              />
              <KeyBindRow
                label="Escape"
                bind={keybinds.escape}
                onRebind={(code) => onUpdateKeybinds({ escape: code })}
                isDuplicate={duplicates.has(keybinds.escape)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            Press <span className="font-mono text-white">ESC</span> or click the close button to
            return to the game
          </p>
        </div>
      </div>
    </div>
  );
}
