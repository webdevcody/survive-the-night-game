import { ItemState } from "../types/entity";

/**
 * ItemState Serialization Utilities
 *
 * Optimized binary format for ItemState:
 * - 1 byte: flags (bit 0 = has count, bit 1 = has health)
 * - If has count: 2 bytes (UInt16) - supports 0-65535
 * - If has health: 1 byte (UInt8) - supports 0-255
 *
 * Total: 1-4 bytes vs ~21+ bytes with writeRecord/Float64
 *
 * Typical cases:
 * - Empty state {}: 1 byte (flags only)
 * - Count only { count: 5 }: 3 bytes (flags + UInt16)
 * - Health only { health: 10 }: 2 bytes (flags + UInt8)
 * - Both { count: 5, health: 10 }: 4 bytes (flags + UInt16 + UInt8)
 */

// Flag bits
const FLAG_HAS_COUNT = 0x01;
const FLAG_HAS_HEALTH = 0x02;

/**
 * Writer interface (matches both BufferWriter and ArrayBufferWriter)
 */
interface ItemStateWriter {
  writeUInt8(value: number): void;
  writeUInt16(value: number): void;
}

/**
 * Reader interface (matches BufferReader)
 */
interface ItemStateReader {
  readUInt8(): number;
  readUInt16(): number;
}

/**
 * Write an ItemState to a buffer using optimized format.
 * @param writer Buffer writer
 * @param state ItemState to serialize
 */
export function writeItemState(writer: ItemStateWriter, state: ItemState | undefined | null): void {
  if (!state) {
    writer.writeUInt8(0); // No flags set
    return;
  }

  let flags = 0;
  if (state.count !== undefined && state.count !== null) {
    flags |= FLAG_HAS_COUNT;
  }
  if (state.health !== undefined && state.health !== null) {
    flags |= FLAG_HAS_HEALTH;
  }

  writer.writeUInt8(flags);

  if (flags & FLAG_HAS_COUNT) {
    // Clamp to UInt16 range (0-65535)
    const count = Math.max(0, Math.min(65535, Math.round(state.count!)));
    writer.writeUInt16(count);
  }

  if (flags & FLAG_HAS_HEALTH) {
    // Clamp to UInt8 range (0-255)
    const health = Math.max(0, Math.min(255, Math.round(state.health!)));
    writer.writeUInt8(health);
  }
}

/**
 * Read an ItemState from a buffer using optimized format.
 * @param reader Buffer reader
 * @returns Deserialized ItemState
 */
export function readItemState(reader: ItemStateReader): ItemState {
  const flags = reader.readUInt8();
  const state: ItemState = {};

  if (flags & FLAG_HAS_COUNT) {
    state.count = reader.readUInt16();
  }

  if (flags & FLAG_HAS_HEALTH) {
    state.health = reader.readUInt8();
  }

  return state;
}
