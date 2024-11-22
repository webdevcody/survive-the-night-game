export const Entities = {
  PLAYER: "player",
  TREE: "tree",
} as const;

type EntityType = (typeof Entities)[keyof typeof Entities];

export abstract class Entity {
  private type: EntityType;
  private id: string;

  constructor(type: EntityType, id: string) {
    this.type = type;
    this.id = id;
  }

  setType(type: EntityType) {
    this.type = type;
  }

  getType(): EntityType {
    return this.type;
  }

  getId(): string {
    return this.id;
  }
}
