import { Renderable } from "@/entities/util";
import { GameState } from "@/state";
import { AssetManager, getItemAssetKey } from "@/managers/asset";
import { PlayerClient } from "@/entities/player";
import { Z_INDEX } from "@shared/map";
import { Direction } from "../../../game-shared/src/util/direction";
import { InventoryItem } from "../../../game-shared/src/util/inventory";
import { RecipeType, recipes } from "../../../game-shared/src/util/recipes";

const CRAFTING_TABLE_SETTINGS = {
  Container: {
    background: "rgba(255, 255, 255, 0.85)",
    padding: {
      bottom: 20,
      left: 20,
      right: 20,
      top: 50,
    },
    right: 20,
  },
  Instructions: {
    color: "rgba(0, 0, 0, 0.7)",
    fontSize: 24,
    text: "Select [W / S]    Craft - [Space]    Close - [Q]",
    offsetY: 25,
  },
  Recipes: {
    gapX: 10,
    gapY: 10,
  },
  Recipe: {
    background: "rgba(128, 128, 128, 0.3)",
    borderColor: "rgba(128, 128, 128, 0.5)",
    borderWidth: 6,

    active: {
      craftable: {
        borderColor: "#22c55e",
        background: "rgba(34, 197, 94, 0.2)",
      },
      uncraftable: {
        borderColor: "#dc2626",
        background: "rgba(220, 38, 38, 0.1)",
      },
    },
    disabled: {
      background: "rgba(128, 128, 128, 0.15)",
    },
  },
  Slot: {
    padding: {
      bottom: 20,
      left: 20,
      right: 20,
      top: 20,
    },
    size: 120,
  },
  Line: {
    color: "rgba(0, 0, 0, 0.6)",
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

  public getZIndex(): number {
    return Z_INDEX.UI;
  }

  public onDown() {
    this.activeRecipe += 1;

    if (this.activeRecipe === recipes.length) {
      this.activeRecipe = 0;
    }
  }

  public onSelect() {
    const sortedRecipes = [...recipes].sort((a, b) => {
      const aCanBeCrafted = a.canBeCrafted(this.getInventory());
      const bCanBeCrafted = b.canBeCrafted(this.getInventory());
      return bCanBeCrafted === aCanBeCrafted ? 0 : bCanBeCrafted ? 1 : -1;
    });
    const recipe = sortedRecipes[this.activeRecipe];

    if (recipe.canBeCrafted(this.getInventory())) {
      this.onCraft(recipe.getType());
    }
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

    // Sort recipes by craftability
    const sortedRecipes = [...recipes].sort((a, b) => {
      const aCanBeCrafted = a.canBeCrafted(this.getInventory());
      const bCanBeCrafted = b.canBeCrafted(this.getInventory());
      return bCanBeCrafted === aCanBeCrafted ? 0 : bCanBeCrafted ? 1 : -1;
    });

    for (const recipe of sortedRecipes) {
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

    // Draw instructions
    const { Instructions } = CRAFTING_TABLE_SETTINGS;
    ctx.font = `${Instructions.fontSize}px Arial`;
    ctx.fillStyle = Instructions.color;
    ctx.textAlign = "center";
    ctx.fillText(Instructions.text, offsetLeft + width / 2, offsetTop + Instructions.offsetY);

    for (let i = 0; i < sortedRecipes.length; i++) {
      const recipe = sortedRecipes[i];
      const disabled = !recipe.canBeCrafted(this.getInventory());
      const isActive = i === this.activeRecipe;
      const components = recipe.components();
      const resulting = recipe.resultingComponent();

      let recipeHeight = Slot.size + Recipe.borderWidth * 2;
      let recipeWidth = maxRecipeWidth;
      let recipeOffsetTop = offsetTop + Container.padding.top + i * recipeHeight + i * Recipes.gapY;
      let recipeOffsetLeft = offsetLeft + Container.padding.left;

      // draw recipe border
      if (isActive) {
        ctx.fillStyle = disabled
          ? Recipe.active.uncraftable.borderColor
          : Recipe.active.craftable.borderColor;
      } else {
        ctx.fillStyle = Recipe.borderColor;
      }
      ctx.fillRect(recipeOffsetLeft, recipeOffsetTop, recipeWidth, recipeHeight);

      recipeOffsetTop += Recipe.borderWidth;
      recipeOffsetLeft += Recipe.borderWidth;

      recipeHeight -= Recipe.borderWidth * 2;
      recipeWidth -= Recipe.borderWidth * 2;

      // draw recipe background
      if (isActive) {
        ctx.fillStyle = disabled
          ? Recipe.active.uncraftable.background
          : Recipe.active.craftable.background;
      } else {
        ctx.fillStyle = disabled ? Recipe.disabled.background : Recipe.background;
      }
      ctx.fillRect(recipeOffsetLeft, recipeOffsetTop, recipeWidth, recipeHeight);

      const slotWidth = Slot.size - Slot.padding.left - Slot.padding.right;
      const slotHeight = Slot.size - Slot.padding.top - Slot.padding.bottom;
      const slotTop = recipeOffsetTop + Slot.padding.top;
      let slotLeft = recipeOffsetLeft;

      for (const component of components) {
        slotLeft += Slot.padding.left;

        const slotImage = this.assetManager.getWithDirection(
          getItemAssetKey({ itemType: component.type }),
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
        getItemAssetKey({ itemType: resulting.type }),
        Direction.Right
      );

      // draw resulting component
      ctx.drawImage(slotImage, slotLeft, slotTop, slotWidth, slotHeight);
    }

    ctx.restore();
  }

  public reset(): void {
    // this.visible = !this.visible;
    this.activeRecipe = 0;
  }
}
