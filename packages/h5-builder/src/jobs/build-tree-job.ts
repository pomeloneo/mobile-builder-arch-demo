import { AbstractJob } from '../bedrock/launch';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService, ISchemaService } from '../services/service-identifiers';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './types';
import type { SchemaService } from '@/services/schema.service';

/**
 * Job 2: 构建模型树
 */
export class BuildTreeJob extends AbstractJob<PageLifecycle> {
  protected _name = 'BuildTree';
  private rootModel?: BaseComponentModel;

  constructor(
    private onProgress: (model: BaseComponentModel | null, msg: string) => void,
    @IComponentService private componentService: ComponentService,
    @ISchemaService private schemaService: SchemaService
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
        await this._whenPrepare();
        break;
      case PageLifecycle.RenderReady:
        break;
      case PageLifecycle.RenderCompleted:
        break;
      case PageLifecycle.Idle:
        break;
      default:
        break;
    }
  }

  private async _whenPrepare() {
    this.onProgress(null, '构建模型树中...');
    console.log('==================开始构建逻辑树');
    console.time('==================构建逻辑树完成');
    const schema = this.schemaService.getSchema()
    if (!schema) {
      throw new Error('Schema not found');
    }

    this.rootModel = this.componentService.buildModelTree(schema);

    console.timeEnd('==================构建逻辑树完成');
    this.onProgress(this.rootModel, '模型树构建完成');
  }
}
