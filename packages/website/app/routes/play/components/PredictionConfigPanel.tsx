import { useEffect, useState } from "react";
import { getConfig } from "@shared/config";

interface PredictionConfig {
  showDebugVisuals: boolean;
  smallErrorThreshold: number;
  largeErrorThreshold: number;
  minLerpSpeed: number;
  maxLerpSpeed: number;
}

/**
 * Panel with sliders to dynamically configure prediction settings
 */
export function PredictionConfigPanel() {
  const [config, setConfig] = useState<PredictionConfig>({
    showDebugVisuals: true,
    smallErrorThreshold: 20,
    largeErrorThreshold: 75,
    minLerpSpeed: 0.15,
    maxLerpSpeed: 0.35,
  });

  const [isOpen, setIsOpen] = useState(false);

  // Initialize config from getConfig().prediction if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const gameConfig = getConfig();
      if (gameConfig.prediction) {
        setConfig(gameConfig.prediction as any);
      }
    }
  }, []);

  // Update window.config.prediction when config changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const gameConfig = getConfig(); // This ensures window.config is properly initialized
      gameConfig.prediction = config as any;
    }
  }, [config]);

  const updateValue = <K extends keyof PredictionConfig>(key: K, value: PredictionConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
      >
        {isOpen ? "Hide Config" : "Config"}
      </button>

      {isOpen && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl max-h-[80vh] overflow-y-auto min-w-[280px]">
          <h3 className="text-white font-bold mb-4 text-sm">Prediction Config</h3>

          <div className="space-y-4">
            {/* Show Debug Visuals */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">Show Debug Visuals</label>
              <input
                type="checkbox"
                checked={config.showDebugVisuals}
                onChange={(e) => updateValue("showDebugVisuals", e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            {/* Small Error Threshold */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Small Error Threshold: {config.smallErrorThreshold}px
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={config.smallErrorThreshold}
                onChange={(e) => updateValue("smallErrorThreshold", parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Large Error Threshold */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Large Error Threshold: {config.largeErrorThreshold}px
              </label>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={config.largeErrorThreshold}
                onChange={(e) => updateValue("largeErrorThreshold", parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Min Lerp Speed */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Min Lerp Speed: {config.minLerpSpeed.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.minLerpSpeed}
                onChange={(e) => updateValue("minLerpSpeed", parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Max Lerp Speed */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Max Lerp Speed: {config.maxLerpSpeed.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.maxLerpSpeed}
                onChange={(e) => updateValue("maxLerpSpeed", parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
