import React from "react"
import { render } from "@testing-library/react"
import { observer } from "../index"

describe("observer static properties", () => {
    it("should copy static properties to the wrapped component", () => {
        const Component = () => <div>test</div>
        Component.staticProp = "static"
        Component.staticMethod = () => "method"

        const ObservedComponent = observer(Component)

        expect((ObservedComponent as any).staticProp).toBe("static")
        expect((ObservedComponent as any).staticMethod()).toBe("method")
    })

    it("should copy defaultProps and propTypes", () => {
        const Component = () => <div>test</div>
        ;(Component as any).defaultProps = { test: "default" }
        ;(Component as any).propTypes = { test: "string" }

        const ObservedComponent = observer(Component)

        expect((ObservedComponent as any).defaultProps).toEqual({ test: "default" })
        expect((ObservedComponent as any).propTypes).toEqual({ test: "string" })
    })
})
