import { EventType } from "@/events/events";

export interface GameEvent<T> {
  getType(): EventType;
  serialize(): T;
}
