import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { VotableGameMode } from "@shared/types/voting";

export interface VoteGameModePayload {
  mode: VotableGameMode;
}

export function onVoteGameMode(
  context: HandlerContext,
  socket: ISocketAdapter,
  payload: VoteGameModePayload
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  context.gameServer.getGameLoop().registerVote(socket.id, player.getId(), payload.mode);
}

export const voteGameModeHandler: SocketEventHandler<VoteGameModePayload> = {
  event: "VOTE_GAME_MODE",
  handler: onVoteGameMode,
};
