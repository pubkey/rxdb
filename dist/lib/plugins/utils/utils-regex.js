"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.REGEX_PARSE_REGEX_EXPRESSION = exports.REGEX_ALL_PIPES = exports.REGEX_ALL_DOTS = void 0;
exports.parseRegex = parseRegex;
var _utilsOther = require("./utils-other");
var REGEX_ALL_DOTS = /\./g;
exports.REGEX_ALL_DOTS = REGEX_ALL_DOTS;
var REGEX_ALL_PIPES = /\|/g;
exports.REGEX_ALL_PIPES = REGEX_ALL_PIPES;
/**
 * @link https://stackoverflow.com/a/26034888/3443137
*/
var REGEX_PARSE_REGEX_EXPRESSION = /(\/?)(.+)\1([a-z]*)/i;
exports.REGEX_PARSE_REGEX_EXPRESSION = REGEX_PARSE_REGEX_EXPRESSION;
function parseRegex(regex) {
  var matches = (0, _utilsOther.ensureNotFalsy)(regex.toString().match(REGEX_PARSE_REGEX_EXPRESSION));
  return {
    pattern: matches[2],
    flags: matches[3]
  };
}
//# sourceMappingURL=utils-regex.js.map