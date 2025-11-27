import type { IDisposable } from '@/bedrock/dispose';
import { CancellationTokenSource } from '@/bedrock/async';
import { InstantiationService } from '../instantiation-service';
import type { IFoo } from './foo.mock';
import { LazyServiceLoader } from './lazy-service';

class LazyFoo extends LazyServiceLoader<IFoo> {
  protected async _getModule() {
    return (await import(/* webpackChunkName: "foo_mock" */ './foo.mock')).Foo;
  }
}

class LazyFooWithDisposable extends LazyServiceLoader<IFoo> implements IDisposable {
  private readonly _cancellationTokenSource = new CancellationTokenSource();
  protected async _getModule() {
    return (await import(/* webpackChunkName: "foo_mock" */ './foo.mock')).Foo;
  }

  async getInstance() {
    const instance = await super.getInstance();
    if (this._cancellationTokenSource.token.isCancellationRequested) {
      instance.dispose();
    }
    return instance;
  }

  dispose() {
    if (this._instance) {
      this._instance.dispose();
    }
    this._cancellationTokenSource.dispose(true);
  }
}

describe('lazyService', () => {
  it('load lazyService', async () => {
    const instantiationService = new InstantiationService();
    const lazyFoo = new LazyFoo(instantiationService);
    const foo = await lazyFoo.getInstance();
    expect(foo.echo()).toBe('Hello Lvweb');
    expect(foo.disposed).toBeFalsy();
  });

  // 获取instance之前就dipose了
  it('lazyService dispose1', async () => {
    const instantiationService = new InstantiationService();
    const lazyFoo = new LazyFooWithDisposable(instantiationService);
    lazyFoo.dispose();
    const foo = await lazyFoo.getInstance();
    expect(foo.echo()).toBe('Hello Lvweb');
    // 获取到的对象，是disposed的
    expect(foo.disposed).toBeTruthy();
  });

  it('lazyService dispose2', async () => {
    const instantiationService = new InstantiationService();
    const lazyFoo = new LazyFooWithDisposable(instantiationService);
    const foo = await lazyFoo.getInstance();
    expect(foo.echo()).toBe('Hello Lvweb');
    expect(foo.disposed).toBeFalsy();
    lazyFoo.dispose();
    // 后续dispose，foo被dispose
    expect(foo.disposed).toBeTruthy();
  });
});
