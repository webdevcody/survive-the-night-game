import { ClientEntity } from "@/entities/client-entity";
import { ClientExtension } from "./types";
import { BufferReader } from "@shared/util/buffer-serialization";

export abstract class BaseClientExtension implements ClientExtension {
  constructor(protected readonly clientEntity: ClientEntity) {}

  public getClientEntity(): ClientEntity {
    return this.clientEntity;
  }

  public abstract deserializeFromBuffer(reader: BufferReader): this;
}
