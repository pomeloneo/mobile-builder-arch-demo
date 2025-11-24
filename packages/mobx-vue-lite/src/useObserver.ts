import { useReducer, useRef, useEffect } from "react"
import { effect, stop, ReactiveEffectRunner } from "@vue/reactivity"
import { isUsingStaticRendering } from "./staticRendering"

/**
 * Hook that tracks observables accessed in the render function and re-renders when they change.
 *
 * Note: This hook is deprecated in mobx-react-lite. Use <Observer> component or observer() HOC instead.
 *
 * @param fn - Render function that accesses observables
 * @param baseComponentName - Component name for debugging (optional)
 * @returns The result of the render function
 *
 * @example
 * function MyComponent() {
 *   return useObserver(() => <div>{store.value}</div>);
 * }
 */
export function useObserver<T>(fn: () => T, baseComponentName: string = "observed"): T {
    // In static rendering mode, just execute fn without tracking
    if (isUsingStaticRendering()) {
        return fn()
    }

    const [, forceUpdate] = useReducer(s => s + 1, 0)
    const runnerRef = useRef<ReactiveEffectRunner | null>(null)
    const renderResultRef = useRef<T | undefined>(undefined)

    // Create effect on first render
    if (!runnerRef.current) {
        runnerRef.current = effect(
            () => {
                // Store the result so we can return it
                renderResultRef.current = fn()
            },
            {
                scheduler: () => {
                    // Schedule re-render when dependencies change
                    forceUpdate()
                }
            }
        )
    } else {
        // On subsequent renders, manually run the effect to get the latest result
        runnerRef.current!()
    }

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (runnerRef.current) {
                stop(runnerRef.current)
            }
        }
    }, [])

    return renderResultRef.current as T
}
