import { ComponentSchema } from '../services/component.service';

export const textContents = [
  '这是一段简短的文本内容。',
  '这是一段中等长度的文本内容，包含了更多的信息和细节描述。',
  '这是一段较长的文本内容，包含了非常详细的信息描述，可以用来测试不同高度的组件在虚拟滚动中的表现。我们需要确保虚拟滚动能够正确处理各种高度的组件。',
  '这是一段非常长的文本内容，包含了大量的详细信息和描述。这段文本可以用来测试组件在不同高度下的渲染效果，以及虚拟滚动在处理大量不同高度组件时的性能表现。我们希望通过这个测试来验证虚拟滚动的稳定性和可靠性。',
];

export const schema: ComponentSchema = {
  type: 'TabsContainer',
  id: 'main-tabs',
  props: {
    defaultIndex: 0,
    // 虚拟滚动配置
    virtualScroll: {
      threshold: 25,             // 超过 15 个就启用虚拟滚动
      estimatedItemHeight: 120,  // 估算高度（动态高度模式）
      containerHeight: 600,      // 容器高度
    },
  },
  children: [
    // Tab 1: 混合高度组件（文本卡片 + 商品卡片）
    {
      type: 'ProductList',
      id: 'tab-1-list',
      props: {},
      children: Array.from({ length: 20 }, (_, i) => {
        // 每 3 个商品卡片插入 1-2 个文本卡片
        if (i % 3 === 0) {
          const textCards = [];
          // 随机 1-2 个文本卡片
          const textCardCount = (i % 2) + 1;
          for (let j = 0; j < textCardCount; j++) {
            const lines = ((i + j) % 4) + 1; // 1-4 行
            textCards.push({
              type: 'TextCard',
              id: `tab1-text-${i}-${j}`,
              props: {
                title: `文本卡片 #${i}-${j}`,
                content: textContents[(i + j) % textContents.length],
                lines: lines,
              },
            });
          }
          return textCards;
        }
        // 商品卡片
        return {
          type: 'ProductCard',
          id: `tab1-product-${i}`,
          props: {
            productId: i + 1,
            showPrice: true,
          },
        };
      }).flat(),
    },

    // Tab 2: 嵌套容器 - 实验容器根据实验信息动态渲染
    {
      type: 'ProductList',
      id: 'tab-2-list',
      props: {},
      children: Array.from({ length: 30 }, (_, i) => {
        // 每 5 个商品插入一个实验容器
        if (i % 5 === 0) {
          return {
            type: 'ExperimentContainer',
            id: `tab2-experiment-${i}`,
            props: {
              experimentKey: `product_card_style_${i}`,
              variants: {
                control: [],       // 对照组：不显示
                variant_a: [0],    // 实验组 A：显示文本卡片 (索引 0)
                variant_b: [1],    // 实验组 B：显示商品卡片 (索引 1)
              },
            },
            // 实验容器的子组件（根据实验分组决定渲染哪些）
            children: [
              {
                type: 'TextCard',
                id: `tab2-experiment-${i}-text`,
                props: {
                  title: `🧪 实验组内容 #${i}`,
                  content: `这是实验容器内的文本卡片，根据实验分组动态渲染。${textContents[i % textContents.length]}`,
                  lines: 3,
                },
              },
              {
                type: 'ProductCard',
                id: `tab2-experiment-${i}-product`,
                props: {
                  productId: i + 100,
                  showPrice: true,
                },
              },
            ],
          };
        }
        // 普通商品卡片
        return {
          type: 'ProductCard',
          id: `tab2-product-${i}`,
          props: {
            productId: i + 50,
            showPrice: true,
          },
        };
      }),
    },

    // Tab 3: 大量混合组件（测试虚拟滚动性能）
    {
      type: 'ProductList',
      id: 'tab-3-list',
      props: {},
      children: Array.from({ length: 100 }, (_, i) => {
        const type = i % 4;
        if (type === 0) {
          // 短文本卡片
          return {
            type: 'TextCard',
            id: `tab3-text-short-${i}`,
            props: {
              title: `短文本 #${i}`,
              content: textContents[0],
              lines: 1,
            },
          };
        } else if (type === 1) {
          // 长文本卡片
          return {
            type: 'TextCard',
            id: `tab3-text-long-${i}`,
            props: {
              title: `长文本 #${i}`,
              content: textContents[3],
              lines: 5,
            },
          };
        } else {
          // 商品卡片
          return {
            type: 'ProductCard',
            id: `tab3-product-${i}`,
            props: {
              productId: i + 200,
              showPrice: true,
            },
          };
        }
      }),
    },

    // Tab 4: 深度嵌套容器（展示容器嵌套能力）
    {
      type: 'ProductList',
      id: 'tab-4-list',
      props: {},
      children: [
        // 第1层：时间段容器
        {
          type: 'TimeBasedContainer',
          id: 'tab4-time-container',
          props: {
            timeSlots: {
              morning: { startHour: 6, endHour: 12 },
              afternoon: { startHour: 12, endHour: 18 },
              evening: { startHour: 18, endHour: 24 },
              night: { startHour: 0, endHour: 6 },
            },
          },
          children: [
            // 第2层：条件容器（VIP 用户）
            {
              type: 'ConditionalContainer',
              id: 'tab4-vip-container',
              props: {
                condition: 'user_vip',
              },
              children: [
                {
                  type: 'TextCard',
                  id: 'tab4-vip-welcome',
                  props: {
                    title: '🌟 VIP 专属',
                    content: '尊贵的 VIP 用户，欢迎您！享受专属优惠和服务。',
                    lines: 2,
                  },
                },
                // 第3层：网格布局容器
                {
                  type: 'GridLayoutContainer',
                  id: 'tab4-vip-grid',
                  props: {
                    columns: 2,
                    gap: 8,
                  },
                  children: [
                    {
                      type: 'ProductCard',
                      id: 'tab4-vip-product-1',
                      props: { productId: 301, showPrice: true },
                    },
                    {
                      type: 'ProductCard',
                      id: 'tab4-vip-product-2',
                      props: { productId: 302, showPrice: true },
                    },
                  ],
                },
              ],
            },

            // 第2层：条件容器（新用户）
            {
              type: 'ConditionalContainer',
              id: 'tab4-new-user-container',
              props: {
                condition: 'user_new',
              },
              children: [
                {
                  type: 'TextCard',
                  id: 'tab4-new-user-welcome',
                  props: {
                    title: '👋 新用户欢迎',
                    content: '欢迎新用户！这里有新手专享优惠等你来领取。',
                    lines: 2,
                  },
                },
                // 第3层：实验容器
                {
                  type: 'ExperimentContainer',
                  id: 'tab4-new-user-experiment',
                  props: {
                    experimentKey: 'new_user_guide',
                    variants: {
                      control: [],       // 对照组：不显示
                      variant_a: [0],    // 实验组 A：显示指南
                      variant_b: [1],    // 实验组 B：显示步骤网格
                    },
                  },
                  children: [
                    {
                      type: 'TextCard',
                      id: 'tab4-experiment-guide',
                      props: {
                        title: '📖 新手指南',
                        content: '跟随指引，快速了解我们的产品和服务。',
                        lines: 3,
                      },
                    },
                    // 第4层：网格布局
                    {
                      type: 'GridLayoutContainer',
                      id: 'tab4-experiment-grid',
                      props: {
                        columns: 3,
                        gap: 4,
                      },
                      children: [
                        {
                          type: 'TextCard',
                          id: 'tab4-guide-1',
                          props: { title: '步骤1', content: '注册账号', lines: 1 },
                        },
                        {
                          type: 'TextCard',
                          id: 'tab4-guide-2',
                          props: { title: '步骤2', content: '完善资料', lines: 1 },
                        },
                        {
                          type: 'TextCard',
                          id: 'tab4-guide-3',
                          props: { title: '步骤3', content: '开始购物', lines: 1 },
                        },
                      ],
                    },
                  ],
                },
              ],
            },

            // 第2层：随机惊喜容器
            {
              type: 'ConditionalContainer',
              id: 'tab4-surprise-container',
              props: {
                condition: 'random',
                probability: 0.7, // 70% 概率显示
              },
              children: [
                {
                  type: 'TextCard',
                  id: 'tab4-surprise',
                  props: {
                    title: '🎁 惊喜福利',
                    content: '恭喜你！获得了一个随机惊喜福利，快来领取吧！',
                    lines: 2,
                  },
                },
                // 第3层：网格布局（惊喜商品）
                {
                  type: 'GridLayoutContainer',
                  id: 'tab4-surprise-grid',
                  props: {
                    columns: 2,
                    gap: 8,
                  },
                  children: Array.from({ length: 4 }, (_, i) => ({
                    type: 'ProductCard',
                    id: `tab4-surprise-product-${i}`,
                    props: { productId: 400 + i, showPrice: true },
                  })),
                },
              ],
            },
          ],
        },

        // 普通商品列表（作为对比）
        ...Array.from({ length: 10 }, (_, i) => ({
          type: 'ProductCard',
          id: `tab4-normal-product-${i}`,
          props: { productId: 500 + i, showPrice: true },
        })),
      ],
    },
  ],
};
