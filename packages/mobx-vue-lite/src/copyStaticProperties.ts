const blackList: Record<string, boolean> = {
    $$typeof: true,
    render: true,
    compare: true,
    type: true,
    displayName: true
}

/**
 * Copy static properties (e.g. defaultProps, propTypes, static methods) from the original
 * component to the observer-wrapped component, excluding React internal symbols.
 */
export function copyStaticProperties(source: any, target: any) {
    Object.keys(source).forEach(key => {
        if (!blackList[key]) {
            const descriptor = Object.getOwnPropertyDescriptor(source, key)
            if (descriptor) {
                Object.defineProperty(target, key, descriptor)
            }
        }
    })
}
