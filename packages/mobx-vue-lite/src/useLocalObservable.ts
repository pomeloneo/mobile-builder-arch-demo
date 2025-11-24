import { useState } from "react"
import { observable } from "./mobx"

/**
 * Creates a local observable object that persists for the lifetime of the component.
 * Similar to useState, but the returned object is observable and can be used with observer/Observer.
 * Methods are automatically bound to ensure 'this' context is preserved.
 *
 * @param initializer - Function that returns the initial observable object
 * @returns Observable object that persists across renders
 *
 * @example
 * const Counter = observer(() => {
 *   const store = useLocalObservable(() => ({
 *     count: 0,
 *     increment() {
 *       this.count++;
 *     }
 *   }));
 *   return <button onClick={store.increment}>{store.count}</button>;
 * });
 */
export function useLocalObservable<T extends object>(initializer: () => T, annotations?: any): T {
    // Use useState to ensure the observable is only created once
    // and persists for the component's lifetime
    return useState(() => {
        const obj = initializer()
        const observableObj = observable(obj, annotations, { autoBind: true })

        // Auto-bind all methods to preserve 'this' context
        // TODO: Move this to observable() if we want full parity, but fine here for now
        Object.keys(observableObj).forEach(key => {
            const value = (observableObj as any)[key]
            if (typeof value === "function") {
                ;(observableObj as any)[key] = value.bind(observableObj)
            }
        })

        return observableObj
    })[0]
}
