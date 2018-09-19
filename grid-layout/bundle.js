var MithrilGrid = (function () {
  'use strict';

  var GridLayoutUtils$1 = (function () {

    var heightWidth = {
      x: "w",
      y: "h"
    };

    return {
      bottom: bottom,
      cloneLayout: cloneLayout,
      cloneLayoutItem: cloneLayoutItem,
      childrenEqual: childrenEqual,
      collides: collides,
      compact: compact,
      resolveCompactionCollision: resolveCompactionCollision,
      compactItem: compactItem,
      correctBounds: correctBounds,
      getLayoutItem: getLayoutItem,
      getFirstCollision: getFirstCollision,
      getAllCollisions: getAllCollisions,
      getStatics: getStatics,
      moveElement: moveElement,
      moveElementAwayFromCollision: moveElementAwayFromCollision,
      perc: perc,
      setTransform: setTransform,
      setTopLeft: setTopLeft,
      sortLayoutItems: sortLayoutItems,
      sortLayoutItemsByRowCol: sortLayoutItemsByRowCol,
      sortLayoutItemsByColRow: sortLayoutItemsByColRow,
      synchronizeLayoutWithChildren: synchronizeLayoutWithChildren,
      validateLayout: validateLayout,
      autoBindHandlers: autoBindHandlers,
      log: log,
      noop: function () {}
    }


    /**
     * Return the bottom coordinate of the layout.
     *
     * @param  {Array} layout Layout array.
     * @return {Number}       Bottom coordinate.
     */
    // bottom: function (layout: Layout): number {
    function bottom(layout) {
      let max = 0,
        bottomY;
      for (let i = 0, len = layout.length; i < len; i++) {
        bottomY = layout[i].y + layout[i].h;
        if (bottomY > max) max = bottomY;
      }
      return max;
    }

    // cloneLayout: function (layout: Layout): Layout {
    function cloneLayout(layout) {
      var newLayout = Array(layout.length);
      for (let i = 0, len = layout.length; i < len; i++) {
        newLayout[i] = cloneLayoutItem(layout[i]);
      }
      return newLayout;
    }

    // Fast path to cloning, since this is monomorphic
    // export function cloneLayoutItem(layoutItem: LayoutItem): LayoutItem {
    function cloneLayoutItem(layoutItem) {
      return {
        w: layoutItem.w,
        h: layoutItem.h,
        x: layoutItem.x,
        y: layoutItem.y,
        i: layoutItem.i,
        minW: layoutItem.minW,
        maxW: layoutItem.maxW,
        minH: layoutItem.minH,
        maxH: layoutItem.maxH,
        moved: layoutItem.moved,
        static: layoutItem.static,
        moved: layoutItem.moved ? true : false,
        static: layoutItem.static ? true : false,
        // These can be null
        isDraggable: layoutItem.isDraggable,
        isResizable: layoutItem.isResizable
      };
    }

    /**
     * Comparing React `children` is a bit difficult. This is a good way to compare them.
     * This will catch differences in keys, order, and length.
     */
    // function childrenEqual(a: ReactChildren, b: ReactChildren): boolean {
    function childrenEqual(a, b) {
      // console.warn('childrenEqual: ', a, b)
      return _.isEqual(
        a.map(function (c) {
          return c.key
        }),
        b.map(function (c) {
          return c.key
        })
      )
    }

    /**
     * Given two layoutitems, check if they collide.
     */
    // export function collides(l1: LayoutItem, l2: LayoutItem): boolean {
    function collides(l1, l2) {
      if (l1.i === l2.i) return false; // same element
      if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
      if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
      if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
      if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
      // console.log('collides.....')
      return true; // boxes overlap
    }

    /**
     * Given a layout, compact it. This involves going down each y coordinate and removing gaps
     * between items.
     *
     * @param  {Array} layout Layout.
     * @param  {Boolean} verticalCompact Whether or not to compact the layout vertically.
     * @return {Array}       Compacted Layout.
     */
    // export function compact(
    //   layout: Layout,
    //   compactType: CompactType,
    //   cols: number
    // ): Layout {
    function compact(layout, compactType, cols) {
      // Statics go in the compareWith array right away so items flow around them.
      var compareWith = getStatics(layout);
      // We go through the items by row and column.
      var sorted = sortLayoutItems(layout, compactType);
      // Holding for new items.
      var out = Array(layout.length);

      for (let i = 0, len = sorted.length; i < len; i++) {
        let l = cloneLayoutItem(sorted[i]);

        // Don't move static elements
        if (!l.static) {
          l = compactItem(compareWith, l, compactType, cols, sorted);

          // Add to comparison array. We only collide with items before this one.
          // Statics are already in this array.
          compareWith.push(l);
        }

        // Add to output array to make sure they still come out in the right order.
        out[layout.indexOf(sorted[i])] = l;

        // Clear moved flag, if it exists.
        l.moved = false;
      }

      return out;
    }


    /**
     * Before moving item down, it will check if the movement will cause collisions and move those items down before.
     */
    // function resolveCompactionCollision(
    //   layout: Layout,
    //   item: LayoutItem,
    //   moveToCoord: number,
    //   axis: "x" | "y"
    // ) {
    function resolveCompactionCollision(layout, item, moveToCoord, axis) {
      // console.warn('resolveCompactionCollision....', layout, item, moveToCoord, axis)
      // var heightWidth = { x: "w", y: "h" };

      var sizeProp = heightWidth[axis];
      item[axis] += 1;
      var itemIndex = layout
        .map(function (layoutItem) {
          return layoutItem.i;
        })
        .indexOf(item.i);

      // Go through each item we collide with.
      for (let i = itemIndex + 1; i < layout.length; i++) {
        var otherItem = layout[i];
        // Ignore static items
        if (otherItem.static) continue;

        // Optimization: we can break early if we know we're past this el
        // We can do this b/c it's a sorted layout
        if (otherItem.y > (item.y + item.h)) break;

        if (collides(item, otherItem)) {
          resolveCompactionCollision(
            layout,
            otherItem,
            moveToCoord + item[sizeProp],
            axis
          );
        }
      }

      item[axis] = moveToCoord;
    }

    /**
     * Compact an item in the layout.
     */
    // function compactItem (
    //   compareWith: Layout,
    //   l: LayoutItem,
    //   compactType: CompactType,
    //   cols: number,
    //   fullLayout: Layout
    // ): LayoutItem {
    function compactItem(compareWith, l, compactType, cols, fullLayout) {
      var compactV = compactType === "vertical";
      var compactH = compactType === "horizontal";
      if (compactV) {
        // Bottom 'y' possible is the bottom of the layout.
        // This allows you to do nice stuff like specify {y: Infinity}
        // This is here because the layout must be sorted in order to get the correct bottom `y`.
        l.y = Math.min(bottom(compareWith), l.y);
        // Move the element up as far as it can go without colliding.
        while (l.y > 0 && !getFirstCollision(compareWith, l)) {
          l.y--;
        }
      } else if (compactH) {
        l.y = Math.min(bottom(compareWith), l.y);
        // Move the element left as far as it can go without colliding.
        while (l.x > 0 && !getFirstCollision(compareWith, l)) {
          l.x--;
        }
      }

      // Move it down, and keep moving it down if it's colliding.
      let collides;
      while ((collides = getFirstCollision(compareWith, l))) {
        if (compactH) {
          resolveCompactionCollision(fullLayout, l, collides.x + collides.w, "x");
        } else {
          resolveCompactionCollision(fullLayout, l, collides.y + collides.h, "y");
        }
        // Since we can't grow without bounds horizontally, if we've overflown, let's move it down and try again.
        if (compactH && l.x + l.w > cols) {
          l.x = cols - l.w;
          l.y++;
        }
      }
      return l;
    }

    /**
     * Given a layout, make sure all elements fit within its bounds.
     *
     * @param  {Array} layout Layout array.
     * @param  {Number} bounds Number of columns.
     */
    // export function correctBounds(
    //   layout: Layout,
    //   bounds: { cols: number }
    // ): Layout {
    function correctBounds(layout, bounds) {
      var collidesWith = getStatics(layout);
      for (let i = 0, len = layout.length; i < len; i++) {
        var l = layout[i];
        // Overflows right
        if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;
        // Overflows left
        if (l.x < 0) {
          l.x = 0;
          l.w = bounds.cols;
        }
        if (!l.static) collidesWith.push(l);
        else {
          // If this is static and collides with other statics, we must move it down.
          // We have to do something nicer than just letting them overlap.
          while (getFirstCollision(collidesWith, l)) {
            l.y++;
          }
        }
      }
      return layout;
    }

    /**
     * Get a layout item by ID. Used so we can override later on if necessary.
     *
     * @param  {Array}  layout Layout array.
     * @param  {String} id     ID
     * @return {LayoutItem}    Item at ID.
     */
    // export function getLayoutItem(layout: Layout, id: string): ?LayoutItem {
    function getLayoutItem(layout, id) {
      for (let i = 0, len = layout.length; i < len; i++) {
        if (layout[i].i === id) return layout[i];
      }
    }

    /**
     * Returns the first item this layout collides with.
     * It doesn't appear to matter which order we approach this from, although
     * perhaps that is the wrong thing to do.
     *
     * @param  {Object} layoutItem Layout item.
     * @return {Object|undefined}  A colliding layout item, or undefined.
     */
    // export function getFirstCollision (
    //   layout: Layout,
    //   layoutItem: LayoutItem
    // ): ?LayoutItem {
    function getFirstCollision(layout, layoutItem) {
      for (let i = 0, len = layout.length; i < len; i++) {
        if (collides(layout[i], layoutItem)) return layout[i];
      }
    }

    // export function getAllCollisions(
    //   layout: Layout,
    //   layoutItem: LayoutItem
    // ): Array<LayoutItem> {
    function getAllCollisions(layout, layoutItem) {
      console.warn('getAllCollisions....', layout, layoutItem);
      // var collisions = layout.filter(function(l) { collides(l, layoutItem) } );
      // console.log('collisions....', collisions)
      // return collisions
      return layout.filter(function (l) {
        collides(l, layoutItem);
      });
    }

    /**
     * Get all static elements.
     * @param  {Array} layout Array of layout objects.
     * @return {Array}        Array of static layout items..
     */
    // export function getStatics(layout: Layout): Array<LayoutItem> {
    function getStatics(layout) {
      return layout.filter(function (l) {
        l.static;
      })
    }

    /**
     * Move an element. Responsible for doing cascading movements of other elements.
     *
     * @param  {Array}      layout            Full layout to modify.
     * @param  {LayoutItem} l                 element to move.
     * @param  {Number}     [x]               X position in grid units.
     * @param  {Number}     [y]               Y position in grid units.
     */
    // export function moveElement(
    //   layout: Layout,
    //   l: LayoutItem,
    //   x: ?number,
    //   y: ?number,
    //   isUserAction: ?boolean,
    //   preventCollision: ?boolean,
    //   compactType: CompactType,
    //   cols: number,
    // ): Layout {
    function moveElement(layout, l, x, y, isUserAction, preventCollision, compactType, cols) {
      if (l.static) return layout;

      // Short-circuit if nothing to do.
      if (l.y === y && l.x === x) return layout;

      log(`Moving element ${l.i} to [${String(x)},${String(y)}] from [${l.x},${l.y}]`);
      var oldX = l.x;
      var oldY = l.y;

      // This is quite a bit faster than extending the object
      if (typeof x === 'number') l.x = x;
      if (typeof y === 'number') l.y = y;
      l.moved = true;

      // console.log('checkpoint #1')

      // If this collides with anything, move it.
      // When doing this comparison, we have to sort the items we compare with
      // to ensure, in the case of multiple collisions, that we're getting the
      // nearest collision.
      let sorted = sortLayoutItems(layout, compactType);
      var movingUp =
        compactType === "vertical" && typeof y === 'number' ? oldY >= y :
        compactType === "horizontal" && typeof x === 'number' ? oldX >= x :
        false;
      if (movingUp) sorted = sorted.reverse();
      var collisions = getAllCollisions(sorted, l);

      console.log('checkpoint #2: ', collisions);
      // There was a collision; abort
      if (preventCollision && collisions.length) {
        log(`Collision prevented on ${l.i}, reverting.`);
        l.x = oldX;
        l.y = oldY;
        l.moved = false;
        return layout;
      }
      // console.log('checkpoint #3')

      // Move each item that collides away from this element.
      for (let i = 0, len = collisions.length; i < len; i++) {
        var collision = collisions[i];
        log(
          `Resolving collision between ${l.i} at [${l.x},${l.y}] and ${
            collision.i
          } at [${collision.x},${collision.y}]`
        );

        // console.log('checkpoint #4')

        // Short circuit so we can't infinite loop
        if (collision.moved) continue;

        // Don't move static items - we have to move *this* element away
        if (collision.static) {
          layout = moveElementAwayFromCollision(
            layout,
            collision,
            l,
            isUserAction,
            compactType,
            cols
          );
        } else {
          layout = moveElementAwayFromCollision(
            layout,
            l,
            collision,
            isUserAction,
            compactType,
            cols
          );
        }
      }

      return layout;
    }

    /**
     * This is where the magic needs to happen - given a collision, move an element away from the collision.
     * We attempt to move it up if there's room, otherwise it goes below.
     *
     * @param  {Array} layout            Full layout to modify.
     * @param  {LayoutItem} collidesWith Layout item we're colliding with.
     * @param  {LayoutItem} itemToMove   Layout item we're moving.
     */
    // export function moveElementAwayFromCollision (
    //   layout: Layout,
    //   collidesWith: LayoutItem,
    //   itemToMove: LayoutItem,
    //   isUserAction: ?boolean,
    //   compactType: CompactType,
    //   cols: number
    // ): Layout {
    function moveElementAwayFromCollision(layout, collidesWith, itemToMove, isUserAction, compactType, cols) {
      var compactH = compactType === "horizontal";
      // Compact vertically if not set to horizontal
      var compactV = compactType !== "horizontal";
      var preventCollision = false; // we're already colliding

      // If there is enough space above the collision to put this element, move it there.
      // We only do this on the main collision as this can get funky in cascades and cause
      // unwanted swapping behavior.
      if (isUserAction) {
        // Reset isUserAction flag because we're not in the main collision anymore.
        isUserAction = false;

        // Make a mock item so we don't modify the item here, only modify in moveElement.
        // var fakeItem: LayoutItem = {
        var fakeItem = {
          x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
          y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
          w: itemToMove.w,
          h: itemToMove.h,
          i: "-1"
        };

        // No collision? If so, we can go up there; otherwise, we'll end up moving down as normal
        if (!getFirstCollision(layout, fakeItem)) {
          log(
            `Doing reverse collision on ${itemToMove.i} up to [${fakeItem.x},${
              fakeItem.y
            }].`
          );
          return moveElement(
            layout,
            itemToMove,
            compactH ? fakeItem.x : undefined,
            compactV ? fakeItem.y : undefined,
            isUserAction,
            preventCollision,
            compactType,
            cols
          );
        }
      }

      return moveElement(
        layout,
        itemToMove,
        compactH ? itemToMove.x + 1 : undefined,
        compactV ? itemToMove.y + 1 : undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols
      );
    }

    /**
     * Helper to convert a number to a percentage string.
     *
     * @param  {Number} num Any number
     * @return {String}     That number as a percentage.
     */
    // export function perc(num: number): string {
    function perc(num) {
      return num * 100 + "%";
    }

    // export function setTransform({ top, left, width, height }: Position): Object {
    function setTransform(pos) {
      const {
        top,
        left,
        width,
        height
      } = pos;
      // console.error('pos: ', pos)
      // Replace unitless items with px
      var translate = `translate(${left}px,${top}px)`;
      return {
        transform: translate,
        WebkitTransform: translate,
        MozTransform: translate,
        msTransform: translate,
        OTransform: translate,
        width: `${width}px`,
        height: `${height}px`,
        position: "absolute"
      };
    }

    // export function setTopLeft({ top, left, width, height }: Position): Object {
    function setTopLeft({
      top,
      left,
      width,
      height
    }) {
      return {
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        position: "absolute"
      };
    }

    /**
     * Get layout items sorted from top left to right and down.
     *
     * @return {Array} Array of layout objects.
     * @return {Array}        Layout, sorted static items first.
     */
    // export function sortLayoutItems(
    //   layout: Layout,
    //   compactType: CompactType
    // ): Layout {
    function sortLayoutItems(layout, compactType) {
      if (compactType === "horizontal") return sortLayoutItemsByColRow(layout);
      else return sortLayoutItemsByRowCol(layout);
    }

    // export function sortLayoutItemsByRowCol(layout: Layout): Layout {
    function sortLayoutItemsByRowCol(layout) {
      return [].concat(layout).sort(function (a, b) {
        if (a.y > b.y || (a.y === b.y && a.x > b.x)) {
          return 1;
        } else if (a.y === b.y && a.x === b.x) {
          // Without this, we can get different sort results in IE vs. Chrome/FF
          return 0;
        }
        return -1;
      });
    }

    // export function sortLayoutItemsByColRow(layout: Layout): Layout {
    function sortLayoutItemsByColRow(layout) {
      return [].concat(layout).sort(function (a, b) {
        if (a.x > b.x || (a.x === b.x && a.y > b.y)) {
          return 1;
        }
        return -1;
      });
    }

    /**
     * Generate a layout using the initialLayout and children as a template.
     * Missing entries will be added, extraneous ones will be truncated.
     *
     * @param  {Array}  initialLayout Layout passed in through props.
     * @param  {String} breakpoint    Current responsive breakpoint.
     * @param  {?String} compact      Compaction option.
     * @return {Array}                Working layout.
     */
    // export function synchronizeLayoutWithChildren(
    //   initialLayout: Layout,
    //   children: ReactChildren,
    //   cols: number,
    //   compactType: CompactType
    // ): Layout {
    function synchronizeLayoutWithChildren(initialLayout, children, cols, compactType) {
      console.warn('syncLayout...');
      compactType = compactType || 'vertical';
      initialLayout = initialLayout || [];

      // Generate one layout item per child.
      // let layout: Layout = [];
      let layout = [];
      // React.Children.forEach(children, (child: ReactElement<any>, i: number) => {
      // React.Children
      _.forEach(children, function (child, i) {
        // Don't overwrite if it already exists.
        var exists = getLayoutItem(initialLayout, String(child.key));
        if (exists) {
          // console.log('checkpoint #1')
          layout[i] = cloneLayoutItem(exists);
        } else {
          // console.log('checkpoint #2')
          // console.log('child: ', child)
          // NOTE: This code is not needed as we won't use the data-grid property
          // if (!isProduction && child.props._grid) {
          //   console.warn(
          //     "`_grid` properties on children have been deprecated as of React 15.2. " + // eslint-disable-line
          //       "Please use `data-grid` or add your properties directly to the `layout`."
          //   );
          // }
          // var g = child.attrs["data-grid"] || child.attrs._grid;

          // Hey, this item has a data-grid property, use it.
          // if (g) {
          //   console.error('****')
          //   if (!isProduction) {
          //     validateLayout([g], "ReactGridLayout.children");
          //   }
          //   layout[i] = cloneLayoutItem({ ...g, i: child.key });
          // } else {
          // Nothing provided: ensure this is added to the bottom
          layout[i] = cloneLayoutItem({
            w: 1,
            h: 1,
            x: 0,
            y: bottom(layout),
            i: String(child.key)
          });
          // }
        }
      });

      // Correct the layout.
      layout = correctBounds(layout, {
        cols: cols
      });
      layout = compact(layout, compactType, cols);
      // console.error('returned layout: ', layout)

      return layout;
    }

    /**
     * Validate a layout. Throws errors.
     *
     * @param  {Array}  layout        Array of layout items.
     * @param  {String} [contextName] Context name for errors.
     * @throw  {Error}                Validation error.
     */
    // export function validateLayout(
    //   layout: Layout,
    //   contextName: string = "Layout"
    // ): void {
    function validateLayout(layout, contextName) {
      var subProps = ["x", "y", "w", "h"];
      if (!Array.isArray(layout))
        throw new Error(contextName + " must be an array!");
      for (let i = 0, len = layout.length; i < len; i++) {
        var item = layout[i];
        for (let j = 0; j < subProps.length; j++) {
          if (typeof item[subProps[j]] !== "number") {
            throw new Error(
              "ReactGridLayout: " +
              contextName +
              "[" +
              i +
              "]." +
              subProps[j] +
              " must be a number!"
            );
          }
        }
        if (item.i && typeof item.i !== "string") {
          throw new Error(
            "ReactGridLayout: " + contextName + "[" + i + "].i must be a string!"
          );
        }
        if (item.static !== undefined && typeof item.static !== "boolean") {
          throw new Error(
            "ReactGridLayout: " +
            contextName +
            "[" +
            i +
            "].static must be a boolean!"
          );
        }
      }
    }

    // Flow can't really figure this out, so we just use Object
    // export function autoBindHandlers(el: Object, fns: Array<string>): void {
    function autoBindHandlers(el, fns) {
      // console.error('autoBindHandlers.....', el, fns)
      fns.forEach(function (key) {
        (el[key] = el[key].bind(el));
      });
    }

    function log(...args) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }

  })();


  module.exports = GridLayoutUtils$1;

  // export type LayoutItem = {
  //   w: number,
  //   h: number,
  //   x: number,
  //   y: number,
  //   i: string,
  //   minW?: number,
  //   minH?: number,
  //   maxW?: number,
  //   maxH?: number,
  //   moved?: boolean,
  //   static?: boolean,
  //   isDraggable?: ?boolean,
  //   isResizable?: ?boolean
  // };
  // export type Layout = Array<LayoutItem>;
  // export type Position = {
  //   left: number,
  //   top: number,
  //   width: number,
  //   height: number
  // };
  // export type ReactDraggableCallbackData = {
  //   node: HTMLElement,
  //   x: number,
  //   y: number,
  //   deltaX: number,
  //   deltaY: number,
  //   lastX: number,
  //   lastY: number
  // };

  // export type PartialPosition = { left: number, top: number };
  // export type Size = { width: number, height: number };
  // export type GridDragEvent = {
  //   e: Event,
  //   node: HTMLElement,
  //   newPosition: PartialPosition
  // };
  // export type GridResizeEvent = { e: Event, node: HTMLElement, size: Size };

  // type REl = ReactElement<any>;
  // export type ReactChildren = ReactChildrenArray<REl>;

  // // All callbacks are of the signature (layout, oldItem, newItem, placeholder, e).
  // export type EventCallback = (
  //   Layout,
  //   oldItem: ?LayoutItem,
  //   newItem: ?LayoutItem,
  //   placeholder: ?LayoutItem,
  //   Event,
  //   ?HTMLElement
  // ) => void;
  // export type CompactType = ?("horizontal" | "vertical");

  // var isProduction = process.env.NODE_ENV === "production";
  // var DEBUG = false;

  var GridItem$1 = (function () {

    const { setTransform, setTopLeft, perc } = GridLayoutUtils;

    // Component Structure
    return {
      oninit: function (vnode) {
        var self = this;
        
        self.defaultAttrs = {
          className: '',
          cancel: '',
          handle: '',
          minH: 1,
          minW: 1,
          maxH: Infinity,
          maxW: Infinity
        };
    
        // Assign the default values to the attrs
        _.forEach(self.defaultAttrs, function (val, key) {
          // console.log('key: ', key)
          if (!vnode.attrs[key]) {
            vnode.attrs[key] = val;
          }
        });
        
        Object.assign(self, vnode.attrs, {
          resizing: null,
          dragging: null,
          className: ''
        });
        // console.error('these are the attrs: ', vnode.attrs)

        vnode.key = vnode.attrs.key;
        // console.error('vnode: ', vnode)
        

        // Helper for generating column width
        self.calcColWidth = function () {
          var self = this;
          const { margin, containerPadding, containerWidth, cols } = self;
          // console.log('colWidth: ', self)
          // console.log('cols: ', cols)
          return (
            (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols
          );
        };

        /**
         * Return position on the page given an x, y, w, h.
         * left, top, width, height are all in pixels.
         * @param  {Number}  x             X coordinate in grid units.
         * @param  {Number}  y             Y coordinate in grid units.
         * @param  {Number}  w             W coordinate in grid units.
         * @param  {Number}  h             H coordinate in grid units.
         * @return {Object}                Object containing coords.
         */
        self.calcPosition = function (x, y, w, h, state) {
          // console.log('calcPosition...', x, y, w, h, state)
          const { margin, containerPadding, rowHeight } = vnode.attrs;  //state;  //vnode.attrs;
          const colWidth = self.calcColWidth(state);

          // console.log('colWidth: ', colWidth)
          // console.log('rowHeight: ', rowHeight)
          // console.log('margin: ', margin)
          // console.log('containerPadding[1]: ', containerPadding[1])
          // console.log('width: ', Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]))

          const out = {
            left: Math.round((colWidth + margin[0]) * x + containerPadding[0]),
            top: Math.round((rowHeight + margin[1]) * y + containerPadding[1]),
            // 0 * Infinity === NaN, which causes problems with resize constraints;
            // Fix this if it occurs.
            // Note we do it here rather than later because Math.round(Infinity) causes deopt
            width:
              w === Infinity
                ? w
                : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]),
            height:
              h === Infinity
                ? h
                : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1])
          };
          // console.log('colWidth: ', colWidth, out)

          if (state && state.resizing) {
            out.width = Math.round(state.resizing.width);
            out.height = Math.round(state.resizing.height);
          }

          if (state && state.dragging) {
            out.top = Math.round(state.dragging.top);
            out.left = Math.round(state.dragging.left);
          }

          return out;
        };

        /**
         * Translate x and y coordinates from pixels to grid units.
         * @param  {Number} top  Top position (relative to parent) in pixels.
         * @param  {Number} left Left position (relative to parent) in pixels.
         * @return {Object} x and y in grid units.
         */
        // calcXY(top: number, left: number): { x: number, y: number } {
        self.calcXY = function (top, left) {
          // console.log('calcXY.....', top, left)
          const { margin, cols, rowHeight, w, h, maxRows } = self;
          const colWidth = self.calcColWidth();

          let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
          let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

          // Capping
          x = Math.max(Math.min(x, cols - w), 0);
          y = Math.max(Math.min(y, maxRows - h), 0);

          return { x, y };
        };

        /**
         * Given a height and width in pixel values, calculate grid units.
         * @param  {Number} height Height in pixels.
         * @param  {Number} width  Width in pixels.
         * @return {Object} w, h as grid units.
         */
        // calcWH({ height, width }: { height: number, width: number }): { w: number, h: number } {
        self.calcWH = function (pos) {
          const { height, width } = pos;
          const { margin, maxRows, cols, rowHeight, x, y } = self;
          const colWidth = self.calcColWidth();

          let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
          let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

          // Capping
          w = Math.max(Math.min(w, cols - x), 0);
          h = Math.max(Math.min(h, maxRows - y), 0);
          return { w, h };
        };

        /**
         * This is where we set the grid item's absolute placement. It gets a little tricky because we want to do it
         * well when server rendering, and the only way to do that properly is to use percentage width/left because
         * we don't know exactly what the browser viewport is.
         * Unfortunately, CSS Transforms, which are great for performance, break in this instance because a percentage
         * left is relative to the item itself, not its container! So we cannot use them on the server rendering pass.
         *
         * @param  {Object} pos Position object with width, height, left, top.
         * @return {Object}     Style object.
         */
        // createStyle(pos: Position): { [key: string]: ?string } {
        self.createStyle = function (pos) {
          const { usePercentages, containerWidth, useCSSTransforms } = self;
          // console.warn('creating style: ', self, vnode)
          let style;
          // CSS Transforms support (default)
          if (useCSSTransforms) {
            style = setTransform(pos);
            // console.error('using cssTransform....', style, pos)
          } else {
            // console.error('using the slow way.....')
            // top,left (slow)
            style = setTopLeft(pos);

            // This is used for server rendering.
            if (usePercentages) {
              style.left = perc(pos.left / containerWidth);
              style.width = perc(pos.width / containerWidth);
            }
          }
              
          // console.error('calc style....', style)
          return style;
        };

        /**
         * Mix a Draggable instance into a child.
         * @param  {Element} child    Child element.
         * @return {Element}          Child wrapped in Draggable.
         */
        // mixinDraggable(child: ReactElement<any>): ReactElement<any> {
        self.mixinDraggable = function (child) {
          // console.error('mixinDraggable.....', child, self)

          return m(DraggableCore, {
              onStart: self.onDragHandler('onDragStart'),
              onDrag: self.onDragHandler('onDrag'),
              onStop: self.onDragHandler('onDragStop'),
              handle: self.handle,
              cancel: '.react-resizable-handle' + 
                      (vnode.attrs.cancel ? ',' + vnode.attrs.cancel : ''),

              vnode: child
            }
            // NOTE: We should be able to nest children in this manner, but it seems
            // to be a mithril anti-pattern because we would then need to manipulate
            // the children directly. Better to pass along with attrs and render 
            // from there
            // , child
          )
          // return (
          //   <DraggableCore
          //     onStart={this.onDragHandler("onDragStart")}
          //     onDrag={this.onDragHandler("onDrag")}
          //     onStop={this.onDragHandler("onDragStop")}
          //     handle={this.props.handle}
          //     cancel={
          //       ".react-resizable-handle" +
          //       (this.props.cancel ? "," + this.props.cancel : "")
          //     }
          //   >
          //     {child}
          //   </DraggableCore>
          // );
        };

        /**
         * Mix a Resizable instance into a child.
         * @param  {Element} child    Child element.
         * @param  {Object} position  Position object (pixel values)
         * @return {Element}          Child wrapped in Resizable.
         */
        // mixinResizable(
        //   child: ReactElement<any>,
        //   position: Position
        // ): ReactElement<any> {
        self.mixinResizable = function (child, position) {
          // const { cols, x, minW, minH, maxW, maxH } = this.props;

          // // This is the max possible width - doesn't go to infinity because of the width of the window
          // const maxWidth = this.calcPosition(0, 0, cols - x, 0).width;

          // // Calculate min/max constraints using our min & maxes
          // const mins = this.calcPosition(0, 0, minW, minH);
          // const maxes = this.calcPosition(0, 0, maxW, maxH);
          // const minConstraints = [mins.width, mins.height];
          // const maxConstraints = [
          //   Math.min(maxes.width, maxWidth),
          //   Math.min(maxes.height, Infinity)
          // ];
          // return (
          //   <Resizable
          //     width={position.width}
          //     height={position.height}
          //     minConstraints={minConstraints}
          //     maxConstraints={maxConstraints}
          //     onResizeStop={this.onResizeHandler("onResizeStop")}
          //     onResizeStart={this.onResizeHandler("onResizeStart")}
          //     onResize={this.onResizeHandler("onResize")}
          //   >
          //     {child}
          //   </Resizable>
          // );
        };

        /**
         * Wrapper around drag events to provide more useful data.
         * All drag events call the function with the given handler name,
         * with the signature (index, x, y).
         *
         * @param  {String} handlerName Handler name to wrap.
         * @return {Function}           Handler function.
         */
        // onDragHandler(handlerName: string) {
        function onDragHandler (handlerName) {
          // return (e: Event, { node, deltaX, deltaY }: ReactDraggableCallbackData) => {
          return function (e, { node, deltaX, deltaY }) {
            // console.warn('onDragHandler...', vnode, this, handlerName)
            const handler = vnode.attrs[handlerName];
            if (!handler) return;

            const newPosition = { top: 0, left: 0 };

            // Get new XY
            switch (handlerName) {
              case "onDragStart": {
                // TODO: this wont work on nested parents
                const { offsetParent } = node;
                if (!offsetParent) return;
                const parentRect = offsetParent.getBoundingClientRect();
                const clientRect = node.getBoundingClientRect();
                newPosition.left =
                clientRect.left - parentRect.left + offsetParent.scrollLeft;
                newPosition.top =
                clientRect.top - parentRect.top + offsetParent.scrollTop;
                console.error('onDragStart....', newPosition);
                Object.assign(self, { dragging: newPosition });
                break;
              }
              case "onDrag":
                if (!self.dragging)
                  throw new Error("onDrag called before onDragStart.");
                newPosition.left = self.dragging.left + deltaX;
                newPosition.top = self.dragging.top + deltaY;
                // console.error('onDrag....', newPosition, self.dragging)
                Object.assign(self, { dragging: newPosition });
                break;
              case "onDragStop":
                if (!self.dragging)
                  throw new Error("onDragEnd called before onDragStart.");
                newPosition.left = self.dragging.left;
                newPosition.top = self.dragging.top;
                console.error('onDragStop....', newPosition);
                Object.assign(self, { dragging: null });
                break;
              default:
                throw new Error(
                  "onDragHandler called with unrecognized handlerName: " + handlerName
                );
            }
            
            const { x, y } = self.calcXY(newPosition.top, newPosition.left);

            // return handler.call(this, this.props.i, x, y, { e, node, newPosition });
            return handler.call(self, vnode.attrs.i, x, y, { e, node, newPosition });
          };
        }
        self.onDragHandler = onDragHandler;

        /**
         * Wrapper around drag events to provide more useful data.
         * All drag events call the function with the given handler name,
         * with the signature (index, x, y).
         *
         * @param  {String} handlerName Handler name to wrap.
         * @return {Function}           Handler function.
         */
        // onResizeHandler(handlerName: string) {
        self.onResizeHandler = function (handlerName) {
          // return (
          //   e: Event,
          //   { node, size }: { node: HTMLElement, size: Position }
          // ) => {
          return function (e, { node, size }) {
            const handler = self.props[handlerName];
            if (!handler) return;
            const { cols, x, i, maxW, minW, maxH, minH } = self.props;

            // Get new XY
            let { w, h } = self.calcWH(size);

            // Cap w at numCols
            w = Math.min(w, cols - x);
            // Ensure w is at least 1
            w = Math.max(w, 1);

            // Min/max capping
            w = Math.max(Math.min(w, maxW), minW);
            h = Math.max(Math.min(h, maxH), minH);

            // this.setState({ resizing: handlerName === "onResizeStop" ? null : size });
            Object.assign(self, { resizing: handlerName === "onResizeStop" ? null : size });

            handler.call(self, i, w, h, { e, node, size });
          };
        };

        // console.warn('GridItem vnode: ', vnode)
        // console.warn('GridItem attrs: ', vnode.attrs)
        // console.warn('GridItem self: ', self)
      },
      onbeforeupdate: function (vnode, old) {
        // if (vnode.key !== 4) {
        //   return false
        // }
        return true

        if (vnode.state.dragging) {
          return true
        }
        // console.log('onbeforeupdate.....', vnode, old)
        if (vnode.state.dragging === old.state.dragging) {
          // console.warn('false...')
          return false
        }
      },
      view: function (vnode) {
        // console.error('GridItem view....', vnode.attrs.containerWidth)
        var self = this;
        var attrs = vnode.attrs;

        const {
          x,
          y,
          w,
          h,
          isDraggable,
          isResizable,
          useCSSTransforms
        } = attrs;
        
        const pos = self.calcPosition(x, y, w, h, self);

        // const child = React.Children.only(this.props.children);
        
        var buildCss = function () {
          return 'react-grid-item ' + (attrs.className || '') + 
                    (attrs.static ? ' static' : '') + 
                    (isDraggable ? ' react-draggable' : '') + 
                    (self.dragging ? ' react-draggable-dragging' : '') + 
                    (useCSSTransforms ? ' cssTransforms' : '')

        };
        // var style = self.createStyle(pos)

        // console.error('attrs.class: ', attrs.class, attrs.className, vnode.state.dragging)
        // if (self.dragging || attrs.placeholder) {
        //   console.warn('*GridItem... vnode', vnode)
        //   console.warn('GridItem self: ', self)
        //   console.warn('GridItem... vnode.attrs', JSON.parse(JSON.stringify(attrs)))
        //   console.log('dragging: ', JSON.parse(JSON.stringify(self.dragging)))
        //   console.log('pos: ', pos)
        //   // console.warn('dragging: ', JSON.parse(JSON.stringify(self.dragging)))
        // }

        //** BE CAREFUL HERE!! */
        // NOTE: This must be done AFTER we run createStyle for the first time, 
        // otherwise we will end up animating the initial render
        // We want to keep the state up to date
        Object.assign(self, {
          useCSSTransforms: attrs.useCSSTransforms,
          // usePercentages: attrs.usePercentages
        });
          
        // console.error('checkpoint....', style)
        
        // Create the child element. We clone the existing element but modify its className and style.
        let newChild = m(self.vnode.tag, { class: buildCss(), style: self.createStyle(pos) }, self.vnode.children);
        // console.warn('newChild: ', newChild)
        // return newChild
        
        // if (attrs.placeholder) {
        //   console.error('placeholder attrs: ', attrs)
        // }

        // ----------------------------------------------------------------------------
        // ----------------------------------------------------------------------------
        // Resizable support. This is usually on but the user can toggle it off.
        // if (isResizable) newChild = self.mixinResizable(newChild, pos);
      
        // TODO - need to fix this
        // Draggable support. This is always on, except for with placeholders.
        if (isDraggable) newChild = self.mixinDraggable(newChild);
        // console.warn('newChild: ', newChild)

        // Render the GridItem
        return newChild

        // NOTE: This works to re-use the vnode
        // return m(self.vnode.tag, { class: css, style: style }, self.vnode.children)
        // return m.fragment({ class: css, style: style }, vnode.children)

        // ----------------------------------------------------------------------------
        // ----------------------------------------------------------------------------




        // Create the child element. We clone the existing element but modify its className and style.
        // let newChild = React.cloneElement(child, {
        //   className: classNames(
        //     "react-grid-item",
        //     child.props.className,
        //     this.props.className,
        //     {
        //       static: this.props.static,
        //       resizing: Boolean(this.state.resizing),
        //       "react-draggable": isDraggable,
        //       "react-draggable-dragging": Boolean(this.state.dragging),
        //       cssTransforms: useCSSTransforms
        //     }
        //   ),
        //   // We can set the width and height on the child, but unfortunately we can't set the position.
        //   style: {
        //     ...this.props.style,
        //     ...child.props.style,
        //     ...this.createStyle(pos)
        //   }
        // });
        
        // // Resizable support. This is usually on but the user can toggle it off.
        // if (isResizable) newChild = this.mixinResizable(newChild, pos);
      
        // // Draggable support. This is always on, except for with placeholders.
        // if (isDraggable) newChild = this.mixinDraggable(newChild);
        // return newChild;

        // Render the GridItem
        // return vnode.children
        // vnode.children.map(function (child) {
        //   return m(child.)
        // })
        // return m('div', vnode.attrs, vnode.children)
            
        // This is where the children go....
        // return m('div', { key: vnode.key, class: css, style: style },
        //   attrs.static ? [
        //     m('span', { class: 'text', title: 'This item is static and cannot be removed or resized.' }, 'Static - ' + vnode.key)
        //   ] : [
        //     m('span', { class: 'text' }, vnode.key + '**')
        //   ]
        // )
      }
    }
    
  })();

  module.exports = GridItem$1;

  var MithrilGridLayout$1 = (function () {

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
    } = GridLayoutUtils;

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
      var self = this;
      // console.error('GridLayout oninit.... ', this, vnode.attrs)

      // Assign the default values to the attrs
      _.forEach(defaultAttrs, function (val, key) {
        // console.log('key: ', key)
        if (!vnode.attrs[key]) {
          vnode.attrs[key] = val;
        }
      });
      
      var attrs = vnode.attrs;
      Object.assign(self, attrs, {
        activeDrag: null,      
        mounted: false,
        oldDragItem: null,
        oldLayout: null,
        oldResizeItem: null
      });

      // Save the props so they don't get lost
      self.props = vnode.attrs;

      self.compactType = function (props) {
        if (!props) props = attrs;
        return props.verticalCompact === false ? null : props.compactType;
      };
      // self.compactType = compactType

      autoBindHandlers(self, [
        'onDragStart',
        'onDrag',
        'onDragStop',
        'onResizeStart',
        'onResize',
        'onResizeStop'
      ]);

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
      };

      /**
       * When dragging starts
       * @param {String} i Id of the child
       * @param {Number} x X position of the move
       * @param {Number} y Y position of the move
       * @param {Event} e The mousedown event
       * @param {Element} node The current dragging DOM element
       */
      self.onDragStart = function (i, x, y, e, node) {
        console.info('onDragStart...', i, x, y, e, node);
        const { layout } = self;
        var l = getLayoutItem(layout, i);
        if (!l) return;

        Object.assign(self, {
          oldDragItem: cloneLayoutItem(l),
          oldLayout: self.layout
        });

        return self.onDragStart(layout, l, l, null, e, node);
      };

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
        m.redraw();
      };

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
        });

        self.onLayoutMaybeChanged(newLayout, oldLayout);
      };

      // onLayoutMaybeChanged(newLayout: Layout, oldLayout: ?Layout) {
      self.onLayoutMaybeChanged = function (newLayout, oldLayout) {
        console.warn('onLayoutMaybeChanged...');
        if (!oldLayout) oldLayout = self.layout;
        if (!_.isEqual(oldLayout, newLayout)) {
          vnode.attrs.onLayoutChange(newLayout);
        }
      };

      // onResizeStart(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
      self.onResizeStart = function (i, w, h, { e, node }) {
        console.log('onResizeStart....', i, w, h, e, node);
        const { layout } = self;
        var l = getLayoutItem(layout, i);
        if (!l) return;
    
        Object.assign(self, {
          oldResizeItem: cloneLayoutItem(l),
          oldLayout: self.layout
        });
    
        vnode.attrs.onResizeStart(layout, l, l, null, e, node);
      };
    
      // onResize(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
      self.onResize = function (i, w, h, { e, node }) {
        console.log('onResize....', i, w, h, e, node);
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
        });
      };
    
      // onResizeStop(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
      self.onResizeStop = function (i, w, h, { e, node }) {
        console.log('onResizeStop....', i, w, h, e, node);
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
        });
    
        self.onLayoutMaybeChanged(newLayout, oldLayout);
      };

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
        var draggable = (!l.static && isDraggable && (l.isDraggable || l.isDraggable == null));
        var resizable = (!l.static && isResizable && (l.isResizable || l.isResizable == null));

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
      };
    }

    return {
      oninit: oninit,
      oncreate: function (vnode) {
        var self = this;
            
        self.mounted = true;

        // Possibly call back with layout on mount. This should be done after correcting the layout width
        // to ensure we don't rerender with the wrong width.
        self.onLayoutMaybeChanged(self.layout, vnode.attrs.layout);

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
        m.redraw();
      },
      // onbeforeupdate: function (vnode, old) {
      //   // console.warn('GridLayout onbeforeupdate: ', vnode, old, vnode.state.activeDrag)
      //   return 
      // },
      view: function (vnode) {
        // console.error("GridLayout view function.....")
        var self = this;
        // var attrs = vnode.attrs

        // NOTE: Do we need to do this???
        var attrs = Object.assign(defaultAttrs, vnode.attrs);
        // log('GridLayout vnode: ', vnode)
        // log('GridLayout self: ', self)
        // log('GridLayout attrs: ', attrs)
        // log('self.containerHeight(): ', self.containerHeight())

        // if (!self.width) { return }

        // NOTE: This logic differentiates from the react-grid-layout
        // || attrs.compactType !== self.compactType
        var newLayoutBase;
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
          );
          // console.warn('newLayout: ', newLayout)
                  
          const oldLayout = self.layout; //JSON.parse(JSON.stringify(self.layout))
          Object.assign(self, {
            layout: newLayout
          });
          self.onLayoutMaybeChanged(newLayout, oldLayout);
        }
            
        // Make sure the state holds the value passed down from above...
        self.width = attrs.width;

        var activeDrag = self.activeDrag;

        // console.error('GridLayout attrs: ', attrs)
        return [
          m('div', { class: 'react-grid-layout layout', style: 'height:'+self.containerHeight() }, [
            attrs.children.map(function (child, i) {
              // console.warn('*child: ', attrs)
              Object.assign(child.attrs, attrs);
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
              var draggable = (!l.static && isDraggable && (l.isDraggable || l.isDraggable == null));
              var resizable = (!l.static && isResizable && (l.isResizable || l.isResizable == null));

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

  module.exports = MithrilGridLayout$1;

  var ResponsiveUtils$1 = (function () {
    var Utils = GridLayoutUtils;
    return {
      getBreakpointFromWidth: getBreakpointFromWidth,
      getColsFromBreakpoint: getColsFromBreakpoint,
      findOrGenerateResponsiveLayout: findOrGenerateResponsiveLayout,

    }

    /**
     * Given a width, find the highest breakpoint that matches is valid for it (width > breakpoint).
     *
     * @param  {Object} breakpoints Breakpoints object (e.g. {lg: 1200, md: 960, ...})
     * @param  {Number} width Screen width.
     * @return {String}       Highest breakpoint that is less than width.
     */
    // export function getBreakpointFromWidth(
    //   breakpoints: Breakpoints,
    //   width: number
    // ): Breakpoint {
    function getBreakpointFromWidth (breakpoints, width) {
      // console.warn('gettingBreakpointFromWidth....', width)
      if (!width) {
        console.error('MISSING THE WIDTH!!!!! - HACKED but needs fixing');
        return 'lg'
      }
      const sorted = sortBreakpoints(breakpoints);
      let matching = sorted[0];
      for (let i = 1, len = sorted.length; i < len; i++) {
        const breakpointName = sorted[i];
        if (width > breakpoints[breakpointName]) matching = breakpointName;
      }
      return matching;
    }

    /**
     * Given a breakpoint, get the # of cols set for it.
     * @param  {String} breakpoint Breakpoint name.
     * @param  {Object} cols       Map of breakpoints to cols.
     * @return {Number}            Number of cols.
     */
    // export function getColsFromBreakpoint(
    //   breakpoint: Breakpoint,
    //   cols: Breakpoints
    // ): number {
    function getColsFromBreakpoint (breakpoint, cols) {
      if (!cols[breakpoint]) {
        throw new Error(
          "ResponsiveReactGridLayout: `cols` entry for breakpoint " +
            breakpoint +
            " is missing!"
        );
      }
      return cols[breakpoint];
    }

    /**
     * Given existing layouts and a new breakpoint, find or generate a new layout.
     *
     * This finds the layout above the new one and generates from it, if it exists.
     *
     * @param  {Object} layouts     Existing layouts.
     * @param  {Array} breakpoints All breakpoints.
     * @param  {String} breakpoint New breakpoint.
     * @param  {String} breakpoint Last breakpoint (for fallback).
     * @param  {Number} cols       Column count at new breakpoint.
     * @param  {Boolean} verticalCompact Whether or not to compact the layout
     *   vertically.
     * @return {Array}             New layout.
     */
    // export function findOrGenerateResponsiveLayout(
    //   layouts: ResponsiveLayout,
    //   breakpoints: Breakpoints,
    //   breakpoint: Breakpoint,
    //   lastBreakpoint: Breakpoint,
    //   cols: number,
    //   compactType: CompactType
    // ): Layout {
    function findOrGenerateResponsiveLayout (layouts, breakpoints, breakpoint, lastBreakpoint, cols, compactType) {
      console.error('****');
      // If it already exists, just return it.
      if (layouts[breakpoint]) return Utils.cloneLayout(layouts[breakpoint]);
      // Find or generate the next layout
      let layout = layouts[lastBreakpoint];
      const breakpointsSorted = sortBreakpoints(breakpoints);
      const breakpointsAbove = breakpointsSorted.slice(
        breakpointsSorted.indexOf(breakpoint)
      );
      for (let i = 0, len = breakpointsAbove.length; i < len; i++) {
        const b = breakpointsAbove[i];
        if (layouts[b]) {
          layout = layouts[b];
          break;
        }
      }
      layout = Utils.cloneLayout(layout || []); // clone layout so we don't modify existing items
      return Utils.compact(Utils.correctBounds(layout, { cols: cols }), compactType, cols);
    }

    /**
     * Given breakpoints, return an array of breakpoints sorted by width. This is usually
     * e.g. ['xxs', 'xs', 'sm', ...]
     *
     * @param  {Object} breakpoints Key/value pair of breakpoint names to widths.
     * @return {Array}              Sorted breakpoints.
     */
    // export function sortBreakpoints(breakpoints: Breakpoints): Array<Breakpoint> {
    function sortBreakpoints (breakpoints) {
      // console.warn('breakpoints: ', breakpoints)
      const keys = Object.keys(breakpoints);
      return keys.sort(function(a, b) {
        return breakpoints[a] - breakpoints[b];
      });
    }

  })();

  module.exports = ResponsiveUtils$1;

  var ResponsiveMithrilGridLayout = (function () {

  return {
    oninit: function (vnode) {
      var self = this;

      const {
        getBreakpointFromWidth,
        getColsFromBreakpoint,
        findOrGenerateResponsiveLayout
      } = ResponsiveUtils;
      
      const {
        cloneLayout,
        synchronizeLayoutWithChildren,
        noop
      } = GridLayoutUtils;
    
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
          vnode.attrs[key] = val;
        }
      });

      // Save the props so they don't get lost
      // self.props = Object.assign({}, vnode.attrs)

      Object.assign(self, defaultAttrs);

      // We use the props to pass along changes in the width of the screen
      self.props = Object.assign({}, vnode.attrs);
      
      self.generateInitialState = function () {
        console.log('generateInitialState... attrs', vnode.attrs);
        var attrs = vnode.attrs;
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
      };

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
        console.error('onWidthChange....', nextProps.width);

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
          });
          
        }

        // NOTE: Because the props and attrs are merged, this function does not work :/
        // call onWidthChange on every change of width, not only on breakpoint changes
        vnode.attrs.onWidthChange(
          nextProps.width,
          nextProps.margin,
          newCols,
          nextProps.containerPadding
        );
      };

      // NOTE: it would be nice to have a mixin that handles the resizing and to attach it higher up than here..
      self.onWindowResize = function () {
        if (!self.mounted) return 
        // if (!vnode.dom) return;
        
        // self.mounted = true
        self.width = self.elem.offsetWidth;
        
        // console.error('---------------------------------')
        // console.error('onWindowResize...', vnode.dom, self.width)
        console.error('onWindowResize...', vnode.dom, self.width);
        // console.error('self.elem.offsetWidth: ', vnode.dom.offsetWidth)
        // console.error('---------------------------------')
        // if (!self.layout) {
        //   // Initialize the state
        //   Object.assign(self, self.generateInitialState())
        // }
          
        m.redraw();
      };
    },

    oncreate: function (vnode) {
      var self = this;
      // self.elem = vnode.dom
      // console.error('oncreate executed...', vnode.dom.offsetWidth)

      self.mounted = true;
        
      self.elem = vnode.dom;
      // self.width = vnode.dom.offsetWidth

      // Set the width BEFORE we generate the initial state
      self.width = self.elem.offsetWidth;
      vnode.attrs.width = self.width;

      // TESTING
      // vnode.attrs.onWidthChange(self.width)
      
      // NOTE: We need the width before we call generateInitialState or it will fail
      // Initialize the state
      Object.assign(self, self.generateInitialState());
      console.log('initialState: ', self);
      
      // window.addEventListener('resize', $.throttle(250, self.onWindowResize))
      window.addEventListener('resize', self.onWindowResize);
      self.onWindowResize();


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
      var self = this;
      var attrs = vnode.attrs;

      // Need to return a div so we can get it's width
      // if (!self.mounted) return m('div')

      // if (attrs.measureBeforeMount && !self.mounted) {
      //   console.error('checkpoint #1')
      //   return m('div')
      // }

      var nextProps = attrs;
      var oldProps = self.props;
      
      /**
       * TODO FIXME
       * This is the biggest area of trouble. React sends in new props, which are the equivalent
       * of mithril attrs, but I don't have the WidthProvider hooked up to send in the width
       * and instead this component handles the passing of that value along....
       * What needs to happen is that I figure out a method of passing the props along correctly,
       * including the breakpoint
       */
      console.log('nextProps.width: ', nextProps, nextProps.width);
      console.log('self.width: ', self.width);
      if (
        // nextProps.width != oldProps.width ||
        nextProps.width != self.width ||
        nextProps.breakpoint !== oldProps.breakpoint ||
        !_.isEqual(nextProps.breakpoints, oldProps.breakpoints) ||
        !_.isEqual(nextProps.cols, oldProps.cols)
      ) {
        // console.log('checkpoint #2')
        console.log('nextProps.width != self.width: ', nextProps.width != self.width);
        console.log('nextProps.breakpoint !== oldProps.breakpoint: ', nextProps.breakpoint !== oldProps.breakpoint);
        console.log('!_.isEqual(nextProps.breakpoints, oldProps.breakpoints): ', !_.isEqual(nextProps.breakpoints, oldProps.breakpoints));
        console.log('!_.isEqual(nextProps.cols, oldProps.cols): ', !_.isEqual(nextProps.cols, oldProps.cols));
        // nextProps.width = old.state.props.width
        
        // @HACK this is not in the react code and it should not be here either, but
        // without it, the entire layout breaks
        // Update the props for the next render
        Object.assign(vnode.attrs, oldProps,{
          width: self.width
        });

        // if (!self.width) return
        
        self.onWidthChange(vnode.attrs);
      } else if (!_.isEqual(nextProps.layouts, oldProps.layouts)) {
        console.log('checkpoint #3');
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
        Object.assign(self, { layout: newLayout });
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


        console.log('layout...', self.layout);
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

    
  })();

  module.exports = ResponsiveMithrilGridLayout;

  // # RollupJS


  function MithrilGrid () {
    console.log(foo);
  }

  return MithrilGrid;

}());
