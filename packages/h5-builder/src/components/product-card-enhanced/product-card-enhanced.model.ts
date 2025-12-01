import { BaseComponentModel } from '../../bedrock/model';
import { IHttpService, ITrackerService, IPrefetchService } from '../../services/service-identifiers';
import type { HttpService } from '../../services/http.service';
import type { TrackerService } from '../../services/tracker.service';
import type { PrefetchService } from '../../services/prefetch.service';

/**
 * 增强版商品数据
 * 包含基本信息 + 用户相关的动态数据
 */
export interface EnhancedProductData {
  // ===== 基本信息（来自预加载）=====
  id: number;
  name: string;
  price: number;
  image: string;
  description?: string;

  // ===== 补充信息（来自 onInitWithPrefetchData）=====
  isFavorited?: boolean;      // 用户是否收藏
  stock?: number;             // 实时库存
  userReview?: string;        // 用户评价
  recommendations?: string[]; // 推荐理由
}

/**
 * 增强版商品卡片 Props
 */
export interface ProductCardEnhancedProps {
  productId: number;
  showPrice?: boolean;
  userId?: string;  // 用户ID，用于加载个性化数据
}

/**
 * 增强版商品卡片 Model
 * 
 * 🎯 演示场景：预加载主数据 + 加载补充数据
 * 
 * 数据加载策略：
 * 1. 预加载数据（在 Open 阶段完成）：
 *    - 商品基本信息（id, name, price, image, description）
 *    - 这些数据是静态的，可以提前加载
 * 
 * 2. 补充数据（在 Completed 阶段的 init 中加载）：
 *    - 用户收藏状态（isFavorited）
 *    - 实时库存（stock）
 *    - 用户评价（userReview）
 *    - 推荐理由（recommendations）
 *    - 这些数据依赖用户登录状态或需要实时查询
 */
export class ProductCardEnhancedModel extends BaseComponentModel<ProductCardEnhancedProps> {
  constructor(
    id: string,
    props: ProductCardEnhancedProps,
    @IHttpService private http: HttpService,
    @ITrackerService private tracker: TrackerService,
    @IPrefetchService prefetchService: PrefetchService
  ) {
    super(id, props, prefetchService);
  }

  /**
   * 🔥 场景1：没有预加载数据时调用
   * 需要加载完整的数据（基本信息 + 补充信息）
   */
  protected async onInit(): Promise<void> {
    console.log(`[EnhancedProductCard:${this.id}] 无预加载数据，加载完整数据...`);

    // 并行加载所有数据
    const [basicData, supplementData] = await Promise.all([
      this.fetchBasicData(),
      this.fetchSupplementData()
    ]);

    // 合并数据
    this.data = {
      ...basicData,
      ...supplementData
    };

    console.log(`[EnhancedProductCard:${this.id}] 完整数据加载完成`, this.data);
  }

  /**
   * 🔥 场景2：有预加载数据时调用
   * 预加载数据已经包含基本信息，只需要加载补充信息
   * 
   * @param prefetchedData 预加载的基本数据
   */
  protected async onInitWithPrefetchData(prefetchedData: EnhancedProductData): Promise<void> {
    console.log(`[EnhancedProductCard:${this.id}] 🎯 使用预加载数据，加载补充信息...`);
    console.log(`[EnhancedProductCard:${this.id}] 预加载数据:`, prefetchedData);

    // 上报预加载命中埋点
    this.tracker.track('ENHANCED_PRODUCT_PREFETCH_HIT', {
      productId: this.props.productId
    });

    // 🔥 只加载补充数据（用户相关的动态数据）
    const supplementData = await this.fetchSupplementData();

    // 🔥 合并到 this.data
    this.data = {
      ...this.data,           // 预加载的基本信息
      ...supplementData       // 补充的动态信息
    };

    console.log(`[EnhancedProductCard:${this.id}] ✅ 补充数据加载完成`, this.data);
  }

