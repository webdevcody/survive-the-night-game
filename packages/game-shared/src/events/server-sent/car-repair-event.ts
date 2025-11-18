import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class CarRepairEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly carId: number;

  constructor(carId: number) {
    this.type = ServerSentEvents.CAR_REPAIR;
    this.carId = carId;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): number {
    return this.carId;
  }

  getCarId(): number {
    return this.carId;
  }
}
