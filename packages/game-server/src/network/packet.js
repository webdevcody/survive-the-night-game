var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _PacketType_type, _PacketType_schema, _Packet_type, _Packet_data, _Packet_buffer, _Packet_offset, _Packet_removeBuffer;
const PRIMITIVE_STRING = "string";
const PRIMITIVE_BOOLEAN = "boolean";
const PRIMITIVE_NUMBER = ["int32", "int16", "int8", "uint32", "uint16", "uint8"];
const PRIMITIVE_RULE = [PRIMITIVE_STRING, PRIMITIVE_BOOLEAN, ...PRIMITIVE_NUMBER];
class PacketType {
    // Returns the schema of the packet type
    get schema() {
        return __classPrivateFieldGet(this, _PacketType_schema, "f");
    }
    constructor(type, schema) {
        _PacketType_type.set(this, void 0);
        _PacketType_schema.set(this, void 0);
        this.validSchema(schema);
        __classPrivateFieldSet(this, _PacketType_type, type, "f");
        __classPrivateFieldSet(this, _PacketType_schema, schema, "f");
    }
    // Validates individual packet rule
    validRule(rule, ruleEnum = false) {
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
        }
        else {
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
    validSchema(schema) {
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
    validPacket(packet) {
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
    validBuffer(buffer) {
        if (!buffer) {
            throw new Error("Buffer cannot be undefined or null.");
        }
        if (!(buffer instanceof Uint8Array)) {
            throw new Error("Buffer must be an instance of Uint8Array.");
        }
    }
    validData(data) {
        for (const key in __classPrivateFieldGet(this, _PacketType_schema, "f")) {
            const rule = __classPrivateFieldGet(this, _PacketType_schema, "f")[key];
            this.validValue(rule, data[key]);
        }
    }
    validKey(key) {
        if (!key) {
            throw new Error("Key cannot be undefined or null.");
        }
        if (typeof key !== "string" || !(key in __classPrivateFieldGet(this, _PacketType_schema, "f"))) {
            throw new Error(`Invalid key type or key does not exist in the schema.`);
        }
    }
    validBoolean(value) {
        if (typeof value !== "boolean") {
            throw new Error(`Expected boolean but received ${typeof value}.`);
        }
    }
    validString(value) {
        if (typeof value !== "string") {
            throw new Error(`Expected string but received ${typeof value}.`);
        }
    }
    validNumber(value, rule = "int32") {
        if (typeof value !== "number") {
            throw new Error(`Expected number but received ${typeof value}.`);
        }
    }
    validEnum(value, ruleEnum) {
        if (!(value instanceof Packet)) {
            throw new Error();
        }
        if (ruleEnum.every((rule) => rule === value.type)) {
            throw new Error();
        }
    }
    validValue(rule, value) {
        if (value === undefined || value === null) {
            throw new Error(`Value cannot be undefined or null.`);
        }
        if (Array.isArray(rule)) {
            if (rule.length > 1) {
                this.validEnum(value, rule);
            }
            else if (rule.length === 1) {
                const type = rule[0];
                const list = value;
                const length = list.length;
                for (let i = 0; i < length; i++) {
                    this.validValue(type, list[i]);
                }
            }
        }
        else {
            if (rule instanceof PacketType) {
                rule.validPacket(value);
            }
            else if (rule === PRIMITIVE_STRING) {
                this.validString(value);
            }
            else if (rule === PRIMITIVE_BOOLEAN) {
                this.validBoolean(value);
            }
            else if (PRIMITIVE_NUMBER.includes(rule)) {
                this.validNumber(value, rule);
            }
        }
    }
    empty() {
        const data = {};
        for (const key in __classPrivateFieldGet(this, _PacketType_schema, "f")) {
            const rule = __classPrivateFieldGet(this, _PacketType_schema, "f")[key];
            if (Array.isArray(rule)) {
                if (rule.length > 1) {
                    const packetType = rule[0];
                    data[key] = packetType.create();
                }
                else if (rule.length === 1) {
                    data[key] = [];
                }
            }
            else {
                if (rule instanceof PacketType) {
                    data[key] = rule.create();
                }
                else if (rule === PRIMITIVE_STRING) {
                    data[key] = "";
                }
                else if (rule === PRIMITIVE_BOOLEAN) {
                    data[key] = false;
                }
                else if (PRIMITIVE_NUMBER.includes(rule)) {
                    data[key] = 0;
                }
            }
        }
        return data;
    }
    decode(packet) {
        this.validPacket(packet);
        return packet.writeBuffer();
    }
    encode(buffer) {
        this.validBuffer(buffer);
        return this.create().readBuffer(buffer);
    }
    create(data) {
        if (data) {
            this.validData(data);
        }
        else {
            data = this.empty();
        }
        return new (__classPrivateFieldGet(this, _PacketType_type, "f"))(this, data);
    }
}
_PacketType_type = new WeakMap(), _PacketType_schema = new WeakMap();
class Packet {
    // Returns the packet type
    get type() {
        return __classPrivateFieldGet(this, _Packet_type, "f");
    }
    // Returns the packet data
    get data() {
        return __classPrivateFieldGet(this, _Packet_data, "f");
    }
    constructor(type, data) {
        _Packet_type.set(this, void 0);
        _Packet_data.set(this, void 0);
        _Packet_buffer.set(this, void 0);
        _Packet_offset.set(this, void 0);
        _Packet_removeBuffer.set(this, void 0);
        __classPrivateFieldSet(this, _Packet_type, type, "f");
        __classPrivateFieldSet(this, _Packet_data, data, "f");
        __classPrivateFieldSet(this, _Packet_buffer, new Uint8Array(255), "f");
        __classPrivateFieldSet(this, _Packet_offset, 0, "f");
        __classPrivateFieldSet(this, _Packet_removeBuffer, true, "f");
    }
    // Creates a new PacketType with the given schema
    static create(schema) {
        const type = class extends Packet {
        };
        return new PacketType(type, Object.assign({}, schema));
    }
    // Sets a value for a specific key in the packet data
    set(key, value) {
        __classPrivateFieldGet(this, _Packet_type, "f").validKey(key);
        __classPrivateFieldGet(this, _Packet_type, "f").validValue(__classPrivateFieldGet(this, _Packet_type, "f").schema[key], value);
        __classPrivateFieldGet(this, _Packet_data, "f")[key] = value;
    }
    // Gets a value for a specific key in the packet data
    get(key) {
        __classPrivateFieldGet(this, _Packet_type, "f").validKey(key);
        return __classPrivateFieldGet(this, _Packet_data, "f")[key];
    }
    ensureBufferCapacity(size) {
        if (__classPrivateFieldGet(this, _Packet_offset, "f") + size > __classPrivateFieldGet(this, _Packet_buffer, "f").length) {
            const buffer = new Uint8Array(__classPrivateFieldGet(this, _Packet_buffer, "f").length * 2);
            buffer.set(__classPrivateFieldGet(this, _Packet_buffer, "f"));
            __classPrivateFieldSet(this, _Packet_buffer, buffer, "f");
        }
    }
    writeBufferPacket(value) {
        const buffer = value.writeBuffer();
        this.ensureBufferCapacity(buffer.length);
        __classPrivateFieldGet(this, _Packet_buffer, "f").set(buffer, __classPrivateFieldGet(this, _Packet_offset, "f"));
        __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + buffer.length, "f");
    }
    writeBufferBoolean(value) {
        this.ensureBufferCapacity(1);
        __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] = value ? 1 : 0;
        __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 1, "f");
    }
    writeBufferString(value) {
        const bufferString = new TextEncoder().encode(value);
        this.ensureBufferCapacity(1);
        __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] = bufferString.length;
        __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 1, "f");
        this.ensureBufferCapacity(bufferString.length);
        __classPrivateFieldGet(this, _Packet_buffer, "f").set(bufferString, __classPrivateFieldGet(this, _Packet_offset, "f"));
        __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + bufferString.length, "f");
    }
    writeBufferNumber(value, rule = "int32") {
        switch (rule) {
            case "uint32":
                this.ensureBufferCapacity(4);
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] = (value >>> 24) & 0xff;
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 1] = (value >>> 16) & 0xff;
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 2] = (value >>> 8) & 0xff;
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 3] = value & 0xff;
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 4, "f");
                break;
            case "uint16":
                this.ensureBufferCapacity(2);
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] = (value >>> 8) & 0xff;
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 1] = value & 0xff;
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 2, "f");
                break;
            case "uint8":
                this.ensureBufferCapacity(1);
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] = value & 0xff;
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 1, "f");
                break;
            case "int32":
                this.ensureBufferCapacity(4);
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] = (value >>> 24) & 0xff;
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 1] = (value >>> 16) & 0xff;
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 2] = (value >>> 8) & 0xff;
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 3] = value & 0xff;
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 4, "f");
                break;
            case "int16":
                this.ensureBufferCapacity(2);
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] = (value >>> 8) & 0xff;
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 1] = value & 0xff;
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 2, "f");
                break;
            case "int8":
                this.ensureBufferCapacity(1);
                __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] = value & 0xff;
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 1, "f");
                break;
        }
    }
    writeBufferEnum(value, ruleEnum) {
        const index = ruleEnum.findIndex((rule) => rule === value.type);
        this.writeBufferNumber(index, "uint8");
        this.writeBufferPacket(value);
    }
    writeBufferValue(value, rule) {
        if (Array.isArray(rule)) {
            if (rule.length > 1) {
                return this.writeBufferEnum(value, rule);
            }
            else if (rule.length === 1) {
                const list = value;
                const length = list.length;
                this.writeBufferNumber(length, "uint8");
                for (let i = 0; i < length; i++) {
                    this.writeBufferValue(list[i], rule[0]);
                }
                return;
            }
        }
        else {
            if (rule instanceof PacketType) {
                return this.writeBufferPacket(value);
            }
            else if (rule === PRIMITIVE_STRING) {
                return this.writeBufferString(value);
            }
            else if (rule === PRIMITIVE_BOOLEAN) {
                return this.writeBufferBoolean(value);
            }
            else if (PRIMITIVE_NUMBER.includes(rule)) {
                return this.writeBufferNumber(value, rule);
            }
        }
        throw new Error(`Unsupported value.`);
    }
    writeBuffer() {
        if (__classPrivateFieldGet(this, _Packet_removeBuffer, "f")) {
            __classPrivateFieldSet(this, _Packet_offset, 0, "f");
            for (const key in __classPrivateFieldGet(this, _Packet_type, "f").schema) {
                const rule = __classPrivateFieldGet(this, _Packet_type, "f").schema[key];
                const value = __classPrivateFieldGet(this, _Packet_data, "f")[key];
                this.writeBufferValue(value, rule);
            }
            __classPrivateFieldSet(this, _Packet_removeBuffer, false, "f");
        }
        return __classPrivateFieldGet(this, _Packet_buffer, "f").subarray(0, __classPrivateFieldGet(this, _Packet_offset, "f"));
    }
    readBufferPacket(packetType) {
        const packet = packetType.encode(__classPrivateFieldGet(this, _Packet_buffer, "f").subarray(__classPrivateFieldGet(this, _Packet_offset, "f")));
        __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + __classPrivateFieldGet(packet, _Packet_offset, "f"), "f");
        return packet;
    }
    readBufferBoolean() {
        const value = __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] == 1;
        __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 1, "f");
        return value;
    }
    readBufferString() {
        const lengthBuffer = __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")];
        __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 1, "f");
        const textBuffer = __classPrivateFieldGet(this, _Packet_buffer, "f").subarray(__classPrivateFieldGet(this, _Packet_offset, "f"), __classPrivateFieldGet(this, _Packet_offset, "f") + lengthBuffer);
        __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + lengthBuffer, "f");
        return new TextDecoder().decode(textBuffer);
    }
    readBufferNumber(rule) {
        let value = 0;
        switch (rule) {
            case "uint32":
                value =
                    (__classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] << 24) |
                        (__classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 1] << 16) |
                        (__classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 2] << 8) |
                        __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 3];
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 4, "f");
                break;
            case "uint16":
                value = (__classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] << 8) | __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 1];
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 2, "f");
                break;
            case "uint8":
                value = __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")];
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 1, "f");
                break;
            case "int32":
                value =
                    (__classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] << 24) |
                        (__classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 1] << 16) |
                        (__classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 2] << 8) |
                        __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 3];
                value = value >> 0;
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 4, "f");
                break;
            case "int16":
                value = (__classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")] << 8) | __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f") + 1];
                value = value >> 0;
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 2, "f");
                break;
            case "int8":
                value = __classPrivateFieldGet(this, _Packet_buffer, "f")[__classPrivateFieldGet(this, _Packet_offset, "f")];
                __classPrivateFieldSet(this, _Packet_offset, __classPrivateFieldGet(this, _Packet_offset, "f") + 1, "f");
                break;
        }
        return value;
    }
    readBufferEnum(ruleEnum) {
        const index = this.readBufferNumber("uint8");
        const rule = ruleEnum[index];
        return this.readBufferPacket(rule);
    }
    readBufferValue(rule) {
        if (Array.isArray(rule)) {
            if (rule.length > 1) {
                return this.readBufferEnum(rule);
            }
            else if (rule.length === 1) {
                const type = rule[0];
                const length = this.readBufferNumber("uint8");
                const value = [];
                for (let i = 0; i < length; i++) {
                    value.push(this.readBufferValue(type));
                }
                return value;
            }
        }
        else {
            if (rule instanceof PacketType) {
                return this.readBufferPacket(rule);
            }
            else if (rule === PRIMITIVE_STRING) {
                return this.readBufferString();
            }
            else if (rule === PRIMITIVE_BOOLEAN) {
                return this.readBufferBoolean();
            }
            else if (PRIMITIVE_NUMBER.includes(rule)) {
                return this.readBufferNumber(rule);
            }
        }
        throw new Error(`Unsupported value.`);
    }
    readBuffer(buffer) {
        __classPrivateFieldSet(this, _Packet_removeBuffer, false, "f");
        __classPrivateFieldSet(this, _Packet_buffer, buffer, "f");
        __classPrivateFieldSet(this, _Packet_offset, 0, "f");
        for (const key in __classPrivateFieldGet(this, _Packet_type, "f").schema) {
            const rule = __classPrivateFieldGet(this, _Packet_type, "f").schema[key];
            const value = this.readBufferValue(rule);
            __classPrivateFieldGet(this, _Packet_data, "f")[key] = value;
        }
        return this;
    }
    removeBuffer() {
        __classPrivateFieldSet(this, _Packet_removeBuffer, true, "f");
    }
    toJSON() {
        const data = Object.assign({}, __classPrivateFieldGet(this, _Packet_data, "f"));
        for (const key in data) {
            const value = data[key];
            if (value instanceof Packet) {
                //@ts-ignore
                data[key] = value.toJSON();
            }
            else if (Array.isArray(value)) {
                for (const i in value) {
                    const subValue = value[i];
                    if (subValue instanceof Packet) {
                        //@ts-ignore
                        value[i] = subValue.toJSON();
                    }
                }
            }
        }
        return data;
    }
}
_Packet_type = new WeakMap(), _Packet_data = new WeakMap(), _Packet_buffer = new WeakMap(), _Packet_offset = new WeakMap(), _Packet_removeBuffer = new WeakMap();
export { PacketType };
export default Packet;
