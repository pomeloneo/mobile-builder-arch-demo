import { setDisposableTimeout, setDisposableInterval } from './timer';

describe('Timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('setDisposableTimeout', () => {
    let a = 0;
    const disposable = setDisposableTimeout(() => {
      a++;
    }, 10);
    vi.advanceTimersByTime(6);
    disposable.dispose();
    vi.advanceTimersByTime(10);
    expect(a).toBe(0);
  });

  it('setDisposableInterval', () => {
    let a = 0;
    const disposable = setDisposableInterval(() => {
      a++;
    }, 20);
    vi.advanceTimersByTime(25);
    expect(a).toBe(1);
    disposable.dispose();
    vi.advanceTimersByTime(25);
    expect(a).toBe(1);
  });
});
