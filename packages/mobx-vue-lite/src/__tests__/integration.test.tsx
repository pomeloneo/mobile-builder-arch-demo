import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import "@testing-library/jest-dom"
import { observable, computed, autorun, reaction, action, observer } from "../index"

describe("mobx-vue-lite", () => {
    it("should support observable and autorun", () => {
        const state = observable({ count: 0 })
        const values: number[] = []

        const dispose = autorun(() => {
            values.push(state.count)
        })

        expect(values).toEqual([0])

        state.count++
        expect(values).toEqual([0, 1])

        dispose()
        state.count++
        expect(values).toEqual([0, 1])
    })

    it("should support computed", () => {
        const state = observable({ count: 1 })
        const double = computed(() => state.count * 2)

        expect(double.get()).toBe(2)

        state.count++
        expect(double.get()).toBe(4)
    })

    it("should support reaction", () => {
        const state = observable({ count: 0 })
        const values: number[] = []

        const dispose = reaction(
            () => state.count,
            count => values.push(count)
        )

        state.count++
        expect(values).toEqual([1])

        state.count++
        expect(values).toEqual([1, 2])

        dispose()
    })

    it("should support observer component", () => {
        const state = observable({ count: 0 })

        const Counter = observer(({ label }: { label: string }) => {
            return (
                <div>
                    <span data-testid="label">{label}</span>
                    <span data-testid="count">{state.count}</span>
                    <button onClick={() => state.count++}>Increment</button>
                </div>
            )
        })

        const { getByTestId, getByText } = render(<Counter label="Test" />)

        expect(getByTestId("label")).toHaveTextContent("Test")
        expect(getByTestId("count")).toHaveTextContent("0")

        fireEvent.click(getByText("Increment"))

        expect(getByTestId("count")).toHaveTextContent("1")

        // Test props update
        // We need to re-render with new props
        // In a real app, parent would re-render. Here we can just verify the component reacts to props if we were testing that specifically,
        // but the observer implementation handles props via closure.
    })

    it("should support action (pass-through)", () => {
        const state = observable({ count: 0 })
        const inc = action(() => {
            state.count++
        })

        inc()
        expect(state.count).toBe(1)
    })
})
