import { MapData } from "../../../game-shared/src/events/server-sent/events/map-event";
import { ClientEventContext } from "./types";

export type MapHandlerContext = ClientEventContext & { checkInitialization: () => void };

export const onMap = (context: MapHandlerContext, mapData: MapData) => {
  context.gameClient.getMapManager().setMap(mapData);
  context.gameClient.getRenderer().initializeSpatialGrid();
  context.checkInitialization();
};
