import { determineDirection, Direction } from "@survive-the-night/game-server";
import { Input } from "@survive-the-night/game-server/src/server";

export class InputManager {
  private hasChanged = false;
  private inputs: Input = {
    facing: Direction.Right,
    dx: 0,
    dy: 0,
    harvest: false,
    fire: false,
    inventoryItem: 1,
    drop: false,
  };
  private lastInputs = {
    ...this.inputs,
  };

  private checkIfChanged() {
    this.hasChanged = JSON.stringify(this.inputs) !== JSON.stringify(this.lastInputs);
    this.lastInputs = { ...this.inputs };
  }

  constructor() {
    window.addEventListener("keydown", (e) => {
      const eventKey = e.key.toLowerCase();

      switch (eventKey) {
        case "w":
          this.inputs.dy = -1;
          this.inputs.facing = Direction.Up;
          break;
        case "s":
          this.inputs.dy = 1;
          break;
        case "a":
          this.inputs.dx = -1;
          break;
        case "d":
          this.inputs.dx = 1;
          break;
        case "e":
          this.inputs.harvest = true;
          break;
        case " ":
          this.inputs.fire = true;
          break;
        case "g":
          this.inputs.drop = true;
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
          this.inputs.harvest = false;
          break;
        case " ":
          this.inputs.fire = false;
          break;
        case "g":
          this.inputs.drop = false;
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
