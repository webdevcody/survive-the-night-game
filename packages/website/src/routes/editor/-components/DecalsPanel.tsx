import { useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import { DECAL_REGISTRY } from "@shared/config/decals-config";
import { Trash2 } from "lucide-react";

export function DecalsPanel() {
  const selectedDecalId = useEditorStore((state) => state.selectedDecalId);
  const setSelectedDecalId = useEditorStore((state) => state.setSelectedDecalId);
  const decals = useEditorStore((state) => state.decals);
  const removeDecal = useEditorStore((state) => state.removeDecal);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Animate the selected decal preview
  useEffect(() => {
    if (!selectedDecalId || !canvasRef.current) return;

    const decalPreset = DECAL_REGISTRY[selectedDecalId];
    if (!decalPreset) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tileSize = 16;
    const scale = 4; // 4x scale for preview
    canvas.width = tileSize * scale;
    canvas.height = tileSize * scale;

    const groundSheet = new Image();
    groundSheet.src = "/sheets/ground.png";

    let startTime: number | null = null;
    let isRunning = true;

    const animate = (timestamp: number) => {
      if (!isRunning) return;

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (groundSheet.complete && decalPreset.animation) {
        const { startX, startY, frameCount, duration, frameWidth = 16 } = decalPreset.animation;

        // Calculate current frame
        const progress = (elapsed % duration) / duration;
        const frameIndex = Math.floor(progress * frameCount);

        // Calculate source position
        const sourceX = startX + frameIndex * frameWidth;
        const sourceY = startY;

        // Draw scaled up
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          groundSheet,
          sourceX,
          sourceY,
          tileSize,
          tileSize,
          0,
          0,
          tileSize * scale,
          tileSize * scale,
        );
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation when image loads
    groundSheet.onload = () => {
      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // If image is already cached, start immediately
    if (groundSheet.complete) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedDecalId]);

  return (
    <div className="space-y-4">
      {/* Decal Presets */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-white">Available Decals</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(DECAL_REGISTRY).map((preset) => (
            <Button
              key={preset.id}
              onClick={() => setSelectedDecalId(preset.id)}
              className={`${
                selectedDecalId === preset.id
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-700 hover:bg-gray-600"
              } text-white px-3 py-2 text-sm`}
              title={preset.description}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Preview Canvas */}
      {selectedDecalId && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-white">Preview</h3>
          <div className="flex justify-center bg-gray-800 p-4 rounded">
            <canvas
              ref={canvasRef}
              className="border border-gray-600"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {DECAL_REGISTRY[selectedDecalId]?.description}
          </p>
        </div>
      )}

      {/* Placed Decals List */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-white">Placed Decals ({decals.length})</h3>
        {decals.length === 0 ? (
          <p className="text-xs text-gray-400">No decals placed yet</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {decals.map((decal, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded text-sm"
              >
                <span className="text-white">
                  {decal.id} at ({decal.position.x}, {decal.position.y})
                </span>
                <Button
                  onClick={() => removeDecal(index)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Decal Info */}
      {selectedDecalId && DECAL_REGISTRY[selectedDecalId] && (
        <div className="text-xs bg-gray-800 p-3 rounded">
          <p className="font-semibold mb-2 text-white">Decal Properties:</p>
          <ul className="space-y-1 text-gray-300">
            <li>
              <span className="text-gray-400">Frames:</span>{" "}
              {DECAL_REGISTRY[selectedDecalId].animation.frameCount}
            </li>
            <li>
              <span className="text-gray-400">Duration:</span>{" "}
              {DECAL_REGISTRY[selectedDecalId].animation.duration}ms
            </li>
            {DECAL_REGISTRY[selectedDecalId].light && (
              <li>
                <span className="text-yellow-400">💡 Emits Light:</span>{" "}
                {DECAL_REGISTRY[selectedDecalId].light!.radius}px radius
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-400 bg-gray-800 p-3 rounded">
        <p className="font-semibold mb-1">How to use:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Select a decal from the list above</li>
          <li>Click on the grid to place it</li>
          <li>Decals render above ground/collidables</li>
          <li>Animations play automatically in-game</li>
          <li>Light-emitting decals illuminate surroundings</li>
        </ul>
      </div>
    </div>
  );
}
