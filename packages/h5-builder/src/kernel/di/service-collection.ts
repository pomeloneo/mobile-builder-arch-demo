import type { ServiceIdentifier } from './base';
import { SyncDescriptor } from './descriptor';
import { ServiceOwnershipCollection } from './service-ownership-collection';
//
// 服务的集合
// key 服务ID
// value 服务的描述符或者是实例
//
export type IServiceCollection = {
  entries?: [ServiceIdentifier<any>, any][];
  ownership?: ServiceOwnershipCollection;
};

export class ServiceCollection {
  private readonly _entries = new Map<ServiceIdentifier<any>, any>();
  private readonly _ownership: ServiceOwnershipCollection | undefined;

  constructor(options?: IServiceCollection) {
    for (const [id, service] of options?.entries || []) {
      this.set(id, service);
    }
    if (options?.ownership) {
      this._ownership = options.ownership;
    }
  }

  get entries() {
    return this._entries;
  }

  get ownerships() {
    return this._ownership?.entries;
  }

  set<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | SyncDescriptor<T>) {
    this._entries.set(id, instanceOrDescriptor);
  }

  has(id: ServiceIdentifier<any>): boolean {
    return this._entries.has(id);
  }

  get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
    return this._entries.get(id);
  }
}
