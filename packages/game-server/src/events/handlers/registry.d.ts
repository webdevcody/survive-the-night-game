import { SocketEventHandler } from "./types";
/**
 * Registry of all socket event handlers.
 * To add a new event handler:
 * 1. Create a handler file in this directory
 * 2. Export a SocketEventHandler object
 * 3. Import and add it to this array
 */
export declare const socketEventHandlers: SocketEventHandler[];
