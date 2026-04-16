import { useState, type CSSProperties } from "react";
import {
  EDITOR_SPAWN_SPRITE_SHEET_URLS,
  getEditorSpawnSpriteBlit,
} from "@survive-the-night/game-shared/map/editor-spawn-sprite";
import { getConfig } from "@survive-the-night/game-shared/config";
import { cn } from "~/lib/utils";

type EditorSpawnSpriteIconProps = {
  spawnTileId: number;
  /** Scale from source pixels (default 2 → 32px box for 16×16 art). */
  zoom?: number;
  className?: string;
};

export function EditorSpawnSpriteIcon({
  spawnTileId,
  zoom = 2,
  className,
}: EditorSpawnSpriteIconProps) {
  const blit = getEditorSpawnSpriteBlit(spawnTileId);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const fallback = getConfig().world.TILE_SIZE * zoom;

  if (!blit) {
    return (
      <span
        className={cn(
          "inline-block shrink-0 rounded border border-dashed border-gray-600 bg-gray-900/80",
          className,
        )}
        style={{ width: fallback, height: fallback }}
      />
    );
  }

  const url = EDITOR_SPAWN_SPRITE_SHEET_URLS[blit.sheet];
  const boxW = blit.sw * zoom;
  const boxH = blit.sh * zoom;

  const imgStyle: CSSProperties = nat
    ? {
        position: "absolute",
        left: -blit.sx * zoom,
        top: -blit.sy * zoom,
        width: nat.w * zoom,
        height: nat.h * zoom,
        imageRendering: "pixelated",
        maxWidth: "none",
      }
    : { visibility: "hidden", position: "absolute" as const };

  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded border border-gray-600 bg-gray-950",
        className,
      )}
      style={{ width: boxW, height: boxH }}
    >
      <img
        src={url}
        alt=""
        decoding="async"
        draggable={false}
        onLoad={(e) =>
          setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
        }
        style={imgStyle}
      />
    </span>
  );
}
