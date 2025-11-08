import { useEffect, useState } from "react";
import { getConfig, type GameConfig } from "@shared/config";

type ConfigValue = string | number | boolean | object;

/**
 * Panel with tree view to dynamically configure all game settings
 */
export function PredictionConfigPanel() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Initialize config from getConfig()
  useEffect(() => {
    if (typeof window !== "undefined") {
      const gameConfig = getConfig();
      setConfig(JSON.parse(JSON.stringify(gameConfig))); // Deep clone
    }
  }, []);

  // Update window.config when config changes
  useEffect(() => {
    if (typeof window !== "undefined" && config) {
      const gameConfig = getConfig();
      Object.assign(gameConfig, config);
    }
  }, [config]);

  const toggleSection = (path: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const updateConfigValue = (path: string[], value: ConfigValue) => {
    if (!config) return;

    setConfig((prev) => {
      if (!prev) return prev;
      const newConfig = JSON.parse(JSON.stringify(prev));
      let current: any = newConfig;

      // Navigate to the parent object
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }

      // Set the value
      current[path[path.length - 1]] = value;
      return newConfig;
    });
  };

  const getValueAtPath = (obj: any, path: string[]): any => {
    let current = obj;
    for (const key of path) {
      current = current[key];
    }
    return current;
  };

  const renderConfigValue = (key: string, value: ConfigValue, path: string[]) => {
    const fullPath = path.join(".");
    const currentValue = config ? getValueAtPath(config, path) : value;

    if (typeof value === "boolean") {
      return (
        <div key={fullPath} className="flex items-center justify-between py-1">
          <label className="text-xs text-gray-300">{key}</label>
          <input
            type="checkbox"
            checked={currentValue}
            onChange={(e) => updateConfigValue(path, e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      );
    }

    if (typeof value === "number") {
      return (
        <div key={fullPath} className="flex items-center justify-between py-1 gap-2">
          <label className="text-xs text-gray-300 flex-shrink-0">{key}</label>
          <input
            type="number"
            value={currentValue}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              if (!isNaN(num)) {
                updateConfigValue(path, num);
              }
            }}
            className="bg-gray-800 text-white text-xs px-2 py-1 rounded w-24 text-right"
            step="any"
          />
        </div>
      );
    }

    if (typeof value === "string") {
      return (
        <div key={fullPath} className="flex items-center justify-between py-1 gap-2">
          <label className="text-xs text-gray-300 flex-shrink-0">{key}</label>
          <input
            type="text"
            value={currentValue}
            onChange={(e) => updateConfigValue(path, e.target.value)}
            className="bg-gray-800 text-white text-xs px-2 py-1 rounded flex-1 min-w-0"
          />
        </div>
      );
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const isExpanded = expandedSections.has(fullPath);
      return (
        <div key={fullPath} className="py-1">
          <button
            onClick={() => toggleSection(fullPath)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 w-full text-left"
          >
            <span className="text-gray-400">{isExpanded ? "▼" : "►"}</span>
            <span className="font-medium">{key}</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-gray-700 pl-2 mt-1">
              {Object.entries(value).map(([childKey, childValue]) =>
                renderConfigValue(childKey, childValue as ConfigValue, [...path, childKey])
              )}
            </div>
          )}
        </div>
      );
    }

    // For arrays or other types, show as JSON
    return (
      <div key={fullPath} className="flex items-center justify-between py-1 gap-2">
        <label className="text-xs text-gray-300 flex-shrink-0">{key}</label>
        <input
          type="text"
          value={JSON.stringify(currentValue)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              updateConfigValue(path, parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          className="bg-gray-800 text-white text-xs px-2 py-1 rounded flex-1 min-w-0 font-mono"
        />
      </div>
    );
  };

  if (!config) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
      >
        {isOpen ? "Hide Config" : "Config"}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl max-h-[80vh] overflow-y-auto min-w-[320px] max-w-[400px]">
          <h3 className="text-white font-bold mb-4 text-sm">Game Configuration</h3>

          <div className="space-y-1">
            {Object.entries(config).map(([key, value]) =>
              renderConfigValue(key, value as ConfigValue, [key])
            )}
          </div>
        </div>
      )}
    </div>
  );
}


