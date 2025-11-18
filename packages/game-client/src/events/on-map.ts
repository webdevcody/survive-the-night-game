import { MapEvent } from "@shared/events/server-sent/map-event";
import { InitializationContext } from "./types";

export const onMap = (context: InitializationContext, mapEvent: MapEvent) => {
  context.gameClient.getMapManager().setMap(mapEvent.getMapData());
  context.setHasReceivedMap(true);
  context.processPendingFullStateIfReady();
  context.checkInitialization();
};

