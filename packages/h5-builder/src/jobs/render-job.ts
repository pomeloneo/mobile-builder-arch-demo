import { AbstractJob } from '../bedrock/launch';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './lifecycle';

import type { ComponentService } from '../services/component.service';
import { IComponentService } from '@/services';

/**
 * Job: 渲染
 * 负责将构建好的模型树渲染到页面
 */
export class RenderJob extends AbstractJob<PageLifecycle> {
  protected _name = 'Render';

  constructor(
    @IComponentService private componentService: ComponentService
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {

    switch (phase) {
      case PageLifecycle.Open:
        break;
      case PageLifecycle.LoadComponentLogic:

        break;
      case PageLifecycle.Prepare:
        break;
      case PageLifecycle.RenderReady:

        break;
      case PageLifecycle.Render:
        this._whenRender();
        break;
      case PageLifecycle.Idle:
        break;
      default:
        break;
    }
  }

  private async _whenRender() {
    const modelTree = this.componentService.getModelTree();
    if (!modelTree) return;

    modelTree.activate();
  }
}
