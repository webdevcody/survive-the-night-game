import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientEventHandlers } from "./client-event-handlers";

class FakeCanvas {
  public width = 800;
  public height = 600;
  private listeners = new Map<string, Set<(event: any) => void>>();

  addEventListener(event: string, handler: (event: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: (event: any) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  dispatch(event: string, payload: any): void {
    for (const handler of this.listeners.get(event) ?? []) {
      handler(payload);
    }
  }

  getBoundingClientRect(): DOMRect {
    return {
      left: 0,
      top: 0,
      width: this.width,
      height: this.height,
    } as DOMRect;
  }
}

describe("ClientEventHandlers pointer activity", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends activity heartbeats every 30 seconds only while the mouse moved recently", () => {
    vi.useFakeTimers();

    const socketManager = {
      getIsDisconnected: vi.fn(() => false),
      sendPointerActivity: vi.fn(),
    };
    const gameClient = {
      getHud: () => ({
        isFullscreenMapOpen: () => false,
        updateMousePosition: vi.fn(),
        handleMouseMove: vi.fn(),
        isHoveringInventory: () => false,
        handleWheel: vi.fn(() => false),
      }),
      getCraftingPanel: () => ({
        isVisible: () => false,
      }),
      getInputManager: () => ({
        updateMousePosition: vi.fn(),
      }),
      getRenderer: () => ({
        updateMousePosition: vi.fn(),
      }),
      getSocketManager: () => socketManager,
    };
    const canvas = new FakeCanvas();
    const handlers = new ClientEventHandlers(gameClient as any);

    handlers.setupEventListeners(canvas as any);
    canvas.dispatch("mousemove", { clientX: 100, clientY: 120 });

    vi.advanceTimersByTime(30_000);
    expect(socketManager.sendPointerActivity).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(socketManager.sendPointerActivity).toHaveBeenCalledTimes(1);
  });

  it("does not send activity heartbeats while disconnected", () => {
    vi.useFakeTimers();

    const socketManager = {
      getIsDisconnected: vi.fn(() => true),
      sendPointerActivity: vi.fn(),
    };
    const gameClient = {
      getHud: () => ({
        isFullscreenMapOpen: () => false,
        updateMousePosition: vi.fn(),
        handleMouseMove: vi.fn(),
        isHoveringInventory: () => false,
        handleWheel: vi.fn(() => false),
      }),
      getCraftingPanel: () => ({
        isVisible: () => false,
      }),
      getInputManager: () => ({
        updateMousePosition: vi.fn(),
      }),
      getRenderer: () => ({
        updateMousePosition: vi.fn(),
      }),
      getSocketManager: () => socketManager,
    };
    const canvas = new FakeCanvas();
    const handlers = new ClientEventHandlers(gameClient as any);

    handlers.setupEventListeners(canvas as any);
    canvas.dispatch("mousemove", { clientX: 100, clientY: 120 });

    vi.advanceTimersByTime(30_000);
    expect(socketManager.sendPointerActivity).not.toHaveBeenCalled();
  });
});
