import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { RecipeType } from "../../../util/recipes";

export function serialize(args: any[]): ArrayBuffer | null {
  const writer = new ArrayBufferWriter(256);
  const recipe = (args[0] ?? "") as RecipeType | string;
  writer.writeString(String(recipe));
  return writer.getBuffer();
}

export function deserialize(buffer: ArrayBuffer): any[] | null {
  const reader = new BufferReader(buffer);
  const recipe = reader.readString() as RecipeType;
  return [recipe];
}

