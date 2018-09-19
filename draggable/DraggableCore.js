//
// Define <DraggableCore>.
//
// <DraggableCore> is for advanced usage of <Draggable>. It maintains minimal internal state so it can
// work well with libraries that require more control over the element.
//

var DraggableCore = (function () {
  const {
    matchesSelectorAndParentsTo,
    addEvent,
    removeEvent,
    addUserSelectStyles,
    getTouchIdentifier,
    removeUserSelectStyles,
    styleHacks
  } = domFns;

  const { createCoreData, getControlPosition, snapToGrid } = positionFns;
  // import log from './utils/log';

  // Simple abstraction for dragging events names.
  const eventsFor = {
    touch: {
      start: 'touchstart',
      move: 'touchmove',
      stop: 'touchend'
    },
    mouse: {
      start: 'mousedown',
      move: 'mousemove',
      stop: 'mouseup'
    }
  };

  // Default to mouse events.
  let dragEventFor = eventsFor.mouse;

  const defaultAttrs = {
    allowAnyClick: false, // by default only accept left click
    cancel: null,
    disabled: false,
    enableUserSelectHack: true,
    offsetParent: null,
    handle: null,
    grid: null,
    transform: null,
    onStart: function(){},
    onDrag: function(){},
    onStop: function(){},
    onMouseDown: function(){}
  };

  var defaultState = {
    dragging: false,
    // Used while dragging to determine deltas.
    lastX: NaN, lastY: NaN,
    touchIdentifier: null
  }

  function oninit (vnode) {
    var self = this

    Object.assign(self, {
      // handleDragStart: handleDragStart,
      handleDrag: handleDrag,
      handleDragStop: handleDragStop
    })

    // Assign the default values to the attrs
    _.forEach(defaultAttrs, function (val, key) {
      // console.log('key: ', key)
      if (!vnode.attrs[key]) {
        vnode.attrs[key] = val
      }
    })

    // Define the initial state
    // self = state
    Object.assign(self, defaultState)

    // -------------------------------------------------
    // Set up the event handlers
    // -------------------------------------------------
    self.onMouseDown = function (e) {
      dragEventFor = eventsFor.mouse; // on touchscreen laptops we could switch back to mouse
  
      return handleDragStart(e);
    }

    // handleDragStart: EventHandler<MouseTouchEvent> = (e) => {
    function handleDragStart (e) {
      console.error('handleDragStart.....', self, vnode)
      var attrs = vnode.attrs
      console.log('attrs: ', attrs)

      // Make it possible to attach event handlers on top of this one.
      attrs.onMouseDown(e);
    
      // Only accept left-clicks.
      if (!attrs.allowAnyClick && typeof e.button === 'number' && e.button !== 0) return false;
    
      // Get the dom element
      // Get nodes. Be sure to grab relative document (could be iframed)
      const thisNode = vnode.dom

      // const thisNode = ReactDOM.findDOMNode(this);
      if (!thisNode || !thisNode.ownerDocument || !thisNode.ownerDocument.body) {
        throw new Error('<DraggableCore> not mounted on DragStart!');
      }
      const {ownerDocument} = thisNode;
    
      // Short circuit if handle or cancel prop was provided and selector doesn't match.
      if (attrs.disabled ||
        (!(e.target instanceof ownerDocument.defaultView.Node)) ||
        (attrs.handle && !matchesSelectorAndParentsTo(e.target, attrs.handle, thisNode)) ||
        (attrs.cancel && matchesSelectorAndParentsTo(e.target, attrs.cancel, thisNode))) {
        return;
      }
    
      // Set touch identifier in component state if this is a touch event. This allows us to
      // distinguish between individual touches on multitouch screens by identifying which
      // touchpoint was set to this element.
      const touchIdentifier = getTouchIdentifier(e);
      console.log('touchIdentifier....', touchIdentifier)
      Object.assign(self, { touchIdentifier: touchIdentifier })
    
      // Get the current drag point from the event. This is used as the offset.
      const position = getControlPosition(e, touchIdentifier, vnode);
      console.error('position....', position)
      if (position == null) return; // not possible but satisfies flow
      const {x, y} = position;
    
      // Create an event object with all the data parents need to make a decision here.
      const coreEvent = createCoreData(vnode, x, y);
    
      log('DraggableCore: handleDragStart: %j', coreEvent);
    
      // Call event handler. If it returns explicit false, cancel.
      log('calling', attrs.onStart);
      const shouldUpdate = attrs.onStart(e, coreEvent);
      if (shouldUpdate === false) return;
    
      // Add a style to the body to disable user-select. This prevents text from
      // being selected all over the page.
      if (attrs.enableUserSelectHack) addUserSelectStyles(ownerDocument);
    
      // Initiate dragging. Set the current x and y as offsets
      // so we know how much we've moved during the drag. This allows us
      // to drag elements around even if they have been moved, without issue.
      Object.assign(self, {
        dragging: true,
    
        lastX: x,
        lastY: y
      });
    
      // Add events to the document directly so we catch when the user's mouse/touch moves outside of
      // this element. We use different events depending on whether or not we have detected that this
      // is a touch-capable device.
      addEvent(ownerDocument, dragEventFor.move, handleDrag);
      addEvent(ownerDocument, dragEventFor.stop, handleDragStop);
    }

    // handleDrag: EventHandler<MouseTouchEvent> = (e) => {
    function handleDrag (e) {
      var attrs = vnode.attrs
      // console.info('handleDrag....', attrs)
      // Prevent scrolling on mobile devices, like ipad/iphone.
      if (e.type === 'touchmove') e.preventDefault();

      // Get the current drag point from the event. This is used as the offset.
      const position = getControlPosition(e, self.touchIdentifier, vnode);
      // console.info('position: ', position)
      if (position == null) return;
      let {x, y} = position;

      // Snap to grid if prop has been provided
      if (Array.isArray(attrs.grid)) {
        let deltaX = x - self.lastX, deltaY = y - self.lastY;
        [deltaX, deltaY] = snapToGrid(attrs.grid, deltaX, deltaY);
        if (!deltaX && !deltaY) return; // skip useless drag
        x = self.lastX + deltaX, y = self.lastY + deltaY;
      }

      const coreEvent = createCoreData(vnode, x, y);

      log('DraggableCore: handleDrag: %j', coreEvent);

      // Call event handler. If it returns explicit false, trigger end.
      const shouldUpdate = attrs.onDrag(e, coreEvent);
      if (shouldUpdate === false) {
        try {
          // $FlowIgnore
          handleDragStop(new MouseEvent('mouseup'));
        } catch (err) {
          // Old browsers
          // const event = ((document.createEvent('MouseEvents'): any): MouseTouchEvent);
          const event = ((document.createEvent('MouseEvents')));
          // I see why this insanity was deprecated
          // $FlowIgnore
          event.initMouseEvent('mouseup', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
          handleDragStop(event);
        }
        return;
      }

      Object.assign(self, {
        lastX: x,
        lastY: y
      });
    }

    function handleDragStop (e) {
      // console.error('handleDragStop.....', e, this)
      if (!self.dragging) return;
  
      const position = getControlPosition(e, self.touchIdentifier, vnode);
      if (position == null) return;
      const {x, y} = position;
      const coreEvent = createCoreData(vnode, x, y);
  
      const thisNode = vnode.dom
      // const thisNode = ReactDOM.findDOMNode(this); -- TODO REMOVE LINE
      if (thisNode) {
        // Remove user-select hack
        if (vnode.attrs.enableUserSelectHack) removeUserSelectStyles(thisNode.ownerDocument);
      }
  
      log('DraggableCore: handleDragStop: %j', coreEvent);
  
      // Reset the el.
      Object.assign(self, {
        dragging: false,
        lastX: NaN,
        lastY: NaN
      });
  
      // Call event handler
      vnode.attrs.onStop(e, coreEvent);
  
      if (thisNode) {
        // Remove event handlers
        log('DraggableCore: Removing handlers');
        removeEvent(thisNode.ownerDocument, dragEventFor.move, handleDrag);
        removeEvent(thisNode.ownerDocument, dragEventFor.stop, handleDragStop);
      }
    }

    self.onMouseUp = function (e) {
      dragEventFor = eventsFor.mouse;
  
      return handleDragStop(e);
    }

    // Same as onMouseDown (start drag), but now consider this a touch device.
    self.onTouchStart = function (e) {
      // We're on a touch device now, so change the event handlers
      dragEventFor = eventsFor.touch;

      return handleDragStart(e);
    };

    self.onTouchEnd = function (e) {
      // We're on a touch device now, so change the event handlers
      dragEventFor = eventsFor.touch;

      return handleDragStop(e);
    };
  }

  function oncreate (vnode) {

  }

  function onremove (vnode) {
    console.error('onremove called....', vnode)
    
    // Remove any leftover event handlers. Remove both touch and mouse handlers in case
    // some browser quirk caused a touch event to fire during a mouse move, or vice versa.
    const thisNode = vnode.dom;     //ReactDOM.findDOMNode(this);
    if (thisNode) {
      const {ownerDocument} = thisNode;
      removeEvent(ownerDocument, eventsFor.mouse.move, self.handleDrag);
      removeEvent(ownerDocument, eventsFor.touch.move, self.handleDrag);
      removeEvent(ownerDocument, eventsFor.mouse.stop, self.handleDragStop);
      removeEvent(ownerDocument, eventsFor.touch.stop, self.handleDragStop);
      if (vnode.attrs.enableUserSelectHack) removeUserSelectStyles(ownerDocument);
    }
  }


  function view (vnode) {
    var self = this
    // console.error('DraggableCore view.....', vnode, self)

    var child = vnode.attrs.vnode

    // var attrs = 
    Object.assign(child.attrs, {
      style: styleHacks(child.attrs.style),

      // Note: mouseMove handler is attached to document so it will still function
      // when the user drags quickly and leaves the bounds of the element.
      onmousedown: self.onMouseDown,
      ontouchstart: self.onTouchStart,
      onmouseup: self.onMouseUp,
      ontouchend: self.onTouchEnd
    })

    // Reuse the child provided in the vnode.attrs
    // This makes it flexible to use whatever element is wanted (div, ul, etc)
    // We will extend the attrs with additional fields
    return child
    // return m(child.tag, attrs, child.children)



    // return React.cloneElement(React.Children.only(this.props.children), {
    //   style: styleHacks(this.props.children.props.style),

    //   // Note: mouseMove handler is attached to document so it will still function
    //   // when the user drags quickly and leaves the bounds of the element.
    //   onMouseDown: this.onMouseDown,
    //   onTouchStart: this.onTouchStart,
    //   onMouseUp: this.onMouseUp,
    //   onTouchEnd: this.onTouchEnd
    // });
  }

  return {
    oninit: oninit,
    oncreate: oncreate,
    onremove: onremove,
    view: view
  }
})()

// var DraggableCore = function () {
//     render() {
//       // Reuse the child provided
//       // This makes it flexible to use whatever element is wanted (div, ul, etc)
//       return React.cloneElement(React.Children.only(this.props.children), {
//         style: styleHacks(this.props.children.props.style),
//         // Note: mouseMove handler is attached to document so it will still function
//         // when the user drags quickly and leaves the bounds of the element.
//         onMouseDown: this.onMouseDown,
//         onTouchStart: this.onTouchStart,
//         onMouseUp: this.onMouseUp,
//         onTouchEnd: this.onTouchEnd
//       });
//     }
//   // }
// }


// type DraggableCoreState = {
//   dragging: boolean,
//   lastX: number,
//   lastY: number,
//   touchIdentifier: ?number
// };

// export type DraggableBounds = {
//   left: number,
//   right: number,
//   top: number,
//   bottom: number,
// };

// export type DraggableData = {
//   node: HTMLElement,
//   x: number, y: number,
//   deltaX: number, deltaY: number,
//   lastX: number, lastY: number,
// };

// export type DraggableEventHandler = (e: MouseEvent, data: DraggableData) => void;

// export type ControlPosition = {x: number, y: number};

// export type DraggableCoreProps = {
//   allowAnyClick: boolean,
//   cancel: string,
//   children: ReactElement<any>,
//   disabled: boolean,
//   enableUserSelectHack: boolean,
//   offsetParent: HTMLElement,
//   grid: [number, number],
//   handle: string,
//   onStart: DraggableEventHandler,
//   onDrag: DraggableEventHandler,
//   onStop: DraggableEventHandler,
//   onMouseDown: (e: MouseEvent) => void,
// };

