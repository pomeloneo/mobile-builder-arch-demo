import React, { forwardRef, memo, ForwardRefRenderFunction, PropsWithoutRef } from "react"
import { isUsingStaticRendering } from "./staticRendering"
import { useObserver } from "./useObserver"
import { copyStaticProperties } from "./copyStaticProperties"

/**
 * observer HOC – wraps a function component (or a forwardRef render function) so that it
 * re‑renders when any accessed observable changes.
 *
 * Features:
 *   • Support for components created with `React.forwardRef`.
 *   • Automatic `React.memo` wrapping for prop‑shallow‑compare optimisation.
 *   • Copy of static properties (`defaultProps`, `propTypes`, static methods, etc.).
 *   • Proper displayName handling for debugging.
 */
export function observer<P extends object, TRef = unknown>(
    baseComponent: React.FunctionComponent<P> | ForwardRefRenderFunction<TRef, PropsWithoutRef<P>>
): React.FunctionComponent<P> {
    // SSR / static rendering – just return the original component.
    if (isUsingStaticRendering()) {
        return baseComponent as any
    }

    // Detect if the component is a forwardRef component.
    const isForwardRef =
        !!(baseComponent as any)["$$typeof"] &&
        (baseComponent as any)["$$typeof"] === Symbol.for("react.forward_ref")

    // Unwrap the render function for forwardRef components.
    const renderFn = isForwardRef ? (baseComponent as any).render : baseComponent

    const name = (baseComponent as any).displayName || (baseComponent as any).name

    // Create the observer‑wrapped component.
    const Wrapped = isForwardRef
        ? forwardRef<TRef, PropsWithoutRef<P>>((props, ref) =>
              useObserver(() => (renderFn as ForwardRefRenderFunction<TRef, P>)(props as P, ref))
          )
        : (props: P) => useObserver(() => (renderFn as React.FunctionComponent<P>)(props))

    // Set displayName for debugging.
    ;(Wrapped as any).displayName = name ? `observer(${name})` : "observer"

    // Return a memoized version for optimisation.
    const MemoizedComponent = memo(Wrapped)

    // Copy static properties from the original component to the memoized component.
    copyStaticProperties(baseComponent as any, MemoizedComponent as any)

    return MemoizedComponent as unknown as React.FunctionComponent<P>
}
