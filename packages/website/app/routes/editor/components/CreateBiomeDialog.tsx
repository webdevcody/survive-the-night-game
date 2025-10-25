import { Button } from "~/components/ui/button";
import { useEditorStore } from "../store";
import { toKebabCase } from "../utils";

interface CreateBiomeDialogProps {
  onCreateBiome: () => Promise<void>;
}

export function CreateBiomeDialog({ onCreateBiome }: CreateBiomeDialogProps) {
  const isCreateDialogOpen = useEditorStore((state) => state.isCreateDialogOpen);
  const setIsCreateDialogOpen = useEditorStore((state) => state.setIsCreateDialogOpen);
  const newBiomeName = useEditorStore((state) => state.newBiomeName);
  const setNewBiomeName = useEditorStore((state) => state.setNewBiomeName);
  const isCreating = useEditorStore((state) => state.isCreating);

  if (!isCreateDialogOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newBiomeName.trim()) {
      onCreateBiome();
    }
  };

  const handleClose = () => {
    setIsCreateDialogOpen(false);
    setNewBiomeName("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Create New Biome</h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Biome Name</label>
          <input
            type="text"
            value={newBiomeName}
            onChange={(e) => setNewBiomeName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Desert Ruins, Ice Cave, etc."
            className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>

        {newBiomeName.trim() && (
          <div className="mb-4 text-sm">
            <span className="text-gray-400">File name: </span>
            <span className="text-purple-400 font-mono">{toKebabCase(newBiomeName)}.ts</span>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            onClick={handleClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreateBiome}
            disabled={!newBiomeName.trim() || isCreating}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
