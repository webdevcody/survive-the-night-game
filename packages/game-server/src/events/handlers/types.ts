import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { ClientSentEvents } from "@shared/events/events";

/**
 * Defines a socket event handler registration.
 * Each handler file should export a SocketEventHandler object.
 */
export interface SocketEventHandler<T = any> {
  /** The event name from ClientSentEvents */
  event: keyof typeof ClientSentEvents | "disconnect";
  /** The handler function that processes the event */
  handler: (context: HandlerContext, socket: ISocketAdapter, payload: T) => void | Promise<void>;
}

