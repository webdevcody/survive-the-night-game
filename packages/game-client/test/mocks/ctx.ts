import { vi } from "vitest";

export function createMockCtx() {
  const mockCtx = {
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
  } as unknown as CanvasRenderingContext2D;

  return mockCtx;
}
