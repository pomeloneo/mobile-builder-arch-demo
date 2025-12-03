import { AbstractJob } from '../bedrock/launch';
import { PageLifecycle } from './lifecycle';

import type { ComponentService } from '../services/component.service';
import { IComponentService } from '@/services';
import { BaseComponentModel } from '../bedrock/model/model';
import { Barrier } from '@/bedrock/async';

/**
 * Job: 触发渲染
 * 负责在 Render 阶段触发 React 渲染
 * 
 * 通过构造函数注入的回调函数来触发外部的 setModelTree
 */
export class TriggerRenderJob extends AbstractJob<PageLifecycle> {
  protected _name = 'TriggerRender';
  private _renderBarrier = new Barrier();

  constructor(
    private setModelTree: (model: BaseComponentModel | null) => void,
    @IComponentService private componentService: ComponentService,

  ) {
    super();
  }

  protected async _executePhase(phase: PageLifecycle) {
    switch (phase) {
      case PageLifecycle.Render:
        await this._whenRender();
        break;
      default:
        break;
    }
  }

  private async _whenRender() {
    this._setBarrier(PageLifecycle.Render, this._renderBarrier);
    const modelTree = this.componentService.getModelTree();

    console.log('[TriggerRenderJob] 触发渲染，modelTree:', modelTree?.id);
    console.log('==============首屏内容开始渲染============')

    //在 Job 内部触发渲染
    const getFirstScreenModelTree = this.componentService.getFirstScreenModelTree()

    // 初始化首屏 Model Tree（不阻塞渲染）
    getFirstScreenModelTree?.init();

    // 触发 React 渲染
    this.setModelTree(modelTree);

    console.log('==========================首屏可以交互了==========');
    console.timeEnd('==========================首屏 TTI 完成时间==========');
    this._renderBarrier.open();
  }
}
