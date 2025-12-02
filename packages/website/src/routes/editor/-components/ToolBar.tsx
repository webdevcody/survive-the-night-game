import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";

interface ToolBarProps {
  onSave: () => void;
}

export function ToolBar({ onSave }: ToolBarProps) {
  const currentBiome = useEditorStore((state) => state.currentBiome);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const groundDimensions = useEditorStore((state) => state.groundDimensions);
  const collidablesDimensions = useEditorStore((state) => state.collidablesDimensions);
  const setIsCreateDialogOpen = useEditorStore((state) => state.setIsCreateDialogOpen);

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">
        Biome Editor
        <span className="text-sm text-gray-400 ml-4">
          Ground: {groundDimensions.cols}×{groundDimensions.rows} ({groundDimensions.totalTiles}{" "}
          tiles) | Collidables: {collidablesDimensions.cols}×{collidablesDimensions.rows} (
          {collidablesDimensions.totalTiles} tiles)
        </span>
      </h1>

      <div className="flex gap-3">
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 text-lg"
        >
          Create New Biome
        </Button>
        <Button
          onClick={onSave}
          disabled={!currentBiome || saveStatus === "saving"}
          className={`${
            saveStatus === "saved"
              ? "bg-green-600 hover:bg-green-700"
              : saveStatus === "error"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
          } text-white px-6 py-2 text-lg`}
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved!"
              : saveStatus === "error"
                ? "Error!"
                : "Save Biome"}
        </Button>
      </div>
    </div>
  );
}
