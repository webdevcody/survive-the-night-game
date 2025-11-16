import Vector2 from "./vector2";
import PoolManager from "./pool-manager";

/**
 * BufferWriter - Server-side buffer writing utility
 * Writes data to Node.js Buffer with automatic growth
 */
export class BufferWriter {
  private buffer: Buffer;
  private offset: number;
  private initialSize: number;

  constructor(initialSize: number = 1024 * 1024) {
    this.initialSize = initialSize;
    this.buffer = Buffer.allocUnsafe(initialSize);
    this.offset = 0;
  }

  /**
   * Ensure buffer has enough capacity for the requested size
   */
  private ensureCapacity(size: number): void {
    const needed = this.offset + size;
    if (needed > this.buffer.length) {
      // Grow buffer by 2x or to needed size, whichever is larger
      const newSize = Math.max(needed, this.buffer.length * 2);
      const newBuffer = Buffer.allocUnsafe(newSize);
      this.buffer.copy(newBuffer, 0, 0, this.offset);
      this.buffer = newBuffer;
    }
  }

  /**
   * Write a UInt8 (1 byte)
   */
  writeUInt8(value: number): void {
    this.ensureCapacity(1);
    this.buffer.writeUInt8(value, this.offset);
    this.offset += 1;
  }

  /**
   * Write a UInt16 (2 bytes, little-endian)
   */
  writeUInt16(value: number): void {
    this.ensureCapacity(2);
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += 2;
  }

  /**
   * Write an Int16 (2 bytes, little-endian, signed)
   */
  writeInt16(value: number): void {
    this.ensureCapacity(2);
    this.buffer.writeInt16LE(value, this.offset);
    this.offset += 2;
  }

  /**
   * Write a UInt32 (4 bytes, little-endian)
   */
  writeUInt32(value: number): void {
    this.ensureCapacity(4);
    this.buffer.writeUInt32LE(value, this.offset);
    this.offset += 4;
  }

  /**
   * Write a Float64 (8 bytes, little-endian)
   */
  writeFloat64(value: number): void {
    this.ensureCapacity(8);
    this.buffer.writeDoubleLE(value, this.offset);
    this.offset += 8;
  }

  /**
   * Write a boolean (1 byte)
   */
  writeBoolean(value: boolean): void {
    this.ensureCapacity(1);
    this.buffer.writeUInt8(value ? 1 : 0, this.offset);
    this.offset += 1;
  }

  /**
   * Write a length-prefixed string (UTF-8)
   * Format: [UInt32 length][string bytes]
   */
  writeString(value: string): void {
    const strBytes = Buffer.from(value, "utf8");
    this.writeUInt32(strBytes.length);
    this.ensureCapacity(strBytes.length);
    strBytes.copy(this.buffer, this.offset);
    this.offset += strBytes.length;
  }

  /**
   * Write a Vector2 (2 Float64 values)
   */
  writeVector2(value: Vector2): void {
    this.writeFloat64(value.x);
    this.writeFloat64(value.y);
  }

  /**
   * Write a Velocity2 (2 Int16 values with 100x scaling)
   * Range: -10.00 to 10.00 (scaled to -1000 to 1000)
   * Precision: 0.01 units
   * Size: 4 bytes (vs 16 bytes for Vector2)
   */
  writeVelocity2(value: Vector2): void {
    // Scale by 100: -10.00 to 10.00 becomes -1000 to 1000
    // Clamp to int16 range: -32768 to 32767
    const scale = 100;
    const scaledX = Math.round(value.x * scale);
    const scaledY = Math.round(value.y * scale);

    // Clamp to int16 range
    const clampedX = Math.max(-32768, Math.min(32767, scaledX));
    const clampedY = Math.max(-32768, Math.min(32767, scaledY));

    this.writeInt16(clampedX);
    this.writeInt16(clampedY);
  }

  /**
   * Write a Position2 (2 Int16 values with 10x scaling)
   * Range: -3000.0 to 3000.0 (scaled to -30000 to 30000)
   * Precision: 0.1 units
   * Size: 4 bytes (vs 16 bytes for Vector2)
   */
  writePosition2(value: Vector2): void {
    // Scale by 10: -3000.0 to 3000.0 becomes -30000 to 30000
    // Clamp to int16 range: -32768 to 32767
    const scale = 10;
    const scaledX = Math.round(value.x * scale);
    const scaledY = Math.round(value.y * scale);

    // Clamp to int16 range
    const clampedX = Math.max(-32768, Math.min(32767, scaledX));
    const clampedY = Math.max(-32768, Math.min(32767, scaledY));

    this.writeInt16(clampedX);
    this.writeInt16(clampedY);
  }

