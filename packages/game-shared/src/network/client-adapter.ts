import { ISocketAdapter } from "./socket-adapter";

/**
 * Options for client connection
 */
export interface IClientConnectionOptions {
  forceNew?: boolean;
  [key: string]: any;
}

/**
 * Abstract interface for client-side WebSocket connection creation
 * This allows swapping WebSocket implementations without changing business logic
 */
export interface IClientAdapter {
  /**
   * Connect to a server and return a socket adapter
   */
  connect(url: string, options?: IClientConnectionOptions): ISocketAdapter;

  /**
   * Register an event listener on the client adapter (for connection-level events)
   */
  on(event: "connect" | "disconnect", listener: (socket: ISocketAdapter) => void): this;
}
