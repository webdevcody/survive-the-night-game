import { ISocketAdapter } from "@shared/network/socket-adapter";
import { IServerAdapter } from "@shared/network/server-adapter";

/**
 * Wraps a socket adapter to add simulated latency to all emit calls
 * while preserving binary payloads
 */
export class DelayedServerSocket {
  private socket: ISocketAdapter;
  private latencyMs: number;

  constructor(socket: ISocketAdapter, latencyMs: number = 0) {
    this.socket = socket;
    this.latencyMs = latencyMs;
  }

  /**
   * Emit an event with simulated latency while preserving binary payloads
   */
  public emit(event: string, ...args: any[]): boolean {
    const send = () => this.socket.emit(event, ...args);

    if (this.latencyMs > 0) {
      setTimeout(send, this.latencyMs);
    } else {
      send();
    }

    return true;
  }

  /**
   * Register an event listener (pass through to underlying socket)
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    this.socket.on(event, listener);
    return this;
  }

  /**
   * Disconnect the socket (pass through to underlying socket)
   */
  public disconnect(close?: boolean): this {
    this.socket.disconnect(close);
    return this;
  }

  /**
   * Get the socket ID
   */
  public get id(): string {
    return this.socket.id ?? "";
  }

  /**
   * Get handshake data
   */
  public get handshake(): ISocketAdapter["handshake"] {
    return this.socket.handshake;
  }

  /**
   * Get the underlying socket adapter instance (for cases where direct access is needed)
   */
  public getUnderlyingSocket(): ISocketAdapter {
    return this.socket;
  }
}

/**
 * Wraps a server adapter to add simulated latency to all broadcast emit calls
 * with optional bandwidth tracking
 */
export class DelayedServer {
  private io: IServerAdapter;
  private latencyMs: number;
  private totalBytesSent: number = 0;
  private bytesSentThisSecond: number = 0;
  private lastSecondTimestamp: number = Date.now();
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(io: IServerAdapter, latencyMs: number = 0) {
    this.io = io;
    this.latencyMs = latencyMs;

    // Start stats reporting interval (every 5 seconds)
    this.statsInterval = setInterval(() => {
      this.printStats();
    }, 5000);
  }

  /**
   * Calculate the byte size of serialized event data
   */
  private calculateEventBytes(eventData: any): number {
    if (eventData === undefined || eventData === null) {
      return 0;
    }
    // If it's a Buffer, return its length directly
    if (Buffer.isBuffer(eventData)) {
      return eventData.length;
    }
    try {
      const serialized = JSON.stringify(eventData);
      if (serialized === undefined || serialized === null) {
        return 0;
      }
      // Use Buffer.byteLength to get accurate UTF-8 byte count
      return Buffer.byteLength(String(serialized), "utf8");
    } catch (error) {
      // Handle circular references or other serialization errors
      console.warn("Failed to calculate event bytes:", error);
      return 0;
    }
  }

  /**
   * Track bytes sent for a broadcast event
   */
  private trackBytesSent(eventData: any): void {
    const bytesPerEvent = this.calculateEventBytes(eventData);
    const playerCount = this.io.sockets.sockets.size;
    const totalBytesForBroadcast = bytesPerEvent * playerCount;

    this.totalBytesSent += totalBytesForBroadcast;

    const now = Date.now();
    const elapsedMs = now - this.lastSecondTimestamp;

    // If more than 1 second has passed since last reset, reset the counter
    if (elapsedMs >= 1000) {
      this.bytesSentThisSecond = totalBytesForBroadcast;
      this.lastSecondTimestamp = now;
    } else {
      // Accumulate bytes for the current second
      this.bytesSentThisSecond += totalBytesForBroadcast;
    }
  }

  /**
   * Get current bandwidth stats (bytes sent in the last second)
   */
  public getCurrentBandwidth(): number {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastSecondTimestamp) / 1000;

    if (elapsedSeconds > 1) {
      // More than 1 second has passed, return 0
      return 0;
    }

    // Return bytes per second
    return elapsedSeconds > 0
      ? this.bytesSentThisSecond / elapsedSeconds
      : this.bytesSentThisSecond;
  }

  /**
   * Reset bandwidth counter for new measurement period
   */
  public resetBandwidthCounter(): number {
    const bytes = this.bytesSentThisSecond;
    this.bytesSentThisSecond = 0;
    this.lastSecondTimestamp = Date.now();
    return bytes;
  }

  /**
   * Print bandwidth statistics every 5 seconds
   */
  private printStats(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastSecondTimestamp) / 1000;

    // Calculate MB/s based on bytes sent in the current second
    // Use elapsed time to get accurate per-second rate
    const mbPerSecond =
      elapsedSeconds > 0 ? this.bytesSentThisSecond / (1024 * 1024) / elapsedSeconds : 0;

    console.log(
      `[Bandwidth] ${mbPerSecond.toFixed(5)} MB/s (${this.io.sockets.sockets.size} players)`
    );
  }

  /**
   * Emit an event to all connected clients with simulated latency
   */
  public emit(event: string, ...args: any[]): boolean {
    const processedArgs = args;

    // Track bytes sent (for first arg, which is typically the payload)
    if (processedArgs.length > 0) {
      this.trackBytesSent(processedArgs[0]);
    }

    const send = () => this.io.emit(event, ...processedArgs);

    if (this.latencyMs > 0) {
      setTimeout(send, this.latencyMs);
    } else {
      send();
    }

    return true;
  }

  /**
   * Clean up resources (stop stats interval)
   */
  public cleanup(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Register an event listener (pass through to underlying server)
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    this.io.on(event, listener);
    return this;
  }

  /**
   * Get the sockets namespace
   */
  public get sockets(): IServerAdapter["sockets"] {
    return this.io.sockets;
  }

  /**
   * Get the underlying server adapter instance (for cases where direct access is needed)
   */
  public getUnderlyingServer(): IServerAdapter {
    return this.io;
  }
}
