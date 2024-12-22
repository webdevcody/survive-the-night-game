import { EventType } from "./events";

export interface GameEvent<T> {
  getType(): EventType;
  serialize(): T;
  deserialize(data: any): GameEvent<T>;
}
