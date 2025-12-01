import { getCurrentTime } from '../core/utils';
import { AbstractExecutor } from './abstract-executor';
import type { IExecutedCallback } from './executor.interface';

export class PostMessageExecutor extends AbstractExecutor {
  private _scheduledCallback?: IExecutedCallback;
  private _isMessageLoopRunning: boolean = false;
  private readonly _channel = new MessageChannel();

  constructor() {
    super();

    this._channel.port1.onmessage = () => {
      this._flushCallback();
    };
  }

  public requestHostCallback(fn: IExecutedCallback) {
    this._scheduledCallback = fn;
    if (!this._isMessageLoopRunning) {
      this._isMessageLoopRunning = true;
      this._channel.port2.postMessage(null);
    }
  }

  public cancelHostCallback() {
    this._scheduledCallback = undefined;
  }

  private readonly _flushCallback = () => {
    if (!this._scheduledCallback) {
      this._isMessageLoopRunning = false;
      return;
    }

    const currentTime = getCurrentTime();
    const deadline = currentTime + this._yieldInterval;

    try {
      const hasMoreWork = this._scheduledCallback(true, currentTime, deadline);
      if (!hasMoreWork) {
        this._isMessageLoopRunning = false;
        this._scheduledCallback = undefined;
      } else {
        this._channel.port2.postMessage(null);
      }
    } catch (err) {
      this._channel.port2.postMessage(null);
      throw err;
    }
  };
}
