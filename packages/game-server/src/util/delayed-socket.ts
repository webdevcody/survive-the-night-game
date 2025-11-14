import { Socket, Server } from "socket.io";
import { encodePayload } from "@shared/util/compression";

/**
 * Wraps a socket.io Server Socket to add simulated latency to all emit calls
 * and automatically encode payloads for network transmission
 */
export class DelayedServerSocket {
  private socket: Socket;
  private latencyMs: number;

  constructor(socket: Socket, latencyMs: number = 0) {
    this.socket = socket;
    this.latencyMs = latencyMs;
  }

  /**
   * Emit an event with simulated latency and automatic payload encoding
   */
  public emit(event: string, ...args: any[]): boolean {
    // Encode all arguments (except the first which is the event name)
    const encodedArgs = args.map((arg) => encodePayload(arg));

    const send = () => this.socket.emit(event, ...encodedArgs);

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
  public get handshake(): Socket["handshake"] {
    return this.socket.handshake;
  }

  /**
   * Get the underlying socket instance (for cases where direct access is needed)
   */
  public getUnderlyingSocket(): Socket {
    return this.socket;
  }
}

/**
 * Wraps a socket.io Server to add simulated latency to all broadcast emit calls
 * and automatically encode payloads for network transmission with byte tracking
 */
export class DelayedServer {
  private io: Server;
  private latencyMs: number;
  private totalBytesSent: number = 0;
  private bytesSentThisSecond: number = 0;
  private lastSecondTimestamp: number = Date.now();
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(io: Server, latencyMs: number = 0) {
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
    return elapsedSeconds > 0 ? this.bytesSentThisSecond / elapsedSeconds : this.bytesSentThisSecond;
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
   * Emit an event to all connected clients with simulated latency and automatic payload encoding
   */
  public emit(event: string, ...args: any[]): boolean {
    // Encode all arguments (except the first which is the event name)
    const encodedArgs = args.map((arg) => encodePayload(arg));

    // Track bytes sent (for first arg, which is typically the payload)
    if (encodedArgs.length > 0) {
      this.trackBytesSent(encodedArgs[0]);
    }

    const send = () => this.io.emit(event, ...encodedArgs);

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
  public get sockets(): Server["sockets"] {
    return this.io.sockets;
  }

  /**
   * Get the underlying server instance (for cases where direct access is needed)
   */
  public getUnderlyingServer(): Server {
    return this.io;
  }
}
