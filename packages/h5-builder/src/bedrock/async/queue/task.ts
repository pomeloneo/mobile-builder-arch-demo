import { Disposable, type IDisposable } from '@/bedrock/dispose';
import { type Event, Emitter } from '@/bedrock/event';
import { makeErrorBy, type IBizErrorRef } from '@/bedrock/error';
import { CancellationToken, type ICancellationToken } from '../cancellation';

export interface IAsyncTask extends IDisposable {
  onSuccess: Event<[]>;
  onFailure: Event<[IBizErrorRef]>;
  onCancel: Event<[]>;

  /** 取消当前任务 */
  cancel: () => void;
}

export class AsyncTask extends Disposable implements IAsyncTask {
  private readonly _onSuccess = this._store.add(new Emitter<[]>());
  public readonly onSuccess = this._onSuccess.event;

  private readonly _onFailure = this._store.add(new Emitter<[IBizErrorRef]>());
  public readonly onFailure = this._onFailure.event;

  private readonly _onCancel = this._store.add(new Emitter<[]>());
  public readonly onCancel = this._onCancel.event;

  private _isExec: boolean = false;
  private _isCancel: boolean = false;

  constructor(
    private _callback: ((cancellation: ICancellationToken) => Promise<void>) | null,
    private readonly _cancellationToken?: ICancellationToken,
  ) {
    super();

    this._cancellationToken?.onCancellationRequested(() => {
      this.cancel();
    });
  }

  /** 这个方法不对外暴露，只提供给 queue 使用. */
  async safeExec(): Promise<void> {
    if (this._isCancel || this._isExec) {
      return;
    }

    try {
      this._isExec = true;
      await this._callback!(this._cancellationToken ?? CancellationToken.None);
      this._onSuccess.fire();
    } catch (err) {
      /** handler error */
      this._onFailure.fire(makeErrorBy(-1, 'exec error', err as Error));
    }
  }

  cancel(): void {
    if (this._isCancel) {
      return;
    }
    if (this._isExec) {
      return;
    }

    this._isCancel = true;
    this._callback = null;
    this._onCancel.fire();
  }
}
