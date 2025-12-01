import { lvAssert } from '@/bedrock/assert';
import { Emitter, type Event } from '@/bedrock/event';

//
// 资源对应的是标准库中的 unsigned state 以及相关的位运算
// 我们用两个具体的Capability结构实现（Capability命名来源于标准库）
//

/**
 * 资源状态
 */
export enum CapabilityStatus {
  Unlocked,
  Locked,
}

/**
 * 独享的资源
 *
 * acquire 获取控制权
 * release 释放控制权
 */
export class Capability {
  public onUnlocked: Event<[]>;

  private readonly _onUnlocked = new Emitter<[]>();
  private _status = CapabilityStatus.Unlocked;

  constructor() {
    this.onUnlocked = this._onUnlocked.event;
  }

  get status(): CapabilityStatus {
    return this._status;
  }

  public acquire(): void {
    lvAssert(this._status === CapabilityStatus.Unlocked);
    this._status = CapabilityStatus.Locked;
  }

  public release(): void {
    lvAssert(this._status === CapabilityStatus.Locked);
    this._status = CapabilityStatus.Unlocked;
    this._onUnlocked.fire();
  }
}

/**
 * 共享的资源
 *
 * acquire 获取控制权
 * release 释放控制权
 */
export class SharedCapability {
  public onUnlocked: Event<[]>;

  private readonly _onUnlocked = new Emitter<[]>();
  private _status = CapabilityStatus.Unlocked;
  private _counter = 0;

  constructor() {
    this.onUnlocked = this._onUnlocked.event;
  }

  get status(): CapabilityStatus {
    return this._status;
  }

  get counter(): number {
    return this._counter;
  }

  public acquire() {
    if (this._status === CapabilityStatus.Unlocked) {
      this._status = CapabilityStatus.Locked;
    }
    this._counter++;
  }

  public release() {
    lvAssert(this._counter > 0);
    this._counter--;
    if (this._counter === 0) {
      this._status = CapabilityStatus.Unlocked;
      this._onUnlocked.fire();
    }
  }
}
