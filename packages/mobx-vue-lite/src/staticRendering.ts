/**
 * Global flag for static rendering mode (SSR)
 */
let isStaticRendering = false

/**
 * Enable or disable static rendering mode.
 * When enabled, observer components will not track observables or re-render.
 * This is useful for server-side rendering to avoid memory leaks.
 *
 * @param enable - Whether to enable static rendering
 *
 * @example
 * // In your SSR entry point
 * enableStaticRendering(true);
 *
 * // In your client entry point
 * enableStaticRendering(false);
 */
export function enableStaticRendering(enable: boolean): void {
    isStaticRendering = enable
}

/**
 * Check if static rendering is currently enabled
 * @returns true if static rendering is enabled
 */
export function isUsingStaticRendering(): boolean {
    return isStaticRendering
}
