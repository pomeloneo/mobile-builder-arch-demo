import { AbstractJob } from '../bedrock/launch';
import type { ComponentService } from '../services/component.service';
import { type ComponentSchema } from '../services/component.service';
import { IComponentService, ISchemaService, IPrefetchService } from '../services/service-identifiers';
import { BaseComponentModel } from '../bedrock/model/model';
import { PageLifecycle } from './lifecycle';
import { SchemaService } from '@/services/schema.service';
import { PrefetchService } from '@/services/prefetch.service';
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
    @IPrefetchService private prefetchService: PrefetchService  // 🔥 新增
  ) {
    super();
  }

  protected async _executePhase(phase: PageLifecycle) {

    switch (phase) {
      case PageLifecycle.Open:
        await this._whenOpen();
        break;
      case PageLifecycle.LoadComponentLogicAndPrefetch:
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
    const pageSchema = await this.schemaService.fetchSchema()
    console.log('==================远端拉取 schema 完成============');
    console.timeEnd('==================远端拉取 schema 完成');
    // 此处是 mock，应该要依赖 schema 内容，所以需要在此处执行
    this._registerComponentLoader()

    // 🔥 启动预加载（异步，不阻塞）
    console.log('==================开始预加载组件数据============');
    console.time('==================首屏接口数据预加载完成============');
    this.prefetchService.startPrefetch(
      pageSchema.prefetch,
      pageSchema.root
    );

    // schema 获取完成后，开始预加载组件资源
    console.time('==================远端拉取所有组件相关资源完成 - Model');
    console.time('==================远端拉取所有组件相关资源完成 - View');
    this.componentService.preloadComponentsUnified(pageSchema.root);
    this._schemaBarrier.open();
  }


  private _registerComponentLoader() {
    console.log('==========================组件加载器开始注册组件==================');
    console.time('==========================组件加载器注册组件完成');

    this.componentService.registerAsync('ProductCard', {
      model: () => import('../components/product-card').then(m => m.ProductCardModel),
      view: () => import('../components/product-card').then(m => m.ProductCardView),
    }, { priority: 'high', delayRange: [200, 800] });

    // 🔥 新增：增强版商品卡片（演示预加载 + 补充数据）
    this.componentService.registerAsync('ProductCardEnhanced', {
      model: () => import('../components/product-card-enhanced').then(m => m.ProductCardEnhancedModel),
      view: () => import('../components/product-card-enhanced').then(m => m.ProductCardEnhancedView),
    }, { priority: 'high', delayRange: [200, 800] });

    this.componentService.registerAsync('TextCard', {
      model: () => import('../components/text-card').then(m => m.TextCardModel),
      view: () => import('../components/text-card').then(m => m.TextCardView),
    }, { priority: 'normal', delayRange: [1000, 1200] });

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
    }, { priority: 'normal', delayRange: [400, 1200] });

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
