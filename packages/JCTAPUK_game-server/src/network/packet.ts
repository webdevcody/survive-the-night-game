type PrimitiveNumber = "uint32" | "uint16" | "uint8" | "int32" | "int16" | "int8";

type PrimitiveString = "string";
type PrimitiveBoolean = "boolean";

type PrimitivePacket<T extends PacketSchema> = PacketType<T>;

type PrimitivePacketEnum = [PrimitivePacket<any>, ...PrimitivePacket<any>[]];

type PacketRule =
  | PrimitiveNumber
  | [PrimitiveNumber]
  | PrimitiveString
  | [PrimitiveString]
  | PrimitiveBoolean
  | [PrimitiveBoolean]
  | PrimitivePacket<any>
  | [PrimitivePacket<any>]
  | PrimitivePacketEnum;

type PacketSchema = {
  [key: string]: PacketRule;
};

type PacketDataEnum<R extends PrimitivePacketEnum> = R extends [infer T, ...infer Rest]
  ? T extends PrimitivePacket<infer Schema>
    ? Packet<Schema> | PacketDataEnum<Rest extends PrimitivePacketEnum ? Rest : never>
    : never
  : never;

type PacketDataValue<R extends PacketRule> = R extends PrimitiveNumber
  ? number
  : R extends [PrimitiveNumber]
  ? number[]
  : R extends PrimitiveString
  ? string
  : R extends [PrimitiveString]
  ? string[]
  : R extends PrimitiveBoolean
  ? boolean
  : R extends [PrimitiveBoolean]
  ? boolean[]
  : R extends PrimitivePacket<infer Schema>
  ? Packet<Schema>
  : R extends [PrimitivePacket<infer Schema>]
  ? Packet<Schema>[]
  : R extends PrimitivePacketEnum
  ? PacketDataEnum<R>
  : never;

type PacketData<T extends PacketSchema> = {
  [K in keyof T]: PacketDataValue<T[K]>;
};

type PacketRaw<T extends PacketData<PacketSchema>> = {
  [K in keyof T]: T[K] extends Packet<infer Schema>
    ? PacketRaw<PacketData<Schema>>
    : T[K] extends Packet<infer Schema>[]
    ? PacketRaw<PacketData<Schema>>[]
    : T[K] extends PrimitivePacketEnum
    ? PacketRaw<PacketDataEnum<T[K]>>
    : T[K];
};

type PacketGet<T extends PacketType<any>> = T extends PacketType<infer U> ? Packet<U> : never;

const PRIMITIVE_STRING: PrimitiveString = "string";

const PRIMITIVE_BOOLEAN: PrimitiveBoolean = "boolean";

const PRIMITIVE_NUMBER: PrimitiveNumber[] = ["int32", "int16", "int8", "uint32", "uint16", "uint8"];

const PRIMITIVE_RULE: PacketRule[] = [PRIMITIVE_STRING, PRIMITIVE_BOOLEAN, ...PRIMITIVE_NUMBER];

class PacketType<T extends PacketSchema> {
  #type: new (type: PacketType<T>, data: PacketData<T>) => Packet<T>;
  #schema: T;

  // Returns the schema of the packet type
  get schema() {
    return this.#schema;
  }

  constructor(type: new (type: PacketType<T>, data: PacketData<T>) => Packet<T>, schema: T) {
    this.validSchema(schema);
    this.#type = type;
    this.#schema = schema;
  }

  // Validates individual packet rule
  private validRule(rule: PacketRule, ruleEnum: boolean = false) {
    if (rule == null) {
      throw new Error("Rule cannot be undefined or null.");
    }

    if (Array.isArray(rule)) {
      if (rule.length < 1) {
        throw new Error("Array rule cannot be empty.");
      }

      for (let i = 0; i < rule.length; i++) {
        this.validRule(rule[i], rule.length > 1);
      }
    } else {
      const isPrimitiveRule = PRIMITIVE_RULE.includes(rule);
      const isPacketType = rule instanceof PacketType;

      if (ruleEnum && !isPacketType) {
        throw new Error("Only enum PacketType");
      }

      if (!isPrimitiveRule && !isPacketType) {
        throw new Error(`Invalid type "${rule}" in rule.`);
      }
    }
  }

  // Validates the entire schema of the packet type
  private validSchema(schema: T) {
    if (!schema) {
      throw new Error("Schema cannot be undefined or null.");
    }

    if (typeof schema !== "object") {
      throw new Error(`Expected schema to be an object, but received ${typeof schema}.`);
    }

    if (Array.isArray(schema)) {
      throw new Error("Schema cannot be an array.");
    }

    for (const key in schema) {
      const rule = schema[key];

      this.validRule(rule);
    }
  }

