/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable max-lines-per-function */
import { CancellationTokenSource } from '../cancellation';
import { AsyncTask } from './task';

describe('AsyncTask', () => {
  test('resolve', async () => {
    const callback = vi.fn();
    const successCb = vi.fn();
    const failureCb = vi.fn();
    const cancelCb = vi.fn();
    const task1 = new AsyncTask(() => {
      callback();
      return Promise.resolve();
    });
    task1.onSuccess(successCb);
    task1.onFailure(failureCb);
    task1.onCancel(cancelCb);

    const result1 = await task1.safeExec();
    expect(callback).toHaveBeenCalled();
    expect(successCb).toHaveBeenCalled();
    expect(failureCb).not.toHaveBeenCalled();
    expect(cancelCb).not.toHaveBeenCalled();
    expect(result1).toBe(undefined);
  });

  test('reject', async () => {
    const callback = vi.fn();
    const successCb = vi.fn();
    const failureCb = vi.fn();
    const cancelCb = vi.fn();
    const error = new Error('error');
    const rej = Promise.reject(error);
    const task1 = new AsyncTask(() => {
      callback();
      return rej;
    });
    task1.onSuccess(successCb);
    task1.onFailure(failureCb);
    task1.onCancel(cancelCb);

    const result1 = await task1.safeExec();
    expect(callback).toHaveBeenCalled();
    expect(successCb).not.toHaveBeenCalled();
    expect(failureCb).toHaveBeenCalled();
    expect(cancelCb).not.toHaveBeenCalled();
    expect(result1).toBe(undefined);
  });

  test('cancel', async () => {
    const callback = vi.fn();
    const successCb = vi.fn();
    const failureCb = vi.fn();
    const cancelCb = vi.fn();

    const task1 = new AsyncTask(() => {
      callback();
      return Promise.reject();
    });
    task1.onSuccess(successCb);
    task1.onFailure(failureCb);
    task1.onCancel(cancelCb);

    task1.cancel();
    await task1.safeExec();
    expect(callback).not.toHaveBeenCalled();
    expect(successCb).not.toHaveBeenCalled();
    expect(failureCb).not.toHaveBeenCalled();
    expect(cancelCb).toHaveBeenCalled();
  });

  test('cancel 2', async () => {
    const callback = vi.fn();
    const successCb = vi.fn();
    const failureCb = vi.fn();
    const cancelCb = vi.fn();

    const task1 = new AsyncTask(() => {
      callback();
      return Promise.reject();
    });
    task1.onSuccess(successCb);
    task1.onFailure(failureCb);
    task1.onCancel(cancelCb);

    await task1.safeExec();
    task1.cancel();
    expect(callback).toHaveBeenCalled();
    expect(successCb).not.toHaveBeenCalled();
    expect(failureCb).toHaveBeenCalled();
    expect(cancelCb).not.toHaveBeenCalled();
  });

  /**
   * Testing the behaviors of aborting with abort signal
   * */
  test('aborts a task before it is exected should prevent task from being executed', async () => {
    const callback = vi.fn();
    const successCb = vi.fn();
    const failureCb = vi.fn();
    const cancelCb = vi.fn();

    const cancellationSource = new CancellationTokenSource();

    const task1 = new AsyncTask(() => {
      callback();
      return Promise.reject();
    }, cancellationSource.token);

    task1.onSuccess(successCb);
    task1.onFailure(failureCb);
    task1.onCancel(cancelCb);

    // aborts the task before it is executed
    cancellationSource.cancel();
    // The abort event of abort controller will be dispatched synchronously

    await task1.safeExec();

    expect(callback).not.toHaveBeenCalled();
    expect(successCb).not.toHaveBeenCalled();
    expect(failureCb).not.toHaveBeenCalled();

    expect(cancelCb).toHaveBeenCalled();
  });

  test('aborts a task after it has been executed should not cause the task to enter the cancelled stage', async () => {
    const callback = vi.fn();
    const successCb = vi.fn();
    const failureCb = vi.fn();
    const cancelCb = vi.fn();

    const cancellationSource = new CancellationTokenSource();

    const task1 = new AsyncTask(() => {
      callback();
      return Promise.reject();
    }, cancellationSource.token);
    task1.onSuccess(successCb);
    task1.onFailure(failureCb);
    task1.onCancel(cancelCb);

    await task1.safeExec();

    // aborts the task after it has been executed
    cancellationSource.cancel();

    expect(callback).toHaveBeenCalled();
    expect(successCb).not.toHaveBeenCalled();
    expect(failureCb).toHaveBeenCalled();

    expect(cancelCb).not.toHaveBeenCalled();
  });
});