  /**
   * Write a Size2 (2 UInt8 values)
   * Range: 0 to 255
   * Size: 2 bytes (vs 16 bytes for Vector2)
   */
  writeSize2(value: Vector2): void {
    // Clamp to uint8 range: 0 to 255
    const clampedX = Math.max(0, Math.min(255, Math.round(value.x)));
    const clampedY = Math.max(0, Math.min(255, Math.round(value.y)));

    this.writeUInt8(clampedX);
    this.writeUInt8(clampedY);
  }

  /**
   * Write an array of items using a writer function
   * Format: [UInt32 count][...items]
   */
  writeArray<T>(items: T[], writer: (item: T) => void): void {
    this.writeUInt32(items.length);
    for (const item of items) {
      writer(item);
    }
  }

  /**
   * Write a length-prefixed buffer
   * Format: [UInt16 length][buffer bytes]
   */
  writeBuffer(data: Buffer): void {
    if (data.length > 65535) {
      throw new Error(`Buffer length ${data.length} exceeds UInt16 maximum (65535)`);
    }
    this.writeUInt16(data.length);
    this.ensureCapacity(data.length);
    data.copy(this.buffer, this.offset);
    this.offset += data.length;
  }

  /**
   * Write a nullable value (first byte indicates if value exists)
   */
  writeNullable<T>(value: T | null | undefined, writer: (item: T) => void): void {
    if (value === null || value === undefined) {
      this.writeBoolean(false);
    } else {
      this.writeBoolean(true);
      writer(value);
    }
  }

  /**
   * Write a record/object as key-value pairs
   * Format: [UInt32 count][key1][value1][key2][value2]...
   */
  writeRecord<T>(record: Record<string, T>, valueWriter: (value: T) => void): void {
    const keys = Object.keys(record);
    this.writeUInt32(keys.length);
    for (const key of keys) {
      this.writeString(key);
      valueWriter(record[key]);
    }
  }

  /**
   * Get the current buffer (only up to offset)
   */
  getBuffer(): Buffer {
    return this.buffer.subarray(0, this.offset);
  }

  /**
   * Get the current offset
   */
  getOffset(): number {
    return this.offset;
  }

  /**
   * Reset the writer (reuse buffer)
   */
  reset(): void {
    this.offset = 0;
  }

  /**
   * Clear and reallocate buffer
   */
  clear(): void {
    this.buffer = Buffer.allocUnsafe(this.initialSize);
    this.offset = 0;
  }
}

/**
 * BufferReader - Client-side buffer reading utility
 * Reads data from ArrayBuffer
 */
export class BufferReader {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number;

