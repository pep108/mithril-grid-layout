var MithrilGridLayout = (function () {
  'use strict'

  const {
    autoBindHandlers,
    bottom,
    childrenEqual,
    cloneLayoutItem,
    compact,
    getLayoutItem,
    moveElement,
    synchronizeLayoutWithChildren,
    validateLayout,
    getAllCollisions,
    noop,
    log
  } = GridLayoutUtils

  const defaultAttrs = {
    autoSize: true,
    cols: 4,
    className: "",
    style: {},
    draggableHandle: "",
    draggableCancel: "",
    containerPadding: null,
    rowHeight: 150,
    maxRows: Infinity, // infinite vertical growth
    layout: [],
    margin: [10, 10],
    isDraggable: true,
    isResizable: true,
    useCSSTransforms: true,
    verticalCompact: true,
    compactType: "vertical",
    preventCollision: false,
    onLayoutChange: noop,
    onDragStart: noop,
    onDrag: noop,
    onDragStop: noop,
    onResizeStart: noop,
    onResize: noop,
    onResizeStop: noop
  };

  function oninit (vnode) {
    var self = this
    // console.error('GridLayout oninit.... ', this, vnode.attrs)

    // Assign the default values to the attrs
    _.forEach(defaultAttrs, function (val, key) {
      // console.log('key: ', key)
      if (!vnode.attrs[key]) {
        vnode.attrs[key] = val
      }
    })
    
    var attrs = vnode.attrs
    Object.assign(self, attrs, {
      activeDrag: null,      
      mounted: false,
      oldDragItem: null,
      oldLayout: null,
      oldResizeItem: null
    })

    // Save the props so they don't get lost
    self.props = vnode.attrs

    self.compactType = function (props) {
      if (!props) props = attrs;
      return props.verticalCompact === false ? null : props.compactType;
    }
    // self.compactType = compactType

    autoBindHandlers(self, [
      'onDragStart',
      'onDrag',
      'onDragStop',
      'onResizeStart',
      'onResize',
      'onResizeStop'
    ])

    self.layout = synchronizeLayoutWithChildren(
      attrs.layout,
      attrs.children,
      attrs.cols,
      // Legacy support for verticalCompact: false
      self.compactType()
    ),
    // console.error('self: ', self)
    // self.props = Object.assign({}, defaultAttrs)
    // console.error('GridLayout self: ', self)
    // log('GridLayout oninit self: ', self)
    // console.warn('vnode.attrs: ', vnode.attrs)

    /**
     * Calculates a pixel value for the container.
     * @return {String} Container height in pixels.
     */       
    self.containerHeight = function () {
      // console.log('self: ', self)
      // var props = self.props
      if (!self.autoSize) return;
      const nbRow = bottom(self.layout);
      const containerPaddingY = self.containerPadding
        ? self.containerPadding[1]
        : self.margin[1];
        
      return (
        nbRow * self.rowHeight +
        (nbRow - 1) * self.margin[1] +
        containerPaddingY * 2 +
        "px"
      )
    }

    /**
     * When dragging starts
     * @param {String} i Id of the child
     * @param {Number} x X position of the move
     * @param {Number} y Y position of the move
     * @param {Event} e The mousedown event
     * @param {Element} node The current dragging DOM element
     */
    self.onDragStart = function (i, x, y, e, node) {
      console.info('onDragStart...', i, x, y, e, node)
      const { layout } = self;
      var l = getLayoutItem(layout, i);
      if (!l) return;

      Object.assign(self, {
        oldDragItem: cloneLayoutItem(l),
        oldLayout: self.layout
      })

      return self.onDragStart(layout, l, l, null, e, node);
    }

    /**
     * Each drag movement create a new dragelement and move the element to the dragged location
     * @param {String} i Id of the child
     * @param {Number} x X position of the move
     * @param {Number} y Y position of the move
     * @param {Event} e The mousedown event
     * @param {Element} node The current dragging DOM element
     */
    // onDrag(i: string, x: number, y: number, { e, node }: GridDragEvent) {
    self.onDrag = function (i, x, y, { e, node }) {
      // console.info('onDrag....', i, x, y, node)
      const { oldDragItem } = self;
      let { layout } = self;
      const { cols } = vnode.attrs;
      var l = getLayoutItem(layout, i);
      // console.log('layoutItem: ', l)
      if (!l) return;

      // Create placeholder (display only)
      var placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        placeholder: true,
        i: i
      };

      // Move the element to the dragged location.
      const isUserAction = true;
      // console.error('moving element....', self.compactType(), 'vertical')
      layout = moveElement(
        layout,
        l,
        x,
        y,
        isUserAction,
        attrs.preventCollision,
        self.compactType(),
        cols
      );

      vnode.attrs.onDrag(layout, oldDragItem, l, placeholder, e, node);

      // console.warn('placeholder: ', placeholder)
      Object.assign(self, {
        layout: compact(layout, self.compactType(), cols),
        activeDrag: placeholder
      });
      m.redraw()
    }

    /**
     * When dragging stops, figure out which position the element is closest to and update its x and y.
     * @param  {String} i Index of the child.
     * @param {Number} x X position of the move
     * @param {Number} y Y position of the move
     * @param {Event} e The mousedown event
     * @param {Element} node The current dragging DOM element
     */
    // onDragStop(i: string, x: number, y: number, { e, node }: GridDragEvent) {
    self.onDragStop = function (i, x, y, { e, node }) {
      const { oldDragItem } = self;
      let { layout } = self;
      const { cols, preventCollision } = vnode.attrs;
      const l = getLayoutItem(layout, i);
      if (!l) return;

      // Move the element here
      const isUserAction = true;
      layout = moveElement(
        layout,
        l,
        x,
        y,
        isUserAction,
        preventCollision,
        self.compactType(),
        cols
      );

      vnode.attrs.onDragStop(layout, oldDragItem, l, null, e, node);

      // Set state
      const newLayout = compact(layout, self.compactType(), cols);
      const { oldLayout } = self;

      Object.assign(self, {
        activeDrag: null,
        layout: newLayout,
        oldDragItem: null,
        oldLayout: null
      })

      self.onLayoutMaybeChanged(newLayout, oldLayout);
    }

    // onLayoutMaybeChanged(newLayout: Layout, oldLayout: ?Layout) {
    self.onLayoutMaybeChanged = function (newLayout, oldLayout) {
      console.warn('onLayoutMaybeChanged...')
      if (!oldLayout) oldLayout = self.layout;
      if (!_.isEqual(oldLayout, newLayout)) {
        vnode.attrs.onLayoutChange(newLayout);
      }
    }

    // onResizeStart(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
    self.onResizeStart = function (i, w, h, { e, node }) {
      console.log('onResizeStart....', i, w, h, e, node)
      const { layout } = self;
      var l = getLayoutItem(layout, i);
      if (!l) return;
  
      Object.assign(self, {
        oldResizeItem: cloneLayoutItem(l),
        oldLayout: self.layout
      })
  
      vnode.attrs.onResizeStart(layout, l, l, null, e, node);
    }
  
    // onResize(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
    self.onResize = function (i, w, h, { e, node }) {
      console.log('onResize....', i, w, h, e, node)
      const { layout, oldResizeItem } = self;
      const { cols, preventCollision } = vnode.attrs;
      const l = getLayoutItem(layout, i);
      if (!l) return;
  
      // Something like quad tree should be used
      // to find collisions faster
      let hasCollisions;
      if (preventCollision) {
        const collisions = getAllCollisions(layout, { ...l, w, h }).filter(
          layoutItem => layoutItem.i !== l.i
        );
        hasCollisions = collisions.length > 0;
  
        // If we're colliding, we need adjust the placeholder.
        if (hasCollisions) {
          // adjust w && h to maximum allowed space
          let leastX = Infinity,
            leastY = Infinity;
          collisions.forEach(layoutItem => {
            if (layoutItem.x > l.x) leastX = Math.min(leastX, layoutItem.x);
            if (layoutItem.y > l.y) leastY = Math.min(leastY, layoutItem.y);
          });
  
          if (Number.isFinite(leastX)) l.w = leastX - l.x;
          if (Number.isFinite(leastY)) l.h = leastY - l.y;
        }
      }
  
      if (!hasCollisions) {
        // Set new width and height.
        l.w = w;
        l.h = h;
      }
  
      // Create placeholder element (display only)
      var placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        static: true,
        i: i
      };
  
      vnode.attrs.onResize(layout, oldResizeItem, l, placeholder, e, node);
  
      // Re-compact the layout and set the drag placeholder.
      Object.assign(self, {
        layout: compact(layout, self.compactType(), cols),
        activeDrag: placeholder
      })
    }
  
    // onResizeStop(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
    self.onResizeStop = function (i, w, h, { e, node }) {
      console.log('onResizeStop....', i, w, h, e, node)
      const { layout, oldResizeItem } = self;
      const { cols } = vnode.attrs;
      var l = getLayoutItem(layout, i);
  
      vnode.attrs.onResizeStop(layout, oldResizeItem, l, null, e, node);
  
      // Set state
      const newLayout = compact(layout, self.compactType(), cols);
      const { oldLayout } = self;
      Object.assign(self, {
        activeDrag: null,
        layout: newLayout,
        oldResizeItem: null,
        oldLayout: null
      })
  
      self.onLayoutMaybeChanged(newLayout, oldLayout);
    }

    self.processGridItem = function (layout, vnode) {
      // console.warn('self.processGridItem...', self, layout)
      // console.error('self: ', self, vnode)

      if (!vnode || !vnode.key) return;
      const l = getLayoutItem(layout, String(vnode.key));
      // console.log('found layout item: ', l)
      if (!l) return null;
      const {
        width,
        cols,
        margin,
        containerPadding,
        rowHeight,
        maxRows,
        isDraggable,
        isResizable,
        useCSSTransforms,
        draggableCancel,
        draggableHandle
      } = vnode.attrs;  //self;
      // const mounted = self.mounted
      const { mounted } = self;

      // Parse 'static'. Any properties defined directly on the grid item will take precedence.
      var draggable = (!l.static && isDraggable && (l.isDraggable || l.isDraggable == null))
      var resizable = (!l.static && isResizable && (l.isResizable || l.isResizable == null))

      // return m('div', '***')
      // console.error('passed in width: ', width, useCSSTransforms, mounted)
      return m(GridItem, {
          key: vnode.key,
          containerWidth: width,
          cols: cols,
          margin: margin,
          containerPadding: containerPadding || margin,
          maxRows: maxRows,
          rowHeight: rowHeight,
          cancel: draggableCancel,
          handle: draggableHandle,
          onDragStop: self.onDragStop,
          onDragStart: self.onDragStart,
          onDrag: self.onDrag,
          onResizeStart: self.onResizeStart,
          onResize: self.onResize,
          onResizeStop: self.onResizeStop,
          isDraggable: draggable,
          isResizable: resizable,
          useCSSTransforms: useCSSTransforms && mounted,
          usePercentages: false,  //!mounted,
          w: l.w,
          h: l.h,
          x: l.x,
          y: l.y,
          i: l.i,
          minH: l.minH,
          minW: l.minW,
          maxH: l.maxH,
          maxW: l.maxW,
          static: l.static,
          // children: vnode.children,
          // We pass in the vnode to render. GridItem will decorate the classes and styles
          vnode: vnode
      })
    }
  }

  return {
    oninit: oninit,
    oncreate: function (vnode) {
      var self = this
          
      self.mounted = true

      // Possibly call back with layout on mount. This should be done after correcting the layout width
      // to ensure we don't rerender with the wrong width.
      self.onLayoutMaybeChanged(self.layout, vnode.attrs.layout)

      // NOTE: it would be nice to have a mixin that handles the resizing and to attach it higher up than here..
      // self.onWindowResize = function () {
      //   console.error('onWindowResize...')  //, vnode.dom)
      //   if (!vnode.dom) return;
        
      //   // console.error('---------------------------------')
      //   // console.error('self.elem.offsetWidth: ', vnode.dom.offsetWidth)
      //   // console.error('vnode: ', vnode)
      //   // console.error('---------------------------------')
      //   self.mounted = true
      //   self.width = vnode.dom.offsetWidth
      //   vnode.attrs.onWindowResize(self.width)
          
      //   m.redraw()
      // }
      
      // window.addEventListener('resize', self.onWindowResize);
      // This will make sure the cssTransforms class is added to the GridItems
      m.redraw()
    },
    // onbeforeupdate: function (vnode, old) {
    //   // console.warn('GridLayout onbeforeupdate: ', vnode, old, vnode.state.activeDrag)
    //   return 
    // },
    view: function (vnode) {
      // console.error("GridLayout view function.....")
      var self = this
      // var attrs = vnode.attrs

      // NOTE: Do we need to do this???
      var attrs = Object.assign(defaultAttrs, vnode.attrs)
      // log('GridLayout vnode: ', vnode)
      // log('GridLayout self: ', self)
      // log('GridLayout attrs: ', attrs)
      // log('self.containerHeight(): ', self.containerHeight())

      // if (!self.width) { return }

      // NOTE: This logic differentiates from the react-grid-layout
      // || attrs.compactType !== self.compactType
      var newLayoutBase
      // Legacy support for compactType
      // Allow parent to set layout directly.
      if (
        !_.isEqual(attrs.layout, self.layout) ||
        attrs.compactType !== self.compactType
      ) {
        newLayoutBase = attrs.layout;
      } else if (!childrenEqual(self.children, attrs.children)) {
        // If children change, also regenerate the layout. Use our state
        // as the base in case because it may be more up to date than
        // what is in props.
        newLayoutBase = self.layout;  //this.state.layout;
      }

      /*
      // NOTE: attrs is what was just passed into this view, and the self is the existing state
      // NOTE: We don't want to update the the layout itself UNTIL the drag has stopped, 
      // so if there is an activeDrag, then we skip this
      if (!vnode.state.activeDrag && !_.isEqual(attrs.layout, self.layout)) {
        // console.error('calculating a new layout....self, attrs', self, attrs.layout)
        newLayoutBase = attrs.layout
      }
      // else if (!childrenEqual(self.children, attrs.children)) {
      //   console.error('FLAG... check me', state.children, attrs.children)
      //   // If children change, also regenerate the layout. Use our state
      //   // as the base in case because it may be more up to date than
      //   // what is in props.
      //   // newLayoutBase = self.layout;
      // }
      */

      if (newLayoutBase) {
        const newLayout = synchronizeLayoutWithChildren(
          newLayoutBase,
          attrs.children,
          attrs.cols,
          // Legacy support for verticalCompact: false
          self.compactType(attrs)
        )
        // console.warn('newLayout: ', newLayout)
                
        const oldLayout = self.layout //JSON.parse(JSON.stringify(self.layout))
        Object.assign(self, {
          layout: newLayout
        })
        self.onLayoutMaybeChanged(newLayout, oldLayout)
      }
          
      // Make sure the state holds the value passed down from above...
      self.width = attrs.width

      var activeDrag = self.activeDrag

      // console.error('GridLayout attrs: ', attrs)
      return [
        m('div', { class: 'react-grid-layout layout', style: 'height:'+self.containerHeight() }, [
          attrs.children.map(function (child, i) {
            // console.warn('*child: ', attrs)
            Object.assign(child.attrs, attrs)
            // return self.processGridItem(attrs.layout, child)
            
            if (!child.key) return;
            
            const l = getLayoutItem(attrs.layout, String(child.key));
            // console.log('found layout item: ', l)
            if (!l) return null;
            const {
              width,
              cols,
              margin,
              containerPadding,
              rowHeight,
              maxRows,
              isDraggable,
              isResizable,
              useCSSTransforms,
              draggableCancel,
              draggableHandle
            } = child.attrs;  //self;
            // const mounted = self.mounted
            const { mounted } = self;

            // Parse 'static'. Any properties defined directly on the grid item will take precedence.
            var draggable = (!l.static && isDraggable && (l.isDraggable || l.isDraggable == null))
            var resizable = (!l.static && isResizable && (l.isResizable || l.isResizable == null))

            // return m('div', '***')
            // console.error('passed in width: ', width, useCSSTransforms, mounted)
            return m(GridItem, {
                key: child.key,
                containerWidth: width,
                cols: cols,
                margin: margin,
                containerPadding: containerPadding || margin,
                maxRows: maxRows,
                rowHeight: rowHeight,
                cancel: draggableCancel,
                handle: draggableHandle,
                onDragStop: self.onDragStop,
                onDragStart: self.onDragStart,
                onDrag: self.onDrag,
                onResizeStart: self.onResizeStart,
                onResize: self.onResize,
                onResizeStop: self.onResizeStop,
                isDraggable: draggable,
                isResizable: resizable,
                useCSSTransforms: useCSSTransforms && mounted,
                usePercentages: false,  //!mounted,
                w: l.w,
                h: l.h,
                x: l.x,
                y: l.y,
                i: l.i,
                minH: l.minH,
                minW: l.minW,
                maxH: l.maxH,
                maxW: l.maxW,
                static: l.static,
                // children: vnode.children,
                // We pass in the vnode to render. GridItem will decorate the classes and styles
                vnode: child
            })
          }),
          // Render the placeholder
          // This will only render with an activeDrag
          activeDrag ?
            m(GridItem, {
              w: activeDrag.w,
              h: activeDrag.h,
              x: activeDrag.x,
              y: activeDrag.y,
              i: activeDrag.i,
              className: 'react-grid-placeholder',
              containerWidth: attrs.width,
              cols: attrs.cols,
              margin: attrs.margin,
              containerPadding :attrs.containerPadding || attrs.margin,
              maxRows: attrs.maxRows,
              rowHeight: attrs.rowHeight,
              isDraggable: false,
              isResizable: false,
              useCSSTransforms: attrs.useCSSTransforms,
              placeholder: true,   // TESTING
              vnode: m('div')
            })
          : null
        ])

        // <div className: mergedClassName} style: mergedStyle}>
        //   {React.Children.map(this.props.children, child =>
        //     this.processGridItem(child)
        //   )}
        //   {this.placeholder()}
        // </div>
      ]
      
      /*
      return [
        m('div', { class: 'react-grid-layout layout', style: 'height:'+self.containerHeight() }, [
          attrs.children.map(function (child, i) {
            // console.warn('*child: ', attrs)
            Object.assign(child.attrs, attrs)
            // return self.processGridItem(attrs.layout, child)
            
            if (!child.key) return;
            
            const l = getLayoutItem(attrs.layout, String(child.key));
            // console.log('found layout item: ', l)
            if (!l) return null;
            const {
              width,
              cols,
              margin,
              containerPadding,
              rowHeight,
              maxRows,
              isDraggable,
              isResizable,
              useCSSTransforms,
              draggableCancel,
              draggableHandle
            } = child.attrs;  //self;
            // const mounted = self.mounted
            const { mounted } = self;

            // Parse 'static'. Any properties defined directly on the grid item will take precedence.
            var draggable = (!l.static && isDraggable && (l.isDraggable || l.isDraggable == null))
            var resizable = (!l.static && isResizable && (l.isResizable || l.isResizable == null))

            // return m('div', '***')
            // console.error('passed in width: ', width, useCSSTransforms, mounted)
            return m(GridItem, {
                key: child.key,
                containerWidth: width,
                cols: cols,
                margin: margin,
                containerPadding: containerPadding || margin,
                maxRows: maxRows,
                rowHeight: rowHeight,
                cancel: draggableCancel,
                handle: draggableHandle,
                onDragStop: self.onDragStop,
                onDragStart: self.onDragStart,
                onDrag: self.onDrag,
                onResizeStart: self.onResizeStart,
                onResize: self.onResize,
                onResizeStop: self.onResizeStop,
                isDraggable: draggable,
                isResizable: resizable,
                useCSSTransforms: useCSSTransforms && mounted,
                usePercentages: false,  //!mounted,
                w: l.w,
                h: l.h,
                x: l.x,
                y: l.y,
                i: l.i,
                minH: l.minH,
                minW: l.minW,
                maxH: l.maxH,
                maxW: l.maxW,
                static: l.static,
                // children: vnode.children,
                // We pass in the vnode to render. GridItem will decorate the classes and styles
                vnode: child
            })
          }),
          // Render the placeholder
          // This will only render with an activeDrag
          self.placeholder()
        ])

        // <div className: mergedClassName} style: mergedStyle}>
        //   {React.Children.map(this.props.children, child =>
        //     this.processGridItem(child)
        //   )}
        //   {this.placeholder()}
        // </div>
      ]
      */
    }
  }

})();

module.exports = MithrilGridLayout;