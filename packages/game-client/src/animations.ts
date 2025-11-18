import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export interface AnimationFrame {
  percent: number;
  offset: { x: number; y: number };
}

export interface Animation {
  duration: number;
  frames: AnimationFrame[];
}

export function animate(
  now: number,
  startedAt: number,
  position: Vector2,
  animation: Animation,
  target: Vector2
): Vector2 {
  const { duration, frames } = animation;
  const currentProgress = (((now - startedAt) % duration) * 100) / duration;

  let currentFrameIdx = frames.length - 1;

  // Assuming frames are sorted by percent (ascending)
  for (let i = frames.length - 1; i >= 0; i--) {
    if (currentProgress >= frames[i].percent) {
      currentFrameIdx = i;
      break;
    }
  }

  const nextFrameIdx = currentFrameIdx === frames.length - 1 ? 0 : currentFrameIdx + 1;
  const currentFrame = frames[currentFrameIdx];
  const nextFrame = frames[nextFrameIdx];

  const currentFramePercent = currentFrame.percent;
  const nextFramePercent = nextFrame.percent;

  const frameLength =
    currentFramePercent > nextFramePercent
      ? 100 - currentFramePercent + nextFramePercent
      : nextFramePercent - currentFramePercent;

  const frameProgress = (currentProgress - currentFramePercent) / frameLength;

  const { x: x0, y: y0 } = currentFrame.offset;
  const { x: x1, y: y1 } = nextFrame.offset;

  return target.reset(
    position.x + x0 + (x1 - x0) * frameProgress,
    position.y + y0 + (y1 - y0) * frameProgress
  );
}

export function bounce(size: number): Animation {
  return {
    duration: 700,
    frames: [
      { percent: 0, offset: { x: 0, y: 0 } },
      { percent: 20, offset: { x: 0, y: size * 0.1 } },
      { percent: 40, offset: { x: 0, y: 0 } },
    ],
  };
}
