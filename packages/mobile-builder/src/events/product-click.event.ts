/**
 * 商品点击事件
 * 当用户点击商品卡片时触发
 */
export class ProductClickEvent {
  static readonly ID = 'product:click';

  constructor(
    public readonly productId: number,
    public readonly productName: string
  ) { }
}


export function makeProductClickEvent(event: ProductClickEvent) {
  return new ProductClickEvent(event.productId, event.productName);
}
