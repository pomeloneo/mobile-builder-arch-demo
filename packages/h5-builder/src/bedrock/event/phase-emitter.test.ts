import { PhaseEmitter, type IPhaseChecker, type WhenPhaseEvent } from './phase-emitter';
import type { Event } from './emitter';

enum Phase {
  Aaa,
  Bbb,
  Ccc,
}

class Lifecycle {
  readonly onBbb: Event<[]>;
  readonly onCcc: Event<[]>;
  readonly whenPhase: WhenPhaseEvent<Phase>;
  readonly onPhaseChange: Event<[Phase]>;
  private readonly _phaseEmitter: PhaseEmitter<Phase>;

  constructor(checker?: IPhaseChecker<Phase>) {
    this._phaseEmitter = new PhaseEmitter(Phase.Aaa, {
      checker,
    });
    this.onBbb = this._phaseEmitter.when(Phase.Bbb);
    this.onCcc = this._phaseEmitter.when(Phase.Ccc);
    this.whenPhase = this._phaseEmitter.whenPhase;
    this.onPhaseChange = this._phaseEmitter.event;
  }

  toB() {
    this._phaseEmitter.setPhase(Phase.Bbb);
  }

  toC() {
    this._phaseEmitter.setPhase(Phase.Ccc);
  }
}

describe('PhaseEmitter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test('listens to state transition 1', () => {
    const lifecycle = new Lifecycle();
    let count = 0;
    lifecycle.onBbb(() => {
      count += 1;
    });
    lifecycle.onCcc(() => {
      count += 10;
    });

    lifecycle.toB();
    lifecycle.toC();
    expect(count).toBe(11);
  });

  test('listens to state transition 2', () => {
    const lifecycle = new Lifecycle();
    let count = 0;
    lifecycle.whenPhase(Phase.Bbb, () => {
      count += 1;
    });
    lifecycle.whenPhase(Phase.Ccc, () => {
      count += 10;
    });

    lifecycle.toB();
    lifecycle.toC();
    expect(count).toBe(11);
  });

  test('listens to state transition 3', () => {
    const lifecycle = new Lifecycle();
    let count = 0;
    lifecycle.onPhaseChange((phase) => {
      if (phase === Phase.Bbb) {
        count += 1;
      } else if (phase === Phase.Ccc) {
        count += 10;
      }
    });

    lifecycle.toB();
    lifecycle.toC();
    expect(count).toBe(11);
  });

  test('state replay 1', async () => {
    const lifecycle = new Lifecycle();
    lifecycle.toB();
    lifecycle.toC();

    // Since final state is C, only state C will be replayed
    let count = 0;
    lifecycle.onBbb(() => {
      count += 1;
    });
    lifecycle.onCcc(() => {
      count += 10;
    });

    vi.advanceTimersByTime(6);
    expect(count).toBe(10);
  });

  test('state replay 2', async () => {
    const lifecycle = new Lifecycle();
    lifecycle.toC();
    lifecycle.toB();

    // Since final state is B, only state B will be replayed
    let count = 0;
    lifecycle.whenPhase(Phase.Bbb, () => {
      count += 1;
    });
    lifecycle.whenPhase(Phase.Ccc, () => {
      count += 10;
    });

    vi.advanceTimersByTime(6);
    expect(count).toBe(1);
  });

  test('state replay 3', async () => {
    const lifecycle = new Lifecycle();
    lifecycle.toB();
    lifecycle.toC();

    // Since we're listening to state changes, no replay will occur
    let count = 0;
    lifecycle.onPhaseChange((phase) => {
      if (phase === Phase.Bbb) {
        count += 1;
      } else if (phase === Phase.Ccc) {
        count += 10;
      }
    });

    vi.advanceTimersByTime(6);
    expect(count).toBe(0);
  });

  test('state replay 4', async () => {
    const lifecycle = new Lifecycle();
    // Listen and replay trigger simultaneously
    let count = 0;
    lifecycle.whenPhase(Phase.Bbb, () => {
      count += 1;
    });

    lifecycle.toB();
    lifecycle.toC();

    lifecycle.whenPhase(Phase.Ccc, () => {
      count += 10;
    });

    vi.advanceTimersByTime(6);
    expect(count).toBe(11);
  });

  test('state replay 5', async () => {
    const lifecycle = new Lifecycle();
    // Multiple replay triggers
    let count = 0;
    lifecycle.toB();
    lifecycle.whenPhase(Phase.Bbb, () => {
      count += 10;
    });
    lifecycle.onBbb(() => {
      count += 10;
    });

    lifecycle.toC();
    lifecycle.whenPhase(Phase.Ccc, () => {
      count += 10;
    });
    lifecycle.onCcc(() => {
      count += 10;
    });

    vi.advanceTimersByTime(6);
    expect(count).toBe(40);
  });

  test('repeated transitions do not trigger', () => {
    const lifecycle = new Lifecycle();
    let count = 0;
    lifecycle.onBbb(() => {
      count += 1;
    });

    lifecycle.toB();
    lifecycle.toB();
    expect(count).toBe(1);
  });

  test('invalid transition throws error', () => {
    const lifecycle = new Lifecycle((before, after) => {
      return after > before;
    });
    let count = 0;
    lifecycle.onBbb(() => {
      count += 1;
    });

    lifecycle.toC();
    expect(() => {
      lifecycle.toB();
    }).toThrowError();
    expect(count).toBe(0);
  });
});
