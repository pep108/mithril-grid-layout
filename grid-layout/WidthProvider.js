var WidthProvider = function (vnode) {
  'use strict'

  var defaultAttrs = {
    measureBeforeMount: false
  }

  function oncreate (vnode) {
    console.log('WidthProvider oncreate....', vnode)
    var self = this
    self.elem = vnode.dom
    
    // console.log('vnode; ', self, vnode)
    
    self.onWindowResize = function () {
      if (!vnode.dom) return;
      
      console.error('---------------------------------')
      console.error('onWindowResize...', vnode.dom)
      console.error('self.elem.offsetWidth: ', self.elem.offsetWidth)
      console.error('---------------------------------')
      self.mounted = true
      if (!self.elem.offsetWidth) return 

      self.width = vnode.dom.offsetWidth
        
      m.redraw()
    }
    
    // window.addEventListener('resize', $.throttle(250, self.onWindowResize))
    window.addEventListener('resize', self.onWindowResize)
    self.onWindowResize()
    m.redraw()
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
      return m('div', { class: attrs.class, style: attrs.style })
    }
    
    // console.log('WidthProvider  attrs', attrs)
    console.error('*** WIDTH: ', self.width, vnode.children)


    // return vnode.children.map(function (child) {
    //   child.attrs.width = self.width
    //   Object.assign(child.attrs, {
    //     width: self.width
    //   })

    //   // child.state = child.state || {}
    //   // Object.assign(child.state, {
    //   //   width: self.width
    //   // })
      
    //   console.log('child.width: ', child.attrs.width)
    //   // m(MithrilGridLayout)
    //   return m(child.tag, child.attrs, child.children)
    // })

    // return m(vnode.tag, vnode.children)

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

  // return {
  //   oncreate: oncreate,
  //   onbeforeremove: onbeforeremove,
  //   view: view
  // }
}

module.exports = WidthProvider;