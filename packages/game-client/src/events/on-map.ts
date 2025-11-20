import { MapEvent } from "../../../game-shared/src/events/server-sent/events/map-event";
import { InitializationContext } from "./types";

export const onMap = (context: InitializationContext, mapEvent: MapEvent) => {
  context.gameClient.getMapManager().setMap(mapEvent.getMapData());
  // Initialize spatial grid when map is loaded
  context.gameClient.getRenderer().initializeSpatialGrid();
  context.setHasReceivedMap(true);
  context.processPendingFullStateIfReady();
  context.checkInitialization();
};
