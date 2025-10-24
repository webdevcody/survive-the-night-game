import { Direction, determineDirection } from "../../../game-shared/src/util/direction";
import { Input } from "../../../game-shared/src/util/input";

export interface InputManagerOptions {
  onCraft?: () => unknown;
  onDown?: (inputs: Input) => void;
  onFire?: (inputs: Input) => void;
  onUp?: (inputs: Input) => void;
  onLeft?: (inputs: Input) => void;
  onRight?: (inputs: Input) => void;
  onInteract?: (inputs: Input) => void;
  onDrop?: (inputs: Input) => void;
  onToggleInstructions?: () => void;
  onShowPlayerList?: () => void;
  onHidePlayerList?: () => void;
  onToggleChat?: () => void;
  onChatInput?: (key: string) => void;
  onSendChat?: () => void;
}

export class InputManager {
  private hasChanged = false;
  private inputs: Input = {
    facing: Direction.Right,
    dx: 0,
    dy: 0,
    interact: false,
    fire: false,
    inventoryItem: 1,
    drop: false,
    consume: false,
    sprint: false,
  };
  private lastInputs = {
    ...this.inputs,
  };
  private isChatting = false;

  private checkIfChanged() {
    this.hasChanged = JSON.stringify(this.inputs) !== JSON.stringify(this.lastInputs);
    this.lastInputs = { ...this.inputs };
  }

  constructor(callbacks: InputManagerOptions = {}) {
    window.addEventListener("keydown", (e) => {
      const eventKey = e.key.toLowerCase();

      // Handle chat mode
      if (eventKey === "y" && !this.isChatting) {
        this.isChatting = true;
        callbacks.onToggleChat?.();
        return;
      }

      if (this.isChatting) {
        if (eventKey === "escape") {
          this.isChatting = false;
          callbacks.onToggleChat?.();
          return;
        }

        if (eventKey === "enter") {
          this.isChatting = false;
          callbacks.onSendChat?.();
          callbacks.onToggleChat?.();
          return;
        }

        callbacks.onChatInput?.(e.key);
        return;
      }

      // Normal game input handling
      switch (eventKey) {
        case "q":
          callbacks.onCraft?.();
          break;
        case "w":
          callbacks.onUp?.(this.inputs);
          break;
        case "s":
          callbacks.onDown?.(this.inputs);
          break;
        case "a":
          callbacks.onLeft?.(this.inputs);
          break;
        case "d":
          callbacks.onRight?.(this.inputs);
          break;
        case "e":
          callbacks.onInteract?.(this.inputs);
          break;
        case " ":
          callbacks.onFire?.(this.inputs);
          break;
        case "g":
          callbacks.onDrop?.(this.inputs);
          break;
        case "f":
          this.inputs.consume = true;
          break;
        case "shift":
          this.inputs.sprint = true;
          break;
        case "i":
          callbacks.onToggleInstructions?.();
          break;
        case "tab":
          e.preventDefault(); // Prevent tab from changing focus
          callbacks.onShowPlayerList?.();
          break;
      }

      this.updateDirection();
      this.checkIfChanged();
    });

    window.addEventListener("keyup", (e) => {
      const eventKey = e.key.toLowerCase();

      switch (eventKey) {
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
        case "0":
          this.inputs.inventoryItem = Number.parseInt(eventKey, 10);
          break;
        case "w":
          this.inputs.dy = this.inputs.dy === -1 ? 0 : this.inputs.dy;
          break;
        case "s":
          this.inputs.dy = this.inputs.dy === 1 ? 0 : this.inputs.dy;
          break;
        case "a":
          this.inputs.dx = this.inputs.dx === -1 ? 0 : this.inputs.dx;
          break;
        case "d":
          this.inputs.dx = this.inputs.dx === 1 ? 0 : this.inputs.dx;
          break;
        case "e":
          this.inputs.interact = false;
          break;
        case " ":
          this.inputs.fire = false;
          break;
        case "g":
          this.inputs.drop = false;
          break;
        case "f":
          this.inputs.consume = false;
          break;
        case "shift":
          this.inputs.sprint = false;
          break;
        case "tab":
          e.preventDefault(); // Prevent tab from changing focus
          callbacks.onHidePlayerList?.();
          break;
      }

      this.updateDirection();
      this.checkIfChanged();
    });
  }

  private updateDirection() {
    const vec = { x: this.inputs.dx, y: this.inputs.dy };
    this.inputs.facing = determineDirection(vec) ?? this.inputs.facing;
  }

  getHasChanged() {
    return this.hasChanged;
  }

  getInputs() {
    return this.inputs;
  }

  reset() {
    this.hasChanged = false;
  }
}
