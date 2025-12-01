import { lvAssert, lvAssertNotNil } from '@/bedrock/assert';
import { listenOnce } from '@/bedrock/event';
import { SharedCapability, Capability, CapabilityStatus } from './capability';
import { Semaphore } from './semaphore';

/**
 * 提供读写能力的共享互斥量
 *
 * 参考C++17标准库双门思想实现
 * 接口也与标准库保持一致
 * 方法内部禁止promise，只可以对外暴露promise
 *
 * 核心
 * - 写写互斥，读写互斥，读读可重入
 *
 * 使用举例：
 * class Foo {
 *   private _mutex = new SharedMutex();
 *
 *   async add() {
 *     // 上写锁
 *     await this._mutex.lock();
 *     // ...write something
 *     this._mutex.unlock();
 *   }
 *
 *   async getSomething1() {
 *     // 上读锁
 *     await this._mutex.lockShared();
 *     try {
 *       return xxx;
 *     } finally {
 *       this._mutex.unlockShared();
 *     }
 *   }
 *
 *   async getSomething2() {
 *     // 上读锁
 *     await this._mutex.lockShared();
 *     try {
 *       return xxx;
 *     } finally {
 *       this._mutex.unlockShared();
 *     }
 *   }
 * }
 */
export class SharedMutex {
  // 在第一道门外等待的写者
  private readonly _waitingWriters: Semaphore[] = [];

  // 已经通过了第一道门的写者
  // 如果在第二道门外等待，状态为sharedLocked
  // 如果已经进入到第二道门内拿到了锁，状态为locked
  private _writer?: Capability;

  // 在第一道门外等待的读者
  private _waitingReader?: Semaphore;

  // 拿到锁的读者
  private _reader?: SharedCapability;

  /**
   * 是否被锁住
   */
  public isLocked() {
    return this._writer || this._readerCount !== 0;
  }

  /**
   * 等待并获取写锁
   */
  public lock(): Promise<void> {
    return new Promise<void>((resolve) => {
      // 第一道门
      if (this._writer) {
        // 如果已经有写者进入了，其他写者等待
        const token = new Semaphore();
        this._waitingWriters.push(token);
        token.onActive(() => {
          this._writerEnterGate1(resolve);
        });
      } else {
        this._writerEnterGate1(resolve);
      }
    });
  }

  /**
   * 尝试获取写锁，立刻返回结果
   */
  public tryLock(): boolean {
    if (this._writer || this._readerCount > 0) {
      return false;
    }
    // 这里不需要await，一定可以上锁
    this.lock();
    return true;
  }

  /**
   * 解除写锁
   */
  public unLock(): void {
    lvAssertNotNil(this._writer);

    // 打开第一道门
    this._writer.release();
  }

  /**
   * 等待并获取读锁
   */
  public lockShared(): Promise<void> {
    return new Promise<void>((resolve) => {
      // 读者只需要进第一道门
      if (this._writer) {
        // 如果有写者已经进入了第一道门，读者等待
        if (!this._waitingReader) {
          this._waitingReader = new Semaphore();
        }
        this._waitingReader.onActive(() => {
          this._readerEnterGate1(resolve);
        });
      } else {
        this._readerEnterGate1(resolve);
      }
    });
  }

  /**
   * 尝试获取读锁，立刻返回结果
   */
  public tryLockShared(): boolean {
    if (this._writer) {
      return false;
    }
    // 不需要await，一定可以上锁
    this.lockShared();
    return true;
  }

  /**
   * 解除读锁
   */
  public unLockShared(): void {
    lvAssertNotNil(this._reader);
    if (this._writer) {
      // TODO(niurouwan): 暂时保留，方便验证，稳定后可以去掉
      lvAssert(this._writer.status === CapabilityStatus.Unlocked);
    }

    this._reader.release();
  }

  /**
   * 获取当前读者数量
   */
  private get _readerCount(): number {
    return this._reader ? this._reader.counter : 0;
  }

  /**
   * 写者进入第一道门
   */
  private _writerEnterGate1(resolve: () => void): void {
    lvAssert(!this._writer);
    // 确定写者，关第一道门
    this._writer = new Capability();

    // 第二道门
    // 等待所有读者出去
    if (this._readerCount > 0) {
      listenOnce(this._reader!.onUnlocked)(() => {
        this._writerEnterGate2(resolve);
      });
    } else {
      this._writerEnterGate2(resolve);
    }
  }

  /**
   * 写者进入第二道门
   */
  private _writerEnterGate2(resolve: () => void): void {
    lvAssertNotNil(this._writer);
    lvAssert(this._readerCount === 0);

    // 成功加锁
    this._writer.acquire();
    listenOnce(this._writer.onUnlocked)(() => {
      lvAssertNotNil(this._writer);
      // 不再持有
      this._writer = undefined;
      this._moveForward();
    });
    resolve();
  }

  /**
   * 读者进入第一道门
   */
  private _readerEnterGate1(resolve: () => void): void {
    lvAssert(!this._writer);

    // 门外等待的读者清除
    this._waitingReader = undefined;

    if (!this._reader) {
      this._reader = new SharedCapability();
      this._reader.acquire();
      listenOnce(this._reader.onUnlocked)(() => {
        this._moveForward();
      });
    } else {
      this._reader.acquire();
    }
    resolve();
  }

  /**
   * 锁释放时推进流程
   */
  private _moveForward(): void {
    // 如果有写者在等待在第二道门前面，那么此时推进的一定是读锁释放，直接return即可
    if (this._writer) {
      return;
    }

    // 写者优先，优先通知在第一道门前面的写者
    if (this._waitingWriters.length > 0) {
      const semaphore = this._waitingWriters.shift()!;
      semaphore.notify();
      return;
    }

    // 最后通知第一道门前面的读者
    if (this._waitingReader) {
      this._waitingReader.notify();
    }
  }
}
