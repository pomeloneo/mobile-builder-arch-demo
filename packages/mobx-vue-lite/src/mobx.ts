import {
    reactive,
    ref,
    computed as vueComputed,
    effect,
    stop,
    Ref,
    ReactiveEffect
} from "@vue/reactivity"

export type IReactionDisposer = () => void

export function observable<T extends object>(target: T, annotations?: any, options?: any): T {
    // Note: Annotations and options are currently ignored in this lightweight implementation
    // except for autoBind which is handled by useLocalObservable for now.
    return reactive(target) as T
}

export function box<T>(value: T): Ref<T> {
    return ref(value) as Ref<T>
}

export function computed<T>(getter: () => T): { get(): T } {
    const c = vueComputed(getter)
    return {
        get() {
            return c.value
        }
    }
}

export function autorun(view: () => void): IReactionDisposer {
    const runner = effect(view)
    return () => stop(runner)
}

export function reaction<T>(
    expression: () => T,
    effectCallback: (arg: T) => void,
    opts: { fireImmediately?: boolean } = {}
): IReactionDisposer {
    let isFirstRun = true
    const runner = effect(() => {
        const value = expression()
        if (isFirstRun) {
            isFirstRun = false
            if (opts.fireImmediately) {
                effectCallback(value)
            }
        } else {
            effectCallback(value)
        }
    })
    return () => stop(runner)
}

export function action<T extends (...args: any[]) => any>(fn: T): T {
    // In this lightweight version, action is just a pass-through.
    // Vue's reactivity system handles batching in its own way (scheduler),
    // but for direct synchronous updates, it's fine.
    return function (this: any, ...args: any[]) {
        return fn.apply(this, args)
    } as T
}
