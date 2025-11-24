import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";

// Player color options matching the game-shared definitions
const PLAYER_COLORS = {
  NONE: "none",
  RED: "red",
  ORANGE: "orange",
  YELLOW: "yellow",
  LIME: "lime",
  GREEN: "green",
  CYAN: "cyan",
  BLUE: "blue",
  PURPLE: "purple",
  MAGENTA: "magenta",
  PINK: "pink",
  BROWN: "brown",
  GRAY: "gray",
} as const;

type PlayerColor = (typeof PLAYER_COLORS)[keyof typeof PLAYER_COLORS];

// Color hex values for display
const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  none: "#FFFFFF",
  red: "#FF4444",
  orange: "#FF8844",
  yellow: "#FFFF44",
  lime: "#88FF44",
  green: "#44FF44",
  cyan: "#44FFFF",
  blue: "#4488FF",
  purple: "#8844FF",
  magenta: "#FF44FF",
  pink: "#FF88BB",
  brown: "#AA6644",
  gray: "#888888",
};

// Color display names
const PLAYER_COLOR_NAMES: Record<PlayerColor, string> = {
  none: "Default",
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  lime: "Lime",
  green: "Green",
  cyan: "Cyan",
  blue: "Blue",
  purple: "Purple",
  magenta: "Magenta",
  pink: "Pink",
  brown: "Brown",
  gray: "Gray",
};

interface CharacterColorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor?: PlayerColor;
  onColorChange: (newColor: PlayerColor) => void;
}

export function CharacterColorPanel({
  isOpen,
  onClose,
  currentColor = "none",
  onColorChange,
}: CharacterColorPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = useState<PlayerColor>(currentColor);

  // Update selectedColor when currentColor changes or panel opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColor(currentColor);
    }
  }, [isOpen, currentColor]);

  const handleColorSelect = (color: PlayerColor) => {
    setSelectedColor(color);
  };

  const handleApply = () => {
    // Save to localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("playerColor", selectedColor);
    }
    onColorChange(selectedColor);
    onClose();
  };

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleApply();
        return;
      }

      // Block game shortcuts
      e.stopPropagation();
      if (
        e.key === "i" ||
        e.key === "I" ||
        e.key === "w" ||
        e.key === "a" ||
        e.key === "s" ||
        e.key === "d" ||
        e.key === "e" ||
        e.key === "f" ||
        e.key === "h" ||
        e.key === "c" ||
        e.key === "g" ||
        e.key === "x" ||
        e.key === "q" ||
        e.key === "m" ||
        e.key === "t" ||
        e.key === "Tab"
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose, handleApply]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get all colors excluding "none" for the color grid
  const colorOptions = Object.entries(PLAYER_COLORS).filter(([, value]) => value !== "none");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={panelRef}
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-2xl">Change Character Color</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          {/* Default/None option */}
          <div
            className={`
              flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
              ${selectedColor === "none" ? "bg-blue-600 ring-2 ring-blue-400" : "bg-gray-800 hover:bg-gray-700"}
            `}
            onClick={() => handleColorSelect("none")}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-gray-600"
              style={{
                background:
                  "linear-gradient(135deg, #fff 25%, #ccc 25%, #ccc 50%, #fff 50%, #fff 75%, #ccc 75%)",
                backgroundSize: "8px 8px",
              }}
            />
            <span className="text-white font-medium">Default (No Tint)</span>
          </div>

          {/* Color grid */}
          <div className="grid grid-cols-4 gap-3">
            {colorOptions.map(([, colorValue]) => (
              <button
                key={colorValue}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer transition-all
                  ${selectedColor === colorValue ? "bg-blue-600 ring-2 ring-blue-400" : "bg-gray-800 hover:bg-gray-700"}
                `}
                onClick={() => handleColorSelect(colorValue as PlayerColor)}
                title={PLAYER_COLOR_NAMES[colorValue as PlayerColor]}
              >
                <div
                  className="w-10 h-10 rounded-full border-2 border-gray-600"
                  style={{ backgroundColor: PLAYER_COLOR_HEX[colorValue as PlayerColor] }}
                />
                <span className="text-xs text-gray-300">
                  {PLAYER_COLOR_NAMES[colorValue as PlayerColor]}
                </span>
              </button>
            ))}
          </div>

          {/* Current selection preview */}
          <div className="flex items-center justify-center gap-3 p-4 bg-gray-800 rounded-lg">
            <span className="text-gray-400">Selected:</span>
            <div
              className="w-8 h-8 rounded-full border-2 border-gray-600"
              style={{
                backgroundColor:
                  selectedColor === "none"
                    ? undefined
                    : PLAYER_COLOR_HEX[selectedColor as PlayerColor],
                background:
                  selectedColor === "none"
                    ? "linear-gradient(135deg, #fff 25%, #ccc 25%, #ccc 50%, #fff 50%, #fff 75%, #ccc 75%)"
                    : undefined,
                backgroundSize: selectedColor === "none" ? "8px 8px" : undefined,
              }}
            />
            <span className="text-white font-medium">
              {PLAYER_COLOR_NAMES[selectedColor as PlayerColor]}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleApply}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Color
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 border border-gray-700 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              Press <span className="font-mono text-white">ENTER</span> to apply or{" "}
              <span className="font-mono text-white">ESC</span> to cancel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
