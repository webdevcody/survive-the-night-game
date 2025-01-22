import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { ZombieClient } from "@/entities/zombie";
import { BigZombieClient } from "@/entities/big-zombie";
import { FastZombieClient } from "@/entities/fast-zombie";
import { PlayerClient } from "@/entities/player";
import { WallClient } from "@/entities/items/wall";
import { TreeClient } from "@/entities/items/tree";
import { ClientCarryable } from "@/extensions/carryable";
import { MapManager } from "@/managers/map";
import { TILE_IDS } from "@shared/map";

const HUD_SETTINGS = {
  ControlsList: {
    background: "rgba(0, 0, 0, 0.8)",
    color: "rgb(255, 255, 255)",
    font: "32px Arial",
    lineHeight: 40,
    left: 20,
    top: 20,
    padding: {
      bottom: 20,
      left: 20,
      right: 20,
      top: 20,
    },
  },
  Minimap: {
    size: 400,
    left: 40,
    bottom: 40,
    background: "rgba(0, 0, 0, 0.7)",
    scale: 0.7,
    colors: {
      enemy: "red",
      player: "blue",
      wall: "white",
      item: "yellow",
      tree: "green",
    },
  },
};

export class Hud {
  private showInstructions: boolean = true;
  private gameMessages: { message: string; timestamp: number }[] = [];
  private messageTimeout: number = 5000;
  private mapManager: MapManager;

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;
  }

  update(gameState: GameState): void {
    this.gameMessages = this.gameMessages.filter(
      (message) => Date.now() - message.timestamp < this.messageTimeout
    );
  }

  public toggleInstructions(): void {
    this.showInstructions = !this.showInstructions;
  }

  private getCycleText(gameState: GameState): string {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - gameState.cycleStartTime) / 1000;
    const remainingTime = Math.max(0, Math.ceil(gameState.cycleDuration - elapsedTime));
    const timeOfDay = gameState.isDay ? "Day" : "Night";
    return `${timeOfDay} ${gameState.dayNumber} - ${remainingTime}s`;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width } = ctx.canvas;

    // Render minimap first
    this.renderMinimap(ctx, gameState);

    ctx.font = "32px Arial";
    ctx.fillStyle = "white";

    const dayText = `Day ${gameState.dayNumber}`;
    const timeOfDay = gameState.isDay ? "Day" : "Night";
    const cycleText = this.getCycleText(gameState);

    const dayTextWidth = ctx.measureText(dayText).width;
    const cycleTextWidth = ctx.measureText(cycleText).width;

    const margin = 50;
    const gap = 50;
    ctx.fillText(dayText, width - dayTextWidth - margin, margin);
    ctx.fillText(cycleText, width - cycleTextWidth - margin, margin + gap);

    const myPlayer = getPlayer(gameState);

    if (myPlayer) {
      const health = myPlayer.getHealth();
      const healthText = `Health: ${health}`;
      const healthTextWidth = ctx.measureText(healthText).width;
      ctx.fillText(healthText, width - healthTextWidth - margin, margin + gap * 2);
    }

    this.renderControlsList(ctx, gameState);
    this.renderGameMessages(ctx);
  }

  public addMessage(message: string): void {
    this.gameMessages.push({
      message,
      timestamp: Date.now(),
    });
  }

  public showPlayerDeath(playerId: string): void {
    this.addMessage(`${playerId} has died`);
  }

  public showPlayerJoined(playerId: string): void {
    this.addMessage(`${playerId} has joined the game`);
  }

  private renderGameMessages(ctx: CanvasRenderingContext2D): void {
    ctx.font = "32px Arial";
    ctx.fillStyle = "white";
    const margin = 50;
    const gap = 40;

    this.gameMessages.forEach((message, index) => {
      const metrics = ctx.measureText(message.message);
      const x = (ctx.canvas.width - metrics.width) / 2;
      ctx.fillText(message.message, x, margin + index * gap);
    });
  }

  public renderControlsList(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.showInstructions) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const text = 'Press "i" for instructions';
      ctx.font = "32px Arial";
      const metrics = ctx.measureText(text);

      // Draw background panel
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(10, 10, metrics.width + 20, 40);

      // Draw text
      ctx.fillStyle = "white";
      ctx.fillText(text, 20, 40);

      ctx.restore();
      return;
    }

    const regularText =
      "Left [A]\n" +
      "Right [D]\n" +
      "Down [S]\n" +
      "Up [W]\n" +
      "Fire [SPACE]\n" +
      "Consume [F]\n" +
      "Harvest [E]\n" +
      "Craft [Q]\n" +
      "Toggle Instructions [I]";

    const craftingText = "Down [S]\nUp [W]\nCraft [SPACE]";
    const innerText = gameState.crafting ? craftingText : regularText;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = HUD_SETTINGS.ControlsList.font;

    const lines = innerText.trim().split("\n");
    let maxLineWidth = 0;
    let maxLineHeight = 0;

    for (const line of lines) {
      const metrics = ctx.measureText(line);

      if (maxLineWidth < metrics.width) {
        maxLineWidth = metrics.width;
      }

      if (maxLineHeight < metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) {
        maxLineHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
      }
    }

    const lineHeight =
      HUD_SETTINGS.ControlsList.lineHeight > maxLineHeight
        ? HUD_SETTINGS.ControlsList.lineHeight
        : maxLineHeight;

    const height =
      lineHeight * lines.length +
      HUD_SETTINGS.ControlsList.padding.top +
      HUD_SETTINGS.ControlsList.padding.bottom;

    const width =
      maxLineWidth +
      HUD_SETTINGS.ControlsList.padding.left +
      HUD_SETTINGS.ControlsList.padding.right;

    ctx.fillStyle = HUD_SETTINGS.ControlsList.background;
    ctx.fillRect(HUD_SETTINGS.ControlsList.left, HUD_SETTINGS.ControlsList.top, width, height);

    ctx.textBaseline = "top";
    ctx.fillStyle = HUD_SETTINGS.ControlsList.color;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const offsetTop = i * lineHeight + (HUD_SETTINGS.ControlsList.lineHeight - maxLineHeight) / 2;

      ctx.fillText(
        line,
        HUD_SETTINGS.ControlsList.left + HUD_SETTINGS.ControlsList.padding.left,
        offsetTop + HUD_SETTINGS.ControlsList.top + HUD_SETTINGS.ControlsList.padding.top
      );
    }

    ctx.restore();
  }

  private renderMinimap(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const settings = HUD_SETTINGS.Minimap;
    const myPlayer = getPlayer(gameState);
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable)) return;

    const playerPos = myPlayer.getExt(ClientPositionable).getPosition();
    const tileSize = 16; // This should match the tile size in MapManager

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Calculate position from bottom
    const top = ctx.canvas.height - settings.bottom - settings.size;

    // Create circular clip
    ctx.beginPath();
    ctx.arc(
      settings.left + settings.size / 2,
      top + settings.size / 2,
      settings.size / 2,
      0,
      Math.PI * 2
    );
    ctx.clip();

    // Draw minimap background
    ctx.fillStyle = settings.background;
    ctx.fillRect(settings.left, top, settings.size, settings.size);

    // Draw forest tiles
    const map = this.mapManager.getMap();
    if (map) {
      ctx.fillStyle = settings.colors.tree;
      map.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === TILE_IDS.FOREST) {
            const worldX = x * tileSize;
            const worldY = y * tileSize;

            // Calculate relative position to player
            const relativeX = worldX - playerPos.x;
            const relativeY = worldY - playerPos.y;

            // Convert to minimap coordinates (centered on player)
            const minimapX = settings.left + settings.size / 2 + relativeX * settings.scale;
            const minimapY = top + settings.size / 2 + relativeY * settings.scale;

            // Draw forest tile
            ctx.fillRect(minimapX - 2, minimapY - 2, 4, 4);
          }
        });
      });
    }

    // Loop through all entities and draw them on minimap
    for (const entity of gameState.entities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getPosition();

      // Calculate relative position to player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;

      // Convert to minimap coordinates (centered on player)
      const minimapX = settings.left + settings.size / 2 + relativeX * settings.scale;
      const minimapY = top + settings.size / 2 + relativeY * settings.scale;
      const minimapSize = 4;

      // Determine color based on entity type
      let color = null;
      if (
        entity instanceof ZombieClient ||
        entity instanceof BigZombieClient ||
        entity instanceof FastZombieClient
      ) {
        color = settings.colors.enemy;
      } else if (entity instanceof PlayerClient) {
        color = settings.colors.player;
      } else if (entity instanceof WallClient) {
        color = settings.colors.wall;
      } else if (entity.hasExt(ClientCarryable)) {
        color = settings.colors.item;
      }

      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          minimapX - minimapSize / 2,
          minimapY - minimapSize / 2,
          minimapSize,
          minimapSize
        );
      }
    }

    // Draw radar circle border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      settings.left + settings.size / 2,
      top + settings.size / 2,
      settings.size / 2,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Draw crosshair at center (player position)
    const crosshairSize = 6;
    ctx.strokeStyle = settings.colors.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(settings.left + settings.size / 2 - crosshairSize, top + settings.size / 2);
    ctx.lineTo(settings.left + settings.size / 2 + crosshairSize, top + settings.size / 2);
    ctx.moveTo(settings.left + settings.size / 2, top + settings.size / 2 - crosshairSize);
    ctx.lineTo(settings.left + settings.size / 2, top + settings.size / 2 + crosshairSize);
    ctx.stroke();

    ctx.restore();
  }
}
