import { lvAssert } from '../../assert';
import type { IScheduledCallback } from '../type';

export class Task {
  private _callback?: IScheduledCallback;
  private _sortIndex: number = -1;

  constructor(
    callback: IScheduledCallback,
    private _startTime: number,
    private _expirationTime: number,
  ) {
    this._callback = callback;
  }

  getCallback() {
    return this._callback;
  }

  setCallback(callback: IScheduledCallback) {
    lvAssert(this._callback === undefined, 'cant overlay callback.');
    this._callback = callback;
  }

  clearCallback() {
    this._callback = undefined;
  }

  getStartTime() {
    return this._startTime;
  }

  setStartTime(startTime: number) {
    this._startTime = startTime;
  }

  getExpirationTime() {
    return this._expirationTime;
  }

  setExpirationTime(expirationTime: number) {
    this._expirationTime = expirationTime;
  }

  setSortIndex(index: number) {
    this._sortIndex = index;
  }

  getSortIndex() {
    return this._sortIndex;
  }
}
