import { io, Socket } from "socket.io-client";
import { IClientAdapter, IClientConnectionOptions } from "@shared/network/client-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { SocketIOSocketAdapter } from "./socketio-socket-adapter";

/**
 * Socket.IO implementation of IClientAdapter
 */
export class SocketIOClientAdapter implements IClientAdapter {
  private connectionHandlers: Array<(socket: ISocketAdapter) => void> = [];
  private disconnectHandlers: Array<(socket: ISocketAdapter) => void> = [];

  connect(url: string, options?: IClientConnectionOptions): ISocketAdapter {
    const socket = io(url, options);
    const adapter = new SocketIOSocketAdapter(socket);

    socket.on("connect", () => {
      this.connectionHandlers.forEach((handler) => handler(adapter));
    });

    socket.on("disconnect", () => {
      this.disconnectHandlers.forEach((handler) => handler(adapter));
    });

    return adapter;
  }

  on(event: "connect" | "disconnect", listener: (socket: ISocketAdapter) => void): this {
    if (event === "connect") {
      this.connectionHandlers.push(listener);
    } else if (event === "disconnect") {
      this.disconnectHandlers.push(listener);
    }
    return this;
  }
}
