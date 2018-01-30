/* eslint-env jest */

const Lrud = require('../lrud')
const data = require('./data.json')

describe('Given an instance of Lrud', () => {
  let navigation

  beforeEach(() => {
    Lrud.KEY_CODES = {
      37: 'LEFT',
      39: 'RIGHT',
      38: 'UP',
      40: 'DOWN',
      13: 'ENTER'
    }
    Lrud.KEY_MAP = {
      LEFT: 'LEFT',
      RIGHT: 'RIGHT',
      UP: 'UP',
      DOWN: 'DOWN',
      ENTER: 'ENTER'
    }
    navigation = new Lrud()
  })

  const noop = () => {}
  const toJSON = (o) => JSON.parse(JSON.stringify(o))

  describe('register', () => {
    it('should throw an error when attempting to register without an id', () => {
      expect(() => navigation.register()).toThrowError('Attempting to register with an invalid id')
    })

    it('should register a node as expected', () => {
      navigation.register('root')

      expect(toJSON(navigation.nodes)).toEqual({
        root: {
          id: 'root',
          children: []
        }
      })
    })

    it('should assign new props on subsequent registrations', () => {
      navigation.register('root')
      navigation.register('root', { orientation: 'horizontal' })

      expect(toJSON(navigation.nodes)).toEqual({
        root: {
          id: 'root',
          children: [],
          orientation: 'horizontal'
        }
      })
    })

    it('should crate the parent/child relationship as expected', () => {
      navigation.register('root')
      navigation.register('child', { parent: 'root' })

      expect(navigation.nodes.root.children).toEqual([ 'child' ])
      expect(navigation.nodes.child.parent).toEqual('root')
    })

    it('should maintain the child order if a node is registered multiple times', () => {
      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })
      navigation.register('child', { parent: 'root' })

      expect(navigation.nodes.root.children).toEqual([
        'child',
        'child2'
      ])
    })
  })

  describe('unregister', () => {
    it('should remove a node as expected', () => {
      navigation.register('root')
      navigation.unregister('root')

      expect(navigation.nodes.root).toBeUndefined()
    })

    it('should undo the parent/child relationship as expected', () => {
      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.unregister('child')

      expect(navigation.nodes.root.children).toEqual([])
    })

    it('should remove the children of the unregistered node', () => {
      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })
      navigation.unregister('root')

      expect(navigation.nodes.child).toBeUndefined()
      expect(navigation.nodes.child2).toBeUndefined()
    })

    it('should blur the currentFocus node if it is the node being unregistered', () => {
      const spy = jest.fn()

      navigation.on('blur', spy)

      navigation.register('root')
      navigation.currentFocus = 'root'
      navigation.unregister('root')

      expect(navigation.currentFocus).toBeUndefined()
      expect(spy).toHaveBeenCalledWith('root')
    })

    it('should not blur the currentFocus node if it is not the node being unregistered', () => {
      const spy = jest.fn()

      navigation.currentFocus = 'child'

      navigation.on('blur', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })
      navigation.unregister('child2')

      expect(navigation.currentFocus).toEqual('child')
      expect(spy).not.toHaveBeenCalled()
    })

    it('should unset the activeChild of the parent if the unregisted node is the currect active child', () => {
      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })
      navigation.nodes.root.activeChild = 'child2'
      navigation.unregister('child2')

      expect(navigation.nodes.root.activeChild).toBeUndefined()
    })
  })

  describe('blur', () => {
    it('should emit the blur event with node id as expected', () => {
      const spy = jest.fn()

      navigation.on('blur', spy)

      navigation.register('root')

      navigation.blur('root')

      expect(spy).toHaveBeenCalledWith('root')
    })

    it('should blur the currentFocus node if no arguments are provided', () => {
      const spy = jest.fn()

      navigation.currentFocus = 'child'

      navigation.on('blur', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })

      navigation.blur()

      expect(spy).toHaveBeenCalledWith('child')
    })
  })

  describe('focus', () => {
    it('should emit the focus event with node id as expected', () => {
      const spy = jest.fn()

      navigation.on('focus', spy)

      navigation.register('root')

      navigation.focus('root')

      expect(spy).toHaveBeenCalledWith('root')
    })

    it('should focus down the tree to the first focusable child', () => {
      const spy = jest.fn()

      navigation.on('focus', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })

      navigation.focus('root')

      expect(spy).toHaveBeenCalledWith('child')
    })

    it('should update the currentFocus prop as expected', () => {
      const spy = jest.fn()

      navigation.on('focus', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })

      expect(navigation.currentFocus).toBeFalsy()

      navigation.focus('root')

      expect(navigation.currentFocus).toEqual('child')
    })

    it('should focus the root node if there is no currentFocus', () => {
      const spy = jest.fn()

      navigation.on('focus', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })

      navigation.focus()

      expect(spy).toHaveBeenCalledWith('child')
    })

    it('should emit a blur event for the previously focused node', () => {
      const spy = jest.fn()

      navigation.currentFocus = 'child'

      navigation.on('blur', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })

      navigation.focus('child2')

      expect(spy).toHaveBeenCalledWith('child')
    })

    it('should set the activeChild property up the tree as expected', () => {
      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })
      navigation.register('child-of-child2', { parent: 'child2' })

      navigation.focus('root')

      expect(navigation.nodes.root.activeChild).toEqual('child')

      navigation.focus('child-of-child2')

      expect(navigation.nodes.child2.activeChild).toEqual('child-of-child2')
      expect(navigation.nodes.root.activeChild).toEqual('child2')
    })

    it('should emit the active event as expected', () => {
      const spy = jest.fn()

      navigation.on('active', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child-of-child', { parent: 'child' })

      navigation.focus('child-of-child')

      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy.mock.calls[0][0]).toBe('child-of-child')
      expect(spy.mock.calls[1][0]).toBe('child')
    })

    it('should emit the inactive event as expected', () => {
      const spy = jest.fn()

      navigation.on('inactive', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })

      navigation.focus('child')
      navigation.focus('child2')

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('child')
    })
  })

  describe('handleKeyEvent', () => {
    it('should emit the select event as expected', () => {
      const spy = jest.fn()

      navigation.on('select', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })

      navigation.focus('child')

      navigation.handleKeyEvent({ keyCode: 13 })

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('child')
    })

    it('should move through a horizontal list as expected', () => {
      const stopPropagationSpy = jest.fn()
      const focusSpy = jest.fn()
      const moveSpy = jest.fn()

      navigation.currentFocus = 'child1'

      navigation.on('focus', focusSpy)
      navigation.on('move', moveSpy)

      navigation.register('root', { orientation: 'horizontal' })
      navigation.register('child1', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })
      navigation.register('child3', { parent: 'root' })

      // RIGHT
      navigation.handleKeyEvent({ keyCode: 39, stopPropagation: stopPropagationSpy }) // Focus child2
      navigation.handleKeyEvent({ keyCode: 39, stopPropagation: stopPropagationSpy }) // Focus child3
      navigation.handleKeyEvent({ keyCode: 39, stopPropagation: stopPropagationSpy }) // Edge
      // LEFT
      navigation.handleKeyEvent({ keyCode: 37, stopPropagation: stopPropagationSpy }) // Focus child2
      navigation.handleKeyEvent({ keyCode: 37, stopPropagation: stopPropagationSpy }) // Focus child1
      navigation.handleKeyEvent({ keyCode: 37, stopPropagation: stopPropagationSpy }) // Edge

      expect(stopPropagationSpy).toHaveBeenCalledTimes(4)
      expect(focusSpy.mock.calls).toEqual([
        [ 'child2' ],
        [ 'child3' ],
        [ 'child2' ],
        [ 'child1' ]
      ])

      expect(toJSON(moveSpy.mock.calls)).toEqual(data.horizontalMove)
    })

    it('should move through a vertical list as expected', () => {
      const stopPropagationSpy = jest.fn()
      const focusSpy = jest.fn()
      const moveSpy = jest.fn()

      navigation.currentFocus = 'child1'

      navigation.on('focus', focusSpy)
      navigation.on('move', moveSpy)

      navigation.register('root', { orientation: 'vertical' })
      navigation.register('child1', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })
      navigation.register('child3', { parent: 'root' })

      // DOWN
      navigation.handleKeyEvent({ keyCode: 40, stopPropagation: stopPropagationSpy }) // Focus child2
      navigation.handleKeyEvent({ keyCode: 40, stopPropagation: stopPropagationSpy }) // Focus child3
      navigation.handleKeyEvent({ keyCode: 40, stopPropagation: stopPropagationSpy }) // Edge
      // UP
      navigation.handleKeyEvent({ keyCode: 38, stopPropagation: stopPropagationSpy }) // Focus child2
      navigation.handleKeyEvent({ keyCode: 38, stopPropagation: stopPropagationSpy }) // Focus child1
      navigation.handleKeyEvent({ keyCode: 38, stopPropagation: stopPropagationSpy }) // Edge

      expect(stopPropagationSpy).toHaveBeenCalledTimes(4)
      expect(focusSpy.mock.calls).toEqual([
        [ 'child2' ],
        [ 'child3' ],
        [ 'child2' ],
        [ 'child1' ]
      ])

      expect(toJSON(moveSpy.mock.calls)).toEqual(data.verticalMove)
    })

    it('should move through a wrapping list as expected', () => {
      const focusSpy = jest.fn()

      navigation.currentFocus = 'child1'

      navigation.on('focus', focusSpy)

      navigation.register('root', { orientation: 'horizontal', wrapping: true })
      navigation.register('child1', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })
      navigation.register('child3', { parent: 'root' })

      // RIGHT
      navigation.handleKeyEvent({ keyCode: 39, stopPropagation: noop }) // Focus child2
      navigation.handleKeyEvent({ keyCode: 39, stopPropagation: noop }) // Focus child3
      navigation.handleKeyEvent({ keyCode: 39, stopPropagation: noop }) // Focus child1

      expect(focusSpy.mock.calls).toEqual([
        [ 'child2' ],
        [ 'child3' ],
        [ 'child1' ]
      ])
    })

    // TODO: Fix bug where grid doesn't correctly handle rows with fewer items
    it('should move through a grid as expected', () => {
      const focusSpy = jest.fn()

      navigation.currentFocus = 'row1-child1'

      navigation.on('focus', focusSpy)

      navigation.register('root', { orientation: 'vertical', grid: true })
      navigation.register('row1', { orientation: 'horizontal', parent: 'root' })
      navigation.register('row2', { orientation: 'horizontal', parent: 'root' })
      navigation.register('row1-child1', { parent: 'row1' })
      navigation.register('row1-child2', { parent: 'row1' })
      navigation.register('row1-child3', { parent: 'row1' })
      navigation.register('row2-child1', { parent: 'row2' })
      navigation.register('row2-child2', { parent: 'row2' })
      navigation.register('row2-child3', { parent: 'row2' })

      navigation.handleKeyEvent({ keyCode: 39, stopPropagation: noop }) // RIGHT
      navigation.handleKeyEvent({ keyCode: 40, stopPropagation: noop }) // DOWN
      navigation.handleKeyEvent({ keyCode: 39, stopPropagation: noop }) // RIGHT
      navigation.handleKeyEvent({ keyCode: 38, stopPropagation: noop }) // UP

      expect(focusSpy.mock.calls).toEqual([
        [ 'row1-child2' ],
        [ 'row2-child2' ],
        [ 'row2-child3' ],
        [ 'row1-child3' ]
      ])
    })
  })

  describe('destroy', () => {
    it('should reset nodes and currentFocus and remove remove all event listeners', () => {
      const focusSpy = jest.fn()
      const blurSpy = jest.fn()

      navigation.on('focus', focusSpy)
      navigation.on('blur', blurSpy)

      navigation.register('root')
      navigation.currentFocus = 'root'

      navigation.destroy()

      navigation.emit('focus')
      navigation.emit('blur')

      expect(navigation.nodes).toEqual({})
      expect(navigation.currentFocus).toBeFalsy()

      expect(focusSpy).not.toHaveBeenCalled()
      expect(blurSpy).not.toHaveBeenCalled()
    })
  })

  describe('setActiveChild', () => {
    it('should set the activeChild as expected', () => {
      navigation.register('root')
      navigation.register('child1', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })

      navigation.setActiveChild('root', 'child2')

      expect(navigation.nodes.root.activeChild).toEqual('child2')
    })

    it('should not set the activeChild if it is invalid', () => {
      navigation.register('root')
      navigation.register('child1', { parent: 'root' })

      navigation.setActiveChild('root', 'child2')

      expect(navigation.nodes.root.activeChild).toBeFalsy()
    })
  })

  describe('setActiveIndex', () => {
    it('should call through to setActiveChild as expected', () => {
      navigation.setActiveChild = jest.fn()

      navigation.register('root')
      navigation.register('child1', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })

      navigation.setActiveIndex('root', 1)

      expect(navigation.setActiveChild).toHaveBeenCalledWith('root', 'child2')
    })

    it('should not call through to setActiveChild when the index is out of range', () => {
      navigation.setActiveChild = jest.fn()

      navigation.register('root')
      navigation.register('child1', { parent: 'root' })
      navigation.register('child2', { parent: 'root' })

      navigation.setActiveIndex('root', 2)

      expect(navigation.setActiveChild).not.toHaveBeenCalled()
    })
  })

  describe('Overriding static KEY_CODES/KEY_MAP properties', () => {
    it('should emit the select event as expected', () => {
      Lrud.KEY_CODES = { 1: 'Enter' }
      Lrud.KEY_MAP = { ENTER: 'Enter' }

      const spy = jest.fn()

      navigation.on('select', spy)

      navigation.register('root')
      navigation.register('child', { parent: 'root' })

      navigation.focus('child')

      navigation.handleKeyEvent({ keyCode: 1 })

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('child')
    })
  })
})