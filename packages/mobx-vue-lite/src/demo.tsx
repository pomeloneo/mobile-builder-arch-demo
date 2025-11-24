import React from "react"
import ReactDOM from "react-dom/client"
import { observable, observer, useLocalObservable, Observer, computed, autorun } from "./index"

// Demo 1: Basic counter with external store
const counterStore = observable({
    count: 0,
    increment() {
        this.count++
    },
    decrement() {
        this.count--
    },
    get double() {
        return this.count * 2
    }
})

const BasicCounter = observer(() => {
    console.log("BasicCounter rendered")
    return (
        <div style={{ padding: "20px", border: "1px solid #ccc", margin: "10px" }}>
            <h2>Demo 1: Basic Counter (External Store)</h2>
            <p>Count: {counterStore.count}</p>
            <p>Double: {counterStore.double}</p>
            <button onClick={() => counterStore.increment()}>+</button>
            <button onClick={() => counterStore.decrement()}>-</button>
        </div>
    )
})

// Demo 2: useLocalObservable
const LocalCounter = observer(() => {
    console.log("LocalCounter rendered")

    const store = useLocalObservable(() => ({
        count: 0,
        get double() {
            return this.count * 2
        },
        increment() {
            this.count++
        },
        decrement() {
            this.count--
        }
    }))

    return (
        <div style={{ padding: "20px", border: "1px solid #ccc", margin: "10px" }}>
            <h2>Demo 2: Local Counter (useLocalObservable)</h2>
            <p>Count: {store.count}</p>
            <p>Double: {store.double}</p>
            <button onClick={store.increment}>+</button>
            <button onClick={store.decrement}>-</button>
        </div>
    )
})

// Demo 3: Fine-grained reactivity with Observer component
const todoStore = observable({
    todos: [
        { id: 1, title: "Buy milk", done: false },
        { id: 2, title: "Learn MobX", done: true }
    ],
    addTodo(title: string) {
        this.todos.push({
            id: Date.now(),
            title,
            done: false
        })
    },
    get completedCount() {
        return this.todos.filter((t: (typeof todoStore.todos)[0]) => t.done).length
    }
})

const TodoItem = observer(({ todo }: { todo: (typeof todoStore.todos)[0] }) => {
    console.log(`TodoItem ${todo.id} rendered`)
    return (
        <li style={{ textDecoration: todo.done ? "line-through" : "none" }}>
            <input type="checkbox" checked={todo.done} onChange={() => (todo.done = !todo.done)} />
            {todo.title}
        </li>
    )
})

function TodoList() {
    console.log("TodoList (parent) rendered")
    const [newTodo, setNewTodo] = React.useState("")

    return (
        <div style={{ padding: "20px", border: "1px solid #ccc", margin: "10px" }}>
            <h2>Demo 3: Todo List (Fine-grained Reactivity)</h2>
            <Observer>
                {() => (
                    <p>
                        Completed: {todoStore.completedCount}/{todoStore.todos.length}
                    </p>
                )}
            </Observer>

            <ul>
                <Observer>
                    {() => (
                        <>
                            {todoStore.todos.map(todo => (
                                <TodoItem key={todo.id} todo={todo} />
                            ))}
                        </>
                    )}
                </Observer>
            </ul>

            <div>
                <input
                    value={newTodo}
                    onChange={e => setNewTodo(e.target.value)}
                    placeholder="New todo..."
                />
                <button
                    onClick={() => {
                        if (newTodo.trim()) {
                            todoStore.addTodo(newTodo)
                            setNewTodo("")
                        }
                    }}
                >
                    Add
                </button>
            </div>
            <p style={{ fontSize: "12px", color: "#666" }}>
                Note: Parent component doesn't re-render when todos change!
            </p>
        </div>
    )
}

// Demo 4: Autorun side effect
function AutorunDemo() {
    const [logs, setLogs] = React.useState<string[]>([])

    React.useEffect(() => {
        const dispose = autorun(() => {
            const log = `Count changed to ${
                counterStore.count
            } at ${new Date().toLocaleTimeString()}`
            setLogs(prev => [...prev.slice(-4), log]) // Keep last 5 logs
        })

        return dispose
    }, [])

    return (
        <div style={{ padding: "20px", border: "1px solid #ccc", margin: "10px" }}>
            <h2>Demo 4: Autorun Side Effect</h2>
            <p>Watching counterStore.count from Demo 1:</p>
            <ul>
                {logs.map((log, i) => (
                    <li key={i} style={{ fontSize: "12px" }}>
                        {log}
                    </li>
                ))}
            </ul>
        </div>
    )
}

// Main App
function App() {
    return (
        <div
            style={{
                fontFamily: "Arial, sans-serif",
                maxWidth: "800px",
                margin: "0 auto",
                padding: "20px"
            }}
        >
            <h1>MobX-Vue-Lite Demo</h1>
            <p>Open console to see render logs</p>

            <BasicCounter />
            <LocalCounter />
            <TodoList />
            <AutorunDemo />

            <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0" }}>
                <h3>验证要点：</h3>
                <ol>
                    <li>点击 Demo 1 的按钮，只有 BasicCounter 应该重渲染</li>
                    <li>点击 Demo 2 的按钮，方法的 this 绑定应该正常工作</li>
                    <li>在 Demo 3 中勾选 todo，只有对应的 TodoItem 重渲染，父组件不重渲染</li>
                    <li>Demo 4 的 autorun 应该自动响应 Demo 1 的变化</li>
                </ol>
            </div>
        </div>
    )
}

// Only run in browser environment
if (typeof document !== "undefined") {
    const root = document.getElementById("root")
    if (root) {
        ReactDOM.createRoot(root).render(<App />)
    }
}

export { App }
