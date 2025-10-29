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
  onToggleMute?: () => void;
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
      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

      // Handle chat mode - use key for 'y' to support all layouts
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

        // Prevent default behavior for arrow keys to avoid page scrolling
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
        }

        callbacks.onChatInput?.(e.key);
        return;
      }

      // Normal game input handling - use physical key codes for WASD
      switch (eventCode) {
        case "KeyQ":
          callbacks.onCraft?.();
          break;
        case "KeyW":
          callbacks.onUp?.(this.inputs);
          break;
        case "KeyS":
          callbacks.onDown?.(this.inputs);
          break;
        case "KeyA":
          callbacks.onLeft?.(this.inputs);
          break;
        case "KeyD":
          callbacks.onRight?.(this.inputs);
          break;
        case "KeyE":
          callbacks.onInteract?.(this.inputs);
          break;
        case "Space":
          callbacks.onFire?.(this.inputs);
          break;
        case "KeyG":
          callbacks.onDrop?.(this.inputs);
          break;
        case "KeyF":
          this.inputs.consume = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.inputs.sprint = true;
          break;
        case "KeyI":
          callbacks.onToggleInstructions?.();
          break;
        case "KeyM":
          callbacks.onToggleMute?.();
          break;
        case "Tab":
          e.preventDefault(); // Prevent tab from changing focus
          callbacks.onShowPlayerList?.();
          break;
      }

      this.updateDirection();
      this.checkIfChanged();
    });

    window.addEventListener("keyup", (e) => {
      const eventCode = e.code;
      const eventKey = e.key.toLowerCase();

      // Use key for number keys (characters work the same across layouts)
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
      }

      // Use physical key codes for WASD and other action keys
      switch (eventCode) {
        case "KeyW":
          this.inputs.dy = this.inputs.dy === -1 ? 0 : this.inputs.dy;
          break;
        case "KeyS":
          this.inputs.dy = this.inputs.dy === 1 ? 0 : this.inputs.dy;
          break;
        case "KeyA":
          this.inputs.dx = this.inputs.dx === -1 ? 0 : this.inputs.dx;
          break;
        case "KeyD":
          this.inputs.dx = this.inputs.dx === 1 ? 0 : this.inputs.dx;
          break;
        case "KeyE":
          this.inputs.interact = false;
          break;
        case "Space":
          this.inputs.fire = false;
          break;
        case "KeyG":
          this.inputs.drop = false;
          break;
        case "KeyF":
          this.inputs.consume = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.inputs.sprint = false;
          break;
        case "Tab":
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
