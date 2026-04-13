import { ClientEventContext } from "./types";
import { AuctionSnapshotEvent } from "../../../game-shared/src/events/server-sent/events/auction-snapshot-event";

export function onAuctionSnapshot(context: ClientEventContext, event: AuctionSnapshotEvent): void {
  const data = event.serialize();
  context.gameClient.getHud().applyAuctionSnapshot(data);
}