  /**
   * 激活：上报曝光埋点
   */
  protected onActive(): void {
    if (this.data) {
      this.tracker.track('ENHANCED_PRODUCT_EXPOSURE', {
        productId: this.data.id,
        productName: this.data.name,
        isFavorited: this.data.isFavorited,
        stock: this.data.stock
      });
    }
  }

  // ===== 私有方法：数据获取 =====

  /**
   * 获取商品基本数据
   * 这部分数据会被预加载
   */
  private async fetchBasicData(): Promise<Partial<EnhancedProductData>> {
    console.log(`[EnhancedProductCard:${this.id}] 📦 加载基本数据...`);

    // 模拟 API 请求延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    const descriptions = [
      '高品质商品，值得信赖',
      '热销爆款，限时优惠',
      '新品上市，抢先体验',
      '经典款式，永不过时',
    ];

    return {
      id: this.props.productId,
      name: `商品 ${this.props.productId}`,
      price: Math.floor(Math.random() * 1000) + 100,
      image: "https://p16-oec-ttp.tiktokcdn-us.com/tos-useast5-i-omjb5zjo8w-tx/664b2911bd14497cb49a6941896f5903.jpg~tplv-omjb5zjo8w-caravel-origin-fmt.image",
      description: descriptions[Math.floor(Math.random() * descriptions.length)]
    };
  }

  /**
   * 获取补充数据（用户相关的动态数据）
   * 这部分数据不会被预加载，需要实时获取
   */
  private async fetchSupplementData(): Promise<Partial<EnhancedProductData>> {
    console.log(`[EnhancedProductCard:${this.id}] 🔄 加载补充数据（用户相关）...`);

    // 模拟并行加载多个补充数据
    const [isFavorited, stock, userReview, recommendations] = await Promise.all([
      this.fetchFavoriteStatus(),
      this.fetchRealTimeStock(),
      this.fetchUserReview(),
      this.fetchRecommendations()
    ]);

    return {
      isFavorited,
      stock,
      userReview,
      recommendations
    };
  }

  /**
   * 获取用户收藏状态
   */
  private async fetchFavoriteStatus(): Promise<boolean> {
    // 模拟 API 请求
    await new Promise(resolve => setTimeout(resolve, 200));

    // 模拟：30% 的商品被收藏
    return Math.random() < 0.3;
  }

  /**
   * 获取实时库存
   */
  private async fetchRealTimeStock(): Promise<number> {
    // 模拟 API 请求
    await new Promise(resolve => setTimeout(resolve, 150));

    // 模拟库存：0-100
    return Math.floor(Math.random() * 100);
  }

  /**
   * 获取用户评价
   */
  private async fetchUserReview(): Promise<string | undefined> {
    // 模拟 API 请求
    await new Promise(resolve => setTimeout(resolve, 180));

    const reviews = [
      '质量很好，值得购买！',
      '性价比超高，推荐！',
      '用了一段时间，很满意',
      undefined  // 用户可能没有评价
    ];

    return reviews[Math.floor(Math.random() * reviews.length)];
  }

  /**
   * 获取推荐理由
   */
  private async fetchRecommendations(): Promise<string[]> {
    // 模拟 API 请求
    await new Promise(resolve => setTimeout(resolve, 220));

    const allReasons = [
      '基于您的浏览历史推荐',
      '同类商品热销榜第一',
      '好友也在看',
      '限时优惠中',
      '新品上市'
    ];

    // 随机返回 1-3 个推荐理由
    const count = Math.floor(Math.random() * 3) + 1;
    return allReasons.slice(0, count);
  }

  // ===== 公共方法 =====

  /**
   * 切换收藏状态
   */
  toggleFavorite(): void {
    if (!this.data) return;

    // 直接切换状态
    this.data.isFavorited = !this.data.isFavorited;

    // 上报埋点
    this.tracker.track('PRODUCT_FAVORITE_TOGGLE', {
      productId: this.data.id,
      isFavorited: this.data.isFavorited
    });

    console.log(`[ProductCardEnhanced:${this.id}] 收藏状态切换为: ${this.data.isFavorited}`);
  }
}
