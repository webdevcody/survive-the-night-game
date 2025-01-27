import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { ZombieClient } from "@/entities/zombie";
import { BigZombieClient } from "@/entities/big-zombie";
import { FastZombieClient } from "@/entities/fast-zombie";
import { PlayerClient } from "@/entities/player";
import { WallClient } from "@/entities/items/wall";
import { ClientCarryable } from "@/extensions/carryable";
import { MapManager } from "@/managers/map";
import { TILE_IDS } from "@shared/map";
import { ChatWidget } from "./chat-widget";
import { ClientDestructible } from "@/extensions/destructible";
import { Zombies, VERSION } from "@shared/constants";

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
  UpcomingFeatures: {
    background: "rgba(0, 0, 0, 0.8)",
    color: "rgb(255, 255, 255)",
    font: "32px Arial",
    lineHeight: 40,
    right: 20,
    top: 20,
    padding: {
      bottom: 20,
      left: 20,
      right: 20,
      top: 20,
    },
    title: "TODO (dev log)",
    features: [
      "- Improve Performance",
      "- More base building",
      "- Spitter Zombies",
      "- Zombie Bats",
    ],
  },
  Minimap: {
    size: 400,
    left: 40,
    bottom: 40,
    background: "rgba(0, 0, 0, 0.7)",
    scale: 0.7,
    colors: {
      enemy: "red",
      player: "green",
      wall: "white",
      item: "yellow",
      tree: "gray",
    },
    indicators: {
      enemy: {
        shape: "circle",
        size: 6,
      },
      player: {
        shape: "rectangle",
        size: 8,
      },
      wall: {
        shape: "rectangle",
        size: 8,
      },
      item: {
        shape: "circle",
        size: 6,
      },
      tree: {
        shape: "rectangle",
        size: 8,
      },
    },
  },
  Ping: {
    right: 140,
    bottom: 50,
    font: "24px Arial",
    colors: {
      excellent: "rgb(0, 255, 0)", // Green: < 50ms
      good: "rgb(255, 255, 0)", // Yellow: 50-100ms
      fair: "rgb(255, 165, 0)", // Orange: 100-150ms
      poor: "rgb(255, 0, 0)", // Red: > 150ms
    },
  },
  PlayerList: {
    background: "rgba(20, 20, 20, 0.95)",
    color: "#ffffff",
    headerBackground: "rgba(40, 40, 40, 0.95)",
    font: "24px 'Arial'",
    lineHeight: 60,
    padding: {
      bottom: 32,
      left: 40,
      right: 40,
      top: 32,
    },
    title: "Players Online",
    titleFont: "bold 32px 'Arial'",
    rowBackground: {
      even: "rgba(40, 40, 40, 0.3)",
      odd: "rgba(40, 40, 40, 0.1)",
    },
    killCount: {
      color: "#ffd700",
      font: "bold 24px 'Arial'",
    },
    ping: {
      excellent: "rgb(0, 255, 0)", // Green: < 50ms
      good: "rgb(255, 255, 0)", // Yellow: 50-100ms
      fair: "rgb(255, 165, 0)", // Orange: 100-150ms
      poor: "rgb(255, 0, 0)", // Red: > 150ms
      font: "20px 'Arial'",
      width: 80,
    },
    borderRadius: 12,
  },
};

