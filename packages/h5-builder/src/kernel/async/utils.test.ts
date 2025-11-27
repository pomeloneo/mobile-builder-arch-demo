import { invokeNextLoop } from './utils';

describe('invokeNextLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('invoke', () => {
    let a = 0;
    invokeNextLoop(() => {
      a++;
    });
    expect(a).toBe(0);
    vi.advanceTimersByTime(1);
    expect(a).toBe(1);
  });

  it('dispose', () => {
    let a = 0;
    const disposable = invokeNextLoop(() => {
      a++;
    });
    expect(a).toBe(0);
    disposable.dispose();
    vi.advanceTimersByTime(1);
    expect(a).toBe(0);
  });
});
