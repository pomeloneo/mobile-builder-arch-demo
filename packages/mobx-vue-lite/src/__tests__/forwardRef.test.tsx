import React, { forwardRef, useImperativeHandle } from "react"
import { render } from "@testing-library/react"
import { observer, useLocalObservable } from "../index"

describe("observer with forwardRef", () => {
    it("should forward ref to the component", () => {
        const Component = observer(
            forwardRef((props, ref) => {
                useImperativeHandle(ref, () => ({
                    method() {
                        return "called"
                    }
                }))
                return <div>test</div>
            })
        )

        const ref = React.createRef<any>()
        render(<Component ref={ref} />)

        expect(ref.current).toBeDefined()
        expect(ref.current.method()).toBe("called")
    })

    it("should work with observables inside forwardRef", () => {
        const Component = observer(
            forwardRef((props, ref) => {
                const store = useLocalObservable(() => ({ count: 0 }))
                return <div>{store.count}</div>
            })
        )

        const { container } = render(<Component />)
        expect(container.textContent).toBe("0")
    })
})
