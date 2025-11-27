/**
 * 等待一段时间
 * @param ms 单位毫秒
 */
export function wait(ms: number): Promise<undefined> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const sleep: (ms: number) => Promise<undefined> = wait;
