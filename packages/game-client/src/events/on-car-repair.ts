import { CarRepairEvent } from "@shared/events/server-sent/car-repair-event";
import { ClientPositionable } from "@/extensions";
import { SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { ClientEventContext } from "./types";

export const onCarRepair = (context: ClientEventContext, event: CarRepairEvent) => {
  if (!context.shouldProcessEntityEvent()) return;
  const car = context.gameClient.getEntityById(event.getCarId());
  if (!car || !car.hasExt(ClientPositionable)) return;

  const carPosition = car.getExt(ClientPositionable).getCenterPosition();
  context.gameClient.getSoundManager().playPositionalSound(SOUND_TYPES_TO_MP3.REPAIR, carPosition);
};

