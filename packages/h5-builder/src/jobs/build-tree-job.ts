import { AbstractJob } from '../bedrock/launch';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService, ISchemaService } from '../services/service-identifiers';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './lifecycle';
import type { SchemaService } from '@/services/schema.service';

/**
 * Job 2: 构建模型树
 */
export class BuildTreeJob extends AbstractJob<PageLifecycle> {
  protected _name = 'BuildTree';
  private rootModel?: BaseComponentModel;

  constructor(

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
      case PageLifecycle.Render:
        break;
      case PageLifecycle.Idle:
        break;
      default:
        break;
    }
  }

  private async _whenPrepare() {


    const schema = this.schemaService.getSchema()
    if (!schema) {
      throw new Error('Schema not found');
    }
    console.log('==================开始构建逻辑树');
    console.time('==================构建逻辑树完成');
    this.rootModel = this.componentService.buildModelTree(schema);
    console.timeEnd('==================构建逻辑树完成');
  }
}
