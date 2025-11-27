import { AbstractJob } from '../bedrock/launch';
import { Barrier } from '../bedrock/async/barrier';
import { PageLifecycle } from './types';
import { BuildTreeJob } from './build-tree-job';

/**
 * Job 3: 初始化数据（后台异步）
 */
export class InitDataJob extends AbstractJob<PageLifecycle> {
  protected _name = 'InitData';

  constructor(
    private getBuildTreeJob: () => BuildTreeJob | undefined,
    private onProgress: (msg: string) => void
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.Completed) return;

    const barrier = new Barrier();
    this._setBarrier(phase, barrier);

    const buildTreeJob = this.getBuildTreeJob();
    const rootModel = buildTreeJob?.getRootModel();
    if (!rootModel) {
      console.warn('rootModel 不存在，跳过数据初始化');
      barrier.open();
      return;
    }

    this.onProgress('初始化数据中...');
    console.log('==========================数据初始化开始');
    console.time('==========================数据初始化完成');

    rootModel.init()
      .then(() => {
        console.timeEnd('==========================数据初始化完成');
        this.onProgress('数据初始化完成');
        barrier.open();
      })
      .catch(err => {
        console.error('数据初始化失败:', err);
        barrier.open();
      });
  }
}
