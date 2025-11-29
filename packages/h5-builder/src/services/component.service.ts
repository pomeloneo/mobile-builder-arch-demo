import { IInstantiationService } from '../bedrock/di/index.common';
import { BaseComponentModel, BaseContainerModel } from '../bedrock/model';
import { ITrackerService } from './service-identifiers';
import type { TrackerService } from './tracker.service';
import { ErrorPlaceholderModel } from '../placeholder';
import { registerModelView } from '../components/model-renderer';

/**
 * 组件元数据
 */
export interface ComponentMetadata {
  // 加载优先级：控制组件加载顺序
  // critical: 最高优先级，立即加载（如核心容器）
  // high: 高优先级，优先加载（如首屏组件）
  // normal: 普通优先级，正常加载（默认值）
  // low: 低优先级，延后加载（如非首屏组件）
  priority?: 'critical' | 'high' | 'normal' | 'low';

  // 加载延迟范围（ms）：模拟网络延迟，用于测试
  delayRange?: [number, number];
}

/**
 * 组件 Schema 定义
 */
export interface ComponentSchema {
  // 组件类型（用于查找对应的 Model 类）
  type: string;

  // 组件唯一 ID
  id: string;

  // 组件属性（传递给 Model 的 props）
  props: Record<string, any>;

  // 子组件（可选，容器组件才有）
  children?: ComponentSchema[];

  // 元数据（可选）
  meta?: ComponentMetadata;
}

/**
 * 组件注册表
 * 维护 type → ModelClass 的映射
 */
export class ComponentRegistry {
  private registry = new Map<string, any>();

  /**
   * 注册单个组件
   */
  register(type: string, ModelClass: any): void {
    if (this.registry.has(type)) {
      console.warn(`[Registry] Component ${type} already registered, overwriting`);
    }
    this.registry.set(type, ModelClass);
  }

  /**
   * 批量注册
   */
  registerAll(components: Record<string, any>): void {
    Object.entries(components).forEach(([type, ModelClass]) => {
      this.register(type, ModelClass);
    });
  }

  /**
   * 获取组件
   */
  get(type: string): any | undefined {
    return this.registry.get(type);
  }

  /**
   * 检查是否已注册
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * 获取所有已注册的组件类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.registry.keys());
  }
}

/**
 * 组件服务
 * 负责组件的注册、加载和构建，将树形 Schema 转换为树形 Model Tree
 */
export class ComponentService {
  readonly _serviceBrand: undefined;
  private registry = new ComponentRegistry();
  private _modelTree: BaseComponentModel | null = null;

  // 缓存加载结果，确保只加载一次
  private _loadingResult: {
    modelTreeReady: Promise<void>;
    viewsReady: Promise<void>;
  } | null = null;

  constructor(
    @IInstantiationService private instantiationService: IInstantiationService,
    @ITrackerService private tracker: TrackerService
  ) { }

  /**
   * 同步注册组件
   */
  register(type: string, ModelClass: any): void {
    this.registry.register(type, ModelClass);
  }

  /**
   * 批量同步注册组件
   */
  registerAll(components: Record<string, any>): void {
    this.registry.registerAll(components);
  }

  /**
   * 构建 Model Tree
   * @param schema 组件 Schema
   * @returns 根 Model
   */
  buildTree(schema: ComponentSchema): BaseComponentModel {
    try {
      // 1. 验证 Schema
      this.validateSchema(schema);

      // 2. 创建 Model
      const model = this.createModel(schema);

      // 3. 如果有子组件，递归构建
      if (schema.children && schema.children.length > 0) {
        if (model instanceof BaseContainerModel) {
          this.buildChildren(model, schema.children);
        } else {
          console.warn(
            `[ComponentLoader] ${schema.type} has children but is not a container model`
          );
        }
      }

      return model;
    } catch (error) {
      console.error('[ComponentLoader] Build tree failed:', error);
      return this.createErrorPlaceholder(schema, error as Error);
    }
  }

