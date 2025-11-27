import { Barrier } from '@/bedrock/async';

export abstract class AbstractJob<T, K extends T = T> {
  protected abstract _name: string;
  protected _store: Map<K, Barrier[]> = new Map();

  get name() {
    return this._name;
  }

  shouldWait(phase: K) {
    const barriers = this._store.get(phase);
    if (!barriers?.length) {
      return false;
    }
    return true;
  }

  wait(phase: K): Promise<void> {
    try {
      const barriers = this._store.get(phase);
      if (!barriers?.length) {
        return Promise.resolve();
      }
      return Promise.all(barriers.map((barrier) => barrier.wait())) as unknown as Promise<void>;
    } finally {
      // 执行之后就清空，确保失败或cancel态时可以重复 prepare.
      this._store.delete(phase);
    }
  }

  prepare(phase: K) {
    this._executePhase(phase);
  }

  protected _setBarrier(phase: K, barrier: Barrier) {
    if (!this._store.has(phase)) {
      this._store.set(phase, []);
    }
    const barriers = this._store.get(phase)!;
    barriers.push(barrier);
  }

  protected abstract _executePhase(phase: K): void;
}
