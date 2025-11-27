import { AbstractJob } from '../bedrock/launch';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './types';

import type { ComponentService } from '../services/component.service';
import { IComponentService } from '@/services';

/**
 * Job: 渲染
 * 负责将构建好的模型树渲染到页面
 */
export class RenderJob extends AbstractJob<PageLifecycle> {
  protected _name = 'Render';

  constructor(

    private onProgress: (model: BaseComponentModel | null, msg: string) => void,
    @IComponentService private componentService: ComponentService
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.RenderReady) return;

    const rootModel = this.componentService.getRootModel();
    if (!rootModel) return;

    if (rootModel) {
      this.onProgress(rootModel, '模型树就绪，开始渲染');
      rootModel.activate();
    }
  }
}
