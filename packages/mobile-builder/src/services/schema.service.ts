import { observable } from 'mobx-vue-lite';
import { IDisposable } from '../bedrock/dispose';
import { ComponentSchema, PageSchema, PrefetchConfigs } from './component.service';
import { pageSchema } from '@/mock/demo-data';


export class SchemaService implements IDisposable {
  readonly _serviceBrand: undefined;

  private _schema: PageSchema | null = null;

  constructor() {
    // 使整个对象响应式
    return observable(this) as this;
  }

  /**
   * 获取完整的 PageSchema
   */
  public getSchema(): PageSchema | null {
    return this._schema;
  }

  /**
   * 获取页面结构（root）
   */
  public getRoot(): ComponentSchema | null {
    return this._schema?.root || null;
  }

  /**
   * 获取预加载配置
   */
  public getPrefetchConfigs(): PrefetchConfigs | undefined {
    return this._schema?.prefetch;
  }

  /**
   * 获取 Schema（返回 PageSchema）
   */
  async fetchSchema(): Promise<PageSchema> {
    const promise = new Promise<PageSchema>((resolve) => {
      setTimeout(() => {
        this._schema = pageSchema;
        resolve(pageSchema)
      }, 1000);
    })

    return promise;
  }

  dispose(): void {

  }
}
