var WidthProviderX = function (gridNode) {
  'use strict'

  console.warn('widthProvider....')
  var defaultAttrs = {
    measureBeforeMount: false
  }

  // function oninit (vnode) {
  //   var self = this
  // }

  function oncreate (vnode) {
    console.log('WidthProvider oncreate....', vnode)
    var self = this
    // self.elem = vnode.dom
    
    // console.log('vnode; ', self, vnode)
    self.width = vnode.dom.offsetWidth
    
    self.onWindowResize = function () {
      // console.error('---------------------------------')
      console.error('onWindowResize...', vnode.dom)
      // console.error('self.elem.offsetWidth: ', vnode.dom.offsetWidth)
      // console.error('---------------------------------')
      if (!vnode.dom) return;
      
      self.mounted = true
      self.width = vnode.dom.offsetWidth
        
      m.redraw()
    }
    
    // window.addEventListener('resize', $.throttle(250, self.onWindowResize))
    window.addEventListener('resize', self.onWindowResize)
    self.onWindowResize()
    // m.redraw()
  }

  function onbeforeremove (vnode) {
    var self = this
    self.mounted = false;
    window.removeEventListener('resize', self.onWindowResize);
  }

  function view (vnode) {
    var self = this
    var attrs = vnode.attrs
    // console.log('WidthProvider view.....', vnode)
    // console.log('WidthProvider self ', self)

    if (attrs.measureBeforeMount && !self.mounted) {
      console.error('checkpoint #1')
      return m('div')
    }
    
    // console.log('WidthProvider  attrs', attrs)
    console.error('*** WIDTH: ', self.width, vnode.children)

    // return vnode

    // return vnode.children.map(function (child) {
    //   // console.log('childe: ', child)
    //   Object.assign(child.attrs, {
    //     width: self.width
    //   })

    //   // m(MithrilGridLayout)
    //   return m(child.tag, child.attrs, child.children)
    // })
    vnode.attrs.width = self.width

    return m(gridNode, vnode.attrs)

    // return m(vnode.tag, {
    //   children: vnode.children,
    //   className: attrs.className,
    //   compactType: attrs.compactType,
    //   initialLayout: attrs.initialLayout,
    //   preventCollision: attrs.preventCollision,
    //   rowHeight: attrs.rowHeight,
    //   useCSSTransforms: attrs.useCSSTransforms,
    //   width: self.width,
    //   onLayoutChange: self.onLayoutChange,
    //   layout: self.layout,
    //   cols: self.cols
    // })

    
    


    // // Pass the width along to the children
    // return vnode.children.map(function (child) {
    //   console.log('child: ', child)
    //   child.attrs.width = self.width

    //   return child
    // })
    // return vnode.children
  }

  // return vnode
  return {
    // oninit: oninit,
    oncreate: oncreate,
    onbeforeremove: onbeforeremove,
    view: view
  }

}