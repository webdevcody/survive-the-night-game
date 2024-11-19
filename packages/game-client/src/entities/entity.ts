export abstract class Entity {
  private type: string;
  private id: string;

  constructor(type: string, id: string) {
    this.type = type;
    this.id = id;
  }

  setType(type: string) {
    this.type = type;
  }

  getType(): string {
    return this.type;
  }

  getId(): string {
    return this.id;
  }
}
