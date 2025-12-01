// lifecycle -> cost
// 启动流程lifecycle某个阶段对应的耗时
type Trace = Record<string | number, number>;

export class CostRecorder {
  // 每个job在不同阶段的耗时
  private _jobCost: Record<string, Trace> = {};

  record(jobName: string, lifecycle: string | number, cost: number) {
    if (!this._jobCost[jobName]) {
      this._jobCost[jobName] = {};
    }
    if (!this._jobCost[jobName][lifecycle]) {
      this._jobCost[jobName][lifecycle] = 0;
    }
    this._jobCost[jobName][lifecycle] += cost;
  }

  toString() {
    return JSON.stringify(this._jobCost);
  }
}
