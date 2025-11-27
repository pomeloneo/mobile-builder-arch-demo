## 项目分析摘要

* Demo 入口与流程：`demo-async.tsx` 通过依赖注入初始化服务 → 注册异步组件 → 应用 Tab 感知策略 → 异步构建模型树 → 用 `JobScheduler` 分阶段执行初始化与渲染，最终用 `ModelRenderer` 渲染根模型（packages/h5-builder/src/demo-async.tsx:23,62,575,582）。

* 依赖注入：`Injector` 支持 `@Inject` 装饰器、父子容器、资源级联销毁（packages/h5-builder/src/kernel/di.ts:97,119）。

* 组件装载：`ComponentLoader` 支持同步与异步注册、按优先级加载、策略调整、错误占位；动态 import 后注册 Model 与 View 映射（packages/h5-builder/src/flow/component-loader.ts:296,390,450,485）。

* 生命周期与容器：`BaseComponentModel` 提供 init/activate/deactivate/dispose；`BaseContainerModel` 默认初始化并激活所有子组件，Tabs 容器覆写为懒加载与闲时预热（packages/h5-builder/src/kernel/model.ts:60,165; packages/h5-builder/src/components/tabs-container/tabs-container.model.ts:63,198）。

* 虚拟滚动：支持固定高度与动态高度（估算+测量），Tabs 容器自动检测并启用虚拟滚动（packages/h5-builder/src/components/virtual-list/virtual-list.model.ts:71,119,183; packages/h5-builder/src/components/tabs-container/tabs-container.model.ts:94,126,150）。

* JSBridge/HTTP/埋点：Bridge 调度（含浏览器 Mock）、Http 拦截器与取消、Tracker 队列/批量/持久化，页面上下文服务（packages/h5-builder/src/modules/bridge.service.ts:69,105; packages/h5-builder/src/modules/http.service.ts:110,168; packages/h5-builder/src/modules/tracker.service.ts:140,229; packages/h5-builder/src/modules/context.service.ts:113）。

* 渲染绑定：`ModelRenderer` 基于 Model→View 映射递归渲染，已默认注册部分组件（packages/h5-builder/src/components/model-renderer.tsx:33,50）。

* 文档要点：组件开发指南、API 文档、自动虚拟滚动说明；部分文档存在断链（packages/h5-builder/docs/component\_development\_guide.md:151; packages/h5-builder/docs/api\_reference.md; packages/h5-builder/docs/auto-virtual-scroll.md）。

## 关键问题与影响

* 生命周期异步语义不一致：`BaseComponentModel.init()` 非 async，调用 `onInit()` 不等待，导致上层 `await rootModel.init()` 无效，容器 `await child.init()` 也不能保证子组件初始化完成（packages/h5-builder/src/kernel/model.ts:60）。

* Bridge 与 Http 契约不统一：Bridge 原生返回 `data`（已解包），Mock 返回 `BridgeResponse`；而 HttpService 期望 `HttpResponse<T>`，在原生模式下 `finalResponse.data` 为 `undefined`（packages/h5-builder/src/modules/bridge.service.ts:90,95; packages/h5-builder/src/modules/http.service.ts:138,153）。

* 加载策略未真正生效：`applyStrategies` 被注释，`TabAwareStrategy` 的上下文只在优先级调整中使用，未过滤加载集合（packages/h5-builder/src/flow/component-loader.ts:332）。

* Tabs 闲时预热索引计算存在偏差风险：基于过滤后的相对索引推断真实索引，复杂场景下可能错位（packages/h5-builder/src/components/tabs-container/tabs-container.model.ts:205-213）。

* 文档断链：开发指南示例路径指向另一个仓库用户目录（packages/h5-builder/docs/component\_development\_guide.md:500-506）。

## 改造目标

* 明确并统一“异步生命周期”的语义，保证初始化顺序可控与可等待。

* 统一 Bridge/HTTP 返回契约，避免环境差异导致的数据结构不一致。

* 让加载策略真正参与“是否加载”的决策，并按上下文动态排序。

* 提升虚拟滚动与 Tabs 的稳定性与可观测性（埋点、日志）。

* 完善文档与测试，提升可维护性与可扩展性。

## 实施方案

### 1) 生命周期异步化改造

