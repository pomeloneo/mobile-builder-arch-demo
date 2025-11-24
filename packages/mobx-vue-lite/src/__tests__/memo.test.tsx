import React from "react"
import { render, act } from "@testing-library/react"
import { observer, observable } from "../index"

describe("observer memoization", () => {
    it("should not re-render if props are shallowly equal", () => {
        let renderCount = 0
        const Component = observer((props: { data: number }) => {
            renderCount++
            return <div>{props.data}</div>
        })

        const { rerender } = render(<Component data={1} />)
        expect(renderCount).toBe(1)

        rerender(<Component data={1} />)
        expect(renderCount).toBe(1) // Should be memoized

        rerender(<Component data={2} />)
        expect(renderCount).toBe(2)
    })

    it("should re-render if observable changes regardless of props", () => {
        let renderCount = 0
        const store = observable({ count: 0 })

        const Component = observer((props: { data: number }) => {
            renderCount++
            return (
                <div>
                    {props.data} - {store.count}
                </div>
            )
        })

        render(<Component data={1} />)
        expect(renderCount).toBe(1)

        act(() => {
            store.count++
        })
        expect(renderCount).toBe(2)
    })
})
