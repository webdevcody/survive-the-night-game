import { Button } from "~/components/ui/button";
import { useEditorStore } from "../store";

interface BiomePanelProps {
  onLoadBiome: (biomeName: string) => void;
}

export function BiomePanel({ onLoadBiome }: BiomePanelProps) {
  const biomes = useEditorStore((state) => state.biomes);
  const currentBiome = useEditorStore((state) => state.currentBiome);

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto">
      {biomes.map((biome) => (
        <Button
          key={biome.name}
          onClick={() => onLoadBiome(biome.name)}
          className={`${
            currentBiome === biome.name
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-700 hover:bg-gray-600"
          } text-white px-4 py-2 whitespace-nowrap`}
        >
          {biome.constantName.replace(/_/g, " ")}
        </Button>
      ))}
    </div>
  );
}
