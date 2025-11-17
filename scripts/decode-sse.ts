#!/usr/bin/env node

/**
 * Script to decode base64 encoded binary server sent events and output a tree structure
 * showing each segment with its label, type, and value
 *
 * Usage:
 *   node scripts/decode-sse.ts <base64_string>
 *   or
 *   tsx scripts/decode-sse.ts <base64_string>
 */

import { BufferReader } from "../packages/game-shared/src/util/buffer-serialization.js";
import { ServerSentEvents } from "../packages/game-shared/src/events/events.js";
// Import entities to initialize entity type registry
import "../packages/game-shared/src/entities/index.js";
import { entityTypeRegistry } from "../packages/game-shared/src/util/entity-type-encoding.js";
import { eventTypeRegistry } from "../packages/game-shared/src/util/event-type-encoding.js";
import { decodeExtensionType } from "../packages/game-shared/src/util/extension-type-encoding.js";

interface Segment {
  label: string;
  type: string;
  value: any;
  offset: number;
  bytes: number;
  children?: Segment[];
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanBase64 = base64.trim().replace(/\s/g, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Read a segment and return its info
 */
function readSegment(
  reader: BufferReader,
  label: string,
  readFn: () => any,
  typeName: string
): Segment {
  const offset = reader.getOffset();
  const value = readFn();
  const bytes = reader.getOffset() - offset;
  return { label, type: typeName, value, offset, bytes };
}

/**
 * Read a string segment
 */
function readStringSegment(
  reader: BufferReader,
  label: string,
  buffer: ArrayBuffer
): { segment: Segment; newReader: BufferReader } {
  const offset = reader.getOffset();
  const length = reader.readUInt32();
  const offsetAfterLength = reader.getOffset();

  // Validate length - return error segment instead of throwing
  if (length < 0 || length > buffer.byteLength || offsetAfterLength + length > buffer.byteLength) {
    // Return error segment instead of throwing
    return {
      segment: {
        label,
        type: `string (ERROR: Invalid length ${length})`,
        value: `[Invalid string length ${length} at offset ${offset}, buffer size: ${buffer.byteLength}]`,
        offset,
        bytes: 4,
      },
      newReader: reader.atOffset(offset + 4), // Skip the invalid length
    };
  }

  const bytes = new Uint8Array(buffer, offsetAfterLength, length);
  const value = new TextDecoder("utf-8").decode(bytes);
  // Create new reader advanced past the string
  const newReader = reader.atOffset(offsetAfterLength + length);
  return {
    segment: {
      label,
      type: `string (length: uint32, data: ${length} bytes)`,
      value,
      offset,
      bytes: 4 + length,
    },
    newReader,
  };
}

/**
 * Parse event header
 */
function parseEventHeader(data: ArrayBuffer): {
  segments: Segment[];
  eventName: string;
  eventDataBuffer: ArrayBuffer;
} {
  const segments: Segment[] = [];
  const reader = new BufferReader(data);

  const eventTypeId = reader.readUInt8();
  let eventName: string;
  try {
    eventName = eventTypeRegistry.decode(eventTypeId);
    segments.push({
      label: "Event Type",
      type: "uint8 (decoded)",
      value: `${eventTypeId} → "${eventName}"`,
      offset: 0,
      bytes: 1,
    });
  } catch {
    eventName = `unknown(${eventTypeId})`;
    segments.push({
      label: "Event Type",
      type: "uint8",
      value: eventTypeId,
      offset: 0,
      bytes: 1,
    });
  }

  const eventDataBuffer = data.slice(reader.getOffset());

  return { segments, eventName, eventDataBuffer };
}

/**
 * Parse game state update event
 */
function parseGameStateUpdate(buffer: ArrayBuffer): Segment[] {
  const segments: Segment[] = [];
  let reader = new BufferReader(buffer);

  // Entity count
  segments.push(readSegment(reader, "Entity Count", () => reader.readUInt16(), "uint16"));
  const entityCount = segments[0].value;

  // Entities
  const entitiesSegment: Segment = {
    label: "Entities",
    type: `array (${entityCount} items)`,
    value: entityCount,
    offset: reader.getOffset() - 2,
    bytes: 0,
    children: [],
  };

  for (let i = 0; i < entityCount; i++) {
    if (reader.getOffset() + 2 > buffer.byteLength) break;

    const entityStartOffset = reader.getOffset();
    const entityLength = reader.readUInt16();

    const entitySegment: Segment = {
      label: `Entity ${i}`,
      type: `struct (length: uint16, data: ${entityLength} bytes)`,
      value: `length=${entityLength}`,
      offset: entityStartOffset,
      bytes: 2 + entityLength,
      children: [],
    };

    let entityReader = reader.atOffset(entityStartOffset + 2);
    const entityDataStart = entityReader.getOffset();

    // Try to detect format by attempting to read binary format first (current format)
    // If that fails or produces invalid data, try old string format
    let idValue: any = "unknown";
    let typeValue: any = "unknown";
    let idSegment: Segment = {
      label: "ID",
      type: "unknown",
      value: "unknown",
      offset: entityDataStart,
      bytes: 0,
    };
    let typeSegment: Segment = {
      label: "Type",
      type: "unknown",
      value: "unknown",
      offset: entityDataStart,
      bytes: 0,
    };
    let formatDetected = false;

    // Try binary format first (uint16 id + uint8 type)
    try {
      if (entityReader.getOffset() + 3 <= buffer.byteLength) {
        const idOffset = entityReader.getOffset();
        const id = entityReader.readUInt16();

        // Check if ID is reasonable (not too large)
        if (id <= 65535) {
          const typeIdOffset = entityReader.getOffset();
          if (typeIdOffset < buffer.byteLength) {
            const typeId = entityReader.readUInt8();

            // Try to decode type - if successful, this is likely binary format
            try {
              const decodedType = entityTypeRegistry.decode(typeId);
              // Success! This is binary format
              idValue = id;
              typeValue = decodedType;
              idSegment = {
                label: "ID",
                type: "uint16",
                value: idValue,
                offset: idOffset,
                bytes: 2,
              };
              typeSegment = {
                label: "Type",
                type: "uint8 (decoded)",
                value: `${typeId} → "${typeValue}"`,
                offset: typeIdOffset,
                bytes: 1,
              };
              formatDetected = true;
            } catch {
              // Type decode failed, might be old format
            }
          }
        }
      }
    } catch {
      // Binary format read failed, try old format
    }

    // If binary format didn't work, try old string format
    if (!formatDetected) {
      try {
        entityReader = reader.atOffset(entityDataStart);
        // Check if we have enough bytes for string format (at least 4 bytes for length)
        if (entityReader.getOffset() + 4 <= buffer.byteLength) {
          const peekOffset = entityReader.getOffset();
          const possibleStringLength = entityReader.readUInt32();
          entityReader = entityReader.atOffset(peekOffset);

          // Validate string length is reasonable
          if (
            possibleStringLength > 0 &&
            possibleStringLength < 1000 &&
            peekOffset + 4 + possibleStringLength <= buffer.byteLength
          ) {
            // Try to read as string format
            const idResult = readStringSegment(entityReader, "ID", buffer);
            idSegment = idResult.segment;
            entityReader = idResult.newReader;
            idValue = idSegment.value;

            // Try to read type as string
            if (entityReader.getOffset() + 4 <= buffer.byteLength) {
              const typeResult = readStringSegment(entityReader, "Type", buffer);
              typeSegment = typeResult.segment;
              entityReader = typeResult.newReader;
              typeValue = typeSegment.value;
              formatDetected = true;
            }
          }
        }
      } catch {
        // String format also failed
      }
    }

    // If neither format worked, show raw bytes
    if (!formatDetected) {
      const remainingBytes = Math.min(10, entityLength);
      const rawBytes = new Uint8Array(buffer, entityDataStart, remainingBytes);
      idSegment = {
        label: "ID",
        type: "unknown format",
        value: `[Could not parse - raw bytes: ${Array.from(rawBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ")}...]`,
        offset: entityDataStart,
        bytes: remainingBytes,
      };
      typeSegment = {
        label: "Type",
        type: "unknown format",
        value: "[Could not parse]",
        offset: entityDataStart + remainingBytes,
        bytes: 0,
      };
      idValue = "unknown";
      typeValue = "unknown";
      entityReader = reader.atOffset(entityStartOffset + 2 + entityLength);
    }

    entitySegment.children!.push(idSegment);
    entitySegment.children!.push(typeSegment);

    // Custom fields
    let fieldCount = 0;
    let fieldCountOffset = entityReader.getOffset();
    try {
      if (entityReader.getOffset() + 4 <= buffer.byteLength) {
        fieldCount = entityReader.readUInt32();
        fieldCountOffset = entityReader.getOffset() - 4;
      } else {
        // Not enough bytes, skip custom fields
        break;
      }
    } catch {
      // Error reading field count, skip to next entity
      break;
    }
    const fieldsSegment: Segment = {
      label: "Custom Fields",
      type: `array (${fieldCount} items)`,
      value: fieldCount,
      offset: fieldCountOffset,
      bytes: 0,
      children: [],
    };

    for (let j = 0; j < fieldCount; j++) {
      // Check bounds before reading field
      if (entityReader.getOffset() >= buffer.byteLength) {
        fieldsSegment.children!.push({
          label: `Field ${j}`,
          type: "error",
          value: "[Buffer overflow - not enough bytes]",
          offset: entityReader.getOffset(),
          bytes: 0,
        });
        break;
      }

      const fieldStartOffset = entityReader.getOffset();
      try {
        const { segment: fieldName, newReader: readerAfterName } = readStringSegment(
          entityReader,
          "Field Name",
          buffer
        );
        entityReader = readerAfterName;

        if (entityReader.getOffset() + 4 > buffer.byteLength) {
          fieldsSegment.children!.push({
            label: `Field ${j}`,
            type: "error",
            value: `[Buffer overflow reading value type for "${fieldName.value}"]`,
            offset: fieldStartOffset,
            bytes: entityReader.getOffset() - fieldStartOffset,
          });
          break;
        }

        const valueType = entityReader.readUInt32();

        let valueSegment: Segment;
        if (valueType === 0) {
          const result = readStringSegment(entityReader, "Value (string)", buffer);
          valueSegment = result.segment;
          entityReader = result.newReader;
        } else if (valueType === 1) {
          valueSegment = readSegment(
            entityReader,
            "Value (float64)",
            () => entityReader.readFloat64(),
            "float64"
          );
        } else if (valueType === 2) {
          valueSegment = readSegment(
            entityReader,
            "Value (boolean)",
            () => entityReader.readBoolean(),
            "uint8 (boolean)"
          );
        } else if (valueType === 3) {
          const result = readStringSegment(entityReader, "Value (JSON string)", buffer);
          valueSegment = result.segment;
          entityReader = result.newReader;
          try {
            valueSegment.value = JSON.parse(valueSegment.value as string);
          } catch {}
        } else {
          const result = readStringSegment(entityReader, "Value (string fallback)", buffer);
          valueSegment = result.segment;
          entityReader = result.newReader;
        }

        fieldsSegment.children!.push({
          label: `Field ${j}`,
          type: "struct",
          value: `${fieldName.value} = ${JSON.stringify(valueSegment.value)}`,
          offset: fieldStartOffset,
          bytes: fieldName.bytes + 4 + valueSegment.bytes,
          children: [
            { ...fieldName, label: "Name" },
            {
              label: "Value Type",
              type: "uint32",
              value: `${valueType}`,
              offset: entityReader.getOffset() - 4,
              bytes: 4,
            },
            { ...valueSegment, label: "Value" },
          ],
        });
      } catch (error: any) {
        fieldsSegment.children!.push({
          label: `Field ${j}`,
          type: "error",
          value: `[Error reading field: ${error.message}]`,
          offset: fieldStartOffset,
          bytes: Math.min(10, buffer.byteLength - fieldStartOffset),
        });
        break;
      }
    }

    if (fieldCount > 0) {
      entitySegment.children!.push(fieldsSegment);
    }

    // Extensions
    let extensionCount = 0;
    let extensionCountOffset = entityReader.getOffset();
    try {
      if (entityReader.getOffset() + 4 <= buffer.byteLength) {
        extensionCount = entityReader.readUInt32();
        extensionCountOffset = entityReader.getOffset() - 4;
      }
    } catch {
      // Error reading extension count, skip extensions
    }
    const extensionsSegment: Segment = {
      label: "Extensions",
      type: `array (${extensionCount} items)`,
      value: extensionCount,
      offset: extensionCountOffset,
      bytes: 0,
      children: [],
    };

    for (let j = 0; j < extensionCount; j++) {
      // Check bounds before reading extension
      if (entityReader.getOffset() + 2 > buffer.byteLength) {
        extensionsSegment.children!.push({
          label: `Extension ${j}`,
          type: "error",
          value: "[Buffer overflow - not enough bytes for extension length]",
          offset: entityReader.getOffset(),
          bytes: 0,
        });
        break;
      }

      const extStartOffset = entityReader.getOffset();
      let extLength = 0;
      try {
        extLength = entityReader.readUInt16();
        const extDataStartOffset = entityReader.getOffset();

        if (extDataStartOffset + 1 > buffer.byteLength) {
          extensionsSegment.children!.push({
            label: `Extension ${j}`,
            type: "error",
            value: "[Buffer overflow - not enough bytes for extension type]",
            offset: extStartOffset,
            bytes: 2,
          });
          break;
        }

        const encodedType = entityReader.readUInt8();
        const extType = decodeExtensionType(encodedType);

        const extSegment: Segment = {
          label: `Extension ${j}`,
          type: `struct (length: uint16, data: ${extLength} bytes)`,
          value: `length=${extLength}`,
          offset: extStartOffset,
          bytes: 2 + extLength,
          children: [
            {
              label: "Length",
              type: "uint16",
              value: extLength,
              offset: extStartOffset,
              bytes: 2,
            },
            {
              label: "Type",
              type: "uint8 (decoded)",
              value: `${encodedType} → "${extType}"`,
              offset: extDataStartOffset,
              bytes: 1,
            },
          ],
        };

        // Try to parse extension data based on type
        const extDataReader = entityReader.atOffset(extDataStartOffset + 1);
        const extDataEndOffset = extDataStartOffset + extLength;

        try {
          const extDataSegments = parseExtensionData(
            extType,
            extDataReader,
            extDataEndOffset,
            buffer
          );
          if (extDataSegments.length > 0) {
            extSegment.children!.push({
              label: "Data",
              type: "struct",
              value: "",
              offset: extDataStartOffset + 1,
              bytes: extLength - 1,
              children: extDataSegments,
            });
          }
        } catch (e) {
          // If we can't parse, just show raw bytes
          const remainingBytes = extDataEndOffset - (extDataStartOffset + 1);
          extSegment.children!.push({
            label: "Data",
            type: `raw bytes (${remainingBytes} bytes)`,
            value: "...",
            offset: extDataStartOffset + 1,
            bytes: remainingBytes,
          });
        }

        extensionsSegment.children!.push(extSegment);
        entityReader = entityReader.atOffset(extDataEndOffset);
      } catch (error: any) {
        extensionsSegment.children!.push({
          label: `Extension ${j}`,
          type: "error",
          value: `[Error reading extension: ${error.message}]`,
          offset: extStartOffset,
          bytes: Math.min(10, buffer.byteLength - extStartOffset),
        });
        break;
      }
    }

    if (extensionCount > 0) {
      entitySegment.children!.push(extensionsSegment);
    }

    // Removed extensions
    let removedCount = 0;
    let removedCountOffset = entityReader.getOffset();
    try {
      if (entityReader.getOffset() + 1 <= buffer.byteLength) {
        removedCount = entityReader.readUInt8();
        removedCountOffset = entityReader.getOffset() - 1;
      }
    } catch {
      // Error reading removed count, skip removed extensions
    }
    const removedSegment: Segment = {
      label: "Removed Extensions",
      type: `array (${removedCount} items)`,
      value: removedCount,
      offset: removedCountOffset,
      bytes: 0,
      children: [],
    };

    for (let j = 0; j < removedCount; j++) {
      try {
        const removedOffset = entityReader.getOffset();
        const encodedType = entityReader.readUInt8();
        const removedType = decodeExtensionType(encodedType);
        removedSegment.children!.push({
          label: `Removed ${j}`,
          type: "uint8 (decoded)",
          value: `${encodedType} → "${removedType}"`,
          offset: removedOffset,
          bytes: 1,
        });
      } catch (error: any) {
        removedSegment.children!.push({
          label: `Removed ${j}`,
          type: "error",
          value: `[Error reading removed extension: ${error.message}]`,
          offset: entityReader.getOffset(),
          bytes: 1,
        });
        break;
      }
    }

    if (removedCount > 0) {
      entitySegment.children!.push(removedSegment);
    }

    entitiesSegment.children!.push(entitySegment);
    reader = reader.atOffset(entityStartOffset + 2 + entityLength); // 2 bytes for uint16 length prefix
  }

  entitiesSegment.bytes = reader.getOffset() - entitiesSegment.offset;
  segments.push(entitiesSegment);

  // Game state metadata
  const gameStateSegment: Segment = {
    label: "Game State Metadata",
    type: "struct",
    value: "",
    offset: reader.getOffset(),
    bytes: 0,
    children: [],
  };

  const gameStateStartOffset = reader.getOffset();

  // Optional fields with boolean flags
  const optionalFields = [
    { name: "Timestamp", readFn: () => reader.readFloat64(), type: "float64" },
    { name: "Cycle Start Time", readFn: () => reader.readFloat64(), type: "float64" },
    { name: "Cycle Duration", readFn: () => reader.readFloat64(), type: "float64" },
    { name: "Wave Number", readFn: () => reader.readUInt8(), type: "uint8" },
    {
      name: "Wave State",
      readFn: () => {
        const len = reader.readUInt32();
        const bytes = new Uint8Array(buffer, reader.getOffset(), len);
        const str = new TextDecoder("utf-8").decode(bytes);
        (reader as any).offset += len;
        return str;
      },
      type: "string",
    },
    { name: "Phase Start Time", readFn: () => reader.readFloat64(), type: "float64" },
    { name: "Phase Duration", readFn: () => reader.readFloat64(), type: "float64" },
    { name: "Is Full State", readFn: () => reader.readBoolean(), type: "uint8 (boolean)" },
  ];

  for (const field of optionalFields) {
    const hasValue = reader.readBoolean();
    if (hasValue) {
      if (field.type === "string") {
        const result = readStringSegment(reader, field.name, buffer);
        gameStateSegment.children!.push(result.segment);
        reader = result.newReader;
      } else {
        gameStateSegment.children!.push(readSegment(reader, field.name, field.readFn, field.type));
      }
    } else {
      gameStateSegment.children!.push({
        label: field.name,
        type: "uint8 (boolean flag)",
        value: false,
        offset: reader.getOffset() - 1,
        bytes: 1,
      });
    }
  }

  // Removed entity IDs
  let removedEntityIdsCount = 0;
  let removedIdsOffset = reader.getOffset();
  try {
    if (reader.getOffset() + 2 <= buffer.byteLength) {
      removedEntityIdsCount = reader.readUInt16();
      removedIdsOffset = reader.getOffset() - 2;
    }
  } catch {
    // Error reading removed entity IDs count, skip
  }
  const removedIdsSegment: Segment = {
    label: "Removed Entity IDs Count",
    type: "uint16",
    value: removedEntityIdsCount,
    offset: removedIdsOffset,
    bytes: 2,
    children: [],
  };
  gameStateSegment.children!.push(removedIdsSegment);

  if (removedEntityIdsCount > 0) {
    const removedIdsArraySegment: Segment = {
      label: "Removed Entity IDs",
      type: `array (${removedEntityIdsCount} items)`,
      value: removedEntityIdsCount,
      offset: reader.getOffset(),
      bytes: 0,
      children: [],
    };

    for (let i = 0; i < removedEntityIdsCount; i++) {
      removedIdsArraySegment.children!.push(
        readSegment(reader, `ID ${i}`, () => reader.readUInt16(), "uint16")
      );
    }

    removedIdsArraySegment.bytes = reader.getOffset() - removedIdsArraySegment.offset;
    gameStateSegment.children!.push(removedIdsArraySegment);
  }

  gameStateSegment.bytes = reader.getOffset() - gameStateStartOffset;
  if (gameStateSegment.bytes > 0) {
    segments.push(gameStateSegment);
  }

  return segments;
}

/**
 * Parse extension data based on extension type
 */
function parseExtensionData(
  extType: string,
  reader: BufferReader,
  endOffset: number,
  buffer: ArrayBuffer
): Segment[] {
  const segments: Segment[] = [];
  const startOffset = reader.getOffset();

  try {
    switch (extType) {
      case "positionable":
        const positionOffset = reader.getOffset();
        const position = reader.readPosition2();
        const sizeOffset = reader.getOffset();
        const size = reader.readSize2();
        segments.push({
          label: "Position",
          type: "struct",
          value: `(${position.x}, ${position.y})`,
          offset: positionOffset,
          bytes: 4,
          children: [
            {
              label: "Position X",
              type: "int16 (scaled x10)",
              value: position.x,
              offset: positionOffset,
              bytes: 2,
            },
            {
              label: "Position Y",
              type: "int16 (scaled x10)",
              value: position.y,
              offset: positionOffset + 2,
              bytes: 2,
            },
          ],
        });
        segments.push({
          label: "Size",
          type: "struct",
          value: `(${size.x}, ${size.y})`,
          offset: sizeOffset,
          bytes: 2,
          children: [
            {
              label: "Size X",
              type: "uint8",
              value: size.x,
              offset: sizeOffset,
              bytes: 1,
            },
            {
              label: "Size Y",
              type: "uint8",
              value: size.y,
              offset: sizeOffset + 1,
              bytes: 1,
            },
          ],
        });
        break;
      case "collidable":
        // Collidable has no data
        break;
      case "movable":
        const velocityOffset = reader.getOffset();
        const velocity = reader.readVelocity2();
        segments.push({
          label: "Velocity",
          type: "struct",
          value: `(${velocity.x}, ${velocity.y})`,
          offset: velocityOffset,
          bytes: 4,
          children: [
            {
              label: "Velocity X",
              type: "int16 (scaled x100)",
              value: velocity.x,
              offset: velocityOffset,
              bytes: 2,
            },
            {
              label: "Velocity Y",
              type: "int16 (scaled x100)",
              value: velocity.y,
              offset: velocityOffset + 2,
              bytes: 2,
            },
          ],
        });
        break;
      case "inventory":
        const itemCount = reader.readUInt32();
        segments.push({
          label: "Items",
          type: `array (${itemCount} items)`,
          value: itemCount,
          offset: reader.getOffset() - 4,
          bytes: 0,
          children: [],
        });
        for (let i = 0; i < itemCount; i++) {
          const hasItem = reader.readBoolean();
          if (hasItem) {
            const result = readStringSegment(reader, `Item ${i} Type`, buffer);
            const itemType = result.segment;
            reader = result.newReader;
            // Item state as record - skip for now
            segments.push({
              label: `Item ${i}`,
              type: "struct",
              value: itemType.value,
              offset: itemType.offset - 1,
              bytes: 0,
              children: [
                {
                  label: "Has Item",
                  type: "uint8 (boolean)",
                  value: true,
                  offset: itemType.offset - 1,
                  bytes: 1,
                },
                itemType,
              ],
            });
          } else {
            segments.push({
              label: `Item ${i}`,
              type: "uint8 (boolean)",
              value: false,
              offset: reader.getOffset() - 1,
              bytes: 1,
            });
          }
        }
        break;
      default:
        // Unknown extension type - show remaining bytes
        const remaining = endOffset - reader.getOffset();
        if (remaining > 0) {
          segments.push({
            label: "Data",
            type: `raw bytes (${remaining} bytes)`,
            value: "...",
            offset: reader.getOffset(),
            bytes: remaining,
          });
        }
    }
  } catch (e) {
    // If parsing fails, show remaining bytes
    const remaining = endOffset - reader.getOffset();
    if (remaining > 0) {
      segments.push({
        label: "Data",
        type: `raw bytes (${remaining} bytes)`,
        value: "...",
        offset: reader.getOffset(),
        bytes: remaining,
      });
    }
  }

  return segments;
}

/**
 * Get ANSI color code based on byte count
 */
function getByteColor(bytes: number): string {
  if (bytes >= 8) {
    return "\x1b[31m"; // Red
  } else if (bytes >= 4) {
    return "\x1b[38;5;208m"; // Orange
  } else if (bytes >= 2) {
    return "\x1b[33m"; // Yellow
  } else if (bytes === 1) {
    return "\x1b[32m"; // Green
  }
  return ""; // No color for 0 bytes
}

/**
 * Print segment tree
 */
function printSegmentTree(segments: Segment[], indent: string = ""): void {
  for (const segment of segments) {
    const reset = "\x1b[0m";
    
    // For decoded types, extract just the decoded part (e.g., "illuminated" from "16384 → \"illuminated\"")
    let typeDisplay = segment.type;
    let decodedPart = "";
    
    if (segment.type.includes("(decoded)")) {
      const valueStr = String(segment.value);
      const match = valueStr.match(/→\s*"([^"]+)"/);
      if (match) {
        decodedPart = match[1];
        // Colorize "illuminated" extension type in cyan
        if (decodedPart === "illuminated") {
          const cyan = "\x1b[36m";
          decodedPart = `${cyan}${decodedPart}${reset}`;
        }
        typeDisplay = `${typeDisplay} → "${decodedPart}"`;
      }
    }

    const color = getByteColor(segment.bytes);
    const bytesStr = color ? `${color}bytes: ${segment.bytes}${reset}` : `bytes: ${segment.bytes}`;

    console.log(
      `${indent}${segment.label}: [${typeDisplay}] (${bytesStr})`
    );

    if (segment.children && segment.children.length > 0) {
      printSegmentTree(segment.children, indent + "  ");
    }
  }
}

/**
 * Main function to decode base64 SSE and output tree
 */
function decodeSSE(base64String: string): void {
  try {
    const arrayBuffer = base64ToArrayBuffer(base64String);

    // Parse event header
    const { segments: headerSegments, eventName, eventDataBuffer } = parseEventHeader(arrayBuffer);

    console.log("=== Event Header ===");
    printSegmentTree(headerSegments);
    console.log();

    // Parse event data based on event type
    if (eventName === ServerSentEvents.GAME_STATE_UPDATE) {
      console.log("=== Game State Update Event ===");
      try {
        const dataSegments = parseGameStateUpdate(eventDataBuffer);
        printSegmentTree(dataSegments);
      } catch (error: any) {
        console.error("Error parsing game state update:", error.message);
        console.log(`Buffer size: ${eventDataBuffer.byteLength} bytes`);
        console.log("Attempting to show raw buffer structure...");
        // Try to show at least entity count
        try {
          const reader = new BufferReader(eventDataBuffer);
          const entityCount = reader.readUInt16();
          console.log(`Entity Count: ${entityCount} (uint16)`);
          console.log(`Remaining buffer: ${eventDataBuffer.byteLength - reader.getOffset()} bytes`);
        } catch {
          console.log("Could not read entity count");
        }
      }
    } else {
      console.log(`=== ${eventName} Event ===`);
      console.log(
        `Event type not fully supported for tree output. Buffer size: ${eventDataBuffer.byteLength} bytes`
      );
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const base64String = process.argv[2];

  if (!base64String) {
    console.error("Usage: node scripts/decode-sse.ts <base64_string>");
    console.error("   or: tsx scripts/decode-sse.ts <base64_string>");
    process.exit(1);
  }

  decodeSSE(base64String);
}

export { decodeSSE };
