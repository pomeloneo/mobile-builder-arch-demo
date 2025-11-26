import { BaseComponentModel } from '../../kernel/model';
import { Inject } from '../../kernel/di';
import { HttpService } from '../../modules/http.service';
import { TrackerService } from '../../modules/tracker.service';

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
  // data, loading, error 已在基类定义

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
    await this.refresh();
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
   * 获取数据
   */
  async fetchData(): Promise<void> {
    // 🧪 测试渐进式渲染：每个卡片延迟递增 200ms
    // 第1个卡片 200ms，第2个 400ms，第3个 600ms...
    const delay = Math.min(this.props.productId * 200, 5000);
    console.log(`[ProductCard:${this.id}] Fetching data with ${delay}ms delay...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // 模拟 API 响应
    const mockData: ProductData = {
      id: this.props.productId,
      name: `商品 ${this.props.productId}`,
      price: Math.floor(Math.random() * 10000) / 100,
      image: `https://p16-oec-general-useast5.ttcdn-us.com/tos-useast5-i-omjb5zjo8w-tx/ba781dbf25134621b7b05b7919cacee8~tplv-fhlh96nyum-crop-webp:360:360.webp?dr=12190&from=1578644683&idc=useast5&ps=933b5bde&shcp=b4b98b7c&shp=5e1834cb&t=555f072d`,
      description: '这是一个模拟的商品描述，展示了异步数据加载的能力。',
    };

    // 模拟随机错误
    // if (Math.random() < 0.1) {
    //   throw new Error('模拟的网络错误');
    // }

    this.data = mockData;

    this.tracker.track('PRODUCT_LOADED', {
      productId: this.props.productId,
      productName: this.data.name,
    });
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
