import { AbstractJob } from '../bedrock/launch';
import { BaseComponentModel } from '../bedrock/model/model';
import { PageLifecycle } from './lifecycle';

import type { ComponentService } from '../services/component.service';
import { IComponentService } from '@/services';

/**
 * Job: 激活组件树
 * 负责在页面渲染完成后，激活所有组件（上报埋点、启动定时器等）
 * 
 * ⚠️ 注意：此时页面已经渲染完成，用户已经可以看到内容
 * 这个 Job 只是触发副作用，不负责实际的 DOM 渲染
 */
export class ActivateTreeJob extends AbstractJob<PageLifecycle> {
  protected _name = 'ActivateTree';

  constructor(
    @IComponentService private componentService: ComponentService
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {

    switch (phase) {
      case PageLifecycle.Open:
        break;
      case PageLifecycle.LoadComponentLogicAndPrefetch:
        break;
      case PageLifecycle.Prepare:
        break;
      case PageLifecycle.RenderReady:
        break;
      case PageLifecycle.Render:

        break;
      case PageLifecycle.Idle:
        this._whenIdle();
        break;
      default:
        break;
    }
  }

  private async _whenIdle() {
    const modelTree = this.componentService.getModelTree();
    if (!modelTree) return;

    // 全部加载完成，激活的整棵逻辑树
    modelTree.activate();
  }
}

