// @flow
// import {findInArray, isFunction, int} from './shims';
// import browserPrefix, {browserPrefixToKey} from './getPrefix';
// import type {ControlPosition, MouseTouchEvent} from './types';
const {findInArray, isFunction, int} = shims;
// const browserPrefix,  ????
const {browserPrefixToKey} = getPrefix;
// const type {ControlPosition, MouseTouchEvent} = types;

var domFns = (function () {
  
  let matchesSelectorFunc = '';

  return {
    matchesSelector: matchesSelector,
    matchesSelectorAndParentsTo: matchesSelectorAndParentsTo,
    addEvent: addEvent,
    removeEvent: removeEvent,
    outerHeight: outerHeight,
    outerWidth: outerWidth,
    innerHeight: innerHeight,
    innerWidth: innerWidth,
    offsetXYFromParent: offsetXYFromParent,
    createCSSTransform: createCSSTransform,
    createSVGTransform: createSVGTransform,
    getTouch: getTouch,
    getTouchIdentifier: getTouchIdentifier,
    addUserSelectStyles: addUserSelectStyles,
    removeUserSelectStyles: removeUserSelectStyles,
    styleHacks: styleHacks,
    addClassName: addClassName,
    removeClassName: removeClassName
  }


  // export function matchesSelector(el: Node, selector: string): boolean {
  function matchesSelector (el, selector) {
    if (!matchesSelectorFunc) {
      matchesSelectorFunc = findInArray([
        'matches',
        'webkitMatchesSelector',
        'mozMatchesSelector',
        'msMatchesSelector',
        'oMatchesSelector'
      ], function(method){
        // $FlowIgnore: Doesn't think elements are indexable
        return isFunction(el[method]);
      });
    }
  
    // Might not be found entirely (not an Element?) - in that case, bail
    // $FlowIgnore: Doesn't think elements are indexable
    if (!isFunction(el[matchesSelectorFunc])) return false;
  
    // $FlowIgnore: Doesn't think elements are indexable
    return el[matchesSelectorFunc](selector);
  }
  
  // Works up the tree to the draggable itself attempting to match selector.
  // export function matchesSelectorAndParentsTo(el: Node, selector: string, baseNode: Node): boolean {
  function matchesSelectorAndParentsTo (el, selector, baseNode) {
    let node = el;
    do {
      if (matchesSelector(node, selector)) return true;
      if (node === baseNode) return false;
      node = node.parentNode;
    } while (node);
  
    return false;
  }
  
  // export function addEvent(el: ?Node, event: string, handler: Function): void {
  function addEvent (el, event, handler) {
    if (!el) { return; }
    if (el.attachEvent) {
      el.attachEvent('on' + event, handler);
    } else if (el.addEventListener) {
      el.addEventListener(event, handler, true);
    } else {
      // $FlowIgnore: Doesn't think elements are indexable
      el['on' + event] = handler;
    }
  }
  
  // export function removeEvent(el: ?Node, event: string, handler: Function): void {
  function removeEvent (el, event, handler) {
    if (!el) { return; }
    if (el.detachEvent) {
      el.detachEvent('on' + event, handler);
    } else if (el.removeEventListener) {
      el.removeEventListener(event, handler, true);
    } else {
      // $FlowIgnore: Doesn't think elements are indexable
      el['on' + event] = null;
    }
  }
  
  // export function outerHeight(node: HTMLElement): number {
  function outerHeight (node) {
    // This is deliberately excluding margin for our calculations, since we are using
    // offsetTop which is including margin. See getBoundPosition
    let height = node.clientHeight;
    const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
    height += int(computedStyle.borderTopWidth);
    height += int(computedStyle.borderBottomWidth);
    return height;
  }
  
  // export function outerWidth(node: HTMLElement): number {
  function outerWidth (node) {
    // This is deliberately excluding margin for our calculations, since we are using
    // offsetLeft which is including margin. See getBoundPosition
    let width = node.clientWidth;
    const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
    width += int(computedStyle.borderLeftWidth);
    width += int(computedStyle.borderRightWidth);
    return width;
  }

  // export function innerHeight(node: HTMLElement): number {
  function innerHeight (node) {
    let height = node.clientHeight;
    const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
    height -= int(computedStyle.paddingTop);
    height -= int(computedStyle.paddingBottom);
    return height;
  }
  
  // export function innerWidth(node: HTMLElement): number {
  function innerWidth (node) {
    let width = node.clientWidth;
    const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
    width -= int(computedStyle.paddingLeft);
    width -= int(computedStyle.paddingRight);
    return width;
  }
  
  // Get from offsetParent
  // export function offsetXYFromParent(evt: {clientX: number, clientY: number}, offsetParent: HTMLElement): ControlPosition {
  function offsetXYFromParent (evt, offsetParent) {
    const isBody = offsetParent === offsetParent.ownerDocument.body;
    const offsetParentRect = isBody ? {left: 0, top: 0} : offsetParent.getBoundingClientRect();
  
    const x = evt.clientX + offsetParent.scrollLeft - offsetParentRect.left;
    const y = evt.clientY + offsetParent.scrollTop - offsetParentRect.top;
  
    return {x, y};
  }
  
  // export function createCSSTransform({x, y}: {x: number, y: number}): Object {
  function createCSSTransform ({x, y}) {
    // Replace unitless items with px
    return {[browserPrefixToKey('transform', browserPrefix)]: 'translate(' + x + 'px,' + y + 'px)'};
  }
  
  // export function createSVGTransform({x, y}: {x: number, y: number}): string {
  function createSVGTransform ({x, y}) {
    return 'translate(' + x + ',' + y + ')';
  }
  
  // export function getTouch(e: MouseTouchEvent, identifier: number): ?{clientX: number, clientY: number} {
  function getTouch (e, identifier) {
    return (e.targetTouches && findInArray(e.targetTouches, t => identifier === t.identifier)) ||
           (e.changedTouches && findInArray(e.changedTouches, t => identifier === t.identifier));
  }
  
  // export function getTouchIdentifier(e: MouseTouchEvent): ?number {
  function getTouchIdentifier (e) {
    if (e.targetTouches && e.targetTouches[0]) return e.targetTouches[0].identifier;
    if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].identifier;
  }
  
  // User-select Hacks:
  //
  // Useful for preventing blue highlights all over everything when dragging.
  
  // Note we're passing `document` b/c we could be iframed
  // export function addUserSelectStyles(doc: ?Document) {
  function addUserSelectStyles (doc) {
    if (!doc) return;
    let styleEl = doc.getElementById('react-draggable-style-el');
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.type = 'text/css';
      styleEl.id = 'react-draggable-style-el';
      styleEl.innerHTML = '.react-draggable-transparent-selection *::-moz-selection {background: transparent;}\n';
      styleEl.innerHTML += '.react-draggable-transparent-selection *::selection {background: transparent;}\n';
      doc.getElementsByTagName('head')[0].appendChild(styleEl);
    }
    if (doc.body) addClassName(doc.body, 'react-draggable-transparent-selection');
  }
  
  // export function removeUserSelectStyles(doc: ?Document) {
  function removeUserSelectStyles (doc) {
    try {
      if (doc && doc.body) removeClassName(doc.body, 'react-draggable-transparent-selection');
      window.getSelection().removeAllRanges();  // remove selection caused by scroll
    } catch (e) {
      // probably IE
    }
  }
  
  // export function styleHacks(childStyle: Object = {}): Object {
  function styleHacks (childStyle) {
    // console.log('styleHacks....', childStyle)
    // Workaround IE pointer events; see #51
    // https://github.com/mzabriskie/react-draggable/issues/51#issuecomment-103488278
    return {
      touchAction: 'none',
      ...childStyle
    };
  }
  
  // export function addClassName(el: HTMLElement, className: string) {
  function addClassName (el, className) {
    if (el.classList) {
      el.classList.add(className);
    } else {
      if (!el.className.match(new RegExp(`(?:^|\\s)${className}(?!\\S)`))) {
        el.className += ` ${className}`;
      }
    }
  }
  
  // export function removeClassName(el: HTMLElement, className: string) {
  function removeClassName (el, className) {
    if (el.classList) {
      el.classList.remove(className);
    } else {
      el.className = el.className.replace(new RegExp(`(?:^|\\s)${className}(?!\\S)`, 'g'), '');
    }
  }
})();
