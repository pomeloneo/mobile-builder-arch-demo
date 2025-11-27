import type { Event } from '@/kernel/event';
import { Emitter } from '@/kernel/event';

/**
 * 信号
 *
 * 用来模拟标准库的condition_variable
 * 提供监听某个信号被激活的能力
 */
export class Semaphore {
  public onActive: Event<[]>;
  private readonly _onActive = new Emitter<[]>();

  constructor() {
    this.onActive = this._onActive.event;
  }

  public notify(): void {
    this._onActive.fire();
  }
}
