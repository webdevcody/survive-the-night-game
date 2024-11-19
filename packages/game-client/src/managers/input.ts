export class InputManager {
  private hasChanged = false;
  private lastInputs = {
    dx: 0,
    dy: 0,
  };
  private inputs = {
    dx: 0,
    dy: 0,
  };

  private checkIfChanged() {
    if (
      this.inputs.dx !== this.lastInputs.dx ||
      this.inputs.dy !== this.lastInputs.dy
    ) {
      this.hasChanged = true;
    }
  }

  constructor() {
    window.addEventListener("keydown", (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
          this.inputs.dy = -1;
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
      }

      this.checkIfChanged();
    });

    window.addEventListener("keyup", (e) => {
      switch (e.key.toLowerCase()) {
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
      }

      this.checkIfChanged();
    });
  }

  getHasChanged() {
    return this.hasChanged;
  }

  getInputs() {
    return this.inputs;
  }
}
