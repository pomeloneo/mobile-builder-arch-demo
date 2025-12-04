import { Logger } from '@/bedrock/_internal/logger';
import { lvAssertNotNil } from '@/bedrock/assert';
import { DisposableStore } from './disposable-store';
import type { IDisposable } from './dispose-base';
import { BRANCH_DISPOSE } from './logger';
import { MARK_AS_DISPOSED, SET_PARENT_OF_DISPOSABLE, TRACK_DISPOSABLE } from './tracker';

//
// Disposable基类
//
// 自动添加DisposableStore，提供默认的dispose和register方法
//
export abstract class Disposable implements IDisposable {
  protected readonly _store = new DisposableStore();

  constructor() {
    TRACK_DISPOSABLE(this);
    SET_PARENT_OF_DISPOSABLE(this._store, this);
  }

  // 销毁该节点和所有的子节点
  dispose(): void {
    MARK_AS_DISPOSED(this);
    BRANCH_DISPOSE(this.constructor.name, this._store.constructor.name);

    this._store.dispose();
  }

  // 挂载子节点
  protected _register<T extends IDisposable>(o: T): T {
    if ((o as unknown as Disposable) === this) {
      throw new Error('Cannot register a disposable on itself!');
    }
    return this._store.add(o);
  }
}

/**
 * 容器类
 * 提供一个容器，容器内部的IDisposable对象可以切换更新，每次更新的时候，旧的IDisposable对象会自动进行dispose
 *
 * 使用方式:
 * class Foo {
 *   private readonly _barRef: MutableDisposable;
 *
 *   toggle() {
 *     this._barRef.setValue(new Bar());
 *   }
 *
 *   doSomething() {
 *     this._barRef.value.xxx();
 *   }
 * }
 */
export class MutableDisposable<T extends IDisposable> implements IDisposable {
  private _value?: T;
  private _isDisposed = false;

  constructor(value?: T) {
    TRACK_DISPOSABLE(this);
    this.value = value;
  }

  get value(): T | undefined {
    return this._isDisposed ? undefined : this._value;
  }

  set value(value: T | undefined) {
    if (this._isDisposed || value === this._value) {
      return;
    }

    this._value?.dispose();
    if (value) {
      SET_PARENT_OF_DISPOSABLE(value, this);
    }
    this._value = value;
  }

  clear(): void {
    this.value = undefined;
  }

  dispose(): void {
    this._isDisposed = true;
    MARK_AS_DISPOSED(this);
    this._value?.dispose();
    this._value = undefined;
  }

  release(): T | undefined {
    const oldValue = this._value;
    this._value = undefined;
    if (oldValue) {
      SET_PARENT_OF_DISPOSABLE(oldValue, null);
    }
    return oldValue;
  }
}

/**
 * 容器类
 * 通过该容器进行dispose试，可以保证内部的IDisposable一会进行一次dispose
 * 本质是一种防御性质的处理，如果需要使用时，最好有明确的理由
 */
export class SafeDisposable<T extends IDisposable> implements IDisposable {
  private _value?: T;

  constructor(value: T) {
    this._value = value;
    TRACK_DISPOSABLE(this);
  }

  get value(): T | undefined {
    return this._value;
  }

  isEmpty() {
    return this._value === undefined;
  }

  dispose() {
    if (!this._value) {
      return;
    }
    this._value.dispose();
    this._value = undefined;
    MARK_AS_DISPOSED(this);
  }
}

/**
 * 容器类
 * 引用计数容器，当引用为0时自动执行dispose
 * 注意：初始计数为1，默认构造的地方自动获得引用，如果在栈上构造，记得最后调用release
 *
 * 使用实例:
 * class Foo {
 *   private _bar: RefCountedDisposable = new RefCountedDisposable(new Bar());
 *
 *   getBar() {
 *     this._bar.acquire();
 *     return this._bar;
 *   }
 * }
 *
 * // 如果在栈上构造
 * const bar = new RefCountedDisposable(new Bar());
 * makeFoo(bar);
 * makeFoo(bar);
 * bar.release();
 */
export class RefCountedDisposable<T extends IDisposable> implements IDisposable {
  private _counter: number = 1;
  private _value?: T;

  constructor(value: T) {
    this._value = value;
    TRACK_DISPOSABLE(this);
  }

  get value(): T | undefined {
    return this._value;
  }

  acquire() {
    if (!this._value) {
      return this;
    }
    this._counter++;
    return this;
  }

  release() {
    if (--this._counter === 0) {
      this._value!.dispose();
      this._value = undefined;
      MARK_AS_DISPOSED(this);
    }
    return this;
  }

  dispose() {
    this.release();
  }
}

/**
 * 容器类，表示了一个T生命周期的转移
 *
 * 由于js引用传递的特性，正常情况下，我们默认为传递过来的对象不具备dispose权利
 * class Foo extends Disposable {
 *   private readonly _bar = new Bar();
 *
 *   constructor(
 *     thirdparty: Thirdparty,
 *   ) {
 *     this._register(this._bar);  // class内部构造的，具备dispose权利
 *     this._register(thirdparty);  // ❌，很少会直接这么写，除非能很确定存在生命周期转移
 *   }
 *
 *   constructor(
 *     thirdparty: TransferDisposable<Thirdparty>,  // ✅，明确表示了我依赖了Thirdparty，但是该对象生命周期要归我所有
 *   ) {
 *     this._register(this._bar);
 *     this._register(thirdparty.release());  // ✅，可以直接register
 *   }
 * }
 *
 */
export class TransferDisposable<T extends IDisposable> extends Disposable {
  private _val?: T;

  constructor(val: T) {
    super();

    this._val = val;
  }

  release() {
    // 只能release一次
    lvAssertNotNil(this._val);
    const v = this._val;
    this._val = undefined;
    return v;
  }

  dispose(): void {
    // 虽然它有dispose，但是不应该被执行，应该直接被gc才对
    Logger.warn(new Error('TransferDisposable call dispose.'));
    this._val?.dispose();
    super.dispose();
  }
}