  private validPacket(packet: Packet<T>) {
    if (!packet) {
      throw new Error("Packet cannot be undefined or null.");
    }

    if (!(packet instanceof Packet)) {
      throw new Error("Packet is not an instance of Packet.");
    }

    if (packet.type !== this) {
      throw new Error("Packet type does not match expected type.");
    }
  }

  private validBuffer(buffer: Uint8Array) {
    if (!buffer) {
      throw new Error("Buffer cannot be undefined or null.");
    }

    if (!(buffer instanceof Uint8Array)) {
      throw new Error("Buffer must be an instance of Uint8Array.");
    }
  }

  private validData(data: PacketData<T>) {
    for (const key in this.#schema) {
      const rule = this.#schema[key];

      this.validValue(rule, data[key]);
    }
  }

  validKey<K extends keyof T>(key: K) {
    if (!key) {
      throw new Error("Key cannot be undefined or null.");
    }

    if (typeof key !== "string" || !(key in this.#schema)) {
      throw new Error(`Invalid key type or key does not exist in the schema.`);
    }
  }

  validBoolean(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error(`Expected boolean but received ${typeof value}.`);
    }
  }

  validString(value: string) {
    if (typeof value !== "string") {
      throw new Error(`Expected string but received ${typeof value}.`);
    }
  }

  validNumber(value: number, rule: PrimitiveNumber = "int32") {
    if (typeof value !== "number") {
      throw new Error(`Expected number but received ${typeof value}.`);
    }
  }

  validEnum(value: Packet<any>, ruleEnum: PacketType<any>[]) {
    if (!(value instanceof Packet)) {
      throw new Error();
    }

    if (ruleEnum.every((rule) => rule === value.type)) {
      throw new Error();
    }
  }

  validValue<K extends keyof T>(rule: PacketRule, value: PacketDataValue<T[K]>) {
    if (value === undefined || value === null) {
      throw new Error(`Value cannot be undefined or null.`);
    }

    if (Array.isArray(rule)) {
      if (rule.length > 1) {
        this.validEnum(value as Packet<any>, rule as PacketType<any>[]);
      } else if (rule.length === 1) {
        const type = rule[0];
        const list = value as PacketDataValue<T[keyof T]>[];
        const length = list.length;

        for (let i = 0; i < length; i++) {
          this.validValue(type, list[i]);
        }
      }
    } else {
      if (rule instanceof PacketType) {
        rule.validPacket(value as Packet<any>);
      } else if (rule === PRIMITIVE_STRING) {
        this.validString(value as string);
      } else if (rule === PRIMITIVE_BOOLEAN) {
        this.validBoolean(value as boolean);
      } else if (PRIMITIVE_NUMBER.includes(rule)) {
        this.validNumber(value as number, rule);
      }
    }
  }

  private empty() {
    const data = {} as PacketData<T>;

    for (const key in this.#schema) {
      const rule = this.#schema[key];

      if (Array.isArray(rule)) {
        if (rule.length > 1) {
          const packetType = rule[0] as PacketType<any>;
          data[key] = packetType.create() as PacketDataValue<T[keyof T]>;
        } else if (rule.length === 1) {
          data[key] = [] as any;
        }
      } else {
        if (rule instanceof PacketType) {
          data[key] = rule.create() as PacketDataValue<T[keyof T]>;
        } else if (rule === PRIMITIVE_STRING) {
          data[key] = "" as PacketDataValue<T[keyof T]>;
        } else if (rule === PRIMITIVE_BOOLEAN) {
          data[key] = false as PacketDataValue<T[keyof T]>;
        } else if (PRIMITIVE_NUMBER.includes(rule)) {
          data[key] = 0 as PacketDataValue<T[keyof T]>;
        }
      }
    }

    return data;
  }

  decode(packet: Packet<T>) {
    this.validPacket(packet);

    return packet.writeBuffer();
  }

  encode(buffer: Uint8Array) {
    this.validBuffer(buffer);

    return this.create().readBuffer(buffer);
  }

  create(data?: PacketData<T>) {
    if (data) {
      this.validData(data);
    } else {
      data = this.empty();
    }

    return new this.#type(this, data);
  }
}

abstract class Packet<T extends PacketSchema> {
  #type: PacketType<T>;
  #data: PacketData<T>;
  #buffer: Uint8Array;
  #offset: number;
  #removeBuffer: boolean;

  // Returns the packet type
  get type() {
    return this.#type;
  }

  // Returns the packet data
  get data() {
    return this.#data;
  }

  constructor(type: PacketType<T>, data: PacketData<T>) {
    this.#type = type;
    this.#data = data;
    this.#buffer = new Uint8Array(255);
    this.#offset = 0;
    this.#removeBuffer = true;
  }

