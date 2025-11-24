# mobx-vue-lite

A lightweight MobX implementation backed by Vue's reactivity system, designed to be API-compatible with `mobx-react-lite`.

## Features

-   **Core MobX Primitives**: `observable`, `computed`, `autorun`, `reaction`, `action` (powered by `@vue/reactivity`).
-   **React Bindings**:
    -   `observer`: HOC for functional components. Supports `forwardRef`, `memo` optimization, and static property hoisting.
    -   `useLocalObservable`: Hook for local observable state.
    -   `<Observer>`: Render prop component for fine-grained reactivity.
    -   `enableStaticRendering`: SSR support.

## Installation

```bash
npm install mobx-vue-lite
# or
yarn add mobx-vue-lite
```

## Usage

```tsx
import React from "react"
import { observer, useLocalObservable } from "mobx-vue-lite"

const Counter = observer(() => {
    const store = useLocalObservable(() => ({
        count: 0,
        increment() {
            this.count++
        }
    }))

    return <button onClick={store.increment}>Count: {store.count}</button>
})
```

## API

### `observer(component)`

Wraps a React function component to make it reactive. It automatically tracks observables accessed during rendering and re-renders when they change.

-   Supports `React.forwardRef`.
-   Automatically applies `React.memo` for performance.
-   Copies static properties from the original component.

### `useLocalObservable(initializer)`

Creates a local observable store that persists across renders.

### `<Observer>{() => JSX}</Observer>`

A component that renders its children inside a reactive context.

## License

MIT
