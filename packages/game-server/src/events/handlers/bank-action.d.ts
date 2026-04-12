import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import type { BankActionEventData } from "@shared/events/client-sent/events/bank-action";
import { type InventoryItem } from "@shared/util/inventory";
import { Player } from "@/entities/players/player";
export declare function dropItemNearPlayerFacing(player: Player, itemToDrop: InventoryItem): void;
export declare function onBankAction(context: HandlerContext, socket: ISocketAdapter, data: BankActionEventData): void;
export declare const bankActionHandler: SocketEventHandler<BankActionEventData>;
