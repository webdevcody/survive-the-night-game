import { useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";

interface InstructionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Panel displaying game controls and instructions
 */
export function InstructionPanel({ isOpen, onClose }: InstructionPanelProps) {
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

  if (!isOpen) return null;

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-blue-400 mb-2">Movement</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Move:</span>
                <span className="font-mono">W A S D</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sprint:</span>
                <span className="font-mono">SHIFT</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-blue-400 mb-2">Combat</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Fire Weapon:</span>
                <span className="font-mono">LEFT CLICK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Cycle Weapon:</span>
                <span className="font-mono">Q / E</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-blue-400 mb-2">Actions</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Interact:</span>
                <span className="font-mono">F</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Teleport to Base:</span>
                <span className="font-mono">C (Hold)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Quick Heal:</span>
                <span className="font-mono">H</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Drop Item:</span>
                <span className="font-mono">G</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-blue-400 mb-2">Interface</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Chat:</span>
                <span className="font-mono">ENTER</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Player List:</span>
                <span className="font-mono">TAB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Mute Sound:</span>
                <span className="font-mono">M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Controls:</span>
                <span className="font-mono">I</span>
              </div>
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
