import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class CarRepairEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly carId: string;

  constructor(carId: string) {
    this.type = ServerSentEvents.CAR_REPAIR;
    this.carId = carId;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): string {
    return this.carId;
  }

  getCarId(): string {
    return this.carId;
  }
}

