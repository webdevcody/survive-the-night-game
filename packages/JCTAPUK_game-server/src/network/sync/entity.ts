import { Entity } from "@/game";
import Client from "../client";

class SyncEntity extends Entity {
  sync(client: Client) {}
}

export default SyncEntity;
