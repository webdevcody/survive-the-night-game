import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onDialogueNpcComplete(context: HandlerContext, socket: ISocketAdapter, data: {
    npcEntityId: number;
}): void;
export declare const dialogueNpcCompleteHandler: SocketEventHandler<{
    npcEntityId: number;
}>;
