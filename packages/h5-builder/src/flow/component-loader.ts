import { Injector } from '../kernel/di';
import { BaseComponentModel, BaseContainerModel } from '../kernel/model';
import { TrackerService } from '../modules/tracker.service';
import { ErrorPlaceholderModel } from './placeholders';

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
}
