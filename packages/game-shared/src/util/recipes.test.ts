import { describe, expect, it } from "vitest";
import { getRecipesForStation, getScrapOutputsForItem, isRecipeUnlocked, recipeCanBeCrafted } from "./recipes";

describe("recipes", () => {
  it("maps professions to their station recipes", () => {
    const workbenchRecipes = getRecipesForStation("workbench").map((recipe) => recipe.id);
    expect(workbenchRecipes).toContain("torch");
    expect(workbenchRecipes).toContain("cloth_hood");
    expect(workbenchRecipes).toContain("scrap_metal_bundle");

    const campfireRecipes = getRecipesForStation("campfire").map((recipe) => recipe.id);
    expect(campfireRecipes).toContain("trail_mix");
    expect(campfireRecipes).toContain("campfire_feast");
  });

  it("enforces profession unlocks and ingredient checks", () => {
    const pistolRecipe = getRecipesForStation("forge").find((recipe) => recipe.id === "pistol");
    expect(pistolRecipe).toBeTruthy();
    expect(
      isRecipeUnlocked(pistolRecipe!, (professionId) => (professionId === "gunsmithing" ? 8 : 1)),
    ).toBe(false);
    expect(
      isRecipeUnlocked(pistolRecipe!, (professionId) => (professionId === "gunsmithing" ? 9 : 1)),
    ).toBe(true);

    expect(
      recipeCanBeCrafted(
        pistolRecipe!,
        [
          { itemType: "scrap_metal", state: { count: 4 } },
          { itemType: "gun_parts", state: { count: 3 } },
          { itemType: "electronics", state: { count: 1 } },
        ],
      ),
    ).toBe(true);
  });

  it("returns salvage outputs for crafted gear", () => {
    expect(getScrapOutputsForItem("pistol")?.components).toEqual([
      { type: "scrap_metal", count: 2 },
      { type: "gun_parts", count: 1 },
      { type: "electronics", count: 1 },
    ]);
    expect(getScrapOutputsForItem("cloth_hood")?.components).toEqual([
      { type: "cloth", count: 1 },
      { type: "leather_strips", count: 1 },
    ]);
  });
});
