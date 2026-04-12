import { describe, expect, it } from "vitest";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { FISTS_INVENTORY_SENTINEL } from "../../../constants/inventory-sentinel";
import { SelectInventorySlotEvent } from "./select-inventory-slot";
import { SetWeaponLoadoutSlotEvent } from "./set-weapon-loadout-slot";
import { SwapBagAndEquipmentEvent } from "./swap-bag-and-equipment";
import { SwapInventoryItemsEvent } from "./swap-inventory-items";

describe("inventory event wire encoding", () => {
  it("preserves high inventory slot selections below the fists sentinel", () => {
    const writer = new ArrayBufferWriter();
    SelectInventorySlotEvent.serializeToBuffer(writer, { slotIndex: 57 });
    const data = SelectInventorySlotEvent.deserializeFromBuffer(new BufferReader(writer.getBuffer()));
    expect(data.slotIndex).toBe(57);
  });

  it("preserves the fists sentinel selection", () => {
    const writer = new ArrayBufferWriter();
    SelectInventorySlotEvent.serializeToBuffer(writer, { slotIndex: FISTS_INVENTORY_SENTINEL });
    const data = SelectInventorySlotEvent.deserializeFromBuffer(new BufferReader(writer.getBuffer()));
    expect(data.slotIndex).toBe(FISTS_INVENTORY_SENTINEL);
  });

  it("preserves higher bag indices for swap and loadout assignment events", () => {
    const swapWriter = new ArrayBufferWriter();
    SwapInventoryItemsEvent.serializeToBuffer(swapWriter, { fromSlotIndex: 41, toSlotIndex: 57 });
    const swapData = SwapInventoryItemsEvent.deserializeFromBuffer(
      new BufferReader(swapWriter.getBuffer()),
    );
    expect(swapData).toEqual({ fromSlotIndex: 41, toSlotIndex: 57 });

    const equipWriter = new ArrayBufferWriter();
    SwapBagAndEquipmentEvent.serializeToBuffer(equipWriter, { bagIndex: 57, equipSlot: "head" });
    const equipData = SwapBagAndEquipmentEvent.deserializeFromBuffer(
      new BufferReader(equipWriter.getBuffer()),
    );
    expect(equipData).toEqual({ bagIndex: 57, equipSlot: "head" });

    const loadoutWriter = new ArrayBufferWriter();
    SetWeaponLoadoutSlotEvent.serializeToBuffer(loadoutWriter, { slot: 3, bagIndex: 57 });
    const loadoutData = SetWeaponLoadoutSlotEvent.deserializeFromBuffer(
      new BufferReader(loadoutWriter.getBuffer()),
    );
    expect(loadoutData).toEqual({ slot: 3, bagIndex: 57 });
  });

  it("does not coerce invalid equipment slot bytes to head", () => {
    const writer = new ArrayBufferWriter();
    writer.writeUInt8(23);
    writer.writeUInt8(250);
    const data = SwapBagAndEquipmentEvent.deserializeFromBuffer(new BufferReader(writer.getBuffer()));
    expect(data).toEqual({
      bagIndex: 23,
      equipSlot: "__invalid__",
    });
  });
});
