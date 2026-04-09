import { useEffect, useId, useState } from "react";
import { getConfig } from "@survive-the-night/game-shared/config";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useEditorStore } from "../-store";
import { useExpandWorldMap } from "../-hooks/useEditorApi";

interface ExpandMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpandMapDialog({ open, onOpenChange }: ExpandMapDialogProps) {
  const groundGrid = useEditorStore((s) => s.groundGrid);
  const expandMutation = useExpandWorldMap();
  const id = useId();

  const { BIOME_SIZE, MAP_SIZE: configMapSize } = getConfig().world;
  const sideTiles = groundGrid.length;
  const mapBiomesFromGrid =
    sideTiles > 0 && sideTiles % BIOME_SIZE === 0 ? sideTiles / BIOME_SIZE : configMapSize;

  const [inputValue, setInputValue] = useState(String(mapBiomesFromGrid + 2));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLocalError(null);
      setInputValue(String(mapBiomesFromGrid + 2));
    }
  }, [open, mapBiomesFromGrid]);

  const handleExpand = () => {
    setLocalError(null);
    const parsed = parseInt(inputValue, 10);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setLocalError("Enter a whole number.");
      return;
    }
    if (parsed < mapBiomesFromGrid) {
      setLocalError(`Must be at least ${mapBiomesFromGrid} (current size).`);
      return;
    }
    expandMutation.mutate(
      { mapSizeBiomes: parsed },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  const nextTileSize = (() => {
    const parsed = parseInt(inputValue, 10);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      return null;
    }
    return parsed * BIOME_SIZE;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-gray-600 bg-gray-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Expand map</DialogTitle>
          <DialogDescription className="text-gray-400">
            Increase MAP_SIZE (biomes per side). Existing tiles stay anchored at the top-left; new
            tiles are added to
            the right and bottom only (world coordinates for existing tiles do not shift). New edge
            cells use empty defaults. Updates{" "}
            <code className="text-gray-300">world-map.json</code> and{" "}
            <code className="text-gray-300">world-config.ts</code> on disk. Restart the game server
            before play-testing in-game.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <p className="text-sm text-gray-300">
            Current:{" "}
            <span className="font-mono text-white">
              {sideTiles}×{sideTiles} tiles
            </span>{" "}
            ({mapBiomesFromGrid} biomes per side × {BIOME_SIZE} tiles/biome)
          </p>
          {nextTileSize !== null && (
            <p className="text-sm text-gray-400">
              After expand:{" "}
              <span className="font-mono text-gray-200">
                {nextTileSize}×{nextTileSize} tiles
              </span>
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id} className="text-gray-300">
              New MAP_SIZE (biomes per side)
            </Label>
            <Input
              id={id}
              type="number"
              min={mapBiomesFromGrid}
              step={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="rounded-none border-gray-600 bg-gray-950 font-mono text-white"
            />
          </div>
          {(localError || expandMutation.isError) && (
            <p className="text-sm text-red-400">
              {localError ??
                (expandMutation.error instanceof Error
                  ? expandMutation.error.message
                  : "Expand failed")}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="secondary"
            className="rounded-none border border-gray-600"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-none bg-amber-700 text-white hover:bg-amber-600"
            disabled={expandMutation.isPending}
            onClick={handleExpand}
          >
            {expandMutation.isPending ? "Expanding…" : "Expand map"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
