import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { observer } from '../observer'
import { useLocalObservable } from '../useLocalObservable'

describe('useObserver bug reproduction', () => {
  it('should track new dependencies on re-render', () => {
    const store = {
      count: 0,
      text: 'hello'
    }

    // We need a way to make 'store' observable. 
    // Since we are testing observer, we can use useLocalObservable inside a wrapper 
    // or just assume we have an observable object.
    // For this test, let's use useLocalObservable inside the component for simplicity,
    // or better, create a simple observable using our library's observable if exported, 
    // but useLocalObservable is the standard way here.

    const TestComponent = observer(() => {
      const localStore = useLocalObservable(() => ({
        showText: false,
        text: 'initial',
        toggle() {
          this.showText = !this.showText
        },
        updateText(val: string) {
          this.text = val
        }
      }))

      const renderCount = React.useRef(0)
      renderCount.current++

      return (
        <div>
          <span data-testid="render-count">{renderCount.current}</span>
          <button onClick={localStore.toggle}>Toggle</button>
          <button onClick={() => localStore.updateText('updated')}>Update Text</button>
          {localStore.showText && <span data-testid="text">{localStore.text}</span>}
        </div>
      )
    })

    render(<TestComponent />)

    // Initial state: text is not shown
    expect(screen.queryByTestId('text')).toBeNull()

    // Toggle to show text. This accesses 'localStore.text' for the first time in the render phase.
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.getByTestId('text')).toHaveTextContent('initial')

    // Now update text. If tracking works for new dependencies, this should trigger a re-render.
    // In the buggy implementation, 'text' might not be tracked because it wasn't accessed in the first render.
    // Wait, useObserver creates the effect ONCE. 
    // If the first render didn't access 'text', the effect dependency list doesn't include 'text'.
    // On the second render (triggered by 'showText' change), we need to ensure the effect RE-RUNS 
    // and updates its dependency list to include 'text'.

    fireEvent.click(screen.getByText('Update Text'))
    expect(screen.getByTestId('text')).toHaveTextContent('updated')
    // Initial + Toggle + Update = 3 renders
    // If bug exists, it will be 2 (Update won't trigger render)
    expect(screen.getByTestId('render-count')).toHaveTextContent('3')
  })
})
