export interface IBarrier {
  isOpen: () => boolean;
  open: () => void;
  wait: () => Promise<boolean>;
}

/**
 * A barrier that is initially closed and then becomes opened permanently after a certain period of
 * time or when open is called explicitly
 */
export class Barrier {
  private _isOpen: boolean;
  private readonly _promise: Promise<boolean>;
  private _completePromise!: (v: boolean) => void;
  private _rejectPromise!: (e: unknown) => void;

  constructor() {
    this._isOpen = false;
    this._promise = new Promise<boolean>((c, e) => {
      this._completePromise = c;
      this._rejectPromise = e;
    });
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  open(): void {
    this._isOpen = true;
    this._completePromise(true);
  }

  reject(e: unknown): void {
    this._rejectPromise(e);
  }

  wait(): Promise<boolean> {
    return this._promise;
  }
}

export function makeBarrierByPromise(promise: Promise<any>, openWhenReject: boolean = false) {
  const barrier = new Barrier();

  promise
    .then(() => barrier.open())
    .catch((err) => {
      if (openWhenReject) {
        barrier.open();
        throw err;
      } else {
        barrier.reject(err);
      }
    });

  return barrier;
}
