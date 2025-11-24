import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import "@testing-library/jest-dom"
import { vi } from "vitest"
import {
    observable,
    computed,
    autorun,
    observer,
    useLocalObservable,
    Observer,
    enableStaticRendering
} from "../index"

describe("useLocalObservable", () => {
    it("should create a local observable that persists across renders", () => {
        let renderCount = 0

        const Counter = observer(() => {
            renderCount++
            const store = useLocalObservable(() => ({
                count: 0,
                increment() {
                    this.count++
                }
            }))

            return (
                <div>
                    <span data-testid="count">{store.count}</span>
                    <button onClick={store.increment}>Increment</button>
                </div>
            )
        })

        const { getByTestId, getByText } = render(<Counter />)

        expect(getByTestId("count")).toHaveTextContent("0")
        expect(renderCount).toBe(1)

        fireEvent.click(getByText("Increment"))

        expect(getByTestId("count")).toHaveTextContent("1")
        expect(renderCount).toBe(2)
    })

    it("should support computed properties", () => {
        const Counter = observer(() => {
            const store = useLocalObservable(() => ({
                count: 1,
                get double() {
                    return this.count * 2
                }
            }))

            return (
                <div>
                    <span data-testid="count">{store.count}</span>
                    <span data-testid="double">{store.double}</span>
                    <button onClick={() => store.count++}>Increment</button>
                </div>
            )
        })

        const { getByTestId, getByText } = render(<Counter />)

        expect(getByTestId("count")).toHaveTextContent("1")
        expect(getByTestId("double")).toHaveTextContent("2")

        fireEvent.click(getByText("Increment"))

        expect(getByTestId("count")).toHaveTextContent("2")
        expect(getByTestId("double")).toHaveTextContent("4")
    })

    it("should only re-render when observed properties change", () => {
        let renderCount = 0
        const store = observable({
            count: 0,
            unused: 0
        })

        const Counter = observer(() => {
            renderCount++
            return <div>{store.count}</div>
        })

        render(<Counter />)
        expect(renderCount).toBe(1)

        act(() => {
            store.count++
        })
        expect(renderCount).toBe(2)

        act(() => {
            store.unused++
        })
        // Should not re-render because unused is not accessed in render
        expect(renderCount).toBe(2)
    })
})

describe("Observer component", () => {
    it("should provide fine-grained reactivity", () => {
        let parentRenderCount = 0
        let observerRenderCount = 0
        const store = observable({ count: 0 })

        const Parent = () => {
            parentRenderCount++
            return (
                <div>
                    <Observer>
                        {() => {
                            observerRenderCount++
                            return <span data-testid="count">{store.count}</span>
                        }}
                    </Observer>
                    <button onClick={() => store.count++}>Increment</button>
                </div>
            )
        }

        const { getByTestId, getByText } = render(<Parent />)

        expect(getByTestId("count")).toHaveTextContent("0")
        expect(parentRenderCount).toBe(1)
        expect(observerRenderCount).toBe(1)

        fireEvent.click(getByText("Increment"))

        expect(getByTestId("count")).toHaveTextContent("1")
        expect(parentRenderCount).toBe(1) // Parent should not re-render
        expect(observerRenderCount).toBe(2) // Only Observer re-renders
    })

    it("should work with useLocalObservable", () => {
        const Counter = () => {
            const store = useLocalObservable(() => ({
                count: 0
            }))

            return (
                <div>
                    <Observer>{() => <span data-testid="count">{store.count}</span>}</Observer>
                    <button onClick={() => store.count++}>Increment</button>
                </div>
            )
        }

        const { getByTestId, getByText } = render(<Counter />)

        expect(getByTestId("count")).toHaveTextContent("0")

        fireEvent.click(getByText("Increment"))

        expect(getByTestId("count")).toHaveTextContent("1")
    })
})

describe("nested rendering", () => {
    it("should only re-render affected components", () => {
        const store = observable({
            todos: [{ title: "a", completed: false }]
        })

        const renderings = {
            item: 0,
            list: 0
        }

        const TodoItem = observer(({ todo }: { todo: (typeof store.todos)[0] }) => {
            renderings.item++
            return <li data-testid="todo-item">{todo.title}</li>
        })

        const TodoList = observer(() => {
            renderings.list++
            return (
                <div>
                    <span data-testid="count">{store.todos.length}</span>
                    {store.todos.map((todo, idx) => (
                        <TodoItem key={idx} todo={todo} />
                    ))}
                </div>
            )
        })

        const { getByTestId } = render(<TodoList />)

        expect(renderings.list).toBe(1)
        expect(renderings.item).toBe(1)
        expect(getByTestId("count")).toHaveTextContent("1")

        // Change inner property - only TodoItem should re-render
        act(() => {
            store.todos[0].title = "b"
        })

        expect(renderings.list).toBe(1) // List should not re-render
        expect(renderings.item).toBe(2) // Item should re-render

        // Add new todo - both should re-render
        act(() => {
            store.todos.push({ title: "c", completed: false })
        })

        expect(renderings.list).toBe(2)
        expect(renderings.item).toBe(3) // Old item should NOT re-render due to memo
        expect(getByTestId("count")).toHaveTextContent("2")
    })
})

describe("static rendering", () => {
    afterEach(() => {
        enableStaticRendering(false)
    })

    it("should not track observables when static rendering is enabled", () => {
        enableStaticRendering(true)

        let renderCount = 0
        const store = observable({ count: 0 })

        const Counter = observer(() => {
            renderCount++
            return <div>{store.count}</div>
        })

        const { container } = render(<Counter />)

        expect(renderCount).toBe(1)
        expect(container.textContent).toBe("0")

        // Change should not trigger re-render
        act(() => {
            store.count++
        })

        expect(renderCount).toBe(1) // Should not re-render
        expect(container.textContent).toBe("0") // Should still show old value
    })
})

describe("error handling", () => {
    it("should propagate errors through Error Boundary", () => {
        const x = observable({ value: 1 })
        const errorsSeen: any[] = []

        class ErrorBoundary extends React.Component<{ children: any }> {
            public static getDerivedStateFromError() {
                return { hasError: true }
            }

            public state = {
                hasError: false
            }

            public componentDidCatch(error: any, info: any) {
                errorsSeen.push("" + error)
            }

            public render() {
                if (this.state.hasError) {
                    return <span>Saw error!</span>
                }
                return this.props.children
            }
        }

        const C = observer(() => {
            if (x.value === 42) {
                throw new Error("The meaning of life!")
            }
            return <span>{x.value}</span>
        })

        const { container } = render(
            <ErrorBoundary>
                <C />
            </ErrorBoundary>
        )

        expect(container.querySelector("span")!.innerHTML).toBe("1")

        // Suppress console errors for this test
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        act(() => {
            x.value = 42
        })

        expect(errorsSeen).toEqual(["Error: The meaning of life!"])
        expect(container.querySelector("span")!.innerHTML).toBe("Saw error!")

        consoleSpy.mockRestore()
    })
})
