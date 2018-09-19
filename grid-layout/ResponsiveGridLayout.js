
var ResponsiveMithrilGridLayout = (function () {

return {
  oninit: function (vnode) {
    var self = this

    const {
      getBreakpointFromWidth,
      getColsFromBreakpoint,
      findOrGenerateResponsiveLayout
    } = ResponsiveUtils
    
    const {
      cloneLayout,
      synchronizeLayoutWithChildren,
      noop
    } = GridLayoutUtils
  
    const defaultAttrs = {
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
      // NOTE: attrs holds the cols object whereas 'state' holds the # of cols
      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      layouts: {},
      onBreakpointChange: noop,
      onLayoutChange: noop,
      onWidthChange: noop
    };

    // Assign the default values to the attrs
    _.forEach(defaultAttrs, function (val, key) {
      // console.log('key: ', key)
      if (!vnode.attrs[key]) {
        vnode.attrs[key] = val
      }
    })

    // Save the props so they don't get lost
    // self.props = Object.assign({}, vnode.attrs)

    Object.assign(self, defaultAttrs)

    // We use the props to pass along changes in the width of the screen
    self.props = Object.assign({}, vnode.attrs)
    
    self.generateInitialState = function () {
      console.log('generateInitialState... attrs', vnode.attrs)
      var attrs = vnode.attrs
      const { width, breakpoints, layouts, cols } = attrs;

      const breakpoint = getBreakpointFromWidth(breakpoints, width);
      const colNo = getColsFromBreakpoint(breakpoint, cols);
      // verticalCompact compatibility, now deprecated
      const compactType =
        attrs.verticalCompact === false ? null : attrs.compactType;
      
        // Get the initial layout. This can tricky; we try to generate one however possible if one doesn't exist
      // for this layout.
      const initialLayout = findOrGenerateResponsiveLayout(
        layouts,
        breakpoints,
        breakpoint,
        breakpoint,
        colNo,
        compactType
      );
  
      return {
        layout: initialLayout,
        breakpoint: breakpoint,
        cols: colNo
      };
    }

    // wrap layouts so we do not need to pass layouts to child
    self.onLayoutChange = function (layout) {
      vnode.attrs.onLayoutChange(layout, {
        ...vnode.attrs.layouts,
        [self.breakpoint]: layout
      });
    };

    /**
     * When the width changes work through breakpoints and reset state with the new width & breakpoint.
     * Width changes are necessary to figure out the widget widths.
     */
    self.onWidthChange = function (nextProps) {
      const { breakpoints, cols, layouts, compactType } = nextProps;
      const newBreakpoint =
        nextProps.breakpoint ||
        getBreakpointFromWidth(nextProps.breakpoints, nextProps.width);

      const lastBreakpoint = self.breakpoint;
      const newCols = getColsFromBreakpoint(newBreakpoint, cols);

      // console.error('onWidthChange....', nextProps, nextProps.width)
      console.error('onWidthChange....', nextProps.width)

      // Breakpoint change
      if (
        lastBreakpoint !== newBreakpoint ||
        self.props.breakpoints !== breakpoints ||
        self.props.cols !== cols
      ) {
        // Preserve the current layout if the current breakpoint is not present in the next layouts.
        // console.log('checkpoint #1')
        if (!(lastBreakpoint in layouts))
          layouts[lastBreakpoint] = cloneLayout(self.layout);

        // Find or generate a new layout.
        let layout = findOrGenerateResponsiveLayout(
          layouts,
          breakpoints,
          newBreakpoint,
          lastBreakpoint,
          newCols,
          compactType
        );

        // This adds missing items.
        layout = synchronizeLayoutWithChildren(
          layout,
          nextProps.children,
          newCols,
          compactType
        );

        // Store the new layout.
        layouts[newBreakpoint] = layout;

        // callbacks
        vnode.attrs.onLayoutChange(layout, layouts);
        vnode.attrs.onBreakpointChange(newBreakpoint, newCols);

        Object.assign(self, {
          breakpoint: newBreakpoint,
          layout: layout,
          cols: newCols
        })
        
      }

      // NOTE: Because the props and attrs are merged, this function does not work :/
      // call onWidthChange on every change of width, not only on breakpoint changes
      vnode.attrs.onWidthChange(
        nextProps.width,
        nextProps.margin,
        newCols,
        nextProps.containerPadding
      );
    }

    // NOTE: it would be nice to have a mixin that handles the resizing and to attach it higher up than here..
    self.onWindowResize = function () {
      if (!self.mounted) return 
      // if (!vnode.dom) return;
      
      // self.mounted = true
      self.width = self.elem.offsetWidth
      
      // console.error('---------------------------------')
      // console.error('onWindowResize...', vnode.dom, self.width)
      console.error('onWindowResize...', vnode.dom, self.width)
      // console.error('self.elem.offsetWidth: ', vnode.dom.offsetWidth)
      // console.error('---------------------------------')
      // if (!self.layout) {
      //   // Initialize the state
      //   Object.assign(self, self.generateInitialState())
      // }
        
      m.redraw()
    }
  },

  oncreate: function (vnode) {
    var self = this
    // self.elem = vnode.dom
    // console.error('oncreate executed...', vnode.dom.offsetWidth)

    self.mounted = true
      
    self.elem = vnode.dom
    // self.width = vnode.dom.offsetWidth

    // Set the width BEFORE we generate the initial state
    self.width = self.elem.offsetWidth
    vnode.attrs.width = self.width

    // TESTING
    // vnode.attrs.onWidthChange(self.width)
    
    // NOTE: We need the width before we call generateInitialState or it will fail
    // Initialize the state
    Object.assign(self, self.generateInitialState())
    console.log('initialState: ', self)
    
    // window.addEventListener('resize', $.throttle(250, self.onWindowResize))
    window.addEventListener('resize', self.onWindowResize)
    self.onWindowResize()


    // var width = vnode.dom.offsetWidth
    // // vnode.attrs.width = width
    // self.props.width = width
    
    // m.redraw()
  },

  onremove: function () {
    self.mounted = false;
    window.removeEventListener('resize', self.onWindowResize);
  },

  /**
   * TODO FIXME - See comment below on the block of logic
   * This is the biggest area of trouble. React sends in new props, which are the equivalent
   * of mithril attrs, but I don't have the WidthProvider hooked up to send in the width
   * and instead this component handles the passing of that value along....
   * What needs to happen is that I figure out a method of passing the props along correctly,
   * including the breakpoint
   */
  /*
  onbeforeupdate: function (vnode, old) {
    return true

    var self = this
    console.error('onbeforeupdate......', vnode.attrs, old)
    // console.log('self: ', self)
    // var nextProps = vnode.state

    var nextProps = vnode.attrs
    var oldProps = old.attrs


    // Allow parent to set width or breakpoint directly.
    if (
      nextProps.width != oldProps.width ||
      nextProps.breakpoint !== oldProps.breakpoint ||
      !_.isEqual(nextProps.breakpoints, oldProps.breakpoints) ||
      !_.isEqual(nextProps.cols, oldProps.cols)

      // vnode.attrs.width != old.attrs.width ||
      // // nextProps.breakpoint !== old.state.breakpoint ||
      // nextProps.breakpoint !== old.attrs.breakpoint ||
      // !_.isEqual(nextProps.breakpoints, old.attrs.breakpoints) ||
      // !_.isEqual(nextProps.cols, old.attrs.cols)
    ) {
      console.log('checkpoint #2')
      // nextProps.width = old.state.props.width
      
      if (!oldProps.width) {
        nextProps.width = self.width
        nextProps.breakpoints = self.breakpoints
      }
      // Object.assign(vnode.attrs, old.state.props) //
      // vnode.attrs.width = old.state.props.width
      
      self.onWidthChange(vnode.attrs);
    } else if (!_.isEqual(nextProps.layouts, old.state.layouts)) {
      console.log('checkpoint #3')
      // Allow parent to set layouts directly.
      const { breakpoint, cols } = self;

      // Since we're setting an entirely new layout object, we must generate a new responsive layout
      // if one does not exist.
      const newLayout = findOrGenerateResponsiveLayout(
        nextProps.layouts,
        nextProps.breakpoints,
        breakpoint,
        breakpoint,
        cols,
        nextProps.compactType
      );
      Object.assign(self, { layout: newLayout })
    }
  },
  */

  view: function (vnode) {
    var self = this
    var attrs = vnode.attrs

    // Need to return a div so we can get it's width
    // if (!self.mounted) return m('div')

    // if (attrs.measureBeforeMount && !self.mounted) {
    //   console.error('checkpoint #1')
    //   return m('div')
    // }

    var nextProps = attrs
    var oldProps = self.props
    
    /**
     * TODO FIXME
     * This is the biggest area of trouble. React sends in new props, which are the equivalent
     * of mithril attrs, but I don't have the WidthProvider hooked up to send in the width
     * and instead this component handles the passing of that value along....
     * What needs to happen is that I figure out a method of passing the props along correctly,
     * including the breakpoint
     */
    console.log('nextProps.width: ', nextProps, nextProps.width)
    console.log('self.width: ', self.width)
    if (
      // nextProps.width != oldProps.width ||
      nextProps.width != self.width ||
      nextProps.breakpoint !== oldProps.breakpoint ||
      !_.isEqual(nextProps.breakpoints, oldProps.breakpoints) ||
      !_.isEqual(nextProps.cols, oldProps.cols)
    ) {
      // console.log('checkpoint #2')
      console.log('nextProps.width != self.width: ', nextProps.width != self.width)
      console.log('nextProps.breakpoint !== oldProps.breakpoint: ', nextProps.breakpoint !== oldProps.breakpoint)
      console.log('!_.isEqual(nextProps.breakpoints, oldProps.breakpoints): ', !_.isEqual(nextProps.breakpoints, oldProps.breakpoints))
      console.log('!_.isEqual(nextProps.cols, oldProps.cols): ', !_.isEqual(nextProps.cols, oldProps.cols))
      // nextProps.width = old.state.props.width
      
      // @HACK this is not in the react code and it should not be here either, but
      // without it, the entire layout breaks
      // Update the props for the next render
      Object.assign(vnode.attrs, oldProps,{
        width: self.width
      })

      // if (!self.width) return
      
      self.onWidthChange(vnode.attrs);
    } else if (!_.isEqual(nextProps.layouts, oldProps.layouts)) {
      console.log('checkpoint #3')
      // Allow parent to set layouts directly.
      const { breakpoint, cols } = self;

      // Since we're setting an entirely new layout object, we must generate a new responsive layout
      // if one does not exist.
      const newLayout = findOrGenerateResponsiveLayout(
        nextProps.layouts,
        nextProps.breakpoints,
        breakpoint,
        breakpoint,
        cols,
        nextProps.compactType
      );
      Object.assign(self, { layout: newLayout })
    }

    /*
    // @HACK - we don't pass the attrs in from before this component
    // so there is no way of modifying them other than like this
    Object.assign(attrs, {
      breakpoint: self.breakpoint,
      breakpoints: self.breakpoints,
      width: self.width
    })
    

    if (
      // NOTE: The attrs that are passed in NEVER have the width. That is added by this
      // module in the oncreate funtion
      attrs.width !== self.props.width || 
      attrs.breakpoint !== self.props.breakpoint ||
      !_.isEqual(attrs.breakpoints, self.props.breakpoints) ||
      !_.isEqual(attrs.cols, self.cols)
    ) {
      self.width = self.props.width
      // NOTE: This is confusing, but the changes to the 'breakpoint' are passed
      // to the self first, and then here to the props, whereas the changes to
      // 'width' are made first to the props and then to the attrs
      // self.props.breakpoint = self.breakpoint

      // attrs.width = self.props.width
      Object.assign(attrs, {
        width: self.width,
        // breakpoint: self.breakpoint,
        breakpoints: self.props.breakpoints
      })

      self.onWidthChange(self.props);
    } else if (!_.isEqual(attrs.layouts, self.layouts)) {
      // console.log('checkpoint #3', attrs)
      // Allow parent to set layouts directly.
      const { breakpoint, cols } = self;
  
      // Since we're setting an entirely new layout object, we must generate a new responsive layout
      // if one does not exist.
      const newLayout = findOrGenerateResponsiveLayout(
        attrs.layouts,
        attrs.breakpoints,
        breakpoint,
        breakpoint,
        cols,
        attrs.compactType
      );
      Object.assign(self, {
        layout: newLayout
      })
      // this.setState({ layout: newLayout });
    }
    */

      /* eslint-disable no-unused-vars */
      // const {
      //   breakpoint,
      //   breakpoints,
      //   cols,
      //   layouts,
      //   onBreakpointChange,
      //   onLayoutChange,
      //   onWidthChange,
      //   ...other
      // } = attrs;
      /* eslint-enable no-unused-vars */

      // console.error('self:', self)
  

      // A WidthProvider is necessary to wrap the Grid because it needs with width 
      // of the container to render
      // return m(WidthProvider, {
      //   measureBeforeMount: true,  //PropTypes.bool
      //   child: m(MithrilGridLayout, {
      //     children: attrs.children,
      //     className: attrs.className,
      //     compactType: attrs.compactType,
      //     initialLayout: attrs.initialLayout,
      //     preventCollision: attrs.preventCollision,
      //     rowHeight: attrs.rowHeight,
      //     useCSSTransforms: attrs.useCSSTransforms,
      //     // width: self.props.width,
      //     width: attrs.width,
      //     onLayoutChange: self.onLayoutChange,
      //     onWindowResize: self.onWindowResize,
      //     layout: self.layout,
      //     cols: self.cols
      //   })
      // })

      // return m(WidthProvider, {
      //           measureBeforeMount: true,  //PropTypes.bool
      //         }, m(MithrilGridLayout, {
      //           children: attrs.children,
      //           className: attrs.className,
      //           compactType: attrs.compactType,
      //           initialLayout: attrs.initialLayout,
      //           preventCollision: attrs.preventCollision,
      //           rowHeight: attrs.rowHeight,
      //           useCSSTransforms: attrs.useCSSTransforms,
      //           // width: self.props.width,
      //           width: attrs.width,
      //           onLayoutChange: self.onLayoutChange,
      //           onWindowResize: self.onWindowResize,
      //           layout: self.layout,
      //           cols: self.cols
      //         }))


      console.log('layout...', self.layout)
      // return self.layout ? 


        return m(MithrilGridLayout, {
          children: attrs.children,
          className: attrs.className,
          compactType: attrs.compactType,
          initialLayout: attrs.initialLayout,
          preventCollision: attrs.preventCollision,
          rowHeight: attrs.rowHeight,
          useCSSTransforms: attrs.useCSSTransforms,
          // width: self.props.width,
          width: self.width,
          onLayoutChange: self.onLayoutChange,
          onWindowResize: self.onWindowResize,
          layout: self.layout,
          cols: self.cols
        }, attrs.children)

      // : m('div')  //null

      // return (
      //   <ReactGridLayout
      //     {...other}
      //     onLayoutChange={this.onLayoutChange}
      //     layout={this.state.layout}
      //     cols={this.state.cols}
      //   />
      // );      
  }
}

// return WidthProviderX(Component)

  
})()

module.exports = ResponsiveMithrilGridLayout;