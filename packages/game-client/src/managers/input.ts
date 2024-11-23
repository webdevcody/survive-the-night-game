export class InputManager {
  private hasChanged = false;
  private lastInputs = {
    dx: 0,
    dy: 0,
    harvest: false,
    fire: false,
  };
  private inputs = {
    dx: 0,
    dy: 0,
    harvest: false,
    fire: false,
  };

  private checkIfChanged() {
    if (
      this.inputs.dx !== this.lastInputs.dx ||
      this.inputs.dy !== this.lastInputs.dy ||
      this.inputs.harvest !== this.lastInputs.harvest ||
      this.inputs.fire !== this.lastInputs.fire
    ) {
      this.hasChanged = true;
    }
    this.lastInputs = { ...this.inputs };
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
        case "e":
          this.inputs.harvest = true;
          break;
        case " ":
          console.log("Space pressed - setting fire to true");
          this.inputs.fire = true;
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
        case "e":
          this.inputs.harvest = false;
          break;
        case " ":
          console.log("Space released - setting fire to false");
          this.inputs.fire = false;
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

  reset() {
    this.hasChanged = false;
  }
}
