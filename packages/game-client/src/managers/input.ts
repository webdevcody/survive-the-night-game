export class InputManager {
  private hasChanged = false;
  private inputs = {
    dx: 0,
    dy: 0,
    harvest: false,
    fire: false,
    inventoryItem: 0,
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
      }

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
          this.inputs.inventoryItem = Number.parseInt(eventKey, 10) - 1;
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
