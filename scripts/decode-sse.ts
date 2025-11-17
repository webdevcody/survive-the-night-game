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
    const entityEndOffset = entityStartOffset + 2 + entityLength; // Entity ends here

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
      if (entityReader.getOffset() + 1 <= buffer.byteLength && entityReader.getOffset() + 1 <= entityEndOffset) {
        fieldCount = entityReader.readUInt8();
        fieldCountOffset = entityReader.getOffset() - 1;
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
      if (entityReader.getOffset() >= buffer.byteLength || entityReader.getOffset() >= entityEndOffset) {
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

        if (entityReader.getOffset() + 4 > buffer.byteLength || entityReader.getOffset() + 4 > entityEndOffset) {
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
          // String - check bounds before reading
          if (entityReader.getOffset() + 4 > buffer.byteLength || entityReader.getOffset() + 4 > entityEndOffset) {
            throw new Error("Not enough bytes for string length");
          }
          const result = readStringSegment(entityReader, "Value (string)", buffer);
          valueSegment = result.segment;
          entityReader = result.newReader;
        } else if (valueType === 1) {
          // Float64 - check bounds before reading
          if (entityReader.getOffset() + 8 > buffer.byteLength || entityReader.getOffset() + 8 > entityEndOffset) {
            throw new Error("Not enough bytes for Float64");
          }
          valueSegment = readSegment(
            entityReader,
            "Value (float64)",
            () => entityReader.readFloat64(),
            "float64"
          );
        } else if (valueType === 2) {
          // Boolean - check bounds before reading
          if (entityReader.getOffset() + 1 > buffer.byteLength || entityReader.getOffset() + 1 > entityEndOffset) {
            throw new Error("Not enough bytes for boolean");
          }
          valueSegment = readSegment(
            entityReader,
            "Value (boolean)",
            () => entityReader.readBoolean(),
            "uint8 (boolean)"
          );
        } else if (valueType === 3) {
          // JSON string - check bounds before reading
          if (entityReader.getOffset() + 4 > buffer.byteLength || entityReader.getOffset() + 4 > entityEndOffset) {
            throw new Error("Not enough bytes for JSON string length");
          }
          const result = readStringSegment(entityReader, "Value (JSON string)", buffer);
          valueSegment = result.segment;
          entityReader = result.newReader;
          try {
            valueSegment.value = JSON.parse(valueSegment.value as string);
          } catch {}
        } else {
          // String fallback - check bounds before reading
          if (entityReader.getOffset() + 4 > buffer.byteLength || entityReader.getOffset() + 4 > entityEndOffset) {
            throw new Error("Not enough bytes for string fallback length");
          }
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
      if (entityReader.getOffset() + 1 <= buffer.byteLength && entityReader.getOffset() + 1 <= entityEndOffset) {
        extensionCount = entityReader.readUInt8();
        extensionCountOffset = entityReader.getOffset() - 1;
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
      // entityEndOffset is already calculated above
      
      let extLength = 0;
      try {
        if (extStartOffset + 2 > buffer.byteLength || extStartOffset + 2 > entityEndOffset) {
          extensionsSegment.children!.push({
            label: `Extension ${j}`,
            type: "error",
            value: "[Buffer overflow - not enough bytes for extension length]",
            offset: extStartOffset,
            bytes: 0,
          });
          break;
        }
        
        extLength = entityReader.readUInt16();
        const extDataStartOffset = entityReader.getOffset();

        // Check if extension would exceed buffer or entity boundary
        const extEndOffset = extStartOffset + 2 + extLength;
        if (extDataStartOffset + 1 > buffer.byteLength || extEndOffset > buffer.byteLength || extEndOffset > entityEndOffset) {
          extensionsSegment.children!.push({
            label: `Extension ${j}`,
            type: "error",
            value: `[Buffer overflow - extension length ${extLength} exceeds available space]`,
            offset: extStartOffset,
            bytes: 2,
          });
          // Skip this extension and break to avoid further errors
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
        // extLength includes the type byte, so data length is extLength - 1
        const extDataReader = entityReader.atOffset(extDataStartOffset + 1);
        const extDataEndOffset = extDataStartOffset + extLength;
        
        // Safety check: ensure end offset doesn't exceed buffer or entity boundary
        const actualEndOffset = Math.min(extDataEndOffset, buffer.byteLength, entityEndOffset);

        try {
          const extDataSegments = parseExtensionData(
            extType,
            extDataReader,
            actualEndOffset,
            buffer
          );
          if (extDataSegments.length > 0) {
            extSegment.children!.push({
              label: "Data",
              type: "struct",
              value: "",
              offset: extDataStartOffset + 1,
              bytes: actualEndOffset - (extDataStartOffset + 1),
              children: extDataSegments,
            });
          }
        } catch (e: any) {
          // If we can't parse, just show raw bytes
          const remainingBytes = Math.max(0, actualEndOffset - (extDataStartOffset + 1));
          extSegment.children!.push({
            label: "Data",
            type: `raw bytes (${remainingBytes} bytes)`,
            value: `[Parse error: ${e.message || String(e)}]`,
            offset: extDataStartOffset + 1,
            bytes: remainingBytes,
          });
        }
        
        // Advance reader past this extension
        entityReader = entityReader.atOffset(actualEndOffset);

        extensionsSegment.children!.push(extSegment);
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
    // entityEndOffset is already calculated above
    let removedCount = 0;
    let removedCountOffset = entityReader.getOffset();
    try {
      if (entityReader.getOffset() + 1 <= buffer.byteLength && entityReader.getOffset() + 1 <= entityEndOffset) {
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
      // Check bounds before reading
      if (entityReader.getOffset() + 1 > buffer.byteLength || entityReader.getOffset() + 1 > entityEndOffset) {
        removedSegment.children!.push({
          label: `Removed ${j}`,
          type: "error",
          value: "[Buffer overflow - not enough bytes for removed extension type]",
          offset: entityReader.getOffset(),
          bytes: 0,
        });
        break;
      }
      
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
    
    // Calculate where we should be: entityStartOffset + 2 (length) + entityLength
    const expectedEntityEnd = entityStartOffset + 2 + entityLength;
    // But use the actual position we've read to, clamped to not exceed buffer
    const actualEntityEnd = Math.min(entityReader.getOffset(), buffer.byteLength);
    const safeEntityEnd = Math.min(expectedEntityEnd, buffer.byteLength);
    
    // Advance reader to the next entity, using the safe end position
    reader = reader.atOffset(safeEntityEnd);
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

  // Safety check: ensure we have at least 1 byte
  if (startOffset >= endOffset) {
    return segments;
  }

  try {
    // Read field count (always present now)
    const fieldCountOffset = reader.getOffset();
    let fieldCount = 0;
    try {
      if (reader.getOffset() + 1 <= endOffset) {
        fieldCount = reader.readUInt8();
        // Sanity check: field count shouldn't be unreasonably large
        // Most extensions have 0-3 fields, so > 10 is suspicious
        if (fieldCount > 10) {
          segments.push({
            label: "Field Count",
            type: "uint8 (ERROR: suspiciously large)",
            value: `${fieldCount} - possible old format data`,
            offset: fieldCountOffset,
            bytes: 1,
          });
          // Try to parse as old format (no field count)
          return parseOldFormatExtension(extType, reader.atOffset(fieldCountOffset), endOffset, buffer);
        }
      } else {
        // Not enough bytes for field count
        return segments;
      }
    } catch {
      // Can't read field count, return empty
      return segments;
    }
    
    segments.push({
      label: "Field Count",
      type: "uint8",
      value: fieldCount,
      offset: fieldCountOffset,
      bytes: 1,
    });
    
    switch (extType) {
      case "positionable":
        // Read fields by index
        for (let i = 0; i < fieldCount; i++) {
          if (reader.getOffset() + 1 > endOffset) break;
          const fieldIndex = reader.readUInt8();
          if (fieldIndex === 0) {
            // position
            if (reader.getOffset() + 4 > endOffset) {
              segments.push({
                label: "Position (index 0)",
                type: "error",
                value: "[Buffer overflow - not enough bytes for Position2]",
                offset: reader.getOffset() - 1,
                bytes: 1,
              });
              break;
            }
            const positionOffset = reader.getOffset();
            const position = reader.readPosition2();
            segments.push({
              label: "Position (index 0)",
              type: "struct",
              value: `(${position.x}, ${position.y})`,
              offset: positionOffset - 1,
              bytes: 5, // 1 byte index + 4 bytes position
              children: [
                {
                  label: "Field Index",
                  type: "uint8",
                  value: 0,
                  offset: positionOffset - 1,
                  bytes: 1,
                },
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
          } else if (fieldIndex === 1) {
            // size
            if (reader.getOffset() + 2 > endOffset) {
              segments.push({
                label: "Size (index 1)",
                type: "error",
                value: "[Buffer overflow - not enough bytes for Size2]",
                offset: reader.getOffset() - 1,
                bytes: 1,
              });
              break;
            }
            const sizeOffset = reader.getOffset();
            const size = reader.readSize2();
            segments.push({
              label: "Size (index 1)",
              type: "struct",
              value: `(${size.x}, ${size.y})`,
              offset: sizeOffset - 1,
              bytes: 3, // 1 byte index + 2 bytes size
              children: [
                {
                  label: "Field Index",
                  type: "uint8",
                  value: 1,
                  offset: sizeOffset - 1,
                  bytes: 1,
                },
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
          }
        }
        break;
      case "collidable":
        // Read fields by index
        for (let i = 0; i < fieldCount; i++) {
          if (reader.getOffset() + 1 > endOffset) break;
          const fieldIndex = reader.readUInt8();
          if (fieldIndex === 0) {
            // offset
            if (reader.getOffset() + 16 > endOffset) {
              segments.push({
                label: "Offset (index 0)",
                type: "error",
                value: "[Buffer overflow - not enough bytes for Vector2]",
                offset: reader.getOffset() - 1,
                bytes: 1,
              });
              break;
            }
            const offsetOffset = reader.getOffset();
            const offset = reader.readVector2();
            segments.push({
              label: "Offset (index 0)",
              type: "struct",
              value: `(${offset.x}, ${offset.y})`,
              offset: offsetOffset - 1,
              bytes: 17, // 1 byte index + 16 bytes vector2
            });
          } else if (fieldIndex === 1) {
            // size
            if (reader.getOffset() + 16 > endOffset) {
              segments.push({
                label: "Size (index 1)",
                type: "error",
                value: "[Buffer overflow - not enough bytes for Vector2]",
                offset: reader.getOffset() - 1,
                bytes: 1,
              });
              break;
            }
            const sizeOffset = reader.getOffset();
            const size = reader.readVector2();
            segments.push({
              label: "Size (index 1)",
              type: "struct",
              value: `(${size.x}, ${size.y})`,
              offset: sizeOffset - 1,
              bytes: 17, // 1 byte index + 16 bytes vector2
            });
          } else if (fieldIndex === 2) {
            // enabled
            if (reader.getOffset() + 1 > endOffset) {
              segments.push({
                label: "Enabled (index 2)",
                type: "error",
                value: "[Buffer overflow - not enough bytes for boolean]",
                offset: reader.getOffset() - 1,
                bytes: 1,
              });
              break;
            }
            const enabledOffset = reader.getOffset();
            const enabled = reader.readBoolean();
            segments.push({
              label: "Enabled (index 2)",
              type: "uint8 (boolean)",
              value: enabled,
              offset: enabledOffset - 1,
              bytes: 2, // 1 byte index + 1 byte boolean
            });
          }
        }
        break;
      case "movable":
        // Read fields by index
        for (let i = 0; i < fieldCount; i++) {
          if (reader.getOffset() + 1 > endOffset) break;
          const fieldIndex = reader.readUInt8();
          if (fieldIndex === 0) {
            // velocity
            if (reader.getOffset() + 4 > endOffset) {
              segments.push({
                label: "Velocity (index 0)",
                type: "error",
                value: "[Buffer overflow - not enough bytes for Velocity2]",
                offset: reader.getOffset() - 1,
                bytes: 1,
              });
              break;
            }
            const velocityOffset = reader.getOffset();
            const velocity = reader.readVelocity2();
            segments.push({
              label: "Velocity (index 0)",
              type: "struct",
              value: `(${velocity.x}, ${velocity.y})`,
              offset: velocityOffset - 1,
              bytes: 5, // 1 byte index + 4 bytes velocity
              children: [
                {
                  label: "Field Index",
                  type: "uint8",
                  value: 0,
                  offset: velocityOffset - 1,
                  bytes: 1,
                },
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
          }
        }
        break;
      case "inventory":
        // Read fields by index
        for (let i = 0; i < fieldCount; i++) {
          if (reader.getOffset() + 1 > endOffset) break;
          const fieldIndex = reader.readUInt8();
          if (fieldIndex === 0) {
            // items
            const itemsOffset = reader.getOffset();
            const itemCount = reader.readUInt32();
            segments.push({
              label: "Items (index 0)",
              type: `array (${itemCount} items)`,
              value: itemCount,
              offset: itemsOffset - 1,
              bytes: 0,
              children: [],
            });
            // Note: full item parsing skipped for brevity
          }
        }
        break;
      case "destructible":
        // Read fields by index
        for (let i = 0; i < fieldCount; i++) {
          if (reader.getOffset() + 1 > endOffset) break;
          const fieldIndex = reader.readUInt8();
          if (fieldIndex === 0) {
            // health
            if (reader.getOffset() + 8 > endOffset) {
              segments.push({
                label: "Health (index 0)",
                type: "error",
                value: "[Buffer overflow - not enough bytes for Float64]",
                offset: reader.getOffset() - 1,
                bytes: 1,
              });
              break;
            }
            const healthOffset = reader.getOffset();
            const health = reader.readFloat64();
            segments.push({
              label: "Health (index 0)",
              type: "float64",
              value: health,
              offset: healthOffset - 1,
              bytes: 9, // 1 byte index + 8 bytes float64
            });
          } else if (fieldIndex === 1) {
            // maxHealth
            if (reader.getOffset() + 8 > endOffset) {
              segments.push({
                label: "Max Health (index 1)",
                type: "error",
                value: "[Buffer overflow - not enough bytes for Float64]",
                offset: reader.getOffset() - 1,
                bytes: 1,
              });
              break;
            }
            const maxHealthOffset = reader.getOffset();
            const maxHealth = reader.readFloat64();
            segments.push({
              label: "Max Health (index 1)",
              type: "float64",
              value: maxHealth,
              offset: maxHealthOffset - 1,
              bytes: 9, // 1 byte index + 8 bytes float64
            });
          }
        }
        break;
      default:
        // Unknown extension type - show remaining bytes
        const remaining = Math.max(0, endOffset - reader.getOffset());
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
  } catch (e: any) {
    // If parsing fails, show remaining bytes
    const remaining = Math.max(0, endOffset - reader.getOffset());
    if (remaining > 0) {
      segments.push({
        label: "Data (parse error)",
        type: `raw bytes (${remaining} bytes)`,
        value: `[Parse error: ${e.message || String(e)}]`,
        offset: reader.getOffset(),
        bytes: remaining,
      });
    }
  }

  return segments;
}

/**
 * Parse extension data in old format (no field count prefix)
 * This is for backward compatibility with data created before field-level delta compression
 */
function parseOldFormatExtension(
  extType: string,
  reader: BufferReader,
  endOffset: number,
  buffer: ArrayBuffer
): Segment[] {
  const segments: Segment[] = [];
  
  try {
    switch (extType) {
      case "positionable":
        if (reader.getOffset() + 6 <= endOffset) {
          const position = reader.readPosition2();
          const size = reader.readSize2();
          segments.push({
            label: "Position (old format)",
            type: "struct",
            value: `(${position.x}, ${position.y})`,
            offset: reader.getOffset() - 6,
            bytes: 6,
          });
        }
        break;
      case "destructible":
        if (reader.getOffset() + 16 <= endOffset) {
          const health = reader.readFloat64();
          const maxHealth = reader.readFloat64();
          segments.push({
            label: "Health (old format)",
            type: "float64",
            value: `${health}/${maxHealth}`,
            offset: reader.getOffset() - 16,
            bytes: 16,
          });
        }
        break;
      case "movable":
        if (reader.getOffset() + 4 <= endOffset) {
          const velocity = reader.readVelocity2();
          segments.push({
            label: "Velocity (old format)",
            type: "struct",
            value: `(${velocity.x}, ${velocity.y})`,
            offset: reader.getOffset() - 4,
            bytes: 4,
          });
        }
        break;
      case "collidable":
        if (reader.getOffset() + 33 <= endOffset) {
          const offset = reader.readVector2();
          const size = reader.readVector2();
          const enabled = reader.readBoolean();
          segments.push({
            label: "Collidable (old format)",
            type: "struct",
            value: `offset=(${offset.x},${offset.y}) size=(${size.x},${size.y}) enabled=${enabled}`,
            offset: reader.getOffset() - 33,
            bytes: 33,
          });
        }
        break;
      default:
        // Unknown - show raw bytes
        const remaining = Math.max(0, endOffset - reader.getOffset());
        if (remaining > 0) {
          segments.push({
            label: "Data (old format)",
            type: `raw bytes (${remaining} bytes)`,
            value: "...",
            offset: reader.getOffset(),
            bytes: remaining,
          });
        }
    }
  } catch (e: any) {
    // Error parsing old format
    const remaining = Math.max(0, endOffset - reader.getOffset());
    segments.push({
      label: "Parse Error (old format)",
      type: "error",
      value: `[Error: ${e.message || String(e)}]`,
      offset: reader.getOffset(),
      bytes: remaining,
    });
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
