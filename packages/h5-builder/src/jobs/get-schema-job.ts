import { AbstractJob } from '../bedrock/launch';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService, ISchemaService } from '../services/service-identifiers';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './types';
import { SchemaService } from '@/services/schema.service';
import { Barrier } from '@/bedrock/async';

/**
 * Job: 获取 schema
 */
export class GetSchemaJob extends AbstractJob<PageLifecycle> {
  protected _name = 'GetSchema';
  private _schemaBarrier = new Barrier();

  constructor(
    private onProgress: (model: BaseComponentModel | null, msg: string) => void,
    @ISchemaService private schemaService: SchemaService,
    @IComponentService private componentService: ComponentService,
  ) {
    super();
  }

  protected async _executePhase(phase: PageLifecycle) {

    switch (phase) {
      case PageLifecycle.Open:
        await this._whenOpen();
        break;
      case PageLifecycle.LoadComponentLogic:

        break;
      case PageLifecycle.Prepare:
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

  private async _whenOpen() {

    this._setBarrier(PageLifecycle.Open, this._schemaBarrier)

    this.onProgress(null, '获取 schema 中...');
    console.log('==================开始获取 schema');
    console.time('==================获取 schema 完成');
    const schema = await this.schemaService.fetchSchema()

    console.log('==================获取 schema 完成============', schema);

    console.timeEnd('==================获取 schema 完成');
    this.onProgress(null, 'schema 获取完成');
    // schema 获取完成后，开始预加载组件
    this.componentService.preloadComponentsUnified(schema);
    this._schemaBarrier.open();
  }

}
