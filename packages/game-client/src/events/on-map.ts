import { MapData } from "../../../game-shared/src/events/server-sent/events/map-event";
import { InitializationContext } from "./types";

export const onMap = (context: InitializationContext, mapData: MapData) => {
  context.gameClient.getMapManager().setMap(mapData);
  // Initialize spatial grid when map is loaded
  context.gameClient.getRenderer().initializeSpatialGrid();
  context.checkInitialization();
};