1. 将 `BaseComponentModel.init()` 改为 `async`，返回 `Promise<void>`，内部 `await this.onInit()`（packages/h5-builder/src/kernel/model.ts）。
2. `BaseContainerModel.onInit()` 真正 `await child.init()`，并在容器场景提供“串行/并行”选项；Tabs 只初始化首屏 Tab，其余在闲时预热时 `await tab.init()`（packages/h5-builder/src/kernel/model.ts; packages/h5-builder/src/components/tabs-container/tabs-container.model.ts）。
3. 调整所有调用方：`demo-async` 的 `scheduler` 里 `init-root-model` 保持 `await rootModel.init()`；子组件初始化语义将随基类改动生效（packages/h5-builder/src/demo-async.tsx:587）。

### 2) Bridge/HTTP 契约统一

1. 统一 Bridge 返回：`BridgeService.call<T>` 改为返回 `BridgeResponse<T>`，并在原生模式与 Mock 模式保持一致（packages/h5-builder/src/modules/bridge.service.ts:54）。
2. 调整 Http：`HttpService.request` 期望 `BridgeResponse<T>`，先校验 `code===0`，再读取 `data`；必要时补全 `status/statusText/headers` 的默认值（packages/h5-builder/src/modules/http.service.ts:138）。
3. 补充 Mock：`BridgeService.setupMockResponses()` 的 `fetch` 响应改为完整 `BridgeResponse`，并在文档中明确契约（packages/h5-builder/src/modules/bridge.service.ts:140; packages/h5-builder/docs/api\_reference.md）。
4. 回归测试：新增原生/Mock 两种模式下的请求单测，覆盖错误分支与拦截器链路。

### 3) 策略驱动加载生效

1. 启用 `applyStrategies`：恢复策略过滤逻辑，并将 `context` 传入（packages/h5-builder/src/flow/component-loader.ts:332）。
2. 丰富上下文：从 `TabsContainerModel` 与页面上下文提供 `activeTabIndex/user/network/device`，用于策略决策（packages/h5-builder/src/flow/loading-strategy.ts）。
3. `TabAwareStrategy.getTabIndex`：在无法从 id 提取时，允许从父路径/Schema 结构计算，保证稳定（packages/h5-builder/src/flow/tab-aware-strategy.ts:79）。
4. 增加策略示例：慢网或低内存设备降低非首屏组件优先级，或延后加载。

### 4) 虚拟滚动与 Tabs 稳定性

1. VirtualList 滚动节流：在 View 层用 `requestAnimationFrame` 或轻量节流，减少滚动抖动（packages/h5-builder/src/components/virtual-list/virtual-list.view\.tsx:87）。
2. 高度测量稳定性：`ResizeObserver` 已使用；补充首帧测量失败重试机制与 max reflow 防护（packages/h5-builder/src/components/virtual-list/virtual-list.view\.tsx:36,44）。
3. Tabs 预热索引修正：基于原始索引迭代而非过滤后的相对索引，避免索引错位（packages/h5-builder/src/components/tabs-container/tabs-container.model.ts:205）。
4. 埋点增强：为虚拟滚动关键事件（启用/切换/测量异常）补充埋点字段（packages/h5-builder/src/components/tabs-container/tabs-container.model.ts:190）。

### 5) 构建与预览改进

1. 分离库产物与 Demo 产物：将 Vite `build.outDir` 改为 `demo-dist`，避免覆盖 `tsc` 输出（packages/h5-builder/vite.config.ts）。
2. 在 README 补充本地预览与打包指引，明确两类产物位置（packages/h5-builder/README.md）。

### 6) 文档修复与补充

1. 修复开发指南中的断链，指向当前仓库的真实路径；补充“生命周期异步化”与“Bridge/HTTP 契约”章节（packages/h5-builder/docs/component\_development\_guide.md, api\_reference.md）。
2. 在自动虚拟滚动文档中说明动态高度模式的测量与缓存策略，以及性能注意事项（packages/h5-builder/docs/auto-virtual-scroll.md）。

### 7) 测试覆盖

* 生命周期：异步初始化的顺序与完成态断言；容器串并行两种策略。

* Bridge/HTTP：原生与 Mock 模式的一致性、错误分支、拦截器链路。

* 策略：`TabAwareStrategy` 的过滤与优先级调整；慢网/低内存策略示例。

* 虚拟滚动：动态高度缓存一致性、start/endIndex 计算正确性、首帧测量回退。

## 交付与回滚

* 逐步提交：先修复 Bridge/HTTP 契约与生命周期异步化，再启用策略与虚拟滚动改进，最后完善文档与测试。

* 风险与回滚：对 `init()` 的签名改动影响面较大，提供临时适配层与变更日志；Bridge 契约统一需同步文档与示例。

请确认以上改造方案，确认后我将开始分步骤修改代码、补充测试与文档，并进行本地验证（含 Demo 预览）。
