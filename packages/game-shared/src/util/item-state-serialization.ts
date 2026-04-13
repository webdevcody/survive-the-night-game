import { ItemState } from "../types/entity";

/**
 * ItemState Serialization Utilities
 *
 * Optimized binary format for ItemState:
 * - 1 byte: flags (bit 0 = has count, bit 1 = has health, bit 2 = has loaded ammo,
 *   bit 3 = has sign message)
 * - If has count: 2 bytes (UInt16) - supports 0-65535
 * - If has health: 1 byte (UInt8) - supports 0-255
 * - If has loaded ammo: 2 bytes (UInt16) - supports 0-65535
 * - If has message: 4-byte length prefix + UTF-8 string bytes
 *
 * Total: 1-6 bytes vs ~21+ bytes with writeRecord/Float64
 *
 * Typical cases:
 * - Empty state {}: 1 byte (flags only)
 * - Count only { count: 5 }: 3 bytes (flags + UInt16)
 * - Health only { health: 10 }: 2 bytes (flags + UInt8)
 * - Count + loaded ammo { count: 5, loadedAmmo: 12 }: 5 bytes
 * - All fields { count: 5, health: 10, loadedAmmo: 12 }: 6 bytes
 */

// Flag bits
const FLAG_HAS_COUNT = 0x01;
const FLAG_HAS_HEALTH = 0x02;
const FLAG_HAS_LOADED_AMMO = 0x04;
const FLAG_HAS_MESSAGE = 0x08;

/**
 * Writer interface (matches both BufferWriter and ArrayBufferWriter)
 */
interface ItemStateWriter {
  writeUInt8(value: number): void;
  writeUInt16(value: number): void;
  writeString(value: string): void;
}

/**
 * Reader interface (matches BufferReader)
 */
interface ItemStateReader {
  readUInt8(): number;
  readUInt16(): number;
  readString(): string;
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
  if (state.loadedAmmo !== undefined && state.loadedAmmo !== null) {
    flags |= FLAG_HAS_LOADED_AMMO;
  }
  if (typeof state.message === "string" && state.message.length > 0) {
    flags |= FLAG_HAS_MESSAGE;
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

  if (flags & FLAG_HAS_LOADED_AMMO) {
    const loadedAmmo = Math.max(0, Math.min(65535, Math.round(state.loadedAmmo!)));
    writer.writeUInt16(loadedAmmo);
  }

  if (flags & FLAG_HAS_MESSAGE) {
    writer.writeString(state.message!);
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

  if (flags & FLAG_HAS_LOADED_AMMO) {
    state.loadedAmmo = reader.readUInt16();
  }

  if (flags & FLAG_HAS_MESSAGE) {
    state.message = reader.readString();
  }

  return state;
}
