import { Scene } from "./scene";
import { SceneManager } from "./scene-manager";
import { GameScene } from "./game-scene";

export class NameEntryScene extends Scene {
  private sceneManager: SceneManager;
  private playerName: string = "";
  private errorMessage: string = "";
  private isSubmitting: boolean = false;

  private inputActive: boolean = true;
  private cursorVisible: boolean = true;
  private cursorBlinkTimer: number = 0;
  private readonly CURSOR_BLINK_INTERVAL = 0.5; // seconds

  constructor(canvas: HTMLCanvasElement, sceneManager?: SceneManager) {
    super(canvas);
    this.sceneManager = sceneManager || (window as any).__sceneManager;

    // Check if player already has a name saved
    const savedName = localStorage.getItem("displayName");
    if (savedName) {
      this.playerName = savedName;
    }
  }

  async init(): Promise<void> {
    // Set up keyboard event listeners
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.inputActive || this.isSubmitting) return;

    if (event.key === "Enter") {
      this.submitName();
    } else if (event.key === "Backspace") {
      event.preventDefault();
      this.playerName = this.playerName.slice(0, -1);
      this.errorMessage = "";
    } else if (event.key.length === 1 && /^[a-zA-Z0-9_-]$/.test(event.key)) {
      // Allow alphanumeric, underscore, and hyphen
      if (this.playerName.length < 16) {
        this.playerName += event.key;
        this.errorMessage = "";
      }
    }
  }

  private async submitName(): Promise<void> {
    if (this.playerName.length < 4) {
      this.errorMessage = "Name must be at least 4 characters";
      return;
    }

    this.isSubmitting = true;
    this.inputActive = false;

    // Save to localStorage
    localStorage.setItem("displayName", this.playerName);

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 200));

    // Transition to game scene
    await this.sceneManager.switchScene(GameScene);
  }

  update(deltaTime: number): void {
    // Update cursor blink
    this.cursorBlinkTimer += deltaTime;
    if (this.cursorBlinkTimer >= this.CURSOR_BLINK_INTERVAL) {
      this.cursorVisible = !this.cursorVisible;
      this.cursorBlinkTimer = 0;
    }
  }

  render(): void {
    const { width, height } = this.canvas;

    // Clear screen
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, width, height);

    // Draw title
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("Survive the Night", width / 2, height / 2 - 120);

    // Draw subtitle
    this.ctx.fillStyle = "#a0a0a0";
    this.ctx.font = "20px Arial";
    this.ctx.fillText("Enter your display name", width / 2, height / 2 - 60);

    // Draw input box
    const boxWidth = 400;
    const boxHeight = 50;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    // Input background
    this.ctx.fillStyle = "#16213e";
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Input border
    this.ctx.strokeStyle = this.inputActive ? "#e94560" : "#4CAF50";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Draw player name
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    const textX = width / 2;
    const textY = boxY + boxHeight / 2;
    this.ctx.fillText(this.playerName, textX, textY);

    // Draw cursor
    if (this.cursorVisible && this.inputActive) {
      const textWidth = this.ctx.measureText(this.playerName).width;
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(textX + textWidth / 2 + 2, boxY + 10, 2, boxHeight - 20);
    }

    // Draw hint text
    this.ctx.fillStyle = "#a0a0a0";
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Press ENTER to continue", width / 2, boxY + boxHeight + 30);

    // Draw requirements
    const reqY = boxY + boxHeight + 60;
    this.ctx.fillStyle = this.playerName.length >= 4 ? "#4CAF50" : "#a0a0a0";
    this.ctx.fillText("Minimum 4 characters (letters, numbers, _, -)", width / 2, reqY);

    // Draw error message
    if (this.errorMessage) {
      this.ctx.fillStyle = "#e94560";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(this.errorMessage, width / 2, reqY + 30);
    }

    // Draw submitting state
    if (this.isSubmitting) {
      this.ctx.fillStyle = "#4CAF50";
      this.ctx.font = "20px Arial";
      this.ctx.fillText("Joining game...", width / 2, reqY + 50);
    }
  }

  cleanup(): void {
    // Remove event listeners
    window.removeEventListener("keydown", this.handleKeyDown);
  }
}
