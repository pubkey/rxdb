import { ensureNotFalsy } from './utils-other';
export var REGEX_ALL_DOTS = /\./g;
export var REGEX_ALL_PIPES = /\|/g;
/**
 * @link https://stackoverflow.com/a/26034888/3443137
*/
export var REGEX_PARSE_REGEX_EXPRESSION = /(\/?)(.+)\1([a-z]*)/i;
export function parseRegex(regex) {
  var matches = ensureNotFalsy(regex.toString().match(REGEX_PARSE_REGEX_EXPRESSION));
  return {
    pattern: matches[2],
    flags: matches[3]
  };
}
//# sourceMappingURL=utils-regex.js.map