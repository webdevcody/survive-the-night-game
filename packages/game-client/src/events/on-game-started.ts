import { GameStartedEvent } from "../../../game-shared/src/events/server-sent/events/game-started-event";
import { clearEntities } from "@/state";
import { InitializationContext } from "./types";

export const onGameStarted = (context: InitializationContext, event: GameStartedEvent) => {
  const data = event.getData();

  clearEntities(context.gameState);
  context.gameClient.getParticleManager().clear();
  context.gameClient.getRenderer().clearSpatialGrid();

  context.gameClient.getGameOverDialog().hide();

  context.gameState.gameMode = data.gameMode;

  context.gameClient.getHud().addMessage("Explore the world. Watch your back.", "cyan");

  context.resetAndRequestInitialization("GameStarted event");
};
