import type { IDisposable } from '@/bedrock/dispose';

// mock的文件，请勿直接引用

export interface IFoo {
  readonly _serviceBrand: undefined;

  disposed: boolean;
  echo: () => void;
  dispose: () => void;
}

export class Foo implements IDisposable {
  readonly _serviceBrand: undefined;
  private _disposed = false;

  get disposed() {
    return this._disposed;
  }

  echo() {
    return 'Hello Lvweb';
  }

  dispose() {
    this._disposed = true;
  }
}
