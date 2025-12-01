import { JobScheduler } from './job-scheduler';
import { AbstractJob } from './abstract-job';
import { InstantiationService } from '@/bedrock/di';

enum Lifecycle {
  A,
  B,
  C,
}

class Job1 extends AbstractJob<Lifecycle> {
  protected _name = 'job1';

  constructor(private readonly _fn: () => void) {
    super();
  }

  protected _executePhase(phase: Lifecycle) {
    switch (phase) {
      case Lifecycle.A:
      case Lifecycle.B:
        this._fn();
        break;
      default:
        return;
    }
  }
}

class Job2 extends AbstractJob<Lifecycle> {
  protected _name = 'job2';

  constructor(private readonly _fn: () => void) {
    super();
  }

  protected _executePhase(phase: Lifecycle) {
    switch (phase) {
      case Lifecycle.C:
        this._fn();
        break;
      default:
        return;
    }
  }
}

class Job3 extends AbstractJob<Lifecycle> {
  protected _name = 'job3';

  constructor(private readonly _fn: () => void) {
    super();
    this._fn();
  }

  protected _executePhase(phase: Lifecycle) {
    // donothing
  }
}

describe('jobscheduler', () => {
  it('addJob', async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const instantiationService = new InstantiationService();
    const jobScheduler = instantiationService.createInstance(JobScheduler, Lifecycle.A);
    jobScheduler.addJob(new Job1(fn1));
    jobScheduler.addJob(new Job2(fn2));

    jobScheduler.prepare(Lifecycle.A);
    await jobScheduler.wait(Lifecycle.A);

    jobScheduler.prepare(Lifecycle.B);
    await jobScheduler.wait(Lifecycle.B);

    jobScheduler.prepare(Lifecycle.C);
    await jobScheduler.wait(Lifecycle.C);

    expect(fn1).toBeCalledTimes(2);
    expect(fn2).toBeCalledTimes(1);
  });

  it('registerJob', async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const instantiationService = new InstantiationService();
    const jobScheduler = instantiationService.createInstance(JobScheduler, Lifecycle.A);
    jobScheduler.registerJob(Lifecycle.A, Job1, fn1);
    jobScheduler.registerJob(Lifecycle.B, Job2, fn2);

    jobScheduler.prepare(Lifecycle.A);
    await jobScheduler.wait(Lifecycle.A);

    jobScheduler.prepare(Lifecycle.B);
    await jobScheduler.wait(Lifecycle.B);

    jobScheduler.prepare(Lifecycle.C);
    await jobScheduler.wait(Lifecycle.C);

    expect(fn1).toBeCalledTimes(2);
    expect(fn2).toBeCalledTimes(1);
  });

  it('delayConstructJob', async () => {
    const fn = vi.fn();
    const instantiationService = new InstantiationService();
    const jobScheduler = instantiationService.createInstance(JobScheduler, Lifecycle.A);
    jobScheduler.registerJob(Lifecycle.C, Job3, fn);

    jobScheduler.prepare(Lifecycle.A);
    await jobScheduler.wait(Lifecycle.A);
    expect(fn).not.toBeCalled();

    jobScheduler.prepare(Lifecycle.B);
    await jobScheduler.wait(Lifecycle.B);
    expect(fn).not.toBeCalled();

    jobScheduler.prepare(Lifecycle.C);
    await jobScheduler.wait(Lifecycle.C);
    expect(fn).toBeCalled();
  });
});
