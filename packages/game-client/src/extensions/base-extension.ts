import { ClientEntity } from "@/entities/client-entity";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export abstract class BaseClientExtension implements ClientExtension {
  constructor(protected readonly clientEntity: ClientEntity) {}

  public getClientEntity(): ClientEntity {
    return this.clientEntity;
  }

  public abstract deserialize(data: ClientExtensionSerialized): this;
}
