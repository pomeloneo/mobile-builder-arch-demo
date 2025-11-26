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

  // 异步加载器
  private asyncLoaders = new Map<
    string,
    () => Promise<{ Model: any; View: any }>
  >();

  // 组件元数据
  private metadata = new Map<string, ComponentMetadata>();

  // 加载策略
  private strategies: any[] = [];

  /**
   * 注册异步组件
   */
  registerAsync(
    componentName: string,
    loader: () => Promise<{ Model: any; View: any }>,
    metadata?: ComponentMetadata
  ): void {
    this.asyncLoaders.set(componentName, loader);

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
   * 预加载组件
   */
  async preload(componentNames: string[]): Promise<void> {
    await Promise.all(
      componentNames.map(name => this.loadComponent(name))
    );
  }

  /**
   * 构建组件树（异步版本）
   */
  async buildTreeAsync(
    schema: ComponentSchema,
    context?: any
  ): Promise<BaseComponentModel> {
    try {
      // 1. 收集所有需要加载的组件
      const componentsToLoad = this.collectComponents(schema);

      // 2. 去重：只保留唯一的组件类型
      const uniqueTypes = new Map<string, { type: string; schema: ComponentSchema }>();
      for (const comp of componentsToLoad) {
        if (!uniqueTypes.has(comp.type)) {
          uniqueTypes.set(comp.type, comp);
        }
      }

      // 3. 应用加载策略（可选 - 暂时禁用以确保所有组件都被加载）
      // const filteredComponents = this.applyStrategies(
      //   Array.from(uniqueTypes.values()),
      //   context || {}
      // );

      // 4. 按优先级加载所有唯一的组件类型
      await this.loadComponentsWithPriority(
        Array.from(uniqueTypes.values()),
        context
      );

      // 5. 构建组件树（使用同步方法）
      return this.buildTree(schema);
    } catch (error) {
      console.error('[ComponentLoader] Build tree async failed:', error);
      return this.createErrorPlaceholder(schema, error as Error);
    }
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
   * 应用加载策略
   */
  private applyStrategies(
    components: Array<{ type: string; schema: ComponentSchema }>,
    context: any
  ) {
    let filtered = components;

    for (const strategy of this.strategies) {
      filtered = filtered.filter(comp =>
        strategy.shouldLoad(comp.schema, context)
      );
    }

    return filtered;
  }

  /**
   * 按优先级加载组件
   */
  private async loadComponentsWithPriority(
    components: Array<{ type: string; schema: ComponentSchema }>,
    context?: any
  ): Promise<void> {
    // 1. 计算每个组件的优先级
    const componentsWithPriority = components.map(comp => {
      const meta = this.getMetadata(comp.type, comp.schema);
      let priority = this.getPriority(meta);

      // 2. 应用策略调整优先级
      for (const strategy of this.strategies) {
        if (strategy.adjustPriority) {
          priority = strategy.adjustPriority(comp.schema, priority);
        }
      }

      return { ...comp, priority };
    });

    // 3. 按优先级排序
    componentsWithPriority.sort((a, b) => b.priority - a.priority);

    // 4. 按顺序加载（保持优先级顺序）
    for (const comp of componentsWithPriority) {
      await this.loadComponent(comp.type);
    }
  }

  /**
   * 获取组件元数据
   */
  private getMetadata(
    componentName: string,
    schema?: ComponentSchema
  ): ComponentMetadata {
    // 优先使用 schema 中的 meta
    if (schema?.meta) {
      return { ...this.metadata.get(componentName), ...schema.meta };
    }

    return this.metadata.get(componentName) || {};
  }

  /**
   * 获取优先级数值
   */
  private getPriority(meta: ComponentMetadata): number {
    const priorityMap = {
      critical: 1000,
      high: 100,
      normal: 10,
      low: 1,
    };

    return priorityMap[meta.priority || 'normal'];
  }

  /**
   * 加载组件（内部使用）
   */
  private async loadComponent(componentName: string): Promise<any> {
    // 1. 检查缓存
    if (this.registry.has(componentName)) {
      return this.registry.get(componentName);
    }

    // 2. 获取元数据
    const meta = this.metadata.get(componentName) || {};

    // 3. 加载依赖
    if (meta.dependencies) {
      await Promise.all(
        meta.dependencies.map(dep => this.loadComponent(dep))
      );
    }

    // 4. 模拟延迟
    const [minDelay, maxDelay] = meta.delayRange || [300, 1500];
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;

    // console.log(`[ComponentLoader] 🔄 Loading ${componentName}...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // 5. 动态 import
    const loader = this.asyncLoaders.get(componentName);
    if (!loader) {
      throw new Error(`Component ${componentName} not registered`);
    }

    const { Model, View } = await loader();

    // 6. 注册 Model
    this.registry.register(componentName, Model);

    // 7. 注册 View
    registerModelView(Model, View);

    // console.log(
    //   `[ComponentLoader] ✅ Loaded ${componentName} in ${delay.toFixed(0)}ms`
    // );

    return Model;
  }
}
