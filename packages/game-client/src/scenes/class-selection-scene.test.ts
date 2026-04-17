import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeImage {
  static instances: FakeImage[] = [];

  public complete = false;
  public naturalWidth = 0;
  public naturalHeight = 0;
  public decoding = "";
  public onload: null | (() => void) = null;
  private _src = "";

  constructor() {
    FakeImage.instances.push(this);
  }

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
  }
}

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

function createCanvasContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    canvas: { width: 1280, height: 720 },
    fillStyle: "",
    strokeStyle: "",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    lineWidth: 1,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn((value: string) => ({ width: value.length * 7 })),
    createLinearGradient: vi.fn(() => gradient),
  };
}

function createCanvas(ctx: ReturnType<typeof createCanvasContext>) {
  return {
    width: 1280,
    height: 720,
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
    })),
  } as unknown as HTMLCanvasElement;
}

describe("ClassSelectionScene", () => {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousImage = globalThis.Image;

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("./game-scene", () => ({ GameScene: class GameScene {} }));
    FakeImage.instances = [];
    Object.defineProperty(globalThis, "window", {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorageMock(),
      configurable: true,
    });
    Object.defineProperty(globalThis, "Image", {
      value: FakeImage,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.doUnmock("./game-scene");

    if (previousWindow === undefined) {
      delete (globalThis as { window?: Window }).window;
    } else {
      Object.defineProperty(globalThis, "window", {
        value: previousWindow,
        configurable: true,
      });
    }

    if (previousLocalStorage === undefined) {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    } else {
      Object.defineProperty(globalThis, "localStorage", {
        value: previousLocalStorage,
        configurable: true,
      });
    }

    if (previousImage === undefined) {
      delete (globalThis as { Image?: typeof Image }).Image;
    } else {
      Object.defineProperty(globalThis, "Image", {
        value: previousImage,
        configurable: true,
      });
    }
  });

  it("preloads and renders artwork for each class card", async () => {
    const { ClassSelectionScene, PLAYER_CLASSES } = await import("./class-selection-scene");
    const ctx = createCanvasContext();
    const canvas = createCanvas(ctx);

    const scene = new ClassSelectionScene(canvas, { switchScene: vi.fn() } as never);

    expect(FakeImage.instances.map((image) => image.src)).toEqual([
      "/ui/classes/class-survivor.jpg",
      "/ui/classes/class-scavenger.jpg",
      "/ui/classes/class-medic.jpg",
    ]);

    for (const image of FakeImage.instances) {
      image.complete = true;
      image.naturalWidth = 640;
      image.naturalHeight = 900;
      image.onload?.();
    }

    scene.render();

    expect(ctx.drawImage).toHaveBeenCalledTimes(PLAYER_CLASSES.length);
  });

  it("keeps selected card perks above the call-to-action bar", async () => {
    const { ClassSelectionScene, PLAYER_CLASSES } = await import("./class-selection-scene");
    const ctx = createCanvasContext();
    const canvas = createCanvas(ctx);

    const scene = new ClassSelectionScene(canvas, { switchScene: vi.fn() } as never);

    for (const image of FakeImage.instances) {
      image.complete = true;
      image.naturalWidth = 640;
      image.naturalHeight = 900;
      image.onload?.();
    }

    scene.render();

    const selectedCardCta = ctx.fillRect.mock.calls.find(
      (call) => call[2] === 250 && call[3] === 24,
    );
    expect(selectedCardCta).toBeDefined();

    const selectedPerkYs = ctx.fillText.mock.calls
      .filter((call) =>
        PLAYER_CLASSES[0].perks.some((perk) => String(call[0]) === `• ${perk}`),
      )
      .map((call) => Number(call[2]));

    expect(selectedPerkYs.length).toBe(PLAYER_CLASSES[0].perks.length);
    expect(Math.max(...selectedPerkYs)).toBeLessThan(Number(selectedCardCta?.[1]) - 10);
  });
});