  /**
   * 创建 Model 实例
   */
  private createModel(schema: ComponentSchema): BaseComponentModel {
    const ModelClass = this.registry.get(schema.type);

    if (!ModelClass) {
      throw new Error(`Unknown component type: ${schema.type}`);
    }

    // 使用 Injector 创建实例（自动注入依赖）
    const model: BaseComponentModel = this.instantiationService.createInstance(
      ModelClass,
      schema.id,
      schema.props
    );

    // 上报组件创建事件
    this.tracker.track('COMPONENT_CREATED', {
      type: schema.type,
      id: schema.id,
    });

    return model;
  }

  /**
   * 构建子组件
   */
  private buildChildren(
    parent: BaseContainerModel,
    childrenSchemas: ComponentSchema[]
  ): void {
    childrenSchemas.forEach((childSchema) => {
      try {
        // 递归构建子 Model
        const childModel = this.buildTree(childSchema);

        // 添加到父 Model
        parent['addChild'](childModel);
      } catch (error) {
        console.error('[ComponentLoader] Child build failed:', error);

        // 创建错误占位组件
        const placeholder = this.createErrorPlaceholder(childSchema, error as Error);
        parent['addChild'](placeholder);
      }
    });
  }

  /**
   * 验证 Schema
   */
  private validateSchema(schema: ComponentSchema): void {
    if (!schema.type) {
      throw new Error('Schema must have a type field');
    }

    if (!schema.id) {
      throw new Error('Schema must have an id field');
    }

    if (!this.registry.has(schema.type)) {
      throw new Error(`Unknown component type: ${schema.type}`);
    }
  }

  /**
   * 创建错误占位组件
   */
  private createErrorPlaceholder(
    schema: ComponentSchema,
    error: Error
  ): BaseComponentModel {
    return this.instantiationService.createInstance(
      ErrorPlaceholderModel,
      `error-${schema.id}`,
      {
        originalType: schema.type,
        error: error.message,
      }
    );
  }

  /**
   * 获取注册表信息（用于调试）
   */
  getRegistryInfo(): {
    totalComponents: number;
    types: string[];
  } {
    return {
      totalComponents: this.registry.getRegisteredTypes().length,
      types: this.registry.getRegisteredTypes(),
    };
  }

  // ========== 异步加载支持 ==========

  // Model 加载器
  private modelLoaders = new Map<string, () => Promise<any>>();

  // View 加载器
  private viewLoaders = new Map<string, () => Promise<any>>();

  // Model 缓存
  private modelCache = new Map<string, any>();

  // View 缓存
  private viewCache = new Map<string, any>();

  // 组件元数据
  private metadata = new Map<string, ComponentMetadata>();

  // 加载策略
  private strategies: any[] = [];

  // 并发控制
  private readonly MODEL_CONCURRENCY = 5;  // Model 并发数（双队列模式）
  private readonly VIEW_CONCURRENCY = 3;   // View 并发数（双队列模式）
  private readonly TOTAL_CONCURRENCY = 6;  // 统一队列总并发数

  /**
   * 注册异步组件（支持分离加载）
   */
  registerAsync(
    componentName: string,
    config:
      {
        model?: () => Promise<any>;
        view?: () => Promise<any>;
        loader?: () => Promise<{ Model: any; View: any }>;
      },
    metadata?: ComponentMetadata
  ): void {
    if (config.model) {
      this.modelLoaders.set(componentName, config.model);
    }
    if (config.view) {
      this.viewLoaders.set(componentName, config.view);
    }
    // 兼容统一 loader
    if (config.loader) {
      this.modelLoaders.set(componentName, async () => {
        const { Model } = await config.loader!();
        return Model;
      });
      this.viewLoaders.set(componentName, async () => {
        const { View } = await config.loader!();
        return View;
      });
    }

    if (metadata) {
      this.metadata.set(componentName, metadata);
    }
  }

