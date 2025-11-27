import { AbstractJob } from '../bedrock/launch';
import { Barrier } from '../bedrock/async/barrier';
import { PageLifecycle } from './types';

import { IComponentService } from '@/services';
import type { ComponentService } from '../services/component.service';

/**
 * Job 3: 初始化数据（后台异步）
 */
export class InitDataJob extends AbstractJob<PageLifecycle> {
  protected _name = 'InitData';

  private _renderCompletedBarrier = new Barrier();

  constructor(
    private onProgress: (msg: string) => void,
    @IComponentService private componentService: ComponentService
  ) {
    super();
  }

  protected async _executePhase(phase: PageLifecycle) {

    switch (phase) {
      case PageLifecycle.Open:

        break;
      case PageLifecycle.LoadResouse:

        break;
      case PageLifecycle.Prepare:
        break;
      case PageLifecycle.StartRender:
        break;
      case PageLifecycle.RenderCompleted:
        await this._whenCompleted();
        break;
      case PageLifecycle.Idle:
        break;
      default:
        break;
    }

  }

  private _whenCompleted() {

    this._setBarrier(PageLifecycle.RenderCompleted, this._renderCompletedBarrier);

    const rootModel = this.componentService.getRootModel();
    if (!rootModel) {
      console.warn('rootModel 不存在，跳过数据初始化');
      this._renderCompletedBarrier.open();
      return;
    }

    this.onProgress('初始化数据中...');
    console.log('==========================数据初始化开始');
    console.time('==========================数据初始化完成');

    rootModel.init()
      .then(() => {
        console.timeEnd('==========================数据初始化完成');
        this.onProgress('数据初始化完成');
        this._renderCompletedBarrier.open();
      })
      .catch(err => {
        console.error('数据初始化失败:', err);
        this._renderCompletedBarrier.open();
      });
  }
}
