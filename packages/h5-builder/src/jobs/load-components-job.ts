import { AbstractJob } from '../bedrock/launch';
import { Barrier } from '../bedrock/async/barrier';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService } from '../services/service-identifiers';
import { PageLifecycle } from './types';

/**
 * Job 1: 加载组件资源（Model 和 View）
 */
export class LoadComponentsJob extends AbstractJob<PageLifecycle> {
  protected _name = 'LoadComponents';
  private _loadResouseBarrier: Barrier = new Barrier();

  constructor(
    private schema: ComponentSchema,
    private onProgress: (msg: string) => void,
    @IComponentService private componentService: ComponentService
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.LoadResouse) return;


    this._setBarrier(PageLifecycle.LoadResouse, this._loadResouseBarrier);

    this.onProgress('加载组件资源中...');
    console.log('==========================组件的model资源加载开始');
    console.time('==========================组件的model资源加载完成');

    const { modelTreeReady, viewsReady } = this.componentService.preloadComponents(this.schema);

    // 等待 Model 和 View 都加载完成
    Promise.all([modelTreeReady, viewsReady])
      .then(() => {
        console.timeEnd('==========================组件的model资源加载完成');


        this.onProgress('组件资源加载完成');
        this._loadResouseBarrier.open();
      })
      .catch(err => {
        console.error('组件资源加载失败:', err);
        this._loadResouseBarrier.open(); // 即使失败也要 open，避免死锁
      });
  }
}
