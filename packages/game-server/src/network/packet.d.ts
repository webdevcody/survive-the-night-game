type PrimitiveNumber = "uint32" | "uint16" | "uint8" | "int32" | "int16" | "int8";
type PrimitiveString = "string";
type PrimitiveBoolean = "boolean";
type PrimitivePacket<T extends PacketSchema> = PacketType<T>;
type PrimitivePacketEnum = [PrimitivePacket<any>, ...PrimitivePacket<any>[]];
type PacketRule = PrimitiveNumber | [PrimitiveNumber] | PrimitiveString | [PrimitiveString] | PrimitiveBoolean | [PrimitiveBoolean] | PrimitivePacket<any> | [PrimitivePacket<any>] | PrimitivePacketEnum;
type PacketSchema = {
    [key: string]: PacketRule;
};
type PacketDataEnum<R extends PrimitivePacketEnum> = R extends [infer T, ...infer Rest] ? T extends PrimitivePacket<infer Schema> ? Packet<Schema> | PacketDataEnum<Rest extends PrimitivePacketEnum ? Rest : never> : never : never;
type PacketDataValue<R extends PacketRule> = R extends PrimitiveNumber ? number : R extends [PrimitiveNumber] ? number[] : R extends PrimitiveString ? string : R extends [PrimitiveString] ? string[] : R extends PrimitiveBoolean ? boolean : R extends [PrimitiveBoolean] ? boolean[] : R extends PrimitivePacket<infer Schema> ? Packet<Schema> : R extends [PrimitivePacket<infer Schema>] ? Packet<Schema>[] : R extends PrimitivePacketEnum ? PacketDataEnum<R> : never;
type PacketData<T extends PacketSchema> = {
    [K in keyof T]: PacketDataValue<T[K]>;
};
type PacketRaw<T extends PacketData<PacketSchema>> = {
    [K in keyof T]: T[K] extends Packet<infer Schema> ? PacketRaw<PacketData<Schema>> : T[K] extends Packet<infer Schema>[] ? PacketRaw<PacketData<Schema>>[] : T[K] extends PrimitivePacketEnum ? PacketRaw<PacketDataEnum<T[K]>> : T[K];
};
declare class PacketType<T extends PacketSchema = {}> {
    #private;
    get schema(): T;
    constructor(type: new (type: PacketType<T>, data: PacketData<T>) => Packet<T>, schema: T);
    private validRule;
    private validSchema;
    private validPacket;
    private validBuffer;
    private validData;
    validKey<K extends keyof T>(key: K): void;
    validBoolean(value: boolean): void;
    validString(value: string): void;
    validNumber(value: number, rule?: PrimitiveNumber): void;
    validEnum(value: Packet<any>, ruleEnum: PacketType<any>[]): void;
    validValue<K extends keyof T>(rule: PacketRule, value: PacketDataValue<T[K]>): void;
    private empty;
    decode(packet: Packet<T>): Uint8Array<ArrayBufferLike>;
    encode(buffer: Uint8Array): Packet<T>;
    create(data?: PacketData<T>): Packet<T>;
}
declare abstract class Packet<T extends PacketSchema> {
    #private;
    get type(): PacketType<T>;
    get data(): PacketData<T>;
    constructor(type: PacketType<T>, data: PacketData<T>);
    static create<T extends PacketSchema>(schema?: T): PacketType<{} & T>;
    set<K extends keyof T>(key: K, value: PacketDataValue<T[K]>): void;
    get<K extends keyof T>(key: K): PacketDataValue<T[K]>;
    private ensureBufferCapacity;
    private writeBufferPacket;
    private writeBufferBoolean;
    private writeBufferString;
    private writeBufferNumber;
    private writeBufferEnum;
    private writeBufferValue;
    writeBuffer(): Uint8Array;
    private readBufferPacket;
    private readBufferBoolean;
    private readBufferString;
    private readBufferNumber;
    private readBufferEnum;
    private readBufferValue;
    readBuffer(buffer: Uint8Array): Packet<T>;
    removeBuffer(): void;
    toJSON(): PacketRaw<PacketData<T>>;
}
export { PacketType, type PacketData, type PacketRule, type PacketSchema, type PacketDataValue };
export default Packet;