  constructor(buffer: ArrayBuffer, offset: number = 0) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.offset = offset;
  }

  /**
   * Check if there's enough data remaining
   */
  private ensureCapacity(size: number): void {
    if (this.offset + size > this.buffer.byteLength) {
      throw new Error(
        `Buffer overflow: tried to read ${size} bytes at offset ${this.offset}, buffer length is ${this.buffer.byteLength}`
      );
    }
  }

  /**
   * Read a UInt8 (1 byte)
   */
  readUInt8(): number {
    this.ensureCapacity(1);
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * Read a UInt16 (2 bytes, little-endian)
   */
  readUInt16(): number {
    this.ensureCapacity(2);
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /**
   * Read an Int16 (2 bytes, little-endian, signed)
   */
  readInt16(): number {
    this.ensureCapacity(2);
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /**
   * Read a UInt32 (4 bytes, little-endian)
   */
  readUInt32(): number {
    this.ensureCapacity(4);
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Read a Float64 (8 bytes, little-endian)
   */
  readFloat64(): number {
    this.ensureCapacity(8);
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  /**
   * Read a boolean (1 byte)
   */
  readBoolean(): boolean {
    this.ensureCapacity(1);
    const value = this.view.getUint8(this.offset) !== 0;
    this.offset += 1;
    return value;
  }

  /**
   * Read a length-prefixed string (UTF-8)
   */
  readString(): string {
    const length = this.readUInt32();
    this.ensureCapacity(length);
    const bytes = new Uint8Array(this.buffer, this.offset, length);
    this.offset += length;
    // Convert UTF-8 bytes to string
    return new TextDecoder("utf-8").decode(bytes);
  }

  /**
   * Read a Vector2 (2 Float64 values)
   */
  readVector2(): Vector2 {
    const x = this.readFloat64();
    const y = this.readFloat64();
    return PoolManager.getInstance().vector2.claim(x, y);
  }

  /**
   * Read a Velocity2 (2 Int16 values with 100x scaling)
   * Converts scaled integers back to float values
   * Range: -10.00 to 10.00 (from -1000 to 1000)
   * Precision: 0.01 units
   */
  readVelocity2(): Vector2 {
    const scale = 100;
    const x = this.readInt16() / scale;
    const y = this.readInt16() / scale;
    return PoolManager.getInstance().vector2.claim(x, y);
  }

  /**
   * Read a Position2 (2 Int16 values with 10x scaling)
   * Converts scaled integers back to float values
   * Range: -3000.0 to 3000.0 (from -30000 to 30000)
   * Precision: 0.1 units
   */
  readPosition2(): Vector2 {
    const scale = 10;
    const x = this.readInt16() / scale;
    const y = this.readInt16() / scale;
    return PoolManager.getInstance().vector2.claim(x, y);
  }

  /**
   * Read a Size2 (2 UInt8 values)
   * Range: 0 to 255
   */
  readSize2(): Vector2 {
    const x = this.readUInt8();
    const y = this.readUInt8();
    return PoolManager.getInstance().vector2.claim(x, y);
  }

  /**
   * Read an array of items using a reader function
   */
  readArray<T>(reader: () => T): T[] {
    const count = this.readUInt32();
    const items: T[] = [];
    for (let i = 0; i < count; i++) {
      items.push(reader());
    }
    return items;
  }

  /**
   * Read a length-prefixed buffer (UInt16 length)
   */
  readBuffer(): ArrayBuffer {
    const length = this.readUInt16();
    this.ensureCapacity(length);
    const buffer = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return buffer;
  }

  /**
   * Read a nullable value
   */
  readNullable<T>(reader: () => T): T | null {
    if (this.readBoolean()) {
      return reader();
    }
    return null;
  }

  /**
   * Get the current offset
   */
  getOffset(): number {
    return this.offset;
  }

  /**
   * Create a new reader at a specific offset
   */
  atOffset(offset: number): BufferReader {
    return new BufferReader(this.buffer, offset);
  }

  /**
   * Check if there's more data to read
   */
  hasMore(): boolean {
    return this.offset < this.buffer.byteLength;
  }

  /**
   * Read a record/object as key-value pairs
   */
  readRecord<T>(valueReader: () => T): Record<string, T> {
    const count = this.readUInt32();
    const record: Record<string, T> = {};
    for (let i = 0; i < count; i++) {
      const key = this.readString();
      record[key] = valueReader();
    }
    return record;
  }
}

/**
 * ArrayBufferWriter - Browser-friendly buffer writing utility
 * Uses ArrayBuffer/DataView to build binary payloads without relying on Node.js Buffer
 */
export class ArrayBufferWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number;
  private initialSize: number;
  private static textEncoder = new TextEncoder();

  constructor(initialSize: number = 1024) {
    this.initialSize = initialSize;
    this.buffer = new ArrayBuffer(initialSize);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  private ensureCapacity(size: number): void {
    const needed = this.offset + size;
    if (needed <= this.buffer.byteLength) {
      return;
    }
    const newSize = Math.max(needed, this.buffer.byteLength * 2);
    const newBuffer = new ArrayBuffer(newSize);
    new Uint8Array(newBuffer).set(new Uint8Array(this.buffer, 0, this.offset));
    this.buffer = newBuffer;
    this.view = new DataView(this.buffer);
  }

  writeUInt32(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value >>> 0, true);
    this.offset += 4;
  }

  writeInt32(value: number): void {
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, value | 0, true);
    this.offset += 4;
  }

  writeFloat64(value: number): void {
    this.ensureCapacity(8);
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }

  writeUInt8(value: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeBoolean(value: boolean): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value ? 1 : 0);
    this.offset += 1;
  }

  writeString(value: string): void {
    const encoded = ArrayBufferWriter.textEncoder.encode(value);
    this.writeUInt32(encoded.length);
    this.ensureCapacity(encoded.length);
    new Uint8Array(this.buffer, this.offset, encoded.length).set(encoded);
    this.offset += encoded.length;
  }

  writeVector2(value: { x: number; y: number }): void {
    this.writeFloat64(value.x);
    this.writeFloat64(value.y);
  }

  writeNullable<T>(value: T | null | undefined, writer: (inner: T) => void): void {
    if (value === null || value === undefined) {
      this.writeBoolean(false);
      return;
    }
    this.writeBoolean(true);
    writer(value);
  }

  writeArray<T>(items: T[], writer: (item: T) => void): void {
    this.writeUInt32(items.length);
    for (const item of items) {
      writer(item);
    }
  }

  getBuffer(): ArrayBuffer {
    return this.buffer.slice(0, this.offset);
  }

  getOffset(): number {
    return this.offset;
  }

  reset(): void {
    this.offset = 0;
  }
}
