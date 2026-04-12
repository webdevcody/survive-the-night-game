import { describe, it, expect } from "vitest";
import type { InitializationContext, ClientEventContext, GameStateUpdateContext } from "./types";

describe("InitializationContext typing", () => {
  it("extends client + game-state apply fields (compile-time contract)", () => {
    const _sample: InitializationContext = {} as InitializationContext;
    const _asClient: ClientEventContext = _sample;
    const _asApply: GameStateUpdateContext = _sample;
    expect(_asClient).toBeDefined();
    expect(_asApply).toBeDefined();
  });
});
