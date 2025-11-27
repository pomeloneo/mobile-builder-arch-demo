import { AbstractJob } from '../bedrock/launch';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService } from '../services/service-identifiers';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './types';

/**
 * Job 2: 构建模型树
 */
export class BuildTreeJob extends AbstractJob<PageLifecycle> {
  protected _name = 'BuildTree';
  private rootModel?: BaseComponentModel;

  constructor(
    private schema: ComponentSchema,
    private onProgress: (model: BaseComponentModel | null, msg: string) => void,
    @IComponentService private componentService: ComponentService
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.Prepare) return;

    this.onProgress(null, '构建模型树中...');
    console.log('==================开始构建逻辑树');
    console.time('==================构建逻辑树完成');

    this.rootModel = this.componentService.buildModelTree(this.schema);

    console.timeEnd('==================构建逻辑树完成');
    this.onProgress(this.rootModel, '模型树构建完成');
  }

  getRootModel() {
    return this.rootModel;
  }
}
