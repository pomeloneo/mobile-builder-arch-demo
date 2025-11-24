import React from "react"
import { useObserver } from "./useObserver"

export interface IObserverProps {
    children: () => React.ReactElement
    render?: () => React.ReactElement
}

/**
 * Observer component that tracks observables in the render function.
 * Provides fine-grained reactivity - only this component re-renders when observables change.
 *
 * @example
 * function MyComponent() {
 *   const store = useLocalObservable(() => ({ count: 0 }));
 *   return (
 *     <div>
 *       <Observer>
 *         {() => <span>{store.count}</span>}
 *       </Observer>
 *       <button onClick={() => store.count++}>Increment</button>
 *     </div>
 *   );
 * }
 */
export function Observer({ children, render }: IObserverProps): React.ReactElement {
    const fn = render || children
    return useObserver(fn)
}

Observer.displayName = "Observer"
