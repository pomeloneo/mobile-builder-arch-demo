import { AbstractJob } from '../bedrock/launch';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './types';
import { BuildTreeJob } from './build-tree-job';

/**
 * Job: 渲染
 * 负责将构建好的模型树渲染到页面
 */
export class RenderJob extends AbstractJob<PageLifecycle> {
  protected _name = 'Render';

  constructor(
    private getBuildTreeJob: () => BuildTreeJob | undefined,
    private onProgress: (model: BaseComponentModel | null, msg: string) => void
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.Render) return;

    const buildTreeJob = this.getBuildTreeJob();
    if (!buildTreeJob) return;

    const rootModel = buildTreeJob.getRootModel();
    if (rootModel) {
      this.onProgress(rootModel, '模型树就绪，开始渲染');
      rootModel.activate();
    }
  }
}
