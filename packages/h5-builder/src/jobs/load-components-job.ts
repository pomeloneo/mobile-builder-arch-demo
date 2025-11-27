import { AbstractJob } from '../bedrock/launch';
import { Barrier } from '../bedrock/async/barrier';
import { ComponentLoader, ComponentSchema } from '../flow/component-loader';
import { PageLifecycle } from './types';

/**
 * Job 1: 加载组件资源（Model 和 View）
 */
export class LoadComponentsJob extends AbstractJob<PageLifecycle> {
  protected _name = 'LoadComponents';

  constructor(
    private loader: ComponentLoader,
    private schema: ComponentSchema,
    private onProgress: (msg: string) => void
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.Open) return;

    const barrier = new Barrier();
    this._setBarrier(phase, barrier);

    this.onProgress('加载组件资源中...');
    console.log('==========================组件的model资源加载开始');
    console.time('==========================组件的model资源加载完成');

    const { modelTreeReady, viewsReady } = this.loader.preloadComponents(this.schema);

    // 等待 Model 和 View 都加载完成
    Promise.all([modelTreeReady, viewsReady])
      .then(() => {
        console.timeEnd('==========================组件的model资源加载完成');


        this.onProgress('组件资源加载完成');
        barrier.open();
      })
      .catch(err => {
        console.error('组件资源加载失败:', err);
        barrier.open(); // 即使失败也要 open，避免死锁
      });
  }
}
