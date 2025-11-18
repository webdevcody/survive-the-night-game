import { ServerUpdatingEvent } from "@shared/events/server-sent/server-updating-event";
import { ClientEventContext } from "./types";

export const onServerUpdating = (context: ClientEventContext, event: ServerUpdatingEvent) => {
  context.gameClient.getHud().addMessage("Server is updating, you will be reconnected shortly...");
};

