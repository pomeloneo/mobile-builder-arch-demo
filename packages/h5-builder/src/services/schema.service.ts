import { observable } from 'mobx-vue-lite';
import { IDisposable } from '../bedrock/dispose';
import { ComponentSchema } from './component.service';
import { schema } from '@/mock/demo-data';


export class SchemaService implements IDisposable {
  readonly _serviceBrand: undefined;

  private _schema: ComponentSchema | null = null;

  constructor() {
    // 使整个对象响应式
    return observable(this) as this;
  }

  public getSchema(): ComponentSchema | null {
    return this._schema;
  }



  async fetchSchema(): Promise<ComponentSchema> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    this._schema = schema;
    return schema;
  }

  dispose(): void {

  }
}
