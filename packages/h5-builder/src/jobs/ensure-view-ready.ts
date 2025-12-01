import { AbstractJob } from '../bedrock/launch';

import { type ComponentSchema } from '../services/component.service';
import { IComponentService, ISchemaService, IPrefetchService } from '../services/service-identifiers';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './lifecycle';
import type { SchemaService } from '@/services/schema.service';

import type { ComponentService } from '../services/component.service';
import type { PrefetchService } from '../services/prefetch.service';
import { Barrier } from '../bedrock/async/barrier';

/**
 * Job 2: 构建模型树
 */
export class EnsureViewReadyJob extends AbstractJob<PageLifecycle> {
  protected _name = 'EnsureViewReady';

  private _loadResouseBarrier: Barrier = new Barrier();

  constructor(

    @IComponentService private componentService: ComponentService,
    @IPrefetchService private prefetchService: PrefetchService  // 🔥 新增
  ) {
    super();
  }

  protected async _executePhase(phase: PageLifecycle) {

    switch (phase) {
      case PageLifecycle.Open:
        break;
      case PageLifecycle.LoadComponentLogic:
        break;
      case PageLifecycle.Prepare:
        break;
      case PageLifecycle.RenderReady:
        await this._whenRenderReady();
        break;
      case PageLifecycle.Render:
        break;
      case PageLifecycle.Idle:
        break;
      default:
        break;
    }
  }

  private async _whenRenderReady() {
    this._setBarrier(PageLifecycle.RenderReady, this._loadResouseBarrier);

    // 🔥 等待预加载完成（如果还没完成）
    console.log('==========================等待首屏接口数据预加载完成=============');
    await this.prefetchService.waitForPrefetchComplete();
    console.log('==========================首屏接口数据预加载完成=============');
    console.timeEnd('==================首屏接口数据预加载完成============');
    await this.componentService.getViewsReady()
    console.timeEnd('==================远端拉取所有组件相关资源完成 - View');
    this._loadResouseBarrier.open()
  }
}
