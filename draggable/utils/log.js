// @flow
/*eslint no-console:0*/

// export default function log(...args: any) {
var DRAGGABLE_DEBUG = false;
var log = function (...args) {
  if (DRAGGABLE_DEBUG) console.log(...args);
}
