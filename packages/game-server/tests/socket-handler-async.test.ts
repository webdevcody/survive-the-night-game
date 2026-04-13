import { describe, expect, it, vi } from "vitest";

/** Mirrors ServerSocketManager: sync throws and async rejections route to .catch */
function dispatchHandler(handler: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => handler())
    .catch(() => {});
}

describe("async socket handler safety pattern", () => {
  it("routes sync throws and async rejections through Promise chain", async () => {
    const syncHandler = vi.fn(() => {
      throw new Error("sync boom");
    });
    const asyncHandler = vi.fn(async () => {
      throw new Error("async boom");
    });

    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await dispatchHandler(syncHandler);
    await dispatchHandler(asyncHandler);

    expect(syncHandler).toHaveBeenCalled();
    expect(asyncHandler).toHaveBeenCalled();

    log.mockRestore();
  });
});
