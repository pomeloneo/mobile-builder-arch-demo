import { BaseComponentModel } from '../../bedrock/model/model';
import { IPrefetchService } from '../../services/service-identifiers';
import type { PrefetchService } from '../../services/prefetch.service';
import { IEventBus, type IEventBus as IEventBusType } from '../../bedrock/event';
import { ProductClickEvent } from '../../events';

/**
 * 文本卡片 Props
 */
export interface TextCardProps {
  title: string;
  content: string;
  lines?: number; // 内容行数（1-5）
}

/**
 * 文本卡片 Model
 * 高度由内容行数决定（小）
 * 
 * 🔥 示例：订阅 ProductClickEvent，展示跨组件通信
 */
export class TextCardModel extends BaseComponentModel<TextCardProps> {
  constructor(
    id: string,
    props: TextCardProps,
    @IPrefetchService prefetchService: PrefetchService,
    @IEventBus private eventBus: IEventBusType  // 🔥 注入 EventBus
  ) {
    super(id, props, prefetchService);
  }

  protected async onInit(): Promise<void> {
    // 🔥 订阅商品点击事件
    this.register(
      this.eventBus.subscribe(ProductClickEvent, (event) => {
        console.log(`[TextCard:${this.id}] 收到商品点击通知: ${event.productName} (ID: ${event.productId})`);
      })
    );
  }
}