  /**
   * 批量注册异步组件
   */
  registerAsyncBatch(
    components: Record<
      string,
      {
        loader: {
          model?: () => Promise<any>;
          view?: () => Promise<any>;
          loader?: () => Promise<{ Model: any; View: any }>;
        }
        metadata?: ComponentMetadata;
      }
    >
  ): void {
    for (const [name, config] of Object.entries(components)) {
      this.registerAsync(name, config.loader, config.metadata);
    }
  }

  /**
   * 添加加载策略
   */
  addStrategy(strategy: any): void {
    this.strategies.push(strategy);
  }



  /**
   * 收集所有需要加载的组件
   */
  private collectComponents(
    schema: ComponentSchema,
    result: Array<{ type: string; schema: ComponentSchema }> = []
  ): Array<{ type: string; schema: ComponentSchema }> {
    result.push({ type: schema.type, schema });

    if (schema.children) {
      for (const child of schema.children) {
        this.collectComponents(child, result);
      }
    }

    return result;
  }




  /**
   * 加载 Model（内部使用）
   */
  private async loadModel(componentName: string): Promise<any> {
    // 1. 检查缓存
    if (this.modelCache.has(componentName)) {
      return this.modelCache.get(componentName);
    }

    // 2. 获取 loader
    const loader = this.modelLoaders.get(componentName);
    if (!loader) {
      throw new Error(`Model loader not found: ${componentName}`);
    }

    try {
      // 3. 模拟延迟（如果配置了 delayRange）
      const meta = this.metadata.get(componentName) || {};
      if (meta.delayRange) {
        const [minDelay, maxDelay] = meta.delayRange;
        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        console.log(`[ComponentLoader] ⏱️  ${componentName} Model loading with ${delay.toFixed(0)}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // 4. 加载 Model
      const Model = await loader();
      // 5. 注册到 registry (用于 buildTree)
      this.registry.register(componentName, Model);

      // 6. 缓存
      this.modelCache.set(componentName, Model);

      return Model;
    } catch (error) {
      console.error(`[ComponentLoader] Model load failed: ${componentName}`, error);

      // 注册空 Model，不阻塞其他组件
      const EmptyModel = this.createEmptyModel(componentName);
      this.registry.register(componentName, EmptyModel);
      this.modelCache.set(componentName, EmptyModel);

      // 上报错误
      this.tracker.track('MODEL_LOAD_FAILED', {
        componentName,
        error: (error as Error).message,
      });

      return EmptyModel;
    }
  }

  /**
   * 加载 View（内部使用）
   * 只负责拉取 View 资源，不建立映射关系
   */
  private async loadView(componentName: string): Promise<any> {
    // 1. 检查缓存
    if (this.viewCache.has(componentName)) {
      return this.viewCache.get(componentName);
    }

    // 2. 获取 loader
    const loader = this.viewLoaders.get(componentName);
    if (!loader) {
      throw new Error(`View loader not found: ${componentName}`);
    }

    try {
      // 3. 模拟延迟（如果配置了 delayRange）
      const meta = this.metadata.get(componentName) || {};
      if (meta.delayRange) {
        const [minDelay, maxDelay] = meta.delayRange;
        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        console.log(`[ComponentLoader] ⏱️  ${componentName} View loading with ${delay.toFixed(0)}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // 4. 加载 View（只负责拉取资源）
      const View = await loader();

      // 5. 缓存（不建立映射关系）
      this.viewCache.set(componentName, View);

      return View;
    } catch (error) {
      console.error(`[ComponentLoader] View load failed: ${componentName}`, error);

      // 缓存空 View
      const EmptyView = this.createEmptyView();
      this.viewCache.set(componentName, EmptyView);

      // 上报错误
      this.tracker.track('VIEW_LOAD_FAILED', {
        componentName,
        error: (error as Error).message,
      });

      return EmptyView;
    }
  }

  /**
   * 创建空 Model（占位符）
   */
  private createEmptyModel(componentName: string): any {
    const self = this;
    return class EmptyModel extends BaseComponentModel {
      protected async onInit(): Promise<void> {
        console.warn(`[EmptyModel] Component ${componentName} failed to load`);
        self.tracker.track('EMPTY_MODEL_RENDERED', {
          componentName,
          componentId: this.id,
        });
      }
    };
  }

  /**
   * 创建空 View（占位符）
   */
  private createEmptyView(): any {
    return () => null; // 静默失败，不渲染任何内容
  }

  /**
   * 统一建立 Model-View 映射关系
   */
  private registerModelViewMappings(componentNames: string[]): void {
    componentNames.forEach(name => {
      const Model = this.modelCache.get(name);
      const View = this.viewCache.get(name);

      if (Model && View) {
        registerModelView(Model, View);
        console.log(`[ComponentLoader] ✅ Registered mapping: ${name}`);
      } else {
        console.warn(`[ComponentLoader] ⚠️  Cannot register mapping for ${name}:`, {
          hasModel: !!Model,
          hasView: !!View
        });
      }
    });
  }

  /**
   * 处理队列（带并发控制）
   * 使用 Promise.race 实现 "完成一个，补充一个"
   */
  private async processQueue(
    queue: Array<() => Promise<void>>,
    concurrency: number
  ): Promise<void> {
    // 正在执行的任务列表
    const executing: Promise<void>[] = [];

    // 遍历所有任务
    for (const task of queue) {
      // 1. 创建任务 Promise
      // 任务完成后，从 executing 列表中移除自己
      const promise = task().then(() => {
        const index = executing.indexOf(promise);
        if (index !== -1) {
          executing.splice(index, 1);
        }
      });

      // 2. 加入执行列表
      executing.push(promise);

      // 3. 如果达到并发限制，等待任意一个任务完成
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    // 4. 等待剩余所有任务完成
    await Promise.all(executing);
  }

  /**
   * 处理统一队列（带并发控制和分类收集）
   * Model 和 View 任务在同一队列，但分别收集 Promise
   */
  private async processUnifiedQueue(
    tasks: Array<{ type: 'model' | 'view'; componentName: string; execute: () => Promise<any> }>,
    concurrency: number,
    result: { modelPromises: Map<string, Promise<any>>; viewPromises: Map<string, Promise<any>> }
  ): Promise<void> {
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      // 🔥 关键：启动任务时就收集 Promise
      const loaderPromise = task.execute();

      // 根据任务类型，将 loader Promise 存入对应容器
      if (task.type === 'model') {
        result.modelPromises.set(task.componentName, loaderPromise);
      } else {
        result.viewPromises.set(task.componentName, loaderPromise);
      }

      // 包装为 void Promise 用于并发控制
      const promise = loaderPromise.then(() => {
        // 从执行列表移除
        const index = executing.indexOf(promise);
        if (index !== -1) {
          executing.splice(index, 1);
        }
      });

      executing.push(promise);

      // 并发控制
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    // 等待所有任务完成
    await Promise.all(executing);
  }

  /**
   * 处理 Promise 队列（带并发控制）
   * 对已创建的 Promise 数组进行并发控制，不需要分类收集
   */
  private async processPromiseQueue(
    promises: Array<Promise<any>>,
    concurrency: number
  ): Promise<void> {
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      // 包装为 void Promise 用于并发控制
      const wrappedPromise = promise.then(() => {
        // 从执行列表移除
        const index = executing.indexOf(wrappedPromise);
        if (index !== -1) {
          executing.splice(index, 1);
        }
      });

      executing.push(wrappedPromise);

      // 并发控制
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    // 等待所有任务完成
    await Promise.all(executing);
  }



  /**
   * 统一队列并发加载 (Public API)
   * Model 和 View 在同一队列，按优先级排序后加载
   * 🔥 只会执行一次，后续调用返回缓存结果
   */
  public preloadComponentsUnified(schema: ComponentSchema): {
    modelTreeReady: Promise<void>;
    viewsReady: Promise<void>;
  } {
    // 🔥 如果已经加载过，直接返回缓存结果
    if (this._loadingResult) {
      console.log('⚠️  preloadComponentsUnified 已调用过，返回缓存结果');
      return this._loadingResult;
    }

    const components = this.collectComponents(schema);

    // 去重：只保留唯一的组件类型
    const uniqueTypes = new Set<string>();
    components.forEach(comp => {
      uniqueTypes.add(comp.type);
    });

    const componentNames = Array.from(uniqueTypes);

    // 🔥 新增：根据优先级排序组件
    const sortedComponentNames = this.sortComponentsByPriority(componentNames);

    // 🔥 关键：在构建队列时就创建所有 Promise 并分类收集
    const modelPromises = new Map<string, Promise<any>>();
    const viewPromises = new Map<string, Promise<any>>();
    const tasks: Array<Promise<any>> = [];

    // 先添加所有 Model 任务（按优先级顺序）
    sortedComponentNames.forEach(name => {
      const promise = this.loadModel(name);
      modelPromises.set(name, promise);
      tasks.push(promise);
    });

    // 再添加所有 View 任务（按优先级顺序）
    sortedComponentNames.forEach(name => {
      const promise = this.loadView(name);
      viewPromises.set(name, promise);
      tasks.push(promise);
    });

    // 🔥 关键：使用 Promise 队列进行并发控制
    this.processPromiseQueue(tasks, this.TOTAL_CONCURRENCY);

    // Model 全部加载完成
    const modelTreeReady = Promise.all(Array.from(modelPromises.values())).then(() => {
      console.log('✅ 所有 Model 加载完成');
    });

    // 所有资源加载完成后，统一建立映射关系
    const viewsReady = Promise.all([
      ...Array.from(modelPromises.values()),
      ...Array.from(viewPromises.values())
    ]).then(() => {
      console.log('✅ 所有资源加载完成，开始建立映射关系');
      this.registerModelViewMappings(componentNames);
      console.log('✅ 映射关系建立完成');
    });

    // 🔥 缓存结果
    this._loadingResult = {
      modelTreeReady,
      viewsReady
    };

    return this._loadingResult;
  }

  /**
   * 根据优先级排序组件
   * 优先级顺序：critical > high > normal > low
   */
  private sortComponentsByPriority(componentNames: string[]): string[] {
    // 定义优先级权重
    const priorityWeight: Record<string, number> = {
      'critical': 0,
      'high': 1,
      'normal': 2,
      'low': 3,
    };

    return componentNames.sort((a, b) => {
      const metaA = this.metadata.get(a);
      const metaB = this.metadata.get(b);

      // 获取优先级，默认为 'normal'
      const priorityA = metaA?.priority || 'normal';
      const priorityB = metaB?.priority || 'normal';

      // 按权重排序（数字越小优先级越高）
      return priorityWeight[priorityA] - priorityWeight[priorityB];
    });
  }

  /**
   * 获取 Model 加载完成的 Promise
   * 必须先调用 preloadComponentsUnified
   */
  public getModelTreeReady(): Promise<void> {
    if (!this._loadingResult) {
      throw new Error('必须先调用 preloadComponentsUnified');
    }
    return this._loadingResult.modelTreeReady;
  }

  /**
   * 获取所有资源加载完成的 Promise
   * 必须先调用 preloadComponentsUnified
   */
  public getViewsReady(): Promise<void> {
    if (!this._loadingResult) {
      throw new Error('必须先调用 preloadComponentsUnified');
    }
    return this._loadingResult.viewsReady;
  }


  /**
   * 构建 Model Tree（同步，所有 Model 已加载）
   */
  public buildModelTree(schema: ComponentSchema): BaseComponentModel {
    // 此时所有 Model 已加载，可以同步构建
    this._modelTree = this.buildTree(schema);
    return this._modelTree;
  }

  public getModelTree(): BaseComponentModel | null {
    return this._modelTree;
  }

}
