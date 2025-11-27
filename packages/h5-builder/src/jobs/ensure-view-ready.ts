import { AbstractJob } from '../bedrock/launch';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService, ISchemaService } from '../services/service-identifiers';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './types';
import type { SchemaService } from '@/services/schema.service';
import { Barrier } from '../bedrock/async/barrier';

/**
 * Job 2: 构建模型树
 */
export class EnsureViewReadyJob extends AbstractJob<PageLifecycle> {
  protected _name = 'EnsureViewReady';

  private _loadResouseBarrier: Barrier = new Barrier();

  constructor(
    private onProgress: (model: BaseComponentModel | null, msg: string) => void,
    @IComponentService private componentService: ComponentService,
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
      case PageLifecycle.RenderCompleted:
        break;
      case PageLifecycle.Idle:
        break;
      default:
        break;
    }
  }

  private async _whenRenderReady() {
    this._setBarrier(PageLifecycle.RenderReady, this._loadResouseBarrier);
    await this.componentService.getViewsReady()
    this._loadResouseBarrier.open()
  }
}
