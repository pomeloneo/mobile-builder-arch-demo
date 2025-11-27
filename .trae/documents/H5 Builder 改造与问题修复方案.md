## 目标
- 用更常见、易读的“分批 Promise.all”实现替换现有并发控制
- 保持现有语义：并发上限、错误不阻塞、先 Model 后 View 的顺序

## 变更点
- 文件：`packages/h5-builder/src/flow/component-loader.ts`
- 方法：`processQueue`（`/Users/bytedance/github/mobx-reactivity/packages/h5-builder/src/flow/component-loader.ts:502-524`）
- 替换为分批执行：每批最多 `concurrency` 个任务，批内 `Promise.all` 并行，批完成后进入下一批

## 拟替换代码
```ts
private async processQueue(
  queue: Array<() => Promise<void>>,
  concurrency: number
): Promise<void> {
  const size = Math.max(1, Math.min(concurrency, queue.length));
  for (let i = 0; i < queue.length; i += size) {
    const batch = queue.slice(i, i + size).map(fn => fn().catch(() => {}));
    await Promise.all(batch);
  }
}
```

## 说明
- 简洁直观：按批次并行，避免 `Promise.race + splice` 的手工并发窗口维护
- 错误吞掉：与现实现一致，失败不阻塞后续批次
- 并发上限：批内并发量不超过 `concurrency`
- 加载顺序：不影响“先 Model 再 View”的串行逻辑（见 `component-loader.ts:552-558`）

## 验证
- 运行示例页面（demo-async）观察 Model→View 加载与渲染是否正常
- 运行现有测试；如需补充：
  - 构造 30 个任务混入失败，限制并发为 3，断言所有任务最终触发且未被阻塞

## 风险与取舍
- 与当前实现相比，批次模型在高度不均匀任务时吞吐略低，但可读性更强、行为稳定；适用于此处加载器场景