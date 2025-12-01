import type { IDisposable } from '../../dispose';
import { getCurrentTime } from '../core/utils';
import { AbstractExecutor } from './abstract-executor';
import type { IExecutedCallback } from './executor.interface';

declare function requestIdleCallback(
  callback: (args: IdleDeadline) => void,
  options?: { timeout: number },
): number;
declare function cancelIdleCallback(handle: number): void;

export class IdleCallbackExecutor extends AbstractExecutor {
  private _scheduledCallback?: IExecutedCallback;
  private _disposable?: IDisposable;
  private _runWhenIdle: (callback: (idle: IdleDeadline) => void, timeout?: number) => IDisposable;

  constructor() {
    super();
    if (typeof requestIdleCallback !== 'function' || typeof cancelIdleCallback !== 'function') {
      this._runWhenIdle = (runner) => {
        let disposed = false;
        setTimeout(() => {
          if (disposed) {
            return;
          }
          const end = Date.now() + 15; // one frame at 64fps
          runner(
            Object.freeze({
              didTimeout: true,
              timeRemaining() {
                return Math.max(0, end - Date.now());
              },
            }),
          );
        });
        return {
          dispose() {
            if (disposed) {
              return;
            }
            disposed = true;
          },
        };
      };
    } else {
      this._runWhenIdle = (runner, timeout?) => {
        const handle: number = requestIdleCallback(
          runner,
          typeof timeout === 'number' ? { timeout } : undefined,
        );
        let disposed = false;
        return {
          dispose() {
            if (disposed) {
              return;
            }
            disposed = true;
            cancelIdleCallback(handle);
          },
        };
      };
    }
  }

  public requestHostCallback(fn: IExecutedCallback) {
    this._scheduledCallback = fn;
    if (!this._disposable) {
      this._disposable = this._runWhenIdle(this._flushCallback);
    }
  }

  public cancelHostCallback() {
    this._disposable?.dispose();
    this._scheduledCallback = undefined;
    this._disposable = undefined;
  }

  private readonly _flushCallback = () => {
    if (!this._scheduledCallback) {
      return;
    }
    const currentTime = getCurrentTime();
    const deadline = currentTime + this._yieldInterval;

    try {
      const hasMoreWork = this._scheduledCallback(true, currentTime, deadline);
      if (!hasMoreWork) {
        this._scheduledCallback = undefined;
        this._disposable = undefined;
      } else {
        this._disposable = this._runWhenIdle(this._flushCallback);
      }
    } catch (err) {
      this._disposable = this._runWhenIdle(this._flushCallback);
      throw err;
    }
  };
}
