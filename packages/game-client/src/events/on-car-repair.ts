import { CarRepairEvent } from "../../../game-shared/src/events/server-sent/events/car-repair-event";
import { ClientPositionable } from "@/extensions";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onCarRepair = (context: ClientEventContext, event: CarRepairEvent) => {
  if (!context.shouldProcessEntityEvent()) return;

  const carId = event.getCarId();
  if (!carId) return;

  const car = context.gameClient.getEntityById(carId);
  if (!car || !car.hasExt(ClientPositionable)) return;

  const carPosition = car.getExt(ClientPositionable).getCenterPosition();
  context.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES_TO_MP3.REPAIR, carPosition);
};
