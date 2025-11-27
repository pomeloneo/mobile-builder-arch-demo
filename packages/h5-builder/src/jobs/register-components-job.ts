import { AbstractJob } from '../bedrock/launch';
import { ComponentLoader } from '../flow/component-loader';
import { PageLifecycle } from './types';

/**
 * Job: 注册组件
 * 负责将所有需要的组件注册到 ComponentLoader 中
 */
export class RegisterComponentsJob extends AbstractJob<PageLifecycle> {
  protected _name = 'RegisterComponents';

  constructor(
    private loader: ComponentLoader
  ) {
    super();
  }

  protected _executePhase(phase: PageLifecycle) {
    if (phase !== PageLifecycle.Open) return;

    console.log('==========================组件加载器开始注册组件');
    console.time('==========================组件加载器注册组件完成');

    this.loader.registerAsync('ProductCard', {
      model: () => import('../components/product-card').then(m => m.ProductCardModel),
      view: () => import('../components/product-card').then(m => m.ProductCardView),
    }, { priority: 'high', delayRange: [200, 800] });

    this.loader.registerAsync('TextCard', {
      model: () => import('../components/text-card').then(m => m.TextCardModel),
      view: () => import('../components/text-card').then(m => m.TextCardView),
    }, { priority: 'normal', delayRange: [300, 1000] });

    this.loader.registerAsync('TabsContainer', {
      model: () => import('../components/tabs-container').then(m => m.TabsContainerModel),
      view: () => import('../components/tabs-container').then(m => m.TabsContainerView),
    }, { priority: 'critical', delayRange: [100, 500] });

    this.loader.registerAsync('ProductList', {
      model: () => import('../components/simple-list').then(m => m.SimpleListModel),
      view: () => import('../components/simple-list').then(m => m.SimpleListView),
    }, { priority: 'high', delayRange: [150, 600] });

    this.loader.registerAsync('ExperimentContainer', {
      model: () => import('../components/experiment-container').then(m => m.ExperimentContainerModel),
      view: () => import('../components/experiment-container').then(m => m.ExperimentContainerView),
    }, { priority: 'normal', dependencies: ['TextCard', 'ProductCard'], delayRange: [400, 1200] });

    this.loader.registerAsync('TimeBasedContainer', {
      model: () => import('../components/time-based-container').then(m => m.TimeBasedContainerModel),
      view: () => import('../components/time-based-container').then(m => m.TimeBasedContainerView),
    }, { priority: 'high', delayRange: [300, 900] });

    this.loader.registerAsync('GridLayoutContainer', {
      model: () => import('../components/grid-layout-container').then(m => m.GridLayoutContainerModel),
      view: () => import('../components/grid-layout-container').then(m => m.GridLayoutContainerView),
    }, { priority: 'normal', delayRange: [250, 800] });

    this.loader.registerAsync('ConditionalContainer', {
      model: () => import('../components/conditional-container').then(m => m.ConditionalContainerModel),
      view: () => import('../components/conditional-container').then(m => m.ConditionalContainerView),
    }, { priority: 'normal', delayRange: [300, 1000] });

    console.timeEnd('==========================组件加载器注册组件完成');
  }
}
