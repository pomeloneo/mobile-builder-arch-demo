import { AbstractJob } from '../bedrock/launch';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService, ISchemaService } from '../services/service-identifiers';
import { BaseComponentModel } from '../bedrock/model';
import { PageLifecycle } from './lifecycle';
import { SchemaService } from '@/services/schema.service';
import { Barrier } from '@/bedrock/async';

/**
 * Job: 获取 schema
 */
export class GetSchemaJob extends AbstractJob<PageLifecycle> {
  protected _name = 'GetSchema';
  private _schemaBarrier = new Barrier();

  constructor(

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
      case PageLifecycle.Render:
        break;
      case PageLifecycle.Idle:
        break;
      default:
        break;
    }


  }

  private async _whenOpen() {
    this._setBarrier(PageLifecycle.Open, this._schemaBarrier)
    console.log('==================开始远端拉取 schema============');
    console.time('==================远端拉取 schema 完成');
    const schema = await this.schemaService.fetchSchema()
    console.log('==================远端拉取 schema 完成============', schema);
    // 此处是 mock，应该要依赖 schema 内容，所以需要在此处执行
    this._registerComponentLoader()



    console.timeEnd('==================远端拉取 schema 完成');

    // schema 获取完成后，开始预加载组件
    this.componentService.preloadComponentsUnified(schema);
    this._schemaBarrier.open();
  }


  private _registerComponentLoader() {
    console.log('==========================组件加载器开始注册组件==================');
    console.time('==========================组件加载器注册组件完成');

    this.componentService.registerAsync('ProductCard', {
      model: () => import('../components/product-card').then(m => m.ProductCardModel),
      view: () => import('../components/product-card').then(m => m.ProductCardView),
    }, { priority: 'high', delayRange: [200, 800] });

    this.componentService.registerAsync('TextCard', {
      model: () => import('../components/text-card').then(m => m.TextCardModel),
      view: () => import('../components/text-card').then(m => m.TextCardView),
    }, { priority: 'normal', delayRange: [2200, 3000] });

    this.componentService.registerAsync('TabsContainer', {
      model: () => import('../components/tabs-container').then(m => m.TabsContainerModel),
      view: () => import('../components/tabs-container').then(m => m.TabsContainerView),
    }, { priority: 'critical', delayRange: [100, 500] });

    this.componentService.registerAsync('ProductList', {
      model: () => import('../components/simple-list').then(m => m.SimpleListModel),
      view: () => import('../components/simple-list').then(m => m.SimpleListView),
    }, { priority: 'high', delayRange: [150, 600] });

    this.componentService.registerAsync('ExperimentContainer', {
      model: () => import('../components/experiment-container').then(m => m.ExperimentContainerModel),
      view: () => import('../components/experiment-container').then(m => m.ExperimentContainerView),
    }, { priority: 'normal', dependencies: ['TextCard', 'ProductCard'], delayRange: [400, 1200] });

    this.componentService.registerAsync('TimeBasedContainer', {
      model: () => import('../components/time-based-container').then(m => m.TimeBasedContainerModel),
      view: () => import('../components/time-based-container').then(m => m.TimeBasedContainerView),
    }, { priority: 'high', delayRange: [300, 900] });

    this.componentService.registerAsync('GridLayoutContainer', {
      model: () => import('../components/grid-layout-container').then(m => m.GridLayoutContainerModel),
      view: () => import('../components/grid-layout-container').then(m => m.GridLayoutContainerView),
    }, { priority: 'normal', delayRange: [250, 800] });

    this.componentService.registerAsync('ConditionalContainer', {
      model: () => import('../components/conditional-container').then(m => m.ConditionalContainerModel),
      view: () => import('../components/conditional-container').then(m => m.ConditionalContainerView),
    }, { priority: 'normal', delayRange: [300, 1000] });
    console.log('==========================组件加载器注册组件完成=====================');

    console.timeEnd('==========================组件加载器注册组件完成');

  }

}
