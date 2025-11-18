import { BufferReader } from "../util/buffer-serialization";

// Common interface for event classes with static serialization methods
// In TypeScript, we can use a constructor type to represent classes with static methods
export type IBufferWriter = {
  serializeToBuffer: (writer: any, data: any) => void;
  deserializeFromBuffer: (reader: BufferReader) => any;
};

/**
 * Generic serialization function that works with any writer type
 */
export function serializeEvent<TWriter extends { getBuffer(): any }>(
  event: string,
  args: any[],
  eventRegistry: Record<string, IBufferWriter>,
  isValidEvent: (event: string) => boolean,
  createWriter: (initialSize: number) => TWriter,
  initialSize: number = 1024,
  handleNoPayload?: (event: string) => any
): ReturnType<TWriter["getBuffer"]> | null {
  if (!isValidEvent(event)) {
    return null;
  }

  const serializer = eventRegistry[event];
  if (!serializer) {
    return null;
  }

  const writer = createWriter(initialSize);
  // For no-payload events, args[0] may be undefined, so use empty object if handler provided
  const data = handleNoPayload ? args[0] ?? handleNoPayload(event) : args[0];

  serializer.serializeToBuffer(writer, data);

  return writer.getBuffer();
}

/**
 * Generic deserialization function that works with any buffer type
 */
export function deserializeEvent(
  event: string,
  buffer: ArrayBuffer,
  eventRegistry: Record<string, IBufferWriter>,
  isValidEvent: (event: string) => boolean,
  handleEmptyBuffer?: (event: string, buffer: ArrayBuffer) => any[] | null
): any[] | null {
  if (!isValidEvent(event)) {
    return null;
  }

  const serializer = eventRegistry[event];
  if (!serializer) {
    return null;
  }

  // Handle empty buffers if handler provided
  if (buffer.byteLength === 0 && handleEmptyBuffer) {
    return handleEmptyBuffer(event, buffer);
  }

  // Events that expect payload should not receive empty buffers
  if (buffer.byteLength === 0) {
    return null;
  }

  const reader = new BufferReader(buffer);
  const data = serializer.deserializeFromBuffer(reader);

  // Normalize return format - wrap primitives in array, keep objects as-is
  if (typeof data === "number" || typeof data === "string" || data === undefined) {
    return [data];
  }
  return [data];
}
