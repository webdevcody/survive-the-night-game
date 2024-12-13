import { Direction, InventoryItem, recipes, RecipeType } from "@survive-the-night/game-server";
import { Renderable } from "../entities/util";
import { GameState } from "@/state";
import { AssetManager, getItemAssetKey } from "../managers/asset";
import { PlayerClient } from "@/entities/player";

const CRAFTING_TABLE_SETTINGS = {
  Container: {
    background: "white",
    padding: {
      bottom: 20,
      left: 20,
      right: 20,
      top: 20,
    },
    right: 20,
  },
  Recipes: {
    gapX: 10,
    gapY: 10,
  },
  Recipe: {
    background: "gray",
    borderColor: "gray",
    borderWidth: 6,

    active: {
      borderColor: "green",
    },
    disabled: {
      opacity: 50,
    },
  },
  Slot: {
    padding: {
      bottom: 10,
      left: 10,
      right: 10,
      top: 10,
    },
    size: 50,
  },
  Line: {
    color: "black",
    height: 8,
    width: 25,
  },
};

export interface CraftingTableOptions {
  getInventory: () => InventoryItem[];
  onCraft: (recipe: RecipeType) => unknown;
  getPlayer: () => PlayerClient | null;
}

export class CraftingTable implements Renderable {
  private assetManager: AssetManager;
  private activeRecipe = 0;
  private getInventory: () => InventoryItem[];
  private onCraft: (recipe: RecipeType) => unknown;
  private getPlayer: () => PlayerClient | null;

  public constructor(
    assetManager: AssetManager,
    { getInventory, onCraft, getPlayer }: CraftingTableOptions
  ) {
    this.assetManager = assetManager;
    this.getInventory = getInventory;
    this.onCraft = onCraft;
    this.getPlayer = getPlayer;
  }

  public onDown() {
    this.activeRecipe += 1;

    if (this.activeRecipe === recipes.length) {
      this.activeRecipe = 0;
    }
  }

  public onSelect() {
    this.onCraft(recipes[this.activeRecipe].getType());
  }

  public onUp() {
    this.activeRecipe -= 1;

    if (this.activeRecipe === -1) {
      this.activeRecipe = recipes.length - 1;
    }
  }

  public isVisible() {
    return this.getPlayer()?.getIsCrafting() ?? false;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.isVisible()) {
      return;
    }

    const { Container, Line, Recipe, Recipes, Slot } = CRAFTING_TABLE_SETTINGS;
    let maxRecipeWidth = 0;

    for (const recipe of recipes) {
      // plus one for the resulting component
      const componentsAmount = recipe.components().length + 1;

      const recipeWidth =
        componentsAmount * Slot.size +
        (componentsAmount + 1) * Recipes.gapX +
        Line.width +
        Recipe.borderWidth * 2;

      if (recipeWidth > maxRecipeWidth) {
        maxRecipeWidth = recipeWidth;
      }
    }

    const { height: screenHeight, width: screenWidth } = ctx.canvas;
    const width = Container.padding.left + maxRecipeWidth + Container.padding.right;

    const height =
      Container.padding.top +
      (Slot.size + Recipe.borderWidth * 2) * recipes.length +
      Recipes.gapY * (recipes.length - 1) +
      Container.padding.bottom;

    const offsetTop = screenHeight / 2 - height / 2;
    const offsetLeft = screenWidth - width - Container.right;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = Container.background;
    ctx.fillRect(offsetLeft, offsetTop, width, height);

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const disabled = !recipe.canBeCrafted(this.getInventory());
      const components = recipe.components();
      const resulting = recipe.resultingComponent();

      ctx.globalAlpha = disabled ? Recipe.disabled.opacity / 100 : 1;

      let recipeHeight = Slot.size + Recipe.borderWidth * 2;
      let recipeWidth = maxRecipeWidth;
      let recipeOffsetTop = offsetTop + Container.padding.top + i * recipeHeight + i * Recipes.gapY;
      let recipeOffsetLeft = offsetLeft + Container.padding.left;

      // draw recipe border
      ctx.fillStyle = i === this.activeRecipe ? Recipe.active.borderColor : Recipe.borderColor;
      ctx.fillRect(recipeOffsetLeft, recipeOffsetTop, recipeWidth, recipeHeight);

      recipeOffsetTop += Recipe.borderWidth;
      recipeOffsetLeft += Recipe.borderWidth;

      recipeHeight -= Recipe.borderWidth * 2;
      recipeWidth -= Recipe.borderWidth * 2;

      // draw recipe background
      ctx.fillStyle = Recipe.background;
      ctx.fillRect(recipeOffsetLeft, recipeOffsetTop, recipeWidth, recipeHeight);

      const slotWidth = Slot.size - Slot.padding.left - Slot.padding.right;
      const slotHeight = Slot.size - Slot.padding.top - Slot.padding.bottom;
      const slotTop = recipeOffsetTop + Slot.padding.top;
      let slotLeft = recipeOffsetLeft;

      for (const component of components) {
        slotLeft += Slot.padding.left;

        const slotImage = this.assetManager.getWithDirection(
          getItemAssetKey({ key: component.type }),
          Direction.Right
        );

        // draw each individual crafting component
        ctx.drawImage(slotImage, slotLeft, slotTop, slotWidth, slotHeight);
        slotLeft += slotWidth + Slot.padding.right + Recipes.gapX;
      }

      const lineOffsetTop = slotTop + (slotHeight - Line.height) / 2;

      // draw line
      ctx.fillStyle = Line.color;
      ctx.fillRect(slotLeft, lineOffsetTop, Line.width, Line.height);

      slotLeft += Line.width + Recipes.gapX + Slot.padding.left;

      const slotImage = this.assetManager.getWithDirection(
        getItemAssetKey({ key: resulting.type }),
        Direction.Right
      );

      // draw resulting component
      ctx.drawImage(slotImage, slotLeft, slotTop, slotWidth, slotHeight);

      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  public toggle(): void {
    // this.visible = !this.visible;
    this.activeRecipe = 0;
  }
}