export class Hud {
  private showInstructions: boolean = true;
  private showPlayerList: boolean = false;
  private gameMessages: { message: string; timestamp: number }[] = [];
  private messageTimeout: number = 5000;
  private mapManager: MapManager;
  private currentPing: number = 0;
  private lastPingUpdate: number = 0;
  private pingUpdateInterval: number = 5000;
  private chatWidget: ChatWidget;
  private currentFps: number = 0;

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;
    this.chatWidget = new ChatWidget();
  }

  public update(gameState: GameState): void {
    this.gameMessages = this.gameMessages.filter(
      (message) => Date.now() - message.timestamp < this.messageTimeout
    );
    this.chatWidget.update();
  }

  public toggleInstructions(): void {
    this.showInstructions = !this.showInstructions;
  }

  private getCycleText(gameState: GameState): string {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - gameState.cycleStartTime) / 1000;
    const remainingTime = Math.max(0, Math.ceil(gameState.cycleDuration - elapsedTime));
    return `${remainingTime}s until ${gameState.isDay ? "night" : "day"}`;
  }

  private getAlivePlayers(gameState: GameState): number {
    return gameState.entities.filter((entity) => entity instanceof PlayerClient && !entity.isDead())
      .length;
  }

  private getTotalPlayers(gameState: GameState): number {
    return gameState.entities.filter((entity) => entity instanceof PlayerClient).length;
  }

  private getAliveZombies(gameState: GameState): number {
    return gameState.entities.filter(
      (entity) => Zombies.includes(entity.getType()) && !entity.getExt(ClientDestructible).isDead()
    ).length;
  }

  public updatePing(ping: number): void {
    this.currentPing = ping;
    this.lastPingUpdate = Date.now();
  }

  private getPingColor(ping: number): string {
    if (ping < 50) return HUD_SETTINGS.Ping.colors.excellent;
    if (ping < 100) return HUD_SETTINGS.Ping.colors.good;
    if (ping < 150) return HUD_SETTINGS.Ping.colors.fair;
    return HUD_SETTINGS.Ping.colors.poor;
  }

  public updateFps(fps: number): void {
    this.currentFps = fps;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width, height } = ctx.canvas;

    // Render minimap first
    this.renderMinimap(ctx, gameState);

    // Add version number in bottom right
    ctx.save();
    ctx.font = "32px Arial";
    ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
    const versionText = VERSION;
    const versionMetrics = ctx.measureText(versionText);
    ctx.fillText(versionText, width - versionMetrics.width - 16, height - 50);
    ctx.restore();

    ctx.font = "32px Arial";
    ctx.fillStyle = "white";

    const dayText = `Day ${gameState.dayNumber}`;
    const timeOfDay = gameState.isDay ? "Day" : "Night";
    const cycleText = this.getCycleText(gameState);
    const playersText = `Alive Players: ${this.getAlivePlayers(gameState)}`;
    const totalPlayers = `Total Players: ${this.getTotalPlayers(gameState)}`;
    const zombiesText = `Zombies Remaining: ${this.getAliveZombies(gameState)}`;

    const dayTextWidth = ctx.measureText(dayText).width;
    const cycleTextWidth = ctx.measureText(cycleText).width;
    const playersTextWidth = ctx.measureText(playersText).width;
    const totalPlayersWidth = ctx.measureText(totalPlayers).width;
    const zombiesTextWidth = ctx.measureText(zombiesText).width;

    const margin = 50;
    const gap = 50;
    ctx.fillText(dayText, width - dayTextWidth - margin, margin);
    ctx.fillText(cycleText, width - cycleTextWidth - margin, margin + gap);
    ctx.fillText(playersText, width - playersTextWidth - margin, margin + gap * 3);
    ctx.fillText(totalPlayers, width - totalPlayersWidth - margin, margin + gap * 4);
    ctx.fillText(zombiesText, width - zombiesTextWidth - margin, margin + gap * 5);

    const myPlayer = getPlayer(gameState);

    if (myPlayer) {
      const health = myPlayer.getHealth();
      const healthText = `Health: ${health}`;
      const kills = myPlayer.getKills();
      const killsText = `Kills: ${kills}`;

      const healthTextWidth = ctx.measureText(healthText).width;
      const killsTextWidth = ctx.measureText(killsText).width;

      ctx.fillText(healthText, width - healthTextWidth - margin, margin + gap * 2);
      ctx.fillText(killsText, width - killsTextWidth - margin, margin + gap * 6);
    }

    // Render FPS and ping
    ctx.font = HUD_SETTINGS.Ping.font;

    // Render FPS first
    const fpsText = `${this.currentFps} FPS`;
    const fpsMetrics = ctx.measureText(fpsText);
    ctx.fillStyle = "white";
    ctx.fillText(
      fpsText,
      ctx.canvas.width - fpsMetrics.width - HUD_SETTINGS.Ping.right - 100,
      ctx.canvas.height - HUD_SETTINGS.Ping.bottom
    );

    // Then render ping
    const pingText = `${Math.round(this.currentPing)}ms`;
    const pingMetrics = ctx.measureText(pingText);
    ctx.fillStyle = this.getPingColor(this.currentPing);
    ctx.fillText(
      pingText,
      ctx.canvas.width - pingMetrics.width - HUD_SETTINGS.Ping.right,
      ctx.canvas.height - HUD_SETTINGS.Ping.bottom
    );

    this.renderControlsList(ctx, gameState);
    this.renderGameMessages(ctx);
    this.renderPlayerList(ctx, gameState);
    this.chatWidget.render(ctx);
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
      "Drop Item [G]\n" +
      "Chat [Y]\n" +
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

    // Render upcoming features
    if (this.showInstructions) {
      const features = HUD_SETTINGS.UpcomingFeatures;
      ctx.font = features.font;

      // Calculate dimensions
      const featureLines = [features.title, ...features.features];
      let featureMaxWidth = 0;

      for (const line of featureLines) {
        const metrics = ctx.measureText(line);
        if (featureMaxWidth < metrics.width) {
          featureMaxWidth = metrics.width;
        }
      }

      const featureWidth = featureMaxWidth + features.padding.left + features.padding.right;

      const featureHeight =
        lineHeight * featureLines.length + features.padding.top + features.padding.bottom;

      // Draw background - position directly to the right of instructions panel
      ctx.fillStyle = features.background;
      ctx.fillRect(
        HUD_SETTINGS.ControlsList.left + width + 10, // 10px gap between panels
        HUD_SETTINGS.ControlsList.top,
        featureWidth,
        featureHeight
      );

      // Draw text
      ctx.fillStyle = features.color;
      ctx.textBaseline = "top";

      for (let i = 0; i < featureLines.length; i++) {
        const line = featureLines[i];
        const offsetTop = i * lineHeight;

        // Make title bold
        if (i === 0) {
          ctx.font = "bold " + features.font;
        } else {
          ctx.font = features.font;
        }

        ctx.fillText(
          line,
          HUD_SETTINGS.ControlsList.left + width + 10 + features.padding.left,
          offsetTop + features.top + features.padding.top
        );
      }
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

            const treeIndicator = settings.indicators.tree;
            const size = treeIndicator.size;
            const halfSize = size / 2;

            // Draw tree indicator based on shape
            if (treeIndicator.shape === "circle") {
              ctx.beginPath();
              ctx.arc(minimapX, minimapY, halfSize, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillRect(minimapX - halfSize, minimapY - halfSize, size, size);
            }
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

      // Determine indicator settings based on entity type
      let indicator = null;
      let color = null;

      if (
        entity instanceof ZombieClient ||
        entity instanceof BigZombieClient ||
        entity instanceof FastZombieClient
      ) {
        color = settings.colors.enemy;
        indicator = settings.indicators.enemy;
      } else if (entity instanceof PlayerClient) {
        color = settings.colors.player;
        indicator = settings.indicators.player;
      } else if (entity instanceof WallClient) {
        color = settings.colors.wall;
        indicator = settings.indicators.wall;
      } else if (entity.hasExt(ClientCarryable)) {
        color = settings.colors.item;
        indicator = settings.indicators.item;
      }

      if (color && indicator) {
        ctx.fillStyle = color;
        const size = indicator.size;
        const halfSize = size / 2;

        // Draw indicator based on shape
        if (indicator.shape === "circle") {
          ctx.beginPath();
          ctx.arc(minimapX, minimapY, halfSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(minimapX - halfSize, minimapY - halfSize, size, size);
        }
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

  public setShowPlayerList(show: boolean): void {
    this.showPlayerList = show;
  }

  private renderPlayerList(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.showPlayerList) return;

    const settings = HUD_SETTINGS.PlayerList;
    const players = gameState.entities.filter((entity) => entity instanceof PlayerClient);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Calculate dimensions
    ctx.font = settings.font;
    let maxWidth = 600; // Increased minimum width to accommodate ping

    // Calculate player list width
    players.forEach((player) => {
      const idText = player.getId();
      const killText = `${player.getKills()}`;
      const metrics = ctx.measureText(idText);
      const killMetrics = ctx.measureText(killText);
      maxWidth = Math.max(maxWidth, metrics.width + killMetrics.width + settings.ping.width + 120); // Extra padding
    });

    const width = maxWidth + settings.padding.left + settings.padding.right;
    const height =
      settings.padding.top + settings.padding.bottom + settings.lineHeight * (players.length + 1);

    // Center the overlay
    const x = (ctx.canvas.width - width) / 2;
    const y = (ctx.canvas.height - height) / 2;

    // Draw main background with rounded corners
    ctx.fillStyle = settings.background;
    this.roundRect(ctx, x, y, width, height, settings.borderRadius);

    // Draw header background
    ctx.fillStyle = settings.headerBackground;
    this.roundRect(
      ctx,
      x,
      y,
      width,
      settings.lineHeight + settings.padding.top,
      settings.borderRadius,
      true,
      false
    );

    // Draw title
    ctx.fillStyle = settings.color;
    ctx.font = settings.titleFont;
    ctx.textBaseline = "middle";
    ctx.fillText(
      settings.title,
      x + settings.padding.left,
      y + (settings.lineHeight + settings.padding.top) / 2
    );

    // Draw player list
    ctx.textBaseline = "middle";
    players.forEach((player, index) => {
      const rowY = y + settings.lineHeight * (index + 1) + settings.padding.top;

      // Draw row background
      ctx.fillStyle = index % 2 === 0 ? settings.rowBackground.even : settings.rowBackground.odd;
      ctx.fillRect(x, rowY, width, settings.lineHeight);

      // Draw player ID
      ctx.font = settings.font;
      ctx.fillStyle = settings.color;
      ctx.fillText(player.getId(), x + settings.padding.left, rowY + settings.lineHeight / 2);

      // Draw ping with color based on value
      const ping = player.getPing();
      const pingText = `${ping}ms`;
      ctx.font = settings.ping.font;
      ctx.fillStyle = this.getPingColor(ping);
      const pingX = x + width - settings.padding.right - settings.ping.width;
      ctx.fillText(pingText, pingX, rowY + settings.lineHeight / 2);

      // Draw kill count with custom styling
      const killText = `${player.getKills()} kills`;
      ctx.font = settings.killCount.font;
      ctx.fillStyle = settings.killCount.color;
      const killMetrics = ctx.measureText(killText);
      ctx.fillText(
        killText,
        pingX - killMetrics.width - 40, // Position kills before ping
        rowY + settings.lineHeight / 2
      );
    });

    ctx.restore();
  }

  // Helper method for drawing rounded rectangles
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    topRounded: boolean = true,
    bottomRounded: boolean = true
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    if (topRounded) {
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    } else {
      ctx.lineTo(x + width, y);
    }
    ctx.lineTo(x + width, y + height - radius);
    if (bottomRounded) {
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    } else {
      ctx.lineTo(x + width, y + height);
    }
    ctx.lineTo(x + radius, y + height);
    if (bottomRounded) {
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    } else {
      ctx.lineTo(x, y + height);
    }
    ctx.lineTo(x, y + radius);
    if (topRounded) {
      ctx.quadraticCurveTo(x, y, x + radius, y);
    } else {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Delegate chat methods to ChatWidget
  public toggleChatInput(): void {
    this.chatWidget.toggleChatInput();
  }

  public updateChatInput(key: string): void {
    this.chatWidget.updateChatInput(key);
  }

  public getChatInput(): string {
    return this.chatWidget.getChatInput();
  }

  public clearChatInput(): void {
    this.chatWidget.clearChatInput();
  }

  public addChatMessage(playerId: string, message: string): void {
    this.chatWidget.addChatMessage(playerId, message);
  }
}
