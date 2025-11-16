import { ServerSentEvents, ClientSentEvents, EventType } from "../events/events";

/**
 * Event Type Registry
 * Maps event type strings to unique numeric IDs (0-255, 1 byte)
 * This allows efficient serialization of event types
 */
class EventTypeRegistry {
  private typeToId: Map<EventType, number> = new Map();
  private idToType: Map<number, EventType> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the registry from ServerSentEvents and ClientSentEvents
   * Must be called after events are populated
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Combine server and client events
    const serverEvents = Object.values(ServerSentEvents) as EventType[];
    const clientEvents = Object.values(ClientSentEvents) as EventType[];
    const allEvents = [...serverEvents, ...clientEvents];

    // Sort event types for consistent ordering
    const sortedTypes = [...allEvents].sort();

    // Assign IDs starting from 0
    sortedTypes.forEach((type, index) => {
      if (index > 255) {
        throw new Error(`Too many event types (${sortedTypes.length}). Maximum is 256 (0-255)`);
      }
      this.typeToId.set(type, index);
      this.idToType.set(index, type);
    });

    this.initialized = true;
  }

  /**
   * Encode an event type string to a numeric ID (0-255)
   */
  encode(type: EventType): number {
    // Auto-initialize if not already initialized
    if (!this.initialized) {
      this.initialize();
    }
    const id = this.typeToId.get(type);
    if (id === undefined) {
      throw new Error(`Unknown event type: ${type}`);
    }
    return id;
  }

  /**
   * Decode a numeric ID (0-255) to an event type string
   */
  decode(id: number): EventType {
    // Auto-initialize if not already initialized
    if (!this.initialized) {
      this.initialize();
    }
    if (id < 0 || id > 255) {
      throw new Error(`Invalid event type ID: ${id} (must be 0-255)`);
    }
    const type = this.idToType.get(id);
    if (type === undefined) {
      throw new Error(`Unknown event type ID: ${id}`);
    }
    return type;
  }

  /**
   * Check if the registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const eventTypeRegistry = new EventTypeRegistry();

