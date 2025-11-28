import { AbstractJob } from '../bedrock/launch';
import { Barrier } from '../bedrock/async/barrier';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService } from '../services/service-identifiers';
import { PageLifecycle } from './lifecycle';

/**
 * Job 1: 加载组件资源（Model 和 View）
 */
export class LoadComponentsJob extends AbstractJob<PageLifecycle> {
  protected _name = 'LoadComponents';
  private _loadResouseBarrier: Barrier = new Barrier();

  constructor(


    @IComponentService private componentService: ComponentService
  ) {
    super();
  }

  protected async _executePhase(phase: PageLifecycle) {
    switch (phase) {
      case PageLifecycle.Open:
        break;
      case PageLifecycle.LoadComponentLogic:
        await this._whenLoadComponentLogic();
        break;
      case PageLifecycle.Prepare:
        break;
      case PageLifecycle.RenderReady:

        break;
      case PageLifecycle.Render:
        break;
      case PageLifecycle.Idle:
        break;
      default:
        break;
    }
  }






  private async _whenLoadComponentLogic() {
    this._setBarrier(PageLifecycle.LoadComponentLogic, this._loadResouseBarrier);
    console.log('==========================正在获取组件 model 资源中===========');

    // 🔥 使用统一队列并发加载策略
    await this.componentService.getModelTreeReady()
    console.log('==========================组件 model 资源获取完成===========');
    console.timeEnd('==================远端拉取所有组件相关资源完成 - Model');
    // 此时组件 model 资源全部加载完成，可以开始构建 model tree
    this._loadResouseBarrier.open();
  }
}
