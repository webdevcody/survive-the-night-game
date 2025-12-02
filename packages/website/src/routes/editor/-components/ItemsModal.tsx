import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { useSpawnableEntities } from "../-hooks/useEditorApi";
import type { EntityType } from "@survive-the-night/game-shared/types/entity";

// Zombie entity types to filter out from items panel
const ZOMBIE_ENTITIES = new Set([
  "zombie",
  "big_zombie",
  "fast_zombie",
  "exploding_zombie",
  "bat_zombie",
  "spitter_zombie",
  "leaping_zombie",
]);

export function ItemsModal() {
  const isItemsModalOpen = useEditorStore((state) => state.isItemsModalOpen);
  const setIsItemsModalOpen = useEditorStore((state) => state.setIsItemsModalOpen);
  const currentBiome = useEditorStore((state) => state.currentBiome);
  const currentItems = useEditorStore((state) => state.currentItems);
  const addItem = useEditorStore((state) => state.addItem);
  const removeItem = useEditorStore((state) => state.removeItem);

  const { data: spawnableEntities, isLoading, error } = useSpawnableEntities();

  // Filter out zombies from spawnable entities to show only items
  const itemEntityTypes = spawnableEntities
    ? spawnableEntities.filter((entity) => !ZOMBIE_ENTITIES.has(entity as EntityType))
    : [];

  if (!isItemsModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            Item Spawns for {currentBiome && currentBiome.toUpperCase().replace(/-/g, " ")}
          </h2>
          <Button
            onClick={() => setIsItemsModalOpen(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2"
          >
            Close
          </Button>
        </div>

        {/* Current Items */}
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-2">Current Items ({currentItems.length}):</div>
          <div className="flex flex-wrap gap-2 min-h-[60px] bg-gray-900 p-3 rounded">
            {currentItems.length === 0 ? (
              <div className="text-gray-500 text-sm">
                No items added yet. Click on entities below to add them.
              </div>
            ) : (
              currentItems.map((item, index) => {
                const displayName = item.replace("Entities.", "").toLowerCase().replace(/_/g, " ");
                return (
                  <button
                    key={`${item}-${index}`}
                    onClick={() => removeItem(index)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer"
                    title="Click to remove"
                  >
                    {displayName} ✕
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Available Entities */}
        <div>
          <div className="text-sm text-gray-400 mb-2">Available Entities (Click to add):</div>
          <div className="flex flex-wrap gap-2 bg-gray-900 p-3 rounded max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="text-gray-500 text-sm">Loading entities...</div>
            ) : error ? (
              <div className="text-red-500 text-sm">Failed to load entities. Please try again.</div>
            ) : itemEntityTypes.length === 0 ? (
              <div className="text-gray-500 text-sm">No entities available.</div>
            ) : (
              itemEntityTypes.map((entity: EntityType) => {
                const displayName = entity.replace(/_/g, " ");
                return (
                  <button
                    key={entity}
                    onClick={() => addItem(entity)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors cursor-pointer"
                    title={`Add ${displayName}`}
                  >
                    {displayName}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
