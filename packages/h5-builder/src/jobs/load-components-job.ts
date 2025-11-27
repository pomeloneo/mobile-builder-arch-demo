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

  protected async _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.LoadComponentLogic) return;


    this._setBarrier(PageLifecycle.LoadComponentLogic, this._loadResouseBarrier);

    this.onProgress('加载组件资源中...');
    console.log('[LoadComponentsJob] Starting component loading...');
    console.time('[LoadComponentsJob] Total loading time');

    // 🔥 使用统一队列并发加载策略
    await this.componentService.getModelTreeReady()
    // 此时组件 model 资源全部加载完成，可以开始构建 model tree
    this._loadResouseBarrier.open();

  }
}