  // Creates a new PacketType with the given schema
  static create<T extends PacketSchema>(schema: T) {
    const type = class extends Packet<T> {};
    return new PacketType(type, schema);
  }

  // Sets a value for a specific key in the packet data
  set<K extends keyof T>(key: K, value: PacketDataValue<T[K]>) {
    this.#type.validKey(key);
    this.#type.validValue(this.#type.schema[key], value);
    this.#data[key] = value;
  }

  // Gets a value for a specific key in the packet data
  get<K extends keyof T>(key: K): PacketDataValue<T[K]> {
    this.#type.validKey(key);
    return this.#data[key];
  }

  private ensureBufferCapacity(size: number) {
    if (this.#offset + size > this.#buffer.length) {
      const buffer = new Uint8Array(this.#buffer.length * 2);
      buffer.set(this.#buffer);
      this.#buffer = buffer;
    }
  }

  private writeBufferPacket(value: Packet<any>) {
    const buffer = value.writeBuffer();
    this.ensureBufferCapacity(buffer.length);
    this.#buffer.set(buffer, this.#offset);
    this.#offset += buffer.length;
  }

  private writeBufferBoolean(value: boolean) {
    this.ensureBufferCapacity(1);
    this.#buffer[this.#offset] = value ? 1 : 0;
    this.#offset += 1;
  }

  private writeBufferString(value: string) {
    const bufferString = new TextEncoder().encode(value);

    this.ensureBufferCapacity(1);
    this.#buffer[this.#offset] = bufferString.length;
    this.#offset += 1;

    this.ensureBufferCapacity(bufferString.length);
    this.#buffer.set(bufferString, this.#offset);
    this.#offset += bufferString.length;
  }

  private writeBufferNumber(value: number, rule: PrimitiveNumber = "int32") {
    switch (rule) {
      case "uint32":
        this.ensureBufferCapacity(4);
        this.#buffer[this.#offset] = (value >>> 24) & 0xff;
        this.#buffer[this.#offset + 1] = (value >>> 16) & 0xff;
        this.#buffer[this.#offset + 2] = (value >>> 8) & 0xff;
        this.#buffer[this.#offset + 3] = value & 0xff;
        this.#offset += 4;
        break;
      case "uint16":
        this.ensureBufferCapacity(2);
        this.#buffer[this.#offset] = (value >>> 8) & 0xff;
        this.#buffer[this.#offset + 1] = value & 0xff;
        this.#offset += 2;
        break;
      case "uint8":
        this.ensureBufferCapacity(1);
        this.#buffer[this.#offset] = value & 0xff;
        this.#offset += 1;
        break;
      case "int32":
        this.ensureBufferCapacity(4);
        this.#buffer[this.#offset] = (value >>> 24) & 0xff;
        this.#buffer[this.#offset + 1] = (value >>> 16) & 0xff;
        this.#buffer[this.#offset + 2] = (value >>> 8) & 0xff;
        this.#buffer[this.#offset + 3] = value & 0xff;
        this.#offset += 4;
        break;
      case "int16":
        this.ensureBufferCapacity(2);
        this.#buffer[this.#offset] = (value >>> 8) & 0xff;
        this.#buffer[this.#offset + 1] = value & 0xff;
        this.#offset += 2;
        break;
      case "int8":
        this.ensureBufferCapacity(1);
        this.#buffer[this.#offset] = value & 0xff;
        this.#offset += 1;
        break;
    }
  }

  private writeBufferEnum(value: Packet<any>, ruleEnum: PacketType<any>[]) {
    const index = ruleEnum.findIndex((rule) => rule === value.type);
    this.writeBufferNumber(index, "uint8");
    this.writeBufferPacket(value);
  }

  private writeBufferValue<K extends keyof T>(value: PacketDataValue<T[K]>, rule: PacketRule) {
    if (Array.isArray(rule)) {
      if (rule.length > 1) {
        return this.writeBufferEnum(value as Packet<any>, rule as PacketType<any>[]);
      } else if (rule.length === 1) {
        const list = value as PacketDataValue<T[keyof T]>[];
        const length = list.length;

        this.writeBufferNumber(length, "uint8");

        for (let i = 0; i < length; i++) {
          this.writeBufferValue(list[i], rule[0]);
        }

        return;
      }
    } else {
      if (rule instanceof PacketType) {
        return this.writeBufferPacket(value as Packet<any>);
      } else if (rule === PRIMITIVE_STRING) {
        return this.writeBufferString(value as string);
      } else if (rule === PRIMITIVE_BOOLEAN) {
        return this.writeBufferBoolean(value as boolean);
      } else if (PRIMITIVE_NUMBER.includes(rule)) {
        return this.writeBufferNumber(value as number, rule);
      }
    }

    throw new Error(`Unsupported value.`);
  }

  writeBuffer(): Uint8Array {
    if (this.#removeBuffer) {
      this.#offset = 0;

      for (const key in this.#type.schema) {
        const rule = this.#type.schema[key];
        const value = this.#data[key];

        this.writeBufferValue(value, rule);
      }

      this.#removeBuffer = false;
    }

    return this.#buffer.subarray(0, this.#offset);
  }

  private readBufferPacket(packetType: PacketType<any>) {
    const packet = packetType.encode(this.#buffer.subarray(this.#offset));
    this.#offset += packet.#offset;
    return packet;
  }

  private readBufferBoolean() {
    const value = this.#buffer[this.#offset] == 1;
    this.#offset += 1;
    return value;
  }

  private readBufferString() {
    const lengthBuffer = this.#buffer[this.#offset];
    this.#offset += 1;

    const textBuffer = this.#buffer.subarray(this.#offset, this.#offset + lengthBuffer);
    this.#offset += lengthBuffer;

    return new TextDecoder().decode(textBuffer);
  }

  private readBufferNumber(rule: PrimitiveNumber) {
    let value = 0;

    switch (rule) {
      case "uint32":
        value =
          (this.#buffer[this.#offset] << 24) |
          (this.#buffer[this.#offset + 1] << 16) |
          (this.#buffer[this.#offset + 2] << 8) |
          this.#buffer[this.#offset + 3];
        this.#offset += 4;
        break;
      case "uint16":
        value = (this.#buffer[this.#offset] << 8) | this.#buffer[this.#offset + 1];
        this.#offset += 2;
        break;
      case "uint8":
        value = this.#buffer[this.#offset];
        this.#offset += 1;
        break;
      case "int32":
        value =
          (this.#buffer[this.#offset] << 24) |
          (this.#buffer[this.#offset + 1] << 16) |
          (this.#buffer[this.#offset + 2] << 8) |
          this.#buffer[this.#offset + 3];
        value = value >> 0;
        this.#offset += 4;
        break;
      case "int16":
        value = (this.#buffer[this.#offset] << 8) | this.#buffer[this.#offset + 1];
        value = value >> 0;
        this.#offset += 2;
        break;
      case "int8":
        value = this.#buffer[this.#offset];
        this.#offset += 1;
        break;
    }

    return value;
  }

  private readBufferEnum(ruleEnum: PacketType<any>[]) {
    const index = this.readBufferNumber("uint8");
    const rule = ruleEnum[index];
    return this.readBufferPacket(rule);
  }

  private readBufferValue(rule: PacketRule) {
    if (Array.isArray(rule)) {
      if (rule.length > 1) {
        return this.readBufferEnum(rule as PacketType<any>[]);
      } else if (rule.length === 1) {
        const type = rule[0];
        const length = this.readBufferNumber("uint8");
        const value = [] as (string | number | boolean | Packet<any>)[];

        for (let i = 0; i < length; i++) {
          value.push(this.readBufferValue(type) as string | number | boolean | Packet<any>);
        }

        return value;
      }
    } else {
      if (rule instanceof PacketType) {
        return this.readBufferPacket(rule);
      } else if (rule === PRIMITIVE_STRING) {
        return this.readBufferString();
      } else if (rule === PRIMITIVE_BOOLEAN) {
        return this.readBufferBoolean();
      } else if (PRIMITIVE_NUMBER.includes(rule)) {
        return this.readBufferNumber(rule);
      }
    }

    throw new Error(`Unsupported value.`);
  }

  readBuffer(buffer: Uint8Array): Packet<T> {
    this.#removeBuffer = false;
    this.#buffer = buffer;
    this.#offset = 0;

    for (const key in this.#type.schema) {
      const rule = this.#type.schema[key];
      const value = this.readBufferValue(rule) as PacketDataValue<T[keyof T]>;
      this.#data[key] = value;
    }

    return this;
  }

  removeBuffer() {
    this.#removeBuffer = true;
  }

  toJSON() {
    const data = Object.assign({}, this.#data);

    for (const key in data) {
      const value = data[key];

      if (value instanceof Packet) {
        //@ts-ignore
        data[key] = value.toJSON();
      } else if (Array.isArray(value)) {
        for (const i in value) {
          const subValue = value[i];

          if (subValue instanceof Packet) {
            //@ts-ignore
            value[i] = subValue.toJSON();
          }
        }
      }
    }

    return data as PacketRaw<typeof data>;
  }
}

export {
  PacketType,
  type PacketData,
  type PacketGet,
  type PacketRule,
  type PacketSchema,
  type PacketDataValue,
};
export default Packet;
