import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { Input } from "../../../util/input";
import type { ItemType } from "../../../util/inventory";
import { Direction } from "../../../util/direction";
import { itemTypeToUInt16, uint16ToItemType } from "./utils";

export type PlayerInputEventData = Input;

export class PlayerInputEvent implements GameEvent<PlayerInputEventData> {
  private readonly type: EventType = ClientSentEvents.PLAYER_INPUT;
  private readonly data: PlayerInputEventData;

  constructor(data: PlayerInputEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): PlayerInputEventData {
    return this.data;
  }

  getInput(): Input {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: PlayerInputEventData): void {
    const input = data;

    // Pack booleans into a bitset (1 byte)
    const hasAimAngle = input.aimAngle !== undefined;
    const hasConsumeItemType =
      input.consumeItemType !== null && input.consumeItemType !== undefined;
    let bitset = 0;
    if (input.interact) bitset |= 1 << 0;
    if (input.fire) bitset |= 1 << 1;
    if (input.drop) bitset |= 1 << 2;
    if (input.consume) bitset |= 1 << 3;
    if (input.sprint) bitset |= 1 << 4;
    if (hasAimAngle) bitset |= 1 << 5;
    if (hasConsumeItemType) bitset |= 1 << 6;
    writer.writeUInt8(bitset);

    // facing: uint8 (Direction enum)
    writer.writeUInt8((input.facing ?? Direction.Down) >>> 0);

    // dx/dy: Combined into single uint8 (3x3 = 9 possible combinations)
    // dx and dy are always -1, 0, or 1, so we encode: (dx + 1) * 3 + (dy + 1)
    const dx = Math.max(-1, Math.min(1, Math.round(input.dx ?? 0)));
    const dy = Math.max(-1, Math.min(1, Math.round(input.dy ?? 0)));
    const encoded = (dx + 1) * 3 + (dy + 1);
    writer.writeUInt8(encoded);

    // inventoryItem: uint8 (0-255 slots)
    writer.writeUInt8(Math.max(0, Math.min(255, (input.inventoryItem ?? 1) >>> 0)));

    // consumeItemType: uint16 (only if bit is set)
    if (hasConsumeItemType) {
      writer.writeUInt16(itemTypeToUInt16(input.consumeItemType));
    }

    // aimAngle: uint16, scale from 0-2π to 0-65535
    if (hasAimAngle && input.aimAngle !== undefined) {
      // Normalize angle to [0, 2π) range
      let angle = input.aimAngle;
      angle = angle % (2 * Math.PI);
      if (angle < 0) angle += 2 * Math.PI;
      // Scale to uint16: 0-65535
      writer.writeUInt16(Math.round((angle / (2 * Math.PI)) * 65535));
    }
  }

  static deserializeFromBuffer(reader: BufferReader): PlayerInputEventData {
    // Read bitset (1 byte)
    const bitset = reader.readUInt8();
    const interact = (bitset & (1 << 0)) !== 0;
    const fire = (bitset & (1 << 1)) !== 0;
    const drop = (bitset & (1 << 2)) !== 0;
    const consume = (bitset & (1 << 3)) !== 0;
    const sprint = (bitset & (1 << 4)) !== 0;
    const hasAimAngle = (bitset & (1 << 5)) !== 0;
    const hasConsumeItemType = (bitset & (1 << 6)) !== 0;

    // facing: uint8
    const facing = reader.readUInt8() as Direction;

    // dx/dy: Decode from single uint8
    // encoded = (dx + 1) * 3 + (dy + 1)
    // dx = floor(encoded / 3) - 1
    // dy = (encoded % 3) - 1
    const encoded = reader.readUInt8();
    const dx = Math.floor(encoded / 3) - 1;
    const dy = (encoded % 3) - 1;

    // inventoryItem: uint8
    const inventoryItem = reader.readUInt8();

    // consumeItemType: uint16 (only if bit is set)
    let consumeItemType: ItemType | null = null;
    if (hasConsumeItemType) {
      consumeItemType = uint16ToItemType(reader.readUInt16());
    }

    // aimAngle: uint16, unclamp by scaling from 0-65535 to 0-2π
    let aimAngle: number | undefined = undefined;
    if (hasAimAngle) {
      const angleScaled = reader.readUInt16();
      aimAngle = (angleScaled / 65535) * (2 * Math.PI);
    }

    const input: Input = {
      facing,
      dx,
      dy,
      interact,
      fire,
      inventoryItem,
      drop,
      consume,
      consumeItemType,
      sprint,
      aimAngle,
    };

    return input;
  }
}
