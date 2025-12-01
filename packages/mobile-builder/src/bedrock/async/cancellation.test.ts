import type { ICancellationToken } from './cancellation';
import { CancellationTokenSource } from './cancellation';

vi.useFakeTimers();
vi.spyOn(global, 'setTimeout');
vi.spyOn(global, 'clearTimeout');

function mockFetchData(token: ICancellationToken, mockTime: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, 4000);
    token.onCancellationRequested(() => {
      resolve(false);
    });
    vi.advanceTimersByTime(mockTime);
  });
}

describe('CancellationToken', () => {
  it('token cancelled', async () => {
    const tokenSource = new CancellationTokenSource();
    const { token } = tokenSource;
    tokenSource.cancel();
    const result = await mockFetchData(token, 0);
    expect(result).toBe(false);
  });

  it('token cancel when waiting', async () => {
    const tokenSource = new CancellationTokenSource();
    const { token } = tokenSource;
    setTimeout(() => {
      tokenSource.cancel();
    }, 1000);
    const result = await mockFetchData(token, 1000);
    expect(result).toBe(false);
  });

  it('fetch success', async () => {
    const tokenSource = new CancellationTokenSource();
    const { token } = tokenSource;
    setTimeout(() => {
      tokenSource.cancel();
    }, 5000);
    const result = await mockFetchData(token, 4000);
    expect(result).toBe(true);
  });

  /**
   * 取消前先获取signal
   */
  it('signal change1', async () => {
    const tokenSource = new CancellationTokenSource();
    const { signal, token } = tokenSource;
    expect(signal.aborted).toBe(false);
    setTimeout(() => {
      tokenSource.cancel();
    }, 1000);
    await mockFetchData(token, 4000);
    expect(signal.aborted).toBe(true);
  });

  /**
   * 取消后再获取signal
   */
  it('signal change2', async () => {
    const tokenSource = new CancellationTokenSource();
    const { token } = tokenSource;
    setTimeout(() => {
      tokenSource.cancel();
    }, 1000);
    await mockFetchData(token, 4000);
    expect(tokenSource.signal.aborted).toBe(true);
  });

  it('reason', async () => {
    const tokenSource = new CancellationTokenSource();
    const { token } = tokenSource;
    setTimeout(() => {
      tokenSource.cancel('unknown');
    }, 1000);
    await mockFetchData(token, 4000);
    expect(token.reason).toBe('unknown');
  });
});
