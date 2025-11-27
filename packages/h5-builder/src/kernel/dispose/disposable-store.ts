import { Logger } from '@/kernel/_internal/logger';
import type { IDisposable } from './dispose-base';
import { BRANCH_DISPOSE } from './logger';
import { MARK_AS_DISPOSED, SET_PARENT_OF_DISPOSABLE, TRACK_DISPOSABLE } from './tracker';

export class DisposableStore implements IDisposable {
  static DISABLE_DISPOSED_WARNING = false;

  private readonly _toDispose = new Set<IDisposable>();
  private _isDisposed = false;

  constructor() {
    TRACK_DISPOSABLE(this);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      // 不应该出现重复dispose
      Logger.warn(new Error('DisposableStore has disposed.').stack);
      return;
    }

    MARK_AS_DISPOSED(this);
    this._isDisposed = true;
    this.clear();
  }

  clear(): void {
    if (this._toDispose.size === 0) {
      return;
    }

    for (const disposable of this._toDispose) {
      BRANCH_DISPOSE(this.constructor.name, disposable.constructor.name);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: any[] = [];
    for (const disposable of this._toDispose) {
      try {
        disposable.dispose();
      } catch (e) {
        errors.push(e);
      }
    }

    this._toDispose.clear();
    if (errors.length > 0) {
      throw new AggregateError(errors, 'find error when dispose store.');
    }
  }

  add<T extends IDisposable>(o: T): T {
    if (!o) {
      return o;
    }
    if ((o as unknown as DisposableStore) === this) {
      throw new Error('Cannot register a disposable on itself.');
    }

    SET_PARENT_OF_DISPOSABLE(o, this);
    if (this._isDisposed) {
      if (!DisposableStore.DISABLE_DISPOSED_WARNING) {
        Logger.warn(
          new Error(
            'Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!',
          ).stack,
        );
      }
    } else {
      this._toDispose.add(o);
    }

    return o;
  }
}
