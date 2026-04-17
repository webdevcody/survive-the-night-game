import { Scene } from "./scene";
import { SceneManager } from "./scene-manager";
import { GameScene } from "./game-scene";
import type { PlayerClassId } from "@shared/player/player-class";

export type { PlayerClassId } from "@shared/player/player-class";

export interface PlayerClassDefinition {
  id: PlayerClassId;
  name: string;
  tagline: string;
  description: string;
  perks: string[];
  accent: string; // hex border/highlight color
}

function getPlayerClassArtworkUrl(id: PlayerClassId): string {
  return `/ui/classes/class-${id}.jpg`;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw <= 0 || ih <= 0) return;

  const imageRatio = iw / ih;
  const cropRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;

  if (imageRatio > cropRatio) {
    sw = ih * cropRatio;
    sx = (iw - sw) / 2;
  } else {
    sh = iw / cropRatio;
    sy = (ih - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function isLoadedImage(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

export const PLAYER_CLASSES: PlayerClassDefinition[] = [
  {
    id: "survivor",
    name: "Survivor",
    tagline: "Jack of all trades",
    description:
      "A hardened generalist. Balanced stats and versatile gear make the Survivor a safe pick for any night.",
    perks: ["+10% stamina regen", "Starts with a melee weapon", "Balanced stats"],
    accent: "#4CAF50",
  },
  {
    id: "scavenger",
    name: "Scavenger",
    tagline: "Finders keepers",
    description:
      "Lives out of a backpack and never leaves a crate unopened. Trades raw power for loot and mobility.",
    perks: ["+4 inventory slots", "Faster looting", "Better rare drop rates"],
    accent: "#f2a03d",
  },
  {
    id: "medic",
    name: "Medic",
    tagline: "Patch 'em up",
    description:
      "The reason your squad makes it to sunrise. Starts with a medkit and stabilizes allies faster.",
    perks: ["Starts with a medkit", "+25% healing output", "Revives are 30% faster"],
    accent: "#5dc8ff",
  },
];

const CLASS_STORAGE_KEY = "selectedClass";

export function getSelectedClassId(): PlayerClassId | null {
  const stored = localStorage.getItem(CLASS_STORAGE_KEY);
  if (!stored) return null;
  const match = PLAYER_CLASSES.find((c) => c.id === stored);
  return match ? match.id : null;
}

export class ClassSelectionScene extends Scene {
  private sceneManager: SceneManager;
  private selectedIndex: number = 0;
  private hoveredIndex: number = -1;
  private isSubmitting: boolean = false;
  private cardBounds: Array<{ x: number; y: number; w: number; h: number }> = [];
  private classArtworkImages: Partial<Record<PlayerClassId, HTMLImageElement>> = {};
  private classArtworkPreloadStarted = false;

  constructor(canvas: HTMLCanvasElement, sceneManager?: SceneManager) {
    super(canvas);
    this.sceneManager = sceneManager || (window as any).__sceneManager;
    this.preloadClassArtwork();

    // Preselect previously chosen class, if any
    const previous = getSelectedClassId();
    if (previous) {
      const idx = PLAYER_CLASSES.findIndex((c) => c.id === previous);
      if (idx >= 0) this.selectedIndex = idx;
    }
  }

  async init(): Promise<void> {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseClick = this.handleMouseClick.bind(this);
    window.addEventListener("keydown", this.handleKeyDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("click", this.handleMouseClick);
  }

  cleanup(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("click", this.handleMouseClick);
  }

  private preloadClassArtwork(): void {
    if (this.classArtworkPreloadStarted) return;
    this.classArtworkPreloadStarted = true;

    for (const klass of PLAYER_CLASSES) {
      const image = new Image();
      image.decoding = "async";
      image.src = getPlayerClassArtworkUrl(klass.id);
      image.onload = () => {
        this.classArtworkImages[klass.id] = image;
      };
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isSubmitting) return;

    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      this.selectedIndex =
        (this.selectedIndex - 1 + PLAYER_CLASSES.length) % PLAYER_CLASSES.length;
    } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      this.selectedIndex = (this.selectedIndex + 1) % PLAYER_CLASSES.length;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.confirmSelection();
    } else if (event.key === "Escape") {
      // Go back to name entry
      this.goBack();
    } else if (/^[1-3]$/.test(event.key)) {
      this.selectedIndex = parseInt(event.key, 10) - 1;
    }
  }

  private getMousePos(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  private hitTestCard(x: number, y: number): number {
    for (let i = 0; i < this.cardBounds.length; i++) {
      const b = this.cardBounds[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return i;
      }
    }
    return -1;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.isSubmitting) return;
    const { x, y } = this.getMousePos(event);
    this.hoveredIndex = this.hitTestCard(x, y);
  }

  private handleMouseClick(event: MouseEvent): void {
    if (this.isSubmitting) return;
    const { x, y } = this.getMousePos(event);
    const idx = this.hitTestCard(x, y);
    if (idx >= 0) {
      if (idx === this.selectedIndex) {
        this.confirmSelection();
      } else {
        this.selectedIndex = idx;
      }
    }
  }

  private async confirmSelection(): Promise<void> {
    const choice = PLAYER_CLASSES[this.selectedIndex];
    this.isSubmitting = true;
    localStorage.setItem(CLASS_STORAGE_KEY, choice.id);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await this.sceneManager.switchScene(GameScene);
  }

  private async goBack(): Promise<void> {
    // Clear saved name so the name entry scene is shown again from LoadingScene-style flow.
    // We switch directly to NameEntryScene without wiping the name so the user sees their prior input.
    const { NameEntryScene } = await import("./name-entry-scene");
    await this.sceneManager.switchScene(NameEntryScene);
  }

  update(_deltaTime: number): void {
    // No animated state yet
  }

  render(): void {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Background
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#05080d");
    background.addColorStop(0.5, "#0c1622");
    background.addColorStop(1, "#04070b");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(185, 34, 34, 0.12)";
    ctx.fillRect(0, 0, width, 110);
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(0, 148, width, 1);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Choose Your Class", width / 2, 82);

    // Subtitle with greeting
    const displayName = localStorage.getItem("displayName") || "survivor";
    ctx.fillStyle = "#c2c8d2";
    ctx.font = "17px Arial";
    ctx.fillText(
      `Welcome, ${displayName}. Pick the role that carries you into first contact.`,
      width / 2,
      124,
    );

    // Card layout
    const cardCount = PLAYER_CLASSES.length;
    const cardWidth = Math.min(286, Math.floor((width - 160) / 3));
    const cardHeight = this.getCardHeight(cardWidth, height);
    const gap = 28;
    const totalWidth = cardCount * cardWidth + (cardCount - 1) * gap;
    const startX = (width - totalWidth) / 2;
    const cardY = Math.max(152, Math.min(184, height * 0.22));

    this.cardBounds = [];

    for (let i = 0; i < cardCount; i++) {
      const klass = PLAYER_CLASSES[i];
      const x = startX + i * (cardWidth + gap);
      const y = cardY;
      const isSelected = i === this.selectedIndex;
      const isHovered = i === this.hoveredIndex;

      this.cardBounds.push({ x, y, w: cardWidth, h: cardHeight });
      this.drawCard(klass, x, y, cardWidth, cardHeight, isSelected, isHovered);
    }

    // Footer hint
    ctx.fillStyle = "#9ca5b7";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "← / → or 1-3 to pick  •  ENTER to confirm  •  ESC to go back",
      width / 2,
      height - 34,
    );

    // Submitting overlay
    if (this.isSubmitting) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#d5b26b";
      ctx.font = "24px Georgia";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Joining game...", width / 2, height / 2);
    }
  }

  private drawCard(
    klass: PlayerClassDefinition,
    x: number,
    y: number,
    w: number,
    h: number,
    isSelected: boolean,
    isHovered: boolean,
  ): void {
    const ctx = this.ctx;
    const artwork = this.classArtworkImages[klass.id];
    const artworkReady = isLoadedImage(artwork);
    const artHeight = this.getCardArtHeight();
    const artX = x + 18;
    const artY = y + 18;
    const artW = w - 36;
    const artH = artHeight;
    const bodyTop = artY + artH + 18;
    const ctaHeight = 24;
    const ctaY = y + h - 18 - ctaHeight;
    const numberBadge = PLAYER_CLASSES.findIndex((entry) => entry.id === klass.id) + 1;
    const descriptionLines = this.wrapText(klass.description, w - 40);
    const perkLines = klass.perks.flatMap((perk) => this.wrapText(`• ${perk}`, w - 48));

    // Card background
    ctx.fillStyle = isSelected ? "#111b28" : isHovered ? "#0f1722" : "#0b121c";
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
    ctx.strokeStyle = isSelected ? klass.accent : isHovered ? "#5b6d84" : "#223142";
    ctx.strokeRect(x, y, w, h);

    // Accent bar at top of card
    ctx.fillStyle = klass.accent;
    ctx.fillRect(x, y, w, 6);

    // Artwork frame
    if (artworkReady) {
      drawImageCover(ctx, artwork, artX, artY, artW, artH);
      const overlay = ctx.createLinearGradient(artX, artY, artX, artY + artH);
      overlay.addColorStop(0, "rgba(2, 4, 8, 0.12)");
      overlay.addColorStop(0.52, "rgba(2, 4, 8, 0.24)");
      overlay.addColorStop(1, "rgba(2, 4, 8, 0.72)");
      ctx.fillStyle = overlay;
      ctx.fillRect(artX, artY, artW, artH);
    } else {
      const fallback = ctx.createLinearGradient(artX, artY, artX, artY + artH);
      fallback.addColorStop(0, `${klass.accent}88`);
      fallback.addColorStop(1, "rgba(5, 8, 13, 0.92)");
      ctx.fillStyle = fallback;
      ctx.fillRect(artX, artY, artW, artH);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(artX + 20, artY + 24, artW - 40, 20);
      ctx.fillRect(artX + 40, artY + 60, artW - 80, 12);
      ctx.fillRect(artX + 26, artY + 104, artW - 52, 10);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(artX, artY, artW, artH);

    // Card number
    ctx.fillStyle = "rgba(7, 11, 17, 0.82)";
    ctx.fillRect(artX + 12, artY + 12, 28, 28);
    ctx.strokeStyle = klass.accent;
    ctx.strokeRect(artX + 12, artY + 12, 28, 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(numberBadge), artX + 26, artY + 27);

    // Class name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 25px Georgia";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(klass.name, x + 20, bodyTop);

    // Tagline
    ctx.fillStyle = klass.accent;
    ctx.font = "italic 14px Arial";
    ctx.fillText(klass.tagline, x + 20, bodyTop + 30);

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, bodyTop + 56);
    ctx.lineTo(x + w - 20, bodyTop + 56);
    ctx.stroke();

    // Description (wrapped)
    ctx.fillStyle = "#cdd5df";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    let textY = bodyTop + 74;
    for (const line of descriptionLines) {
      ctx.fillText(line, x + 20, textY);
      textY += 20;
    }

    // Perks
    textY += 12;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.fillText("Perks", x + 20, textY);
    textY += 20;
    ctx.font = "13px Arial";
    ctx.fillStyle = "#aab3c0";
    for (const perkLine of perkLines) {
      ctx.fillText(perkLine, x + 24, textY);
      textY += 18;
    }

    // Selection indicator at bottom
    if (isSelected) {
      ctx.fillStyle = klass.accent;
      ctx.fillRect(x + 18, ctaY, w - 36, ctaHeight);
      ctx.fillStyle = "#081019";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SELECTED", x + w / 2, ctaY + ctaHeight / 2);
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 18, ctaY, w - 36, ctaHeight);
      ctx.fillStyle = "#8e98a8";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        isHovered ? "CLICK TO CHOOSE" : "PRESS ENTER TO LOCK IN",
        x + w / 2,
        ctaY + ctaHeight / 2,
      );
    }
  }

  private getCardArtHeight(): number {
    return this.canvas.height < 760 ? 132 : 152;
  }

  private getCardHeight(cardWidth: number, canvasHeight: number): number {
    const cardTop = Math.max(152, Math.min(184, canvasHeight * 0.22));
    const footerBaseline = canvasHeight - 34;
    const maxCardHeight = Math.max(420, footerBaseline - 26 - cardTop);
    const requiredHeight = Math.max(
      438,
      ...PLAYER_CLASSES.map((klass) => this.getRequiredCardHeightForClass(klass, cardWidth)),
    );

    return Math.min(maxCardHeight, requiredHeight);
  }

  private getRequiredCardHeightForClass(
    klass: PlayerClassDefinition,
    cardWidth: number,
  ): number {
    const descriptionLines = this.wrapText(klass.description, cardWidth - 40);
    const perkLines = klass.perks.flatMap((perk) => this.wrapText(`• ${perk}`, cardWidth - 48));

    return (
      18 + // top padding
      this.getCardArtHeight() +
      18 + // artwork to body gap
      56 + // name, tagline, divider
      descriptionLines.length * 20 +
      12 + // description to perks gap
      20 + // perks label
      perkLines.length * 18 +
      18 + // perks to CTA gap
      24 + // CTA height
      18 // bottom padding
    );
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (this.ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
