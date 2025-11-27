import { Injector } from '../kernel/di';
import { BaseComponentModel, BaseContainerModel } from '../kernel/model';
import { TrackerService } from '../modules/tracker.service';
import { ErrorPlaceholderModel } from './placeholders';
import { registerModelView } from '../components/model-renderer';

/**
 * 组件元数据
 */
export interface ComponentMetadata {
  // 加载优先级
  priority?: 'critical' | 'high' | 'normal' | 'low';

  // 依赖的其他组件
  dependencies?: string[];

  // 是否预加载
  preload?: boolean;

  // 加载延迟范围（ms）
  delayRange?: [number, number];

  // 是否可以延迟加载
  lazy?: boolean;
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
 * 组件加载器
 * 负责将树形 Schema 转换为树形 Model Tree
 */
export class ComponentLoader {
  private registry = new ComponentRegistry();

  constructor(
    private injector: Injector,
    private tracker: TrackerService
  ) { }

  /**
   * 注册组件
   */
  register(type: string, ModelClass: any): void {
    this.registry.register(type, ModelClass);
  }

  /**
   * 批量注册组件
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
    const model = this.injector.resolveAndInstantiate<BaseComponentModel>(
      ModelClass,
      [schema.id, schema.props]
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
    return this.injector.resolveAndInstantiate<ErrorPlaceholderModel>(
      ErrorPlaceholderModel,
      [
        `error-${schema.id}`,
        {
          originalType: schema.type,
          error: error.message,
        },
      ]
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
  private readonly MODEL_CONCURRENCY = 5;  // Model 并发数
  private readonly VIEW_CONCURRENCY = 3;   // View 并发数

  /**
   * 注册异步组件（支持分离加载）
   */
  registerAsync(
    componentName: string,
    config:
      | (() => Promise<{ Model: any; View: any }>)
      | {
        model?: () => Promise<any>;
        view?: () => Promise<any>;
        loader?: () => Promise<{ Model: any; View: any }>;
      },
    metadata?: ComponentMetadata
  ): void {
    // 兼容旧 API: 直接传入 loader 函数
    if (typeof config === 'function') {
      const loader = config;
      this.modelLoaders.set(componentName, async () => {
        const { Model } = await loader();
        return Model;
      });
      this.viewLoaders.set(componentName, async () => {
        const { View } = await loader();
        return View;
      });
    } else {
      // 新 API: 分离的 loader
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
        loader: () => Promise<{ Model: any; View: any }>;
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

      // 4. 加载 View
      const View = await loader();

      // 5. 获取对应的 Model
      const Model = this.modelCache.get(componentName);
      if (!Model) {
        throw new Error(`Model not loaded: ${componentName}`);
      }

      // 6. 注册 Model-View 映射
      registerModelView(Model, View);

      // 7. 缓存
      this.viewCache.set(componentName, View);

      return View;
    } catch (error) {
      console.error(`[ComponentLoader] View load failed: ${componentName}`, error);

      // 注册空 View，不阻塞其他组件
      const Model = this.modelCache.get(componentName);
      if (Model) {
        const EmptyView = this.createEmptyView();
        registerModelView(Model, EmptyView);
        this.viewCache.set(componentName, EmptyView);
      }

      // 上报错误
      this.tracker.track('VIEW_LOAD_FAILED', {
        componentName,
        error: (error as Error).message,
      });

      return null;
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
   * 处理队列（带并发控制）
   */
  private async processQueue(
    queue: Array<() => Promise<void>>,
    concurrency: number
  ): Promise<void> {
    const executing: Promise<void>[] = [];

    for (const task of queue) {
      const promise = task().then(() => {
        executing.splice(executing.indexOf(promise), 1);
      }).catch((error) => {
        // 错误已在 loadModel/loadView 中处理，这里只需移除
        executing.splice(executing.indexOf(promise), 1);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }

  /**
   * 双队列并行加载
   */
  private async loadWithDualQueue(schema: ComponentSchema): Promise<{
    modelTreeReady: Promise<void>;
    viewsReady: Promise<void>;
  }> {
    const components = this.collectComponents(schema);

    // 构建加载队列
    const modelQueue: Array<() => Promise<void>> = [];
    const viewQueue: Array<() => Promise<void>> = [];

    // 去重：只保留唯一的组件类型
    const uniqueTypes = new Set<string>();
    components.forEach(comp => {
      if (!uniqueTypes.has(comp.type)) {
        uniqueTypes.add(comp.type);
        modelQueue.push(() => this.loadModel(comp.type));
        viewQueue.push(() => this.loadView(comp.type));
      }
    });

    // 并行启动两个队列
    const modelPromise = this.processQueue(modelQueue, this.MODEL_CONCURRENCY);
    const viewPromise = this.processQueue(viewQueue, this.VIEW_CONCURRENCY);

    return {
      modelTreeReady: modelPromise,
      viewsReady: viewPromise,
    };
  }

  /**
   * 构建 Model Tree（同步，所有 Model 已加载）
   */
  private buildModelTree(schema: ComponentSchema): BaseComponentModel {
    // 此时所有 Model 已加载，可以同步构建
    return this.buildTree(schema);
  }

  /**
   * 使用分离加载构建组件树
   */
  async buildTreeWithSplitLoading(schema: ComponentSchema): Promise<BaseComponentModel> {
    try {
      console.log('[ComponentLoader] Starting split loading...');

      // 1. 启动双队列并行加载
      const { modelTreeReady, viewsReady } = await this.loadWithDualQueue(schema);

      // 2. 等待 Model 队列完成
      await modelTreeReady;
      console.log('[ComponentLoader] Model queue completed');

      // 3. 构建 Model Tree（此时 View 还在后台加载）
      const modelTree = this.buildModelTree(schema);
      console.log('[ComponentLoader] Model tree built');

      // 4. 等待 View 加载完成（不初始化数据，由外层控制）
      await viewsReady;

      console.log('[ComponentLoader] Split loading completed');
      return modelTree;
    } catch (error) {
      console.error('[ComponentLoader] Split loading failed:', error);
      return this.createErrorPlaceholder(schema, error as Error);
    }
  }


}
