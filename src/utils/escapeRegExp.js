/**
 * Escape a string so it can be safely embedded inside a RegExp.
 *
 * Building `new RegExp(userToken)` from raw user/model text is a common crash
 * source: a token containing (, [, *, etc. throws "Invalid regular expression"
 * and can take down the whole handler. Always pass dynamic fragments through
 * this first. (Standard MDN pattern.)
 */
export function escapeRegExp(str) {
  return String(str ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
