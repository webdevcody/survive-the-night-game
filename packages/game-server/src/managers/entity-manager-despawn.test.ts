import { describe, it, expect } from "vitest";
import { EntityManager } from "./entity-manager";

describe("EntityManager.despawnEntity", () => {
  it("immediate mode records removal in tracker even when entity id is unknown", () => {
    const em = new EntityManager();
    em.despawnEntity(42, "immediate");
    expect(em.getEntityStateTracker().getRemovedEntityIds()).toContain(42);
  });

  it("endOfTick mode does not track removal when entity is missing", () => {
    const em = new EntityManager();
    em.despawnEntity(99, "endOfTick", 0);
    expect(em.getEntityStateTracker().getRemovedEntityIds()).not.toContain(99);
  });
});
