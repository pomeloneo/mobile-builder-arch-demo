import type { ServiceIdentifier } from './base';

export enum ServiceOwnership {
  Owned = 1, // 单独持有
  Reference = 2, // 引用子父级类型
  // Shared = 3, // 与兄弟节点共同持有
}

//
// 服务的集合
// key 服务ID
// value 服务的描述符或者是实例
//
export class ServiceOwnershipCollection {
  private readonly _entries = new Map<ServiceIdentifier<any>, ServiceOwnership>();

  constructor(...entries: [ServiceIdentifier<any>, ServiceOwnership][]) {
    for (const [id, service] of entries) {
      this.set(id, service);
    }
  }

  get entries() {
    return this._entries;
  }

  set(id: ServiceIdentifier<any>, ownership: ServiceOwnership) {
    this._entries.set(id, ownership);
  }

  has(id: ServiceIdentifier<any>): boolean {
    return this._entries.has(id);
  }

  get(id: ServiceIdentifier<any>): ServiceOwnership | undefined {
    return this._entries.get(id);
  }
}
