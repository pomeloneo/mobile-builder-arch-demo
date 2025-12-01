import { IInstantiationService, type GetLeadingNonServiceArgs } from '@/bedrock/di';
import { lvAssert, lvAssertNotHere } from '@/bedrock/assert';
import type { AbstractJob } from './abstract-job';
import { CostRecorder } from './cost-recorder';

class JobDescriptor<T, K extends T> {
  readonly ctor: new (...args: any[]) => AbstractJob<T, K>;
  readonly staticArguments: any[];

  constructor(ctor: new (...args: any[]) => AbstractJob<T, K>, args: any[]) {
    this.ctor = ctor;
    this.staticArguments = args;
  }
}

export class JobScheduler<T, K extends T = T> {
  private readonly _jobPools: Map<string, AbstractJob<T, K>> = new Map();
  private readonly _costRecorder = new CostRecorder();
  private readonly _unconstructedJobs: Map<K, JobDescriptor<AbstractJob<T, K>, any>[]> = new Map();

  constructor(
    private _currentPhase: K,
    @IInstantiationService private readonly _instantiationService: IInstantiationService,
  ) { }

  get currentPhase() {
    return this._currentPhase;
  }

  /**
   * 按需添加一个job，job会在phase时刻才进行实例化
   * @param phase job实例化时机
   * @param ctor job构造函数
   * @param args job构造静态参数
   */
  registerJob<Ctor extends new (...args: any[]) => AbstractJob<T, K>>(
    phase: K,
    ctor: Ctor,
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
  ) {
    if (!this._unconstructedJobs.has(phase)) {
      this._unconstructedJobs.set(phase, [new JobDescriptor(ctor, args)]);
    } else {
      this._unconstructedJobs.get(phase)!.push(new JobDescriptor(ctor, args));
    }
  }

  /**
   * 添加一个构造好的job
   * @param job 任务
   */
  addJob(job: AbstractJob<T, K>) {
    lvAssert(!this._jobPools.has(job.name), 'cant duplicate add job.');
    this._jobPools.set(job.name, job);
  }

  getJob<J extends AbstractJob<T, K>>(name: string): J | undefined {
    return this._jobPools.get(name) as J;
  }

  removeJob(jobName: string) {
    this._jobPools.delete(jobName);
  }

  prepare(phase: K) {
    const descriptors = this._unconstructedJobs.get(phase) ?? [];
    for (const d of descriptors) {
      this.addJob(this._instantiationService.createInstance(d.ctor, ...d.staticArguments));
    }
    let shouldWait = false;
    this._unconstructedJobs.delete(phase);
    for (const [, job] of this._jobPools) {
      const start = Date.now();
      job.prepare(phase);
      this._costRecorder.record(job.name, phase as number | string, Date.now() - start);

      if (job.shouldWait(phase)) {
        shouldWait = true;
      }
    }

    return shouldWait;
  }

  getCost() {
    return this._costRecorder.toString();
  }

  /**
   * 推进到目标阶段，要求目标阶段没有需要等待的任务
   * @param phase 目标阶段
   */
  advanceToPhase(phase: K) {
    for (const [, job] of this._jobPools) {
      if (job.shouldWait(phase)) {
        lvAssertNotHere(`exists job should wait, job name: ${job.name}, phase: ${phase}`);
      }
    }

    this._currentPhase = phase;
  }

  async wait(phase: K) {
    const jobPromises: Promise<void>[] = [];
    for (const [, job] of this._jobPools) {
      if (!job.shouldWait(phase)) {
        continue;
      }
      jobPromises.push(
        (() => {
          const start = Date.now();
          return job.wait(phase).then(() => {
            this._costRecorder.record(job.name, phase as number | string, Date.now() - start);
          });
        })(),
      );
    }

    await Promise.all(jobPromises);
    this._currentPhase = phase;
  }
}
