import { BaseComponentModel } from '../kernel/model';
import { Inject } from '../kernel/di';
import { HttpService } from '../modules/http.service';
import { TrackerService } from '../modules/tracker.service';

/**
 * 商品数据
 */
export interface ProductData {
  id: number;
  name: string;
  price: number;
  image: string;
  description?: string;
}

/**
 * 商品卡片 Props
 */
export interface ProductCardProps {
  productId: number;
  showPrice?: boolean;
}

/**
 * 商品卡片 Model
 * 展示如何在 Model 中处理数据加载、状态管理、埋点上报
 */
export class ProductCardModel extends BaseComponentModel<ProductCardProps> {
  // 响应式状态
  public loading = false;
  public error: Error | null = null;
  public data: ProductData | null = null;

  constructor(
    id: string,
    props: ProductCardProps,
    @Inject(HttpService) private http: HttpService,
    @Inject(TrackerService) private tracker: TrackerService
  ) {
    super(id, props);
  }

  /**
   * 初始化：加载商品数据
   */
  protected async onInit(): Promise<void> {
    await this.loadData();
  }

  /**
   * 激活：上报曝光埋点
   */
  protected onActive(): void {
    if (this.data) {
      this.tracker.track('PRODUCT_EXPOSURE', {
        productId: this.data.id,
        productName: this.data.name,
      });
    }
  }

  /**
   * 加载商品数据
   */
  private async loadData(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.data = await this.http.get<ProductData>(
        `/api/product/${this.props.productId}`
      );

      this.tracker.track('PRODUCT_LOADED', {
        productId: this.props.productId,
        productName: this.data.name,
      });
    } catch (error) {
      this.error = error as Error;

      this.tracker.track('PRODUCT_LOAD_ERROR', {
        productId: this.props.productId,
        error: (error as Error).message,
      });
    } finally {
      this.loading = false;
    }
  }

  /**
   * 点击商品卡片
   */
  handleClick(): void {
    if (!this.data) return;

    this.tracker.track('PRODUCT_CLICK', {
      productId: this.data.id,
      productName: this.data.name,
    });

    // 这里可以触发导航等操作
    console.log(`[ProductCard] Clicked: ${this.data.name}`);
  }

  /**
   * 计算属性：是否显示价格
   */
  get shouldShowPrice(): boolean {
    return this.props.showPrice !== false;
  }

  /**
   * 计算属性：格式化价格
   */
  get formattedPrice(): string {
    if (!this.data || !this.shouldShowPrice) return '';
    return `¥${this.data.price.toFixed(2)}`;
  }
}
