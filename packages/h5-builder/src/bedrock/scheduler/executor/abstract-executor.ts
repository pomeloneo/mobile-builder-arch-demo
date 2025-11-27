import { lvAssert } from '../../assert';
import type { IExecutedCallback, IExecutor } from './executor.interface';

export abstract class AbstractExecutor implements IExecutor {
  private _timeoutId: number = -1;
  protected _deadline: number = 0;
  protected _yieldInterval: number = 16;

  get deadline() {
    return this._deadline;
  }

  setFrameRate(fps: number) {
    lvAssert(fps > 0 && fps <= 125);
    this._yieldInterval = Math.floor(1000 / fps);
  }

  resetFrameRate() {
    this._yieldInterval = 16;
  }

  public abstract requestHostCallback(fn: IExecutedCallback): void;
  public abstract cancelHostCallback(): void;

  public requestHostTimeout(fn: () => void, delayMs: number) {
    lvAssert(this._timeoutId === -1, 'has request host timeout.');
    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(() => {
      this._timeoutId = -1;
      fn();
    }, delayMs) as unknown as number;
  }

  public cancelHostTimeout() {
    clearTimeout(this._timeoutId);
    this._timeoutId = -1;
  }
}
