/**
 * Abstract interface for socket operations (both client and server side)
 * This allows swapping WebSocket implementations without changing business logic
 */
export interface ISocketAdapter {
  /**
   * Emit an event to the socket
   */
  emit(event: string, ...args: any[]): boolean | this;

  /**
   * Register an event listener
   */
  on(event: string, listener: (...args: any[]) => void): this;

  /**
   * Disconnect the socket
   */
  disconnect(close?: boolean): this;

  /**
   * Get the socket ID
   */
  readonly id: string;

  /**
   * Get handshake data (query parameters, etc.)
   */
  readonly handshake: {
    query: Record<string, string | string[]>;
  };
}
