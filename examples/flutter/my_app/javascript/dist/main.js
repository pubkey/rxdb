/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 6313:
/***/ ((module) => {

var clone = (function() {
'use strict';

function _instanceof(obj, type) {
  return type != null && obj instanceof type;
}

var nativeMap;
try {
  nativeMap = Map;
} catch(_) {
  // maybe a reference error because no `Map`. Give it a dummy value that no
  // value will ever be an instanceof.
  nativeMap = function() {};
}

var nativeSet;
try {
  nativeSet = Set;
} catch(_) {
  nativeSet = function() {};
}

var nativePromise;
try {
  nativePromise = Promise;
} catch(_) {
  nativePromise = function() {};
}

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
 * @param `includeNonEnumerable` - set to true if the non-enumerable properties
 *    should be cloned as well. Non-enumerable properties on the prototype
 *    chain will be ignored. (optional - false by default)
*/
function clone(parent, circular, depth, prototype, includeNonEnumerable) {
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    includeNonEnumerable = circular.includeNonEnumerable;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth === 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (_instanceof(parent, nativeMap)) {
      child = new nativeMap();
    } else if (_instanceof(parent, nativeSet)) {
      child = new nativeSet();
    } else if (_instanceof(parent, nativePromise)) {
      child = new nativePromise(function (resolve, reject) {
        parent.then(function(value) {
          resolve(_clone(value, depth - 1));
        }, function(err) {
          reject(_clone(err, depth - 1));
        });
      });
    } else if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      if (Buffer.allocUnsafe) {
        // Node.js >= 4.5.0
        child = Buffer.allocUnsafe(parent.length);
      } else {
        // Older Node.js versions
        child = new Buffer(parent.length);
      }
      parent.copy(child);
      return child;
    } else if (_instanceof(parent, Error)) {
      child = Object.create(parent);
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    if (_instanceof(parent, nativeMap)) {
      parent.forEach(function(value, key) {
        var keyChild = _clone(key, depth - 1);
        var valueChild = _clone(value, depth - 1);
        child.set(keyChild, valueChild);
      });
    }
    if (_instanceof(parent, nativeSet)) {
      parent.forEach(function(value) {
        var entryChild = _clone(value, depth - 1);
        child.add(entryChild);
      });
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(parent);
      for (var i = 0; i < symbols.length; i++) {
        // Don't need to worry about cloning a symbol because it is a primitive,
        // like a number or string.
        var symbol = symbols[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
        if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
          continue;
        }
        child[symbol] = _clone(parent[symbol], depth - 1);
        if (!descriptor.enumerable) {
          Object.defineProperty(child, symbol, {
            enumerable: false
          });
        }
      }
    }

    if (includeNonEnumerable) {
      var allPropertyNames = Object.getOwnPropertyNames(parent);
      for (var i = 0; i < allPropertyNames.length; i++) {
        var propertyName = allPropertyNames[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
        if (descriptor && descriptor.enumerable) {
          continue;
        }
        child[propertyName] = _clone(parent[propertyName], depth - 1);
        Object.defineProperty(child, propertyName, {
          enumerable: false
        });
      }
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
}
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
}
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if ( true && module.exports) {
  module.exports = clone;
}


/***/ }),

/***/ 4063:
/***/ ((module) => {

"use strict";


// do not edit .js files directly - edit src/index.jst



module.exports = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }



    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;)
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0;) {
      var key = keys[i];

      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a!==a && b!==b;
};


/***/ }),

/***/ 9134:
/***/ ((module) => {

// https://github.com/electron/electron/issues/2288
function isElectron() {
    // Renderer process
    if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
        return true;
    }

    // Main process
    if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
        return true;
    }

    // Detect the user agent when the `nodeIntegration` option is set to true
    if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
        return true;
    }

    return false;
}

module.exports = isElectron;


/***/ }),

/***/ 8221:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Aggregator = void 0;
var core_1 = __webpack_require__(7424);
var lazy_1 = __webpack_require__(1088);
var util_1 = __webpack_require__(6588);
/**
 * Provides functionality for the mongoDB aggregation pipeline
 *
 * @param pipeline an Array of pipeline operators
 * @param options An optional Options to pass the aggregator
 * @constructor
 */
var Aggregator = /** @class */ (function () {
    function Aggregator(pipeline, options) {
        this.pipeline = pipeline;
        this.options = options;
        this.options = (0, core_1.makeOptions)(options);
    }
    /**
     * Returns an `Lazy` iterator for processing results of pipeline
     *
     * @param {*} collection An array or iterator object
     * @param {Query} query the `Query` object to use as context
     * @returns {Iterator} an iterator object
     */
    Aggregator.prototype.stream = function (collection) {
        var iterator = (0, lazy_1.Lazy)(collection);
        var mode = this.options.processingMode;
        if (mode == core_1.ProcessingMode.CLONE_ALL ||
            mode == core_1.ProcessingMode.CLONE_INPUT) {
            iterator.map(util_1.cloneDeep);
        }
        var pipelineOperators = [];
        if (!(0, util_1.isEmpty)(this.pipeline)) {
            // run aggregation pipeline
            for (var _i = 0, _a = this.pipeline; _i < _a.length; _i++) {
                var operator = _a[_i];
                var operatorKeys = Object.keys(operator);
                var op = operatorKeys[0];
                var call = (0, core_1.getOperator)(core_1.OperatorType.PIPELINE, op);
                (0, util_1.assert)(operatorKeys.length === 1 && !!call, "invalid aggregation operator " + op);
                pipelineOperators.push(op);
                iterator = call(iterator, operator[op], this.options);
            }
        }
        // operators that may share object graphs of inputs.
        // we only need to clone the output for these since the objects will already be distinct for other operators.
        if (mode == core_1.ProcessingMode.CLONE_OUTPUT ||
            (mode == core_1.ProcessingMode.CLONE_ALL &&
                !!(0, util_1.intersection)(["$group", "$unwind"], pipelineOperators).length)) {
            iterator.map(util_1.cloneDeep);
        }
        return iterator;
    };
    /**
     * Return the results of the aggregation as an array.
     *
     * @param {*} collection
     * @param {*} query
     */
    Aggregator.prototype.run = function (collection) {
        return this.stream(collection).value();
    };
    return Aggregator;
}());
exports.Aggregator = Aggregator;


/***/ }),

/***/ 7424:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.redact = exports.computeValue = exports.addOperators = exports.getOperator = exports.useOperators = exports.OperatorType = exports.makeOptions = exports.ProcessingMode = void 0;
var util_1 = __webpack_require__(6588);
/**
 * This controls how input and output documents are processed to meet different application needs.
 * Each mode has different trade offs for; immutability, reference sharing, and performance.
 */
var ProcessingMode;
(function (ProcessingMode) {
    /**
     * Clone inputs prior to processing, and the outputs if some objects graphs may be shared.
     * Use this option to keep input collection immutable and to get distinct output objects.
     *
     * Note: This option is expensive and reduces performance.
     */
    ProcessingMode["CLONE_ALL"] = "CLONE_ALL";
    /**
     * Clones inputs prior to processing.
     * This option will return output objects with shared graphs in their path if specific operators are used.
     * Use this option to keep the input collection immutable.
     *
     */
    ProcessingMode["CLONE_INPUT"] = "CLONE_INPUT";
    /**
     * Clones the output to return distinct objects with no shared paths.
     * This option modifies the input collection and during processing.
     */
    ProcessingMode["CLONE_OUTPUT"] = "CLONE_OUTPUT";
    /**
     * Turn off cloning and modifies the input collection as needed.
     * This option will also return output objects with shared paths in their graph when specific operators are used.
     *
     * This option provides the greatest speedup for the biggest tradeoff. When using the aggregation pipeline, you can use
     * the "$out" operator to collect immutable intermediate results.
     *
     * @default
     */
    ProcessingMode["CLONE_OFF"] = "CLONE_OFF";
})(ProcessingMode = exports.ProcessingMode || (exports.ProcessingMode = {}));
/**
 * Creates an Option from another required keys are initialized
 * @param options Options
 */
function makeOptions(options) {
    return Object.assign({ idKey: "_id", processingMode: ProcessingMode.CLONE_OFF }, options || {});
}
exports.makeOptions = makeOptions;
/**
 * The different groups of operators
 */
var OperatorType;
(function (OperatorType) {
    OperatorType["ACCUMULATOR"] = "accumulator";
    OperatorType["EXPRESSION"] = "expression";
    OperatorType["PIPELINE"] = "pipeline";
    OperatorType["PROJECTION"] = "projection";
    OperatorType["QUERY"] = "query";
})(OperatorType = exports.OperatorType || (exports.OperatorType = {}));
// operator definitions
var OPERATORS = (_a = {},
    _a[OperatorType.ACCUMULATOR] = {},
    _a[OperatorType.EXPRESSION] = {},
    _a[OperatorType.PIPELINE] = {},
    _a[OperatorType.PROJECTION] = {},
    _a[OperatorType.QUERY] = {},
    _a);
/**
 * Validates the object collection of operators
 */
function validateOperatorMap(operators) {
    for (var _i = 0, _a = Object.entries(operators); _i < _a.length; _i++) {
        var _b = _a[_i], k = _b[0], v = _b[1];
        (0, util_1.assert)(v instanceof Function && (0, util_1.isOperator)(k), "invalid operator specified");
    }
}
/**
 * Register fully specified operators for the given operator class.
 *
 * @param cls Category of the operator
 * @param operators Name of operator
 */
function useOperators(cls, operators) {
    validateOperatorMap(operators);
    (0, util_1.into)(OPERATORS[cls], operators);
}
exports.useOperators = useOperators;
/**
 * Returns the operator function or null if it is not found
 * @param cls Category of the operator
 * @param operator Name of the operator
 */
function getOperator(cls, operator) {
    return (0, util_1.has)(OPERATORS[cls], operator) ? OPERATORS[cls][operator] : null;
}
exports.getOperator = getOperator;
/**
 * Add new operators
 *
 * @param operatorType the operator class to extend
 * @param operatorFactory a callback that accepts internal object state and returns an object of new operators.
 */
function addOperators(operatorType, operatorFactory) {
    var customOperators = operatorFactory({ computeValue: computeValue, resolve: util_1.resolve });
    validateOperatorMap(customOperators);
    // check for existing operators
    for (var _i = 0, _a = Object.entries(customOperators); _i < _a.length; _i++) {
        var _b = _a[_i], op = _b[0], _ = _b[1];
        var call = getOperator(operatorType, op);
        (0, util_1.assert)(!call, op + " already exists for '" + operatorType + "' operators");
    }
    var normalizedOperators = {};
    switch (operatorType) {
        case OperatorType.QUERY:
            var _loop_1 = function (op, f) {
                var fn = f;
                normalizedOperators[op] =
                    function (selector, value, options) {
                        return function (obj) {
                            // value of field must be fully resolved.
                            var lhs = (0, util_1.resolve)(obj, selector, { unwrapArray: true });
                            return fn(selector, lhs, value, options);
                        };
                    };
            };
            for (var _c = 0, _d = Object.entries(customOperators); _c < _d.length; _c++) {
                var _e = _d[_c], op = _e[0], f = _e[1];
                _loop_1(op, f);
            }
            break;
        case OperatorType.PROJECTION:
            var _loop_2 = function (op, f) {
                var fn = f;
                normalizedOperators[op] = function (obj, expr, selector, options) {
                    var lhs = (0, util_1.resolve)(obj, selector);
                    return fn(selector, lhs, expr, options);
                };
            };
            for (var _f = 0, _g = Object.entries(customOperators); _f < _g.length; _f++) {
                var _h = _g[_f], op = _h[0], f = _h[1];
                _loop_2(op, f);
            }
            break;
        default:
            var _loop_3 = function (op, fn) {
                normalizedOperators[op] = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return fn.call.apply(fn, __spreadArray([null], args, false));
                };
            };
            for (var _j = 0, _k = Object.entries(customOperators); _j < _k.length; _j++) {
                var _l = _k[_j], op = _l[0], fn = _l[1];
                _loop_3(op, fn);
            }
    }
    // toss the operator salad :)
    useOperators(operatorType, normalizedOperators);
}
exports.addOperators = addOperators;
/* eslint-disable unused-imports/no-unused-vars-ts */
/**
 * Implementation of system variables
 * @type {Object}
 */
var systemVariables = {
    $$ROOT: function (obj, expr, options) {
        return options.root;
    },
    $$CURRENT: function (obj, expr, options) {
        return obj;
    },
    $$REMOVE: function (obj, expr, options) {
        return undefined;
    },
};
/**
 * Implementation of $redact variables
 *
 * Each function accepts 3 arguments (obj, expr, options)
 *
 * @type {Object}
 */
var redactVariables = {
    $$KEEP: function (obj, expr, options) {
        return obj;
    },
    $$PRUNE: function (obj, expr, options) {
        return undefined;
    },
    $$DESCEND: function (obj, expr, options) {
        // traverse nested documents iff there is a $cond
        if (!(0, util_1.has)(expr, "$cond"))
            return obj;
        var result;
        for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], current = _b[1];
            if ((0, util_1.isObjectLike)(current)) {
                if (current instanceof Array) {
                    var array = [];
                    for (var _c = 0, current_1 = current; _c < current_1.length; _c++) {
                        var elem = current_1[_c];
                        if ((0, util_1.isObject)(elem)) {
                            elem = redact(elem, expr, options);
                        }
                        if (!(0, util_1.isNil)(elem)) {
                            array.push(elem);
                        }
                    }
                    result = array;
                }
                else {
                    result = redact(current, expr, options);
                }
                if ((0, util_1.isNil)(result)) {
                    delete obj[key]; // pruned result
                }
                else {
                    obj[key] = result;
                }
            }
        }
        return obj;
    },
};
/* eslint-enable unused-imports/no-unused-vars-ts */
/**
 * Computes the value of the expression on the object for the given operator
 *
 * @param obj the current object from the collection
 * @param expr the expression for the given field
 * @param operator the operator to resolve the field with
 * @param options {Object} extra options
 * @returns {*}
 */
function computeValue(obj, expr, operator, options) {
    // ensure valid options exist on first invocation
    options = options || makeOptions();
    if ((0, util_1.isOperator)(operator)) {
        // if the field of the object is a valid operator
        var call = getOperator(OperatorType.EXPRESSION, operator);
        if (call)
            return call(obj, expr, options);
        // we also handle $group accumulator operators
        call = getOperator(OperatorType.ACCUMULATOR, operator);
        if (call) {
            // if object is not an array, first try to compute using the expression
            if (!(obj instanceof Array)) {
                obj = computeValue(obj, expr, null, options);
                expr = null;
            }
            // validate that we have an array
            (0, util_1.assert)(obj instanceof Array, "'" + operator + "' target must be an array.");
            // we pass a null expression because all values have been resolved
            return call(obj, expr, options);
        }
        // operator was not found
        throw new Error("operator '" + operator + "' is not registered");
    }
    // if expr is a variable for an object field
    // field not used in this case
    if ((0, util_1.isString)(expr) && expr.length > 0 && expr[0] === "$") {
        // we return redact variables as literals
        if ((0, util_1.has)(redactVariables, expr)) {
            return expr;
        }
        // handle selectors with explicit prefix
        var arr = expr.split(".");
        if ((0, util_1.has)(systemVariables, arr[0])) {
            // set 'root' only the first time it is required to be used for all subsequent calls
            // if it already available on the options, it will be used
            obj = systemVariables[arr[0]](obj, null, (0, util_1.into)({ root: obj }, options));
            if (arr.length == 1)
                return obj;
            expr = expr.substr(arr[0].length); // '.' prefix will be sliced off below
        }
        return (0, util_1.resolve)(obj, expr.slice(1));
    }
    // check and return value if already in a resolved state
    if (expr instanceof Array) {
        return expr.map(function (item) {
            return computeValue(obj, item, null, options);
        });
    }
    else if ((0, util_1.isObject)(expr)) {
        var result = {};
        var _loop_4 = function (key, val) {
            result[key] = computeValue(obj, val, key, options);
            // must run ONLY one aggregate operator per expression
            // if so, return result of the computed value
            if ([OperatorType.EXPRESSION, OperatorType.ACCUMULATOR].some(function (c) {
                return (0, util_1.has)(OPERATORS[c], key);
            })) {
                // there should be only one operator
                (0, util_1.assert)(Object.keys(expr).length === 1, "Invalid aggregation expression '" + JSON.stringify(expr) + "'");
                return { value: result[key] };
            }
        };
        for (var _i = 0, _a = Object.entries(expr); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], val = _b[1];
            var state_1 = _loop_4(key, val);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return result;
    }
    return expr;
}
exports.computeValue = computeValue;
/**
 * Redact an object
 * @param  {Object} obj The object to redact
 * @param  {*} expr The redact expression
 * @param  {*} options  Options for value
 * @return {*} returns the result of the redacted object
 */
function redact(obj, expr, options) {
    var result = computeValue(obj, expr, null, options);
    return (0, util_1.has)(redactVariables, result)
        ? redactVariables[result](obj, expr, (0, util_1.into)({ root: obj }, options))
        : result;
}
exports.redact = redact;


/***/ }),

/***/ 9537:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Cursor = void 0;
var aggregator_1 = __webpack_require__(8221);
var lazy_1 = __webpack_require__(1088);
var util_1 = __webpack_require__(6588);
/**
 * Cursor to iterate and perform filtering on matched objects.
 * This object must not be used directly. A cursor may be obtaine from calling `find()` on an instance of `Query`.
 *
 * @param collection The input source of the collection
 * @param predicate A predicate function to test documents
 * @param projection A projection criteria
 * @param options Options
 * @constructor
 */
var Cursor = /** @class */ (function () {
    function Cursor(source, predicate, projection, options) {
        this.source = source;
        this.predicate = predicate;
        this.projection = projection;
        this.options = options;
        this.operators = [];
        this.result = null;
        this.stack = [];
    }
    Cursor.prototype.fetch = function () {
        if (this.result)
            return this.result;
        // add projection operator
        if ((0, util_1.isObject)(this.projection)) {
            this.operators.push({ $project: this.projection });
        }
        // filter collection
        this.result = (0, lazy_1.Lazy)(this.source).filter(this.predicate);
        if (this.operators.length > 0) {
            this.result = new aggregator_1.Aggregator(this.operators, this.options).stream(this.result);
        }
        return this.result;
    };
    /**
     * Return remaining objects in the cursor as an array. This method exhausts the cursor
     * @returns {Array}
     */
    Cursor.prototype.all = function () {
        return this.fetch().value();
    };
    /**
     * Returns the number of objects return in the cursor. This method exhausts the cursor
     * @returns {Number}
     */
    Cursor.prototype.count = function () {
        return this.all().length;
    };
    /**
     * Returns a cursor that begins returning results only after passing or skipping a number of documents.
     * @param {Number} n the number of results to skip.
     * @return {Cursor} Returns the cursor, so you can chain this call.
     */
    Cursor.prototype.skip = function (n) {
        this.operators.push({ $skip: n });
        return this;
    };
    /**
     * Constrains the size of a cursor's result set.
     * @param {Number} n the number of results to limit to.
     * @return {Cursor} Returns the cursor, so you can chain this call.
     */
    Cursor.prototype.limit = function (n) {
        this.operators.push({ $limit: n });
        return this;
    };
    /**
     * Returns results ordered according to a sort specification.
     * @param {Object} modifier an object of key and values specifying the sort order. 1 for ascending and -1 for descending
     * @return {Cursor} Returns the cursor, so you can chain this call.
     */
    Cursor.prototype.sort = function (modifier) {
        this.operators.push({ $sort: modifier });
        return this;
    };
    /**
     * Specifies the collation for the cursor returned by the `mingo.Query.find`
     * @param {*} spec
     */
    Cursor.prototype.collation = function (spec) {
        (0, util_1.into)(this.options, { collation: spec });
        return this;
    };
    /**
     * Returns the next document in a cursor.
     * @returns {Object | Boolean}
     */
    Cursor.prototype.next = function () {
        // empty stack means processing is done
        if (!this.stack)
            return;
        // yield value obtains in hasNext()
        if (this.stack.length > 0) {
            return this.stack.pop();
        }
        var o = this.fetch().next();
        if (!o.done)
            return o.value;
        this.stack = null;
        return;
    };
    /**
     * Returns true if the cursor has documents and can be iterated.
     * @returns {boolean}
     */
    Cursor.prototype.hasNext = function () {
        if (!this.stack)
            return false; // done
        // there is a value on stack
        if (this.stack.length > 0)
            return true;
        var o = this.fetch().next();
        if (o.done) {
            this.stack = null;
        }
        else {
            this.stack.push(o.value);
        }
        return !!this.stack;
    };
    /**
     * Applies a function to each document in a cursor and collects the return values in an array.
     * @param callback
     * @returns {Array}
     */
    Cursor.prototype.map = function (callback) {
        return this.fetch().map(callback).value();
    };
    /**
     * Applies a JavaScript function for every document in a cursor.
     * @param callback
     */
    Cursor.prototype.forEach = function (callback) {
        this.fetch().each(callback);
    };
    Cursor.prototype[Symbol.iterator] = function () {
        return this.fetch(); /* eslint-disable-line */
    };
    return Cursor;
}());
exports.Cursor = Cursor;


/***/ }),

/***/ 4406:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
__webpack_unused_export__ = __webpack_unused_export__ = __webpack_unused_export__ = exports.AE = __webpack_unused_export__ = void 0;
// loads basic operators
__webpack_require__(7532);
var aggregator_1 = __webpack_require__(8221);
var query_1 = __webpack_require__(7732);
var aggregator_2 = __webpack_require__(8221);
__webpack_unused_export__ = ({ enumerable: true, get: function () { return aggregator_2.Aggregator; } });
var query_2 = __webpack_require__(7732);
Object.defineProperty(exports, "AE", ({ enumerable: true, get: function () { return query_2.Query; } }));
/**
 * Performs a query on a collection and returns a cursor object.
 * Shorthand for `Query(criteria).find(collection, projection)`
 *
 * @param collection Array of objects
 * @param criteria Query criteria
 * @param projection Projection criteria
 * @param options
 * @returns {Cursor} A cursor of results
 */
function find(collection, criteria, projection, options) {
    return new query_1.Query(criteria, options).find(collection, projection);
}
__webpack_unused_export__ = find;
/**
 * Returns a new array without objects which match the criteria
 *
 * @param collection Array of objects
 * @param criteria Query criteria of objects to remove
 * @param options
 * @returns {Array} New filtered array
 */
function remove(collection, criteria, options) {
    return new query_1.Query(criteria, options).remove(collection);
}
__webpack_unused_export__ = remove;
/**
 * Return the result collection after running the aggregation pipeline for the given collection.
 * Shorthand for `(new Aggregator(pipeline, options)).run(collection)`
 *
 * @param collection Collection or stream of objects
 * @param pipeline The pipeline operators to use
 * @param options
 * @returns {Array} New array of results
 */
function aggregate(collection, pipeline, options) {
    return new aggregator_1.Aggregator(pipeline, options).run(collection);
}
__webpack_unused_export__ = aggregate;
// default interface
exports.ZP = {
    Aggregator: aggregator_1.Aggregator,
    Query: query_1.Query,
    aggregate: aggregate,
    find: find,
    remove: remove,
};


/***/ }),

/***/ 7532:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Loads all Query and Projection operators
 */
// helpers
var core_1 = __webpack_require__(7424);
var booleanOperators = __importStar(__webpack_require__(5039));
var comparisonOperators = __importStar(__webpack_require__(4543));
var pipeline_1 = __webpack_require__(1091);
var projectionOperators = __importStar(__webpack_require__(7086));
var queryOperators = __importStar(__webpack_require__(581));
var util_1 = __webpack_require__(6588);
/**
 * Enable basic operators. This includes only query and projection operators
 */
function enableBasicOperators() {
    (0, core_1.useOperators)(core_1.OperatorType.EXPRESSION, (0, util_1.into)({}, booleanOperators, comparisonOperators));
    (0, core_1.useOperators)(core_1.OperatorType.PIPELINE, { $project: pipeline_1.$project, $skip: pipeline_1.$skip, $limit: pipeline_1.$limit, $sort: pipeline_1.$sort });
    (0, core_1.useOperators)(core_1.OperatorType.PROJECTION, projectionOperators);
    (0, core_1.useOperators)(core_1.OperatorType.QUERY, queryOperators);
}
enableBasicOperators();


/***/ }),

/***/ 1088:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Iterator = exports.Lazy = void 0;
/**
 * Returns an iterator
 * @param {*} source An iterable source (Array, Function, Generator, or Iterator)
 */
function Lazy(source) {
    return source instanceof Iterator ? source : new Iterator(source);
}
exports.Lazy = Lazy;
/**
 * Checks whether the given object is compatible with a generator i.e Object{next:Function}
 * @param {*} o An object
 */
function isGenerator(o) {
    var _a;
    return (!!o && typeof o === "object" && ((_a = o) === null || _a === void 0 ? void 0 : _a.next) instanceof Function);
}
function dropItem(array, i) {
    var rest = array.slice(i + 1);
    array.splice(i);
    Array.prototype.push.apply(array, rest);
}
// stop iteration error
var DONE = new Error();
// Lazy function actions
var Action;
(function (Action) {
    Action[Action["MAP"] = 0] = "MAP";
    Action[Action["FILTER"] = 1] = "FILTER";
    Action[Action["TAKE"] = 2] = "TAKE";
    Action[Action["DROP"] = 3] = "DROP";
})(Action || (Action = {}));
function createCallback(nextFn, iteratees, buffer) {
    var done = false;
    var index = -1;
    var bufferIndex = 0; // index for the buffer
    return function (storeResult) {
        // special hack to collect all values into buffer
        try {
            outer: while (!done) {
                var o = nextFn();
                index++;
                var i = -1;
                var size = iteratees.length;
                var innerDone = false;
                while (++i < size) {
                    var r = iteratees[i];
                    switch (r.action) {
                        case Action.MAP:
                            o = r.func(o, index);
                            break;
                        case Action.FILTER:
                            if (!r.func(o, index))
                                continue outer;
                            break;
                        case Action.TAKE:
                            --r.count;
                            if (!r.count)
                                innerDone = true;
                            break;
                        case Action.DROP:
                            --r.count;
                            if (!r.count)
                                dropItem(iteratees, i);
                            continue outer;
                        default:
                            break outer;
                    }
                }
                done = innerDone;
                if (storeResult) {
                    buffer[bufferIndex++] = o;
                }
                else {
                    return { value: o, done: false };
                }
            }
        }
        catch (e) {
            if (e !== DONE)
                throw e;
        }
        done = true;
        return { done: done };
    };
}
/**
 * A lazy collection iterator yields a single value at time upon request
 */
var Iterator = /** @class */ (function () {
    /**
     * @param {*} source An iterable object or function.
     *    Array - return one element per cycle
     *    Object{next:Function} - call next() for the next value (this also handles generator functions)
     *    Function - call to return the next value
     * @param {Function} fn An optional transformation function
     */
    function Iterator(source) {
        this.iteratees = new Array(); // lazy function chain
        this.yieldedValues = [];
        this.iteratees = []; // lazy function chain
        this.isSingle = false; // flag whether to return a single value
        this.isDone = false;
        this.yieldedValues = [];
        var nextVal;
        if (source instanceof Function) {
            // make iterable
            source = { next: source };
        }
        if (isGenerator(source)) {
            var src_1 = source;
            nextVal = function () {
                var o = src_1.next();
                if (o.done)
                    throw DONE;
                return o.value;
            };
        }
        else if (source instanceof Array) {
            var data_1 = source;
            var size_1 = data_1.length;
            var index_1 = 0;
            nextVal = function () {
                if (index_1 < size_1)
                    return data_1[index_1++];
                throw DONE;
            };
        }
        else if (!(source instanceof Function)) {
            throw new Error("Source is of type '" + typeof source + "'. Must be Array, Function, or Generator");
        }
        // create next function
        this.getNext = createCallback(nextVal, this.iteratees, this.yieldedValues);
    }
    Iterator.prototype.validate = function () {
        if (this.isSingle)
            throw new Error("Cannot add iteratee/transform after `first()`");
    };
    /**
     * Add an iteratee to this lazy sequence
     * @param {Object} iteratee
     */
    Iterator.prototype.push = function (action, value) {
        this.validate();
        if (typeof value === "function") {
            this.iteratees.push({ action: action, func: value });
        }
        else if (typeof value === "number") {
            this.iteratees.push({ action: action, count: value });
        }
        else {
            throw Error("invalid value");
        }
        return this;
    };
    Iterator.prototype.next = function () {
        return this.getNext();
    };
    // Iteratees methods
    /**
     * Transform each item in the sequence to a new value
     * @param {Function} f
     */
    Iterator.prototype.map = function (f) {
        return this.push(Action.MAP, f);
    };
    /**
     * Select only items matching the given predicate
     * @param {Function} pred
     */
    Iterator.prototype.filter = function (predicate) {
        return this.push(Action.FILTER, predicate);
    };
    /**
     * Take given numbe for values from sequence
     * @param {Number} n A number greater than 0
     */
    Iterator.prototype.take = function (n) {
        return n > 0 ? this.push(Action.TAKE, n) : this;
    };
    /**
     * Drop a number of values from the sequence
     * @param {Number} n Number of items to drop greater than 0
     */
    Iterator.prototype.drop = function (n) {
        return n > 0 ? this.push(Action.DROP, n) : this;
    };
    // Transformations
    /**
     * Returns a new lazy object with results of the transformation
     * The entire sequence is realized.
     *
     * @param {Function} fn Tranform function of type (Array) => (Any)
     */
    Iterator.prototype.transform = function (fn) {
        this.validate();
        var self = this;
        var iter;
        return Lazy(function () {
            if (!iter) {
                iter = Lazy(fn(self.value()));
            }
            return iter.next();
        });
    };
    /**
     * Mark this lazy object to return only the first result on `lazy.value()`.
     * No more iteratees or transformations can be added after this method is called.
     */
    Iterator.prototype.first = function () {
        this.take(1);
        this.isSingle = true;
        return this;
    };
    // Terminal methods
    /**
     * Returns the fully realized values of the iterators.
     * The return value will be an array unless `lazy.first()` was used.
     * The realized values are cached for subsequent calls
     */
    Iterator.prototype.value = function () {
        if (!this.isDone) {
            this.isDone = this.getNext(true).done;
        }
        return this.isSingle ? this.yieldedValues[0] : this.yieldedValues;
    };
    /**
     * Execute the funcion for each value. Will stop when an execution returns false.
     * @param {Function} f
     * @returns {Boolean} false iff `f` return false for AnyVal execution, otherwise true
     */
    Iterator.prototype.each = function (f) {
        for (;;) {
            var o = this.next();
            if (o.done)
                break;
            if (f(o.value) === false)
                return false;
        }
        return true;
    };
    /**
     * Returns the reduction of sequence according the reducing function
     *
     * @param {*} f a reducing function
     * @param {*} init
     */
    Iterator.prototype.reduce = function (f, initialValue) {
        var o = this.next();
        var i = 0;
        if (initialValue === undefined && !o.done) {
            initialValue = o.value;
            o = this.next();
            i++;
        }
        while (!o.done) {
            initialValue = f(initialValue, o.value, i++);
            o = this.next();
        }
        return initialValue;
    };
    /**
     * Returns the number of matched items in the sequence
     */
    Iterator.prototype.size = function () {
        return this.reduce(function (acc, _) { return ++acc; }, 0);
    };
    Iterator.prototype[Symbol.iterator] = function () {
        /* eslint-disable @typescript-eslint/no-unsafe-return */
        return this;
    };
    return Iterator;
}());
exports.Iterator = Iterator;


/***/ }),

/***/ 2344:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/**
 * Predicates used for Query and Expression operators.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$type = exports.$elemMatch = exports.$size = exports.$all = exports.$exists = exports.$regex = exports.$mod = exports.$gte = exports.$gt = exports.$lte = exports.$lt = exports.$nin = exports.$in = exports.$ne = exports.$eq = exports.createExpressionOperator = exports.createQueryOperator = void 0;
var core_1 = __webpack_require__(7424);
var query_1 = __webpack_require__(7732);
var util_1 = __webpack_require__(6588);
/**
 * Returns a query operator created from the predicate
 *
 * @param predicate Predicate function
 */
function createQueryOperator(predicate) {
    return function (selector, value, options) {
        var opts = { unwrapArray: true };
        return function (obj) {
            // value of field must be fully resolved.
            var lhs = (0, util_1.resolve)(obj, selector, opts);
            return predicate(lhs, value, options);
        };
    };
}
exports.createQueryOperator = createQueryOperator;
/**
 * Returns an expression operator created from the predicate
 *
 * @param predicate Predicate function
 */
function createExpressionOperator(predicate) {
    return function (obj, expr, options) {
        var args = (0, core_1.computeValue)(obj, expr, null, options);
        return predicate.apply(void 0, args);
    };
}
exports.createExpressionOperator = createExpressionOperator;
/**
 * Checks that two values are equal.
 *
 * @param a         The lhs operand as resolved from the object by the given selector
 * @param b         The rhs operand provided by the user
 * @returns {*}
 */
function $eq(a, b, options) {
    // start with simple equality check
    if ((0, util_1.isEqual)(a, b))
        return true;
    // https://docs.mongodb.com/manual/tutorial/query-for-null-fields/
    if ((0, util_1.isNil)(a) && (0, util_1.isNil)(b))
        return true;
    // check
    if (a instanceof Array) {
        var eq = util_1.isEqual.bind(null, b);
        return a.some(eq) || (0, util_1.flatten)(a, 1).some(eq);
    }
    return false;
}
exports.$eq = $eq;
/**
 * Matches all values that are not equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $ne(a, b, options) {
    return !$eq(a, b, options);
}
exports.$ne = $ne;
/**
 * Matches any of the values that exist in an array specified in the query.
 *
 * @param a
 * @param b
 * @returns {*}
 */
function $in(a, b, options) {
    // queries for null should be able to find undefined fields
    if ((0, util_1.isNil)(a))
        return b.some(util_1.isNull);
    return (0, util_1.intersection)((0, util_1.ensureArray)(a), b, options === null || options === void 0 ? void 0 : options.hashFunction).length > 0;
}
exports.$in = $in;
/**
 * Matches values that do not exist in an array specified to the query.
 *
 * @param a
 * @param b
 * @returns {*|boolean}
 */
function $nin(a, b, options) {
    return !$in(a, b, options);
}
exports.$nin = $nin;
/**
 * Matches values that are less than the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $lt(a, b, options) {
    return compare(a, b, function (x, y) { return x < y; });
}
exports.$lt = $lt;
/**
 * Matches values that are less than or equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $lte(a, b, options) {
    return compare(a, b, function (x, y) { return x <= y; });
}
exports.$lte = $lte;
/**
 * Matches values that are greater than the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $gt(a, b, options) {
    return compare(a, b, function (x, y) { return x > y; });
}
exports.$gt = $gt;
/**
 * Matches values that are greater than or equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $gte(a, b, options) {
    return compare(a, b, function (x, y) { return x >= y; });
}
exports.$gte = $gte;
/**
 * Performs a modulo operation on the value of a field and selects documents with a specified result.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $mod(a, b, options) {
    return (0, util_1.ensureArray)(a).some(function (x) { return b.length === 2 && x % b[0] === b[1]; });
}
exports.$mod = $mod;
/**
 * Selects documents where values match a specified regular expression.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $regex(a, b, options) {
    var lhs = (0, util_1.ensureArray)(a);
    var match = function (x) { return (0, util_1.isString)(x) && !!b.exec(x); };
    return lhs.some(match) || (0, util_1.flatten)(lhs, 1).some(match);
}
exports.$regex = $regex;
/**
 * Matches documents that have the specified field.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $exists(a, b, options) {
    return (((b === false || b === 0) && a === undefined) ||
        ((b === true || b === 1) && a !== undefined));
}
exports.$exists = $exists;
/**
 * Matches arrays that contain all elements specified in the query.
 *
 * @param values
 * @param queries
 * @returns boolean
 */
function $all(values, queries, options) {
    if (!(0, util_1.isArray)(values) ||
        !(0, util_1.isArray)(queries) ||
        !values.length ||
        !queries.length) {
        return false;
    }
    var matched = true;
    var _loop_1 = function (query) {
        // no need to check all the queries.
        if (!matched)
            return "break";
        if ((0, util_1.isObject)(query) && (0, util_1.inArray)(Object.keys(query), "$elemMatch")) {
            matched = $elemMatch(values, query["$elemMatch"], options);
        }
        else if (query instanceof RegExp) {
            matched = values.some(function (s) { return typeof s === "string" && query.test(s); });
        }
        else {
            matched = values.some(function (v) { return (0, util_1.isEqual)(query, v); });
        }
    };
    for (var _i = 0, queries_1 = queries; _i < queries_1.length; _i++) {
        var query = queries_1[_i];
        var state_1 = _loop_1(query);
        if (state_1 === "break")
            break;
    }
    return matched;
}
exports.$all = $all;
/**
 * Selects documents if the array field is a specified size.
 *
 * @param a
 * @param b
 * @returns {*|boolean}
 */
function $size(a, b, options) {
    return a.length === b;
}
exports.$size = $size;
function isNonBooleanOperator(name) {
    return (0, util_1.isOperator)(name) && ["$and", "$or", "$nor"].indexOf(name) === -1;
}
/**
 * Selects documents if element in the array field matches all the specified $elemMatch condition.
 *
 * @param a {Array} element to match against
 * @param b {Object} subquery
 */
function $elemMatch(a, b, options) {
    // should return false for non-matching input
    if ((0, util_1.isArray)(a) && !(0, util_1.isEmpty)(a)) {
        var format = function (x) { return x; };
        var criteria = b;
        // If we find a boolean operator in the subquery, we fake a field to point to it. This is an
        // attempt to ensure that it is a valid criteria. We cannot make this substitution for operators
        // like $and/$or/$nor; as otherwise, this faking will break our query.
        if (Object.keys(b).every(isNonBooleanOperator)) {
            criteria = { temp: b };
            format = function (x) { return ({ temp: x }); };
        }
        var query = new query_1.Query(criteria, options);
        for (var i = 0, len = a.length; i < len; i++) {
            if (query.test(format(a[i]))) {
                return true;
            }
        }
    }
    return false;
}
exports.$elemMatch = $elemMatch;
/**
 * Selects documents if a field is of the specified type.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function compareType(a, b, options) {
    switch (b) {
        case 1:
        case 19:
        case util_1.BsonType.DOUBLE:
        case util_1.BsonType.DECIMAL:
            return (0, util_1.isNumber)(a);
        case 2:
        case util_1.JsType.STRING:
            return (0, util_1.isString)(a);
        case 3:
        case util_1.JsType.OBJECT:
            return (0, util_1.isObject)(a);
        case 4:
        case util_1.JsType.ARRAY:
            return (0, util_1.isArray)(a);
        case 6:
        case util_1.JsType.UNDEFINED:
            return (0, util_1.isNil)(a);
        case 8:
        case util_1.JsType.BOOLEAN:
        case util_1.BsonType.BOOL:
            return (0, util_1.isBoolean)(a);
        case 9:
        case util_1.JsType.DATE:
            return (0, util_1.isDate)(a);
        case 10:
        case util_1.JsType.NULL:
            return (0, util_1.isNull)(a);
        case 11:
        case util_1.JsType.REGEXP:
        case util_1.BsonType.REGEX:
            return (0, util_1.isRegExp)(a);
        case 16:
        case util_1.BsonType.INT:
            return ((0, util_1.isNumber)(a) &&
                a >= util_1.MIN_INT &&
                a <= util_1.MAX_INT &&
                a.toString().indexOf(".") === -1);
        case 18:
        case util_1.BsonType.LONG:
            return ((0, util_1.isNumber)(a) &&
                a >= util_1.MIN_LONG &&
                a <= util_1.MAX_LONG &&
                a.toString().indexOf(".") === -1);
        default:
            return false;
    }
}
/**
 * Selects documents if a field is of the specified type.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
function $type(a, b, options) {
    return Array.isArray(b)
        ? b.findIndex(function (t) { return compareType(a, t, options); }) >= 0
        : compareType(a, b, options);
}
exports.$type = $type;
function compare(a, b, f) {
    return (0, util_1.ensureArray)(a).some(function (x) { return (0, util_1.getType)(x) === (0, util_1.getType)(b) && f(x, b); });
}


/***/ }),

/***/ 78:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Array Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#array-expression-operators
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$slice = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Returns a subset of an array.
 *
 * @param  {Object} obj
 * @param  {*} expr
 * @return {*}
 */
function $slice(obj, expr, options) {
    var args = (0, core_1.computeValue)(obj, expr, null, options);
    var arr = args[0];
    var skip = args[1];
    var limit = args[2];
    // MongoDB $slice works a bit differently from Array.slice
    // Uses single argument for 'limit' and array argument [skip, limit]
    if ((0, util_1.isNil)(limit)) {
        if (skip < 0) {
            skip = Math.max(0, arr.length + skip);
            limit = arr.length - skip + 1;
        }
        else {
            limit = skip;
            skip = 0;
        }
    }
    else {
        if (skip < 0) {
            skip = Math.max(0, arr.length + skip);
        }
        (0, util_1.assert)(limit > 0, "Invalid argument for $slice operator. Limit must be a positive number");
        limit += skip;
    }
    return arr.slice(skip, limit);
}
exports.$slice = $slice;


/***/ }),

/***/ 510:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Boolean Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#boolean-expression-operators
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$and = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Returns true only when all its expressions evaluate to true. Accepts any number of argument expressions.
 *
 * @param obj
 * @param expr
 * @returns {boolean}
 */
function $and(obj, expr, options) {
    var value = (0, core_1.computeValue)(obj, expr, null, options);
    return (0, util_1.truthy)(value) && value.every(util_1.truthy);
}
exports.$and = $and;


/***/ }),

/***/ 5039:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(510), exports);
__exportStar(__webpack_require__(7846), exports);
__exportStar(__webpack_require__(7405), exports);


/***/ }),

/***/ 7846:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Boolean Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#boolean-expression-operators
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$not = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Returns the boolean value that is the opposite of its argument expression. Accepts a single argument expression.
 *
 * @param obj RawObject from collection
 * @param expr Right hand side expression of operator
 * @returns {boolean}
 */
function $not(obj, expr, options) {
    var booleanExpr = (0, util_1.ensureArray)(expr);
    // array values are truthy so an emty array is false
    if (booleanExpr.length == 0)
        return false;
    // use provided value non-array value
    if (booleanExpr.length == 1)
        return !(0, core_1.computeValue)(obj, booleanExpr[0], null, options);
    // expects a single argument
    throw "Expression $not takes exactly 1 argument";
}
exports.$not = $not;


/***/ }),

/***/ 7405:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Boolean Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#boolean-expression-operators
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$or = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Returns true when any of its expressions evaluates to true. Accepts any number of argument expressions.
 *
 * @param obj
 * @param expr
 * @returns {boolean}
 */
function $or(obj, expr, options) {
    var value = (0, core_1.computeValue)(obj, expr, null, options);
    return (0, util_1.truthy)(value) && value.some(util_1.truthy);
}
exports.$or = $or;


/***/ }),

/***/ 4543:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Comparison Expression Operators: https://docs.mongodb.com/manual/reference/operator/aggregation/#comparison-expression-operators
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$cmp = exports.$ne = exports.$lte = exports.$lt = exports.$gte = exports.$gt = exports.$eq = void 0;
var core_1 = __webpack_require__(7424);
var _predicates_1 = __webpack_require__(2344);
exports.$eq = (0, _predicates_1.createExpressionOperator)(_predicates_1.$eq);
exports.$gt = (0, _predicates_1.createExpressionOperator)(_predicates_1.$gt);
exports.$gte = (0, _predicates_1.createExpressionOperator)(_predicates_1.$gte);
exports.$lt = (0, _predicates_1.createExpressionOperator)(_predicates_1.$lt);
exports.$lte = (0, _predicates_1.createExpressionOperator)(_predicates_1.$lte);
exports.$ne = (0, _predicates_1.createExpressionOperator)(_predicates_1.$ne);
/**
 * Compares two values and returns the result of the comparison as an integer.
 *
 * @param obj
 * @param expr
 * @returns {number}
 */
function $cmp(obj, expr, options) {
    var args = (0, core_1.computeValue)(obj, expr, null, options);
    if (args[0] > args[1])
        return 1;
    if (args[0] < args[1])
        return -1;
    return 0;
}
exports.$cmp = $cmp;


/***/ }),

/***/ 5292:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$addFields = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Adds new fields to documents.
 * Outputs documents that contain all existing fields from the input documents and newly added fields.
 *
 * @param {Iterator} collection
 * @param {Object} expr
 * @param {Options} options
 */
function $addFields(collection, expr, options) {
    var newFields = Object.keys(expr);
    if (newFields.length === 0)
        return collection;
    return collection.map(function (obj) {
        var newObj = __assign({}, obj);
        for (var _i = 0, newFields_1 = newFields; _i < newFields_1.length; _i++) {
            var field = newFields_1[_i];
            var newValue = (0, core_1.computeValue)(obj, expr[field], null, options);
            if (newValue !== undefined) {
                (0, util_1.setValue)(newObj, field, newValue);
            }
            else {
                (0, util_1.removeValue)(newObj, field);
            }
        }
        return newObj;
    });
}
exports.$addFields = $addFields;


/***/ }),

/***/ 624:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$bucket = void 0;
var core_1 = __webpack_require__(7424);
var lazy_1 = __webpack_require__(1088);
var util_1 = __webpack_require__(6588);
/**
 * Categorizes incoming documents into groups, called buckets, based on a specified expression and bucket boundaries.
 * https://docs.mongodb.com/manual/reference/operator/aggregation/bucket/
 *
 * @param {*} collection
 * @param {*} expr
 * @param {Options} opt Pipeline options
 */
function $bucket(collection, expr, options) {
    var boundaries = __spreadArray([], expr.boundaries, true);
    var defaultKey = expr.default;
    var lower = boundaries[0]; // inclusive
    var upper = boundaries[boundaries.length - 1]; // exclusive
    var outputExpr = expr.output || { count: { $sum: 1 } };
    (0, util_1.assert)(expr.boundaries.length > 2, "$bucket 'boundaries' expression must have at least 3 elements");
    var boundType = (0, util_1.getType)(lower);
    for (var i = 0, len = boundaries.length - 1; i < len; i++) {
        (0, util_1.assert)(boundType === (0, util_1.getType)(boundaries[i + 1]), "$bucket 'boundaries' must all be of the same type");
        (0, util_1.assert)(boundaries[i] < boundaries[i + 1], "$bucket 'boundaries' must be sorted in ascending order");
    }
    !(0, util_1.isNil)(defaultKey) &&
        (0, util_1.getType)(expr.default) === (0, util_1.getType)(lower) &&
        (0, util_1.assert)(expr.default >= upper || expr.default < lower, "$bucket 'default' expression must be out of boundaries range");
    var grouped = {};
    for (var _i = 0, boundaries_1 = boundaries; _i < boundaries_1.length; _i++) {
        var k = boundaries_1[_i];
        grouped[k] = [];
    }
    // add default key if provided
    if (!(0, util_1.isNil)(defaultKey))
        grouped[defaultKey] = [];
    var iterator = null;
    return (0, lazy_1.Lazy)(function () {
        if (iterator === null) {
            collection.each(function (obj) {
                var key = (0, core_1.computeValue)(obj, expr.groupBy, null, options);
                if ((0, util_1.isNil)(key) || key < lower || key >= upper) {
                    (0, util_1.assert)(!(0, util_1.isNil)(defaultKey), "$bucket require a default for out of range values");
                    grouped[defaultKey].push(obj);
                }
                else {
                    (0, util_1.assert)(key >= lower && key < upper, "$bucket 'groupBy' expression must resolve to a value in range of boundaries");
                    var index = findInsertIndex(boundaries, key);
                    var boundKey = boundaries[Math.max(0, index - 1)];
                    grouped[boundKey].push(obj);
                }
            });
            // upper bound is exclusive so we remove it
            boundaries.pop();
            if (!(0, util_1.isNil)(defaultKey))
                boundaries.push(defaultKey);
            iterator = (0, lazy_1.Lazy)(boundaries).map(function (key) {
                var acc = (0, core_1.computeValue)(grouped[key], outputExpr, null, options);
                return (0, util_1.into)(acc, { _id: key });
            });
        }
        return iterator.next();
    });
}
exports.$bucket = $bucket;
/**
 * Find the insert index for the given key in a sorted array.
 *
 * @param {*} sorted The sorted array to search
 * @param {*} item The search key
 */
function findInsertIndex(sorted, item) {
    // uses binary search
    var lo = 0;
    var hi = sorted.length - 1;
    while (lo <= hi) {
        var mid = Math.round(lo + (hi - lo) / 2);
        if (item < sorted[mid]) {
            hi = mid - 1;
        }
        else if (item > sorted[mid]) {
            lo = mid + 1;
        }
        else {
            return mid;
        }
    }
    return lo;
}


/***/ }),

/***/ 4943:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$bucketAuto = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Categorizes incoming documents into a specific number of groups, called buckets,
 * based on a specified expression. Bucket boundaries are automatically determined
 * in an attempt to evenly distribute the documents into the specified number of buckets.
 * https://docs.mongodb.com/manual/reference/operator/aggregation/bucketAuto/
 *
 * @param {*} collection
 * @param {*} expr
 * @param {*} options
 */
function $bucketAuto(collection, expr, options) {
    var outputExpr = expr.output || { count: { $sum: 1 } };
    var groupByExpr = expr.groupBy;
    var bucketCount = expr.buckets;
    (0, util_1.assert)(bucketCount > 0, "The $bucketAuto 'buckets' field must be greater than 0, but found: " + bucketCount);
    var ID_KEY = "_id";
    return collection.transform(function (coll) {
        var approxBucketSize = Math.max(1, Math.round(coll.length / bucketCount));
        var computeValueOptimized = (0, util_1.memoize)(core_1.computeValue, options === null || options === void 0 ? void 0 : options.hashFunction);
        var grouped = {};
        var remaining = [];
        var sorted = (0, util_1.sortBy)(coll, function (o) {
            var key = computeValueOptimized(o, groupByExpr, null, options);
            if ((0, util_1.isNil)(key)) {
                remaining.push(o);
            }
            else {
                grouped[key] || (grouped[key] = []);
                grouped[key].push(o);
            }
            return key;
        });
        var result = [];
        var index = 0; // counter for sorted collection
        for (var i = 0, len = sorted.length; i < bucketCount && index < len; i++) {
            var boundaries = {};
            var bucketItems = [];
            for (var j = 0; j < approxBucketSize && index < len; j++) {
                var key = computeValueOptimized(sorted[index], groupByExpr, null, options);
                if ((0, util_1.isNil)(key))
                    key = null;
                // populate current bucket with all values for current key
                (0, util_1.into)(bucketItems, (0, util_1.isNil)(key) ? remaining : grouped[key]);
                // increase sort index by number of items added
                index += (0, util_1.isNil)(key) ? remaining.length : grouped[key].length;
                // set the min key boundary if not already present
                if (!(0, util_1.has)(boundaries, "min"))
                    boundaries.min = key;
                if (result.length > 0) {
                    var lastBucket = result[result.length - 1];
                    lastBucket[ID_KEY].max = boundaries.min;
                }
            }
            // if is last bucket add remaining items
            if (i == bucketCount - 1) {
                (0, util_1.into)(bucketItems, sorted.slice(index));
            }
            var values = (0, core_1.computeValue)(bucketItems, outputExpr, null, options);
            result.push((0, util_1.into)(values, {
                _id: boundaries,
            }));
        }
        if (result.length > 0) {
            result[result.length - 1][ID_KEY].max =
                computeValueOptimized(sorted[sorted.length - 1], groupByExpr, null, options);
        }
        return result;
    });
}
exports.$bucketAuto = $bucketAuto;


/***/ }),

/***/ 1688:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$count = void 0;
var lazy_1 = __webpack_require__(1088);
var util_1 = __webpack_require__(6588);
/**
 * Returns a document that contains a count of the number of documents input to the stage.
 *
 * @param {Array} collection
 * @param {String} expr
 * @param {Options} options
 * @return {Object}
 */
function $count(collection, expr, options) {
    (0, util_1.assert)((0, util_1.isString)(expr) &&
        expr.trim() !== "" &&
        expr.indexOf(".") === -1 &&
        expr.trim()[0] !== "$", "Invalid expression value for $count");
    return (0, lazy_1.Lazy)(function () {
        var o = {};
        o[expr] = collection.size();
        return { value: o, done: false };
    }).first();
}
exports.$count = $count;


/***/ }),

/***/ 1129:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$facet = void 0;
var aggregator_1 = __webpack_require__(8221);
var util_1 = __webpack_require__(6588);
/**
 * Processes multiple aggregation pipelines within a single stage on the same set of input documents.
 * Enables the creation of multi-faceted aggregations capable of characterizing data across multiple dimensions, or facets, in a single stage.
 */
function $facet(collection, expr, options) {
    return collection.transform(function (array) {
        return [
            (0, util_1.objectMap)(expr, function (pipeline) {
                return new aggregator_1.Aggregator(pipeline, options).run(array);
            }),
        ];
    });
}
exports.$facet = $facet;


/***/ }),

/***/ 4285:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$group = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Groups documents together for the purpose of calculating aggregate values based on a collection of documents.
 *
 * @param collection
 * @param expr
 * @param options
 * @returns {Array}
 */
function $group(collection, expr, options) {
    // lookup key for grouping
    var ID_KEY = "_id";
    var id = expr[ID_KEY];
    return collection.transform(function (coll) {
        var partitions = (0, util_1.groupBy)(coll, function (obj) { return (0, core_1.computeValue)(obj, id, null, options); }, options === null || options === void 0 ? void 0 : options.hashFunction);
        // remove the group key
        expr = (0, util_1.into)({}, expr);
        delete expr[ID_KEY];
        var i = -1;
        var size = partitions.keys.length;
        return function () {
            if (++i === size)
                return { done: true };
            var value = partitions.keys[i];
            var obj = {};
            // exclude undefined key value
            if (value !== undefined) {
                obj[ID_KEY] = value;
            }
            // compute remaining keys in expression
            for (var _i = 0, _a = Object.entries(expr); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], val = _b[1];
                obj[key] = (0, core_1.computeValue)(partitions.groups[i], val, key, options);
            }
            return { value: obj, done: false };
        };
    });
}
exports.$group = $group;


/***/ }),

/***/ 1091:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/**
 * Pipeline Aggregation Stages. https://docs.mongodb.com/manual/reference/operator/aggregation-
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(5292), exports);
__exportStar(__webpack_require__(624), exports);
__exportStar(__webpack_require__(4943), exports);
__exportStar(__webpack_require__(1688), exports);
__exportStar(__webpack_require__(1129), exports);
__exportStar(__webpack_require__(4285), exports);
__exportStar(__webpack_require__(854), exports);
__exportStar(__webpack_require__(7672), exports);
__exportStar(__webpack_require__(7533), exports);
__exportStar(__webpack_require__(2250), exports);
__exportStar(__webpack_require__(8203), exports);
__exportStar(__webpack_require__(1229), exports);
__exportStar(__webpack_require__(9251), exports);
__exportStar(__webpack_require__(3042), exports);
__exportStar(__webpack_require__(6486), exports);
__exportStar(__webpack_require__(5702), exports);
__exportStar(__webpack_require__(7642), exports);
__exportStar(__webpack_require__(3469), exports);
__exportStar(__webpack_require__(8734), exports);
__exportStar(__webpack_require__(49), exports);
__exportStar(__webpack_require__(8105), exports);


/***/ }),

/***/ 854:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$limit = void 0;
/**
 * Restricts the number of documents in an aggregation pipeline.
 *
 * @param collection
 * @param value
 * @param options
 * @returns {Object|*}
 */
function $limit(collection, expr, options) {
    return collection.take(expr);
}
exports.$limit = $limit;


/***/ }),

/***/ 7672:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$lookup = void 0;
var util_1 = __webpack_require__(6588);
/**
 * Performs a left outer join to another collection in the same database to filter in documents from the “joined” collection for processing.
 *
 * @param collection
 * @param expr
 * @param opt
 */
function $lookup(collection, expr, options) {
    var joinColl = (0, util_1.isString)(expr.from)
        ? options === null || options === void 0 ? void 0 : options.collectionResolver(expr.from)
        : expr.from;
    (0, util_1.assert)(joinColl instanceof Array, "'from' field must resolve to an array");
    var hash = {};
    for (var _i = 0, joinColl_1 = joinColl; _i < joinColl_1.length; _i++) {
        var obj = joinColl_1[_i];
        var k = (0, util_1.hashCode)((0, util_1.resolve)(obj, expr.foreignField), options === null || options === void 0 ? void 0 : options.hashFunction);
        hash[k] = hash[k] || [];
        hash[k].push(obj);
    }
    return collection.map(function (obj) {
        var k = (0, util_1.hashCode)((0, util_1.resolve)(obj, expr.localField), options === null || options === void 0 ? void 0 : options.hashFunction);
        var newObj = (0, util_1.into)({}, obj);
        newObj[expr.as] = hash[k] || [];
        return newObj;
    });
}
exports.$lookup = $lookup;


/***/ }),

/***/ 7533:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$match = void 0;
var query_1 = __webpack_require__(7732);
/**
 * Filters the document stream, and only allows matching documents to pass into the next pipeline stage.
 * $match uses standard MongoDB queries.
 *
 * @param collection
 * @param expr
 * @param options
 * @returns {Array|*}
 */
function $match(collection, expr, options) {
    var q = new query_1.Query(expr, options);
    return collection.filter(function (o) { return q.test(o); });
}
exports.$match = $match;


/***/ }),

/***/ 2250:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$out = void 0;
var util_1 = __webpack_require__(6588);
/**
 * Takes the documents returned by the aggregation pipeline and writes them to a specified collection.
 *
 * Unlike the $out operator in MongoDB, this operator can appear in any position in the pipeline and is
 * useful for collecting intermediate results of an aggregation operation.
 *
 * Note: Object are deep cloned for outputing regardless of the ProcessingMode.
 *
 * @param collection
 * @param expr
 * @param options
 * @returns {*}
 */
function $out(collection, expr, options) {
    var outputColl = (0, util_1.isString)(expr)
        ? options === null || options === void 0 ? void 0 : options.collectionResolver(expr)
        : expr;
    (0, util_1.assert)(outputColl instanceof Array, "expression must resolve to an array");
    return collection.map(function (o) {
        outputColl.push((0, util_1.cloneDeep)(o));
        return o; // passthrough
    });
}
exports.$out = $out;


/***/ }),

/***/ 8203:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$project = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Reshapes a document stream.
 * $project can rename, add, or remove fields as well as create computed values and sub-documents.
 *
 * @param collection
 * @param expr
 * @param opt
 * @returns {Array}
 */
function $project(collection, expr, options) {
    if ((0, util_1.isEmpty)(expr))
        return collection;
    // result collection
    var expressionKeys = Object.keys(expr);
    var idOnlyExcluded = false;
    // validate inclusion and exclusion
    validateExpression(expr, options);
    var ID_KEY = options.idKey;
    if ((0, util_1.inArray)(expressionKeys, ID_KEY)) {
        var id = expr[ID_KEY];
        if (id === 0 || id === false) {
            expressionKeys = expressionKeys.filter(util_1.notInArray.bind(null, [ID_KEY]));
            idOnlyExcluded = expressionKeys.length == 0;
        }
    }
    else {
        // if not specified the add the ID field
        expressionKeys.push(ID_KEY);
    }
    return collection.map(function (obj) {
        return processObject(obj, expr, options, expressionKeys, idOnlyExcluded);
    });
}
exports.$project = $project;
/**
 * Process the expression value for $project operators
 *
 * @param {Object} obj The object to use as options
 * @param {Object} expr The experssion object of $project operator
 * @param {Array} expressionKeys The key in the 'expr' object
 * @param {Boolean} idOnlyExcluded Boolean value indicating whether only the ID key is excluded
 */
function processObject(obj, expr, options, expressionKeys, idOnlyExcluded) {
    var newObj = {};
    var foundSlice = false;
    var foundExclusion = false;
    var dropKeys = [];
    if (idOnlyExcluded) {
        dropKeys.push(options.idKey);
    }
    var _loop_1 = function (key) {
        // final computed value of the key
        var value = undefined;
        // expression to associate with key
        var subExpr = expr[key];
        if (key !== options.idKey && (0, util_1.inArray)([0, false], subExpr)) {
            foundExclusion = true;
        }
        if (key === options.idKey && (0, util_1.isEmpty)(subExpr)) {
            // tiny optimization here to skip over id
            value = obj[key];
        }
        else if ((0, util_1.isString)(subExpr)) {
            value = (0, core_1.computeValue)(obj, subExpr, key, options);
        }
        else if ((0, util_1.inArray)([1, true], subExpr)) {
            // For direct projections, we use the resolved object value
        }
        else if (subExpr instanceof Array) {
            value = subExpr.map(function (v) {
                var r = (0, core_1.computeValue)(obj, v, null, options);
                if ((0, util_1.isNil)(r))
                    return null;
                return r;
            });
        }
        else if ((0, util_1.isObject)(subExpr)) {
            var subExprObj_1 = subExpr;
            var subExprKeys_1 = Object.keys(subExpr);
            var operator = subExprKeys_1.length == 1 ? subExprKeys_1[0] : null;
            // first try a projection operator
            var call = (0, core_1.getOperator)(core_1.OperatorType.PROJECTION, operator);
            if (call) {
                // apply the projection operator on the operator expression for the key
                if (operator === "$slice") {
                    // $slice is handled differently for aggregation and projection operations
                    if ((0, util_1.ensureArray)(subExprObj_1[operator]).every(util_1.isNumber)) {
                        // $slice for projection operation
                        value = call(obj, subExprObj_1[operator], key);
                        foundSlice = true;
                    }
                    else {
                        // $slice for aggregation operation
                        value = (0, core_1.computeValue)(obj, subExprObj_1, key, options);
                    }
                }
                else {
                    value = call(obj, subExprObj_1[operator], key, options);
                }
            }
            else if ((0, util_1.isOperator)(operator)) {
                // compute if operator key
                value = (0, core_1.computeValue)(obj, subExprObj_1[operator], operator, options);
            }
            else if ((0, util_1.has)(obj, key)) {
                // compute the value for the sub expression for the key
                validateExpression(subExprObj_1, options);
                var target = obj[key];
                if (target instanceof Array) {
                    value = target.map(function (o) {
                        return processObject(o, subExprObj_1, options, subExprKeys_1, false);
                    });
                }
                else {
                    target = (0, util_1.isObject)(target) ? target : obj;
                    value = processObject(target, subExprObj_1, options, subExprKeys_1, false);
                }
            }
            else {
                // compute the value for the sub expression for the key
                value = (0, core_1.computeValue)(obj, subExpr, null, options);
            }
        }
        else {
            dropKeys.push(key);
            return "continue";
        }
        // get value with object graph
        var objPathGraph = (0, util_1.resolveGraph)(obj, key, {
            preserveMissing: true,
        });
        // add the value at the path
        if (objPathGraph !== undefined) {
            (0, util_1.merge)(newObj, objPathGraph, {
                flatten: true,
            });
        }
        // if computed add/or remove accordingly
        if ((0, util_1.notInArray)([0, 1, false, true], subExpr)) {
            if (value === undefined) {
                (0, util_1.removeValue)(newObj, key);
            }
            else {
                (0, util_1.setValue)(newObj, key, value);
            }
        }
    };
    for (var _i = 0, expressionKeys_1 = expressionKeys; _i < expressionKeys_1.length; _i++) {
        var key = expressionKeys_1[_i];
        _loop_1(key);
    }
    // filter out all missing values preserved to support correct merging
    (0, util_1.filterMissing)(newObj);
    // For the following cases we include all keys on the object that were not explicitly excluded.
    //
    // 1. projection included $slice operator
    // 2. some fields were explicitly excluded
    // 3. only the id field was excluded
    if (foundSlice || foundExclusion || idOnlyExcluded) {
        newObj = (0, util_1.into)({}, obj, newObj);
        if (dropKeys.length > 0) {
            for (var _a = 0, dropKeys_1 = dropKeys; _a < dropKeys_1.length; _a++) {
                var k = dropKeys_1[_a];
                (0, util_1.removeValue)(newObj, k);
            }
        }
    }
    return newObj;
}
/**
 * Validate inclusion and exclusion values in expression
 *
 * @param {Object} expr The expression given for the projection
 */
function validateExpression(expr, options) {
    var check = [false, false];
    for (var _i = 0, _a = Object.entries(expr); _i < _a.length; _i++) {
        var _b = _a[_i], k = _b[0], v = _b[1];
        if (k === options.idKey)
            return;
        if (v === 0 || v === false) {
            check[0] = true;
        }
        else if (v === 1 || v === true) {
            check[1] = true;
        }
        (0, util_1.assert)(!(check[0] && check[1]), "Projection cannot have a mix of inclusion and exclusion.");
    }
}


/***/ }),

/***/ 1229:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$redact = void 0;
var core_1 = __webpack_require__(7424);
/**
 * Restricts the contents of the documents based on information stored in the documents themselves.
 *
 * https://docs.mongodb.com/manual/reference/operator/aggregation/redact/
 */
function $redact(collection, expr, options) {
    return collection.map(function (obj) { return (0, core_1.redact)(obj, expr, options); });
}
exports.$redact = $redact;


/***/ }),

/***/ 9251:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$replaceRoot = void 0;
var core_1 = __webpack_require__(7424);
var util_1 = __webpack_require__(6588);
/**
 * Replaces a document with the specified embedded document or new one.
 * The replacement document can be any valid expression that resolves to a document.
 *
 * https://docs.mongodb.com/manual/reference/operator/aggregation/replaceRoot/
 *
 * @param  {Iterator} collection
 * @param  {Object} expr
 * @param  {Object} options
 * @return {*}
 */
function $replaceRoot(collection, expr, options) {
    return collection.map(function (obj) {
        obj = (0, core_1.computeValue)(obj, expr.newRoot, null, options);
        (0, util_1.assert)((0, util_1.isObject)(obj), "$replaceRoot expression must return an object");
        return obj;
    });
}
exports.$replaceRoot = $replaceRoot;


/***/ }),

/***/ 3042:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$replaceWith = void 0;
var replaceRoot_1 = __webpack_require__(9251);
/**
 * Alias for $replaceRoot
 */
exports.$replaceWith = replaceRoot_1.$replaceRoot;


/***/ }),

/***/ 6486:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

// $sample operator -  https://docs.mongodb.com/manual/reference/operator/aggregation/sample/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$sample = void 0;
/**
 * Randomly selects the specified number of documents from its input. The given iterator must have finite values
 *
 * @param  {Iterator} collection
 * @param  {Object} expr
 * @param  {Options} options
 * @return {*}
 */
function $sample(collection, expr, options) {
    return collection.transform(function (xs) {
        var len = xs.length;
        var i = -1;
        return function () {
            if (++i === expr.size)
                return { done: true };
            var n = Math.floor(Math.random() * len);
            return { value: xs[n], done: false };
        };
    });
}
exports.$sample = $sample;


/***/ }),

/***/ 5702:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$set = void 0;
var addFields_1 = __webpack_require__(5292);
/**
 * Alias for $addFields.
 */
exports.$set = addFields_1.$addFields;


/***/ }),

/***/ 7642:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$skip = void 0;
/**
 * Skips over a specified number of documents from the pipeline and returns the rest.
 *
 * @param collection An iterator
 * @param expr
 * @param  {Options} options
 * @returns {*}
 */
function $skip(collection, expr, options) {
    return collection.drop(expr);
}
exports.$skip = $skip;


/***/ }),

/***/ 3469:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$sort = void 0;
var util_1 = __webpack_require__(6588);
/**
 * Takes all input documents and returns them in a stream of sorted documents.
 *
 * @param collection
 * @param sortKeys
 * @param  {Object} options
 * @returns {*}
 */
function $sort(collection, sortKeys, options) {
    if ((0, util_1.isEmpty)(sortKeys) || !(0, util_1.isObject)(sortKeys))
        return collection;
    var cmp = util_1.compare;
    // check for collation spec on the options
    var collationSpec = options.collation;
    // use collation comparator if provided
    if ((0, util_1.isObject)(collationSpec) && (0, util_1.isString)(collationSpec.locale)) {
        cmp = collationComparator(collationSpec);
    }
    return collection.transform(function (coll) {
        var modifiers = Object.keys(sortKeys);
        var _loop_1 = function (key) {
            var grouped = (0, util_1.groupBy)(coll, function (obj) { return (0, util_1.resolve)(obj, key); }, options === null || options === void 0 ? void 0 : options.hashFunction);
            var sortedIndex = {};
            var indexKeys = (0, util_1.sortBy)(grouped.keys, function (k, i) {
                sortedIndex[k] = i;
                return k;
            }, cmp);
            if (sortKeys[key] === -1)
                indexKeys.reverse();
            coll = [];
            for (var _b = 0, indexKeys_1 = indexKeys; _b < indexKeys_1.length; _b++) {
                var k = indexKeys_1[_b];
                (0, util_1.into)(coll, grouped.groups[sortedIndex[k]]);
            }
        };
        for (var _i = 0, _a = modifiers.reverse(); _i < _a.length; _i++) {
            var key = _a[_i];
            _loop_1(key);
        }
        return coll;
    });
}
exports.$sort = $sort;
// MongoDB collation strength to JS localeCompare sensitivity mapping.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
var COLLATION_STRENGTH = {
    // Only strings that differ in base letters compare as unequal. Examples: a ≠ b, a = á, a = A.
    1: "base",
    //  Only strings that differ in base letters or accents and other diacritic marks compare as unequal.
    // Examples: a ≠ b, a ≠ á, a = A.
    2: "accent",
    // Strings that differ in base letters, accents and other diacritic marks, or case compare as unequal.
    // Other differences may also be taken into consideration. Examples: a ≠ b, a ≠ á, a ≠ A
    3: "variant",
    // case - Only strings that differ in base letters or case compare as unequal. Examples: a ≠ b, a = á, a ≠ A.
};
/**
 * Creates a comparator function for the given collation spec. See https://docs.mongodb.com/manual/reference/collation/
 *
 * @param spec {Object} The MongoDB collation spec.
 * {
 *   locale: string,
 *   caseLevel: boolean,
 *   caseFirst: string,
 *   strength: int,
 *   numericOrdering: boolean,
 *   alternate: string,
 *   maxVariable: string, // unsupported
 *   backwards: boolean // unsupported
 * }
 */
function collationComparator(spec) {
    var localeOpt = {
        sensitivity: COLLATION_STRENGTH[spec.strength || 3],
        caseFirst: spec.caseFirst === "off" ? "false" : spec.caseFirst || "false",
        numeric: spec.numericOrdering || false,
        ignorePunctuation: spec.alternate === "shifted",
    };
    // when caseLevel is true for strength  1:base and 2:accent, bump sensitivity to the nearest that supports case comparison
    if ((spec.caseLevel || false) === true) {
        if (localeOpt.sensitivity === "base")
            localeOpt.sensitivity = "case";
        if (localeOpt.sensitivity === "accent")
            localeOpt.sensitivity = "variant";
    }
    var collator = new Intl.Collator(spec.locale, localeOpt);
    return function (a, b) {
        // non strings
        if (!(0, util_1.isString)(a) || !(0, util_1.isString)(b))
            return (0, util_1.compare)(a, b);
        // only for strings
        var i = collator.compare(a, b);
        if (i < 0)
            return -1;
        if (i > 0)
            return 1;
        return 0;
    };
}


/***/ }),

/***/ 8734:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$sortByCount = void 0;
var group_1 = __webpack_require__(4285);
var sort_1 = __webpack_require__(3469);
/**
 * Groups incoming documents based on the value of a specified expression,
 * then computes the count of documents in each distinct group.
 *
 * https://docs.mongodb.com/manual/reference/operator/aggregation/sortByCount/
 *
 * @param  {Array} collection
 * @param  {Object} expr
 * @param  {Object} options
 * @return {*}
 */
function $sortByCount(collection, expr, options) {
    var newExpr = { count: { $sum: 1 } };
    newExpr["_id"] = expr;
    return (0, sort_1.$sort)((0, group_1.$group)(collection, newExpr, options), { count: -1 }, options);
}
exports.$sortByCount = $sortByCount;


/***/ }),

/***/ 49:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$unset = void 0;
var util_1 = __webpack_require__(6588);
var project_1 = __webpack_require__(8203);
/**
 * Removes/excludes fields from documents.
 *
 * @param collection
 * @param expr
 * @param options
 * @returns {Iterator}
 */
function $unset(collection, expr, options) {
    expr = (0, util_1.ensureArray)(expr);
    var doc = {};
    for (var _i = 0, expr_1 = expr; _i < expr_1.length; _i++) {
        var k = expr_1[_i];
        doc[k] = 0;
    }
    return (0, project_1.$project)(collection, doc, options);
}
exports.$unset = $unset;


/***/ }),

/***/ 8105:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$unwind = void 0;
var lazy_1 = __webpack_require__(1088);
var util_1 = __webpack_require__(6588);
/**
 * Takes an array of documents and returns them as a stream of documents.
 *
 * @param collection
 * @param expr
 * @param options
 * @returns {Array}
 */
function $unwind(collection, expr, options) {
    if ((0, util_1.isString)(expr))
        expr = { path: expr };
    var path = expr.path;
    var field = path.substr(1);
    var includeArrayIndex = (expr === null || expr === void 0 ? void 0 : expr.includeArrayIndex) || false;
    var preserveNullAndEmptyArrays = expr.preserveNullAndEmptyArrays || false;
    var format = function (o, i) {
        if (includeArrayIndex !== false)
            o[includeArrayIndex] = i;
        return o;
    };
    var value;
    return (0, lazy_1.Lazy)(function () {
        var _loop_1 = function () {
            // take from lazy sequence if available
            if (value instanceof lazy_1.Iterator) {
                var tmp = value.next();
                if (!tmp.done)
                    return { value: tmp };
            }
            // fetch next object
            var wrapper = collection.next();
            if (wrapper.done)
                return { value: wrapper };
            // unwrap value
            var obj = wrapper.value;
            // get the value of the field to unwind
            value = (0, util_1.resolve)(obj, field);
            // throw error if value is not an array???
            if (value instanceof Array) {
                if (value.length === 0 && preserveNullAndEmptyArrays === true) {
                    value = null; // reset unwind value
                    (0, util_1.removeValue)(obj, field);
                    return { value: { value: format(obj, null), done: false } };
                }
                else {
                    // construct a lazy sequence for elements per value
                    value = (0, lazy_1.Lazy)(value).map(function (item, i) {
                        var newObj = (0, util_1.resolveGraph)(obj, field, {
                            preserveKeys: true,
                        });
                        (0, util_1.setValue)(newObj, field, item);
                        return format(newObj, i);
                    });
                }
            }
            else if (!(0, util_1.isEmpty)(value) || preserveNullAndEmptyArrays === true) {
                return { value: { value: format(obj, null), done: false } };
            }
        };
        for (;;) {
            var state_1 = _loop_1();
            if (typeof state_1 === "object")
                return state_1.value;
        }
    });
}
exports.$unwind = $unwind;


/***/ }),

/***/ 6842:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// $elemMatch operator. https://docs.mongodb.com/manual/reference/operator/projection/elemMatch/#proj._S_elemMatch
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$elemMatch = void 0;
var query_1 = __webpack_require__(7732);
var util_1 = __webpack_require__(6588);
/**
 * Projects only the first element from an array that matches the specified $elemMatch condition.
 *
 * @param obj
 * @param field
 * @param expr
 * @returns {*}
 */
function $elemMatch(obj, expr, field, options) {
    var arr = (0, util_1.resolve)(obj, field);
    var query = new query_1.Query(expr, options);
    (0, util_1.assert)(arr instanceof Array, "$elemMatch: argument must resolve to array");
    for (var i = 0; i < arr.length; i++) {
        if (query.test(arr[i]))
            return [arr[i]];
    }
    return undefined;
}
exports.$elemMatch = $elemMatch;


/***/ }),

/***/ 7086:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// Projection Operators. https://docs.mongodb.com/manual/reference/operator/projection/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(6842), exports);
__exportStar(__webpack_require__(3526), exports);


/***/ }),

/***/ 3526:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

// $slice operator. https://docs.mongodb.com/manual/reference/operator/projection/slice/#proj._S_slice
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$slice = void 0;
var util_1 = __webpack_require__(6588);
var slice_1 = __webpack_require__(78);
/**
 * Limits the number of elements projected from an array. Supports skip and limit slices.
 *
 * @param obj
 * @param field
 * @param expr
 */
function $slice(obj, expr, field, options) {
    var xs = (0, util_1.resolve)(obj, field);
    var exprAsArray = expr;
    if (!(0, util_1.isArray)(xs))
        return xs;
    return (0, slice_1.$slice)(obj, expr instanceof Array ? __spreadArray([xs], exprAsArray, true) : [xs, expr], options);
}
exports.$slice = $slice;


/***/ }),

/***/ 518:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Array Operators: https://docs.mongodb.com/manual/reference/operator/query-array/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$all = void 0;
var _predicates_1 = __webpack_require__(2344);
/**
 * Matches arrays that contain all elements specified in the query.
 */
exports.$all = (0, _predicates_1.createQueryOperator)(_predicates_1.$all);


/***/ }),

/***/ 9039:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Array Operators: https://docs.mongodb.com/manual/reference/operator/query-array/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$elemMatch = void 0;
var _predicates_1 = __webpack_require__(2344);
/**
 * Selects documents if element in the array field matches all the specified $elemMatch conditions.
 */
exports.$elemMatch = (0, _predicates_1.createQueryOperator)(_predicates_1.$elemMatch);


/***/ }),

/***/ 844:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(518), exports);
__exportStar(__webpack_require__(9039), exports);
__exportStar(__webpack_require__(9159), exports);


/***/ }),

/***/ 9159:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Array Operators: https://docs.mongodb.com/manual/reference/operator/query-array/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$size = void 0;
var _predicates_1 = __webpack_require__(2344);
/**
 * Selects documents if the array field is a specified size.
 */
exports.$size = (0, _predicates_1.createQueryOperator)(_predicates_1.$size);


/***/ }),

/***/ 7012:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createBitwiseOperator = void 0;
var _predicates_1 = __webpack_require__(2344);
var createBitwiseOperator = function (predicate) {
    return (0, _predicates_1.createQueryOperator)(function (value, mask, options) {
        var b = 0;
        if (mask instanceof Array) {
            for (var _i = 0, mask_1 = mask; _i < mask_1.length; _i++) {
                var n = mask_1[_i];
                b = b | (1 << n);
            }
        }
        else {
            b = mask;
        }
        return predicate(value & b, b);
    });
};
exports.createBitwiseOperator = createBitwiseOperator;


/***/ }),

/***/ 2604:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Bitwise Operators: https://docs.mongodb.com/manual/reference/operator/query-bitwise/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$bitsAllClear = void 0;
var _internal_1 = __webpack_require__(7012);
/**
 * Matches numeric or binary values in which a set of bit positions all have a value of 0.
 */
exports.$bitsAllClear = (0, _internal_1.createBitwiseOperator)(function (result, _) { return result == 0; });


/***/ }),

/***/ 5051:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Bitwise Operators: https://docs.mongodb.com/manual/reference/operator/query-bitwise/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$bitsAllSet = void 0;
var _internal_1 = __webpack_require__(7012);
/**
 * Matches numeric or binary values in which a set of bit positions all have a value of 1.
 */
exports.$bitsAllSet = (0, _internal_1.createBitwiseOperator)(function (result, mask) { return result == mask; });


/***/ }),

/***/ 9904:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Bitwise Operators: https://docs.mongodb.com/manual/reference/operator/query-bitwise/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$bitsAnyClear = void 0;
var _internal_1 = __webpack_require__(7012);
/**
 * Matches numeric or binary values in which any bit from a set of bit positions has a value of 0.
 */
exports.$bitsAnyClear = (0, _internal_1.createBitwiseOperator)(function (result, mask) { return result < mask; });


/***/ }),

/***/ 602:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Bitwise Operators: https://docs.mongodb.com/manual/reference/operator/query-bitwise/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$bitsAnySet = void 0;
var _internal_1 = __webpack_require__(7012);
/**
 * Matches numeric or binary values in which any bit from a set of bit positions has a value of 1.
 */
exports.$bitsAnySet = (0, _internal_1.createBitwiseOperator)(function (result, _) { return result > 0; });


/***/ }),

/***/ 1246:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$bitsAnySet = exports.$bitsAnyClear = exports.$bitsAllSet = exports.$bitsAllClear = void 0;
var bitsAllClear_1 = __webpack_require__(2604);
Object.defineProperty(exports, "$bitsAllClear", ({ enumerable: true, get: function () { return bitsAllClear_1.$bitsAllClear; } }));
var bitsAllSet_1 = __webpack_require__(5051);
Object.defineProperty(exports, "$bitsAllSet", ({ enumerable: true, get: function () { return bitsAllSet_1.$bitsAllSet; } }));
var bitsAnyClear_1 = __webpack_require__(9904);
Object.defineProperty(exports, "$bitsAnyClear", ({ enumerable: true, get: function () { return bitsAnyClear_1.$bitsAnyClear; } }));
var bitsAnySet_1 = __webpack_require__(602);
Object.defineProperty(exports, "$bitsAnySet", ({ enumerable: true, get: function () { return bitsAnySet_1.$bitsAnySet; } }));


/***/ }),

/***/ 3406:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Comparison Operators: https://docs.mongodb.com/manual/reference/operator/query-comparison/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$nin = exports.$ne = exports.$lte = exports.$lt = exports.$in = exports.$gte = exports.$gt = exports.$eq = void 0;
var _predicates_1 = __webpack_require__(2344);
/**
 * Matches values that are equal to a specified value.
 */
exports.$eq = (0, _predicates_1.createQueryOperator)(_predicates_1.$eq);
/**
 * Matches values that are greater than a specified value.
 */
exports.$gt = (0, _predicates_1.createQueryOperator)(_predicates_1.$gt);
/**
 * 	Matches values that are greater than or equal to a specified value.
 */
exports.$gte = (0, _predicates_1.createQueryOperator)(_predicates_1.$gte);
/**
 * Matches any of the values that exist in an array specified in the query.
 */
exports.$in = (0, _predicates_1.createQueryOperator)(_predicates_1.$in);
/**
 * Matches values that are less than the value specified in the query.
 */
exports.$lt = (0, _predicates_1.createQueryOperator)(_predicates_1.$lt);
/**
 * Matches values that are less than or equal to the value specified in the query.
 */
exports.$lte = (0, _predicates_1.createQueryOperator)(_predicates_1.$lte);
/**
 * Matches all values that are not equal to the value specified in the query.
 */
exports.$ne = (0, _predicates_1.createQueryOperator)(_predicates_1.$ne);
/**
 * Matches values that do not exist in an array specified to the query.
 */
exports.$nin = (0, _predicates_1.createQueryOperator)(_predicates_1.$nin);


/***/ }),

/***/ 7402:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Element Operators: https://docs.mongodb.com/manual/reference/operator/query-element/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$exists = void 0;
var _predicates_1 = __webpack_require__(2344);
/**
 * Matches documents that have the specified field.
 */
exports.$exists = (0, _predicates_1.createQueryOperator)(_predicates_1.$exists);


/***/ }),

/***/ 8252:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(7402), exports);
__exportStar(__webpack_require__(442), exports);


/***/ }),

/***/ 442:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Element Operators: https://docs.mongodb.com/manual/reference/operator/query-element/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$type = void 0;
var _predicates_1 = __webpack_require__(2344);
/**
 * Selects documents if a field is of the specified type.
 */
exports.$type = (0, _predicates_1.createQueryOperator)(_predicates_1.$type);


/***/ }),

/***/ 3597:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$expr = void 0;
var core_1 = __webpack_require__(7424);
/**
 * Allows the use of aggregation expressions within the query language.
 *
 * @param selector
 * @param value
 * @returns {Function}
 */
function $expr(selector, value, options) {
    return function (obj) { return (0, core_1.computeValue)(obj, value, null, options); };
}
exports.$expr = $expr;


/***/ }),

/***/ 5864:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(3597), exports);
__exportStar(__webpack_require__(5615), exports);
__exportStar(__webpack_require__(5971), exports);
__exportStar(__webpack_require__(9789), exports);
// $where operator is not included by default


/***/ }),

/***/ 5615:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$jsonSchema = void 0;
/**
 * Validate documents against the given JSON Schema.
 *
 * @param selector
 * @param schema
 * @returns {Function}
 */
function $jsonSchema(selector, schema, options) {
    if (!(options === null || options === void 0 ? void 0 : options.jsonSchemaValidator)) {
        throw new Error("Missing option 'jsonSchemaValidator'. Configure to use '$jsonSchema' operator.");
    }
    var validate = options === null || options === void 0 ? void 0 : options.jsonSchemaValidator(schema);
    return function (obj) { return validate(obj); };
}
exports.$jsonSchema = $jsonSchema;


/***/ }),

/***/ 5971:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$mod = void 0;
var _predicates_1 = __webpack_require__(2344);
/**
 * Performs a modulo operation on the value of a field and selects documents with a specified result.
 */
exports.$mod = (0, _predicates_1.createQueryOperator)(_predicates_1.$mod);


/***/ }),

/***/ 9789:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Evaluation Operators: https://docs.mongodb.com/manual/reference/operator/query-evaluation/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$regex = void 0;
var _predicates_1 = __webpack_require__(2344);
/**
 * Selects documents where values match a specified regular expression.
 */
exports.$regex = (0, _predicates_1.createQueryOperator)(_predicates_1.$regex);


/***/ }),

/***/ 581:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(844), exports);
__exportStar(__webpack_require__(1246), exports);
__exportStar(__webpack_require__(3406), exports);
__exportStar(__webpack_require__(8252), exports);
__exportStar(__webpack_require__(5864), exports);
__exportStar(__webpack_require__(7676), exports);


/***/ }),

/***/ 7770:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Logical Operators: https://docs.mongodb.com/manual/reference/operator/query-logical/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$and = void 0;
var query_1 = __webpack_require__(7732);
var util_1 = __webpack_require__(6588);
/**
 * Joins query clauses with a logical AND returns all documents that match the conditions of both clauses.
 *
 * @param selector
 * @param value
 * @returns {Function}
 */
function $and(selector, value, options) {
    (0, util_1.assert)((0, util_1.isArray)(value), "Invalid expression: $and expects value to be an Array");
    var queries = new Array();
    value.forEach(function (expr) { return queries.push(new query_1.Query(expr, options)); });
    return function (obj) {
        for (var i = 0; i < queries.length; i++) {
            if (!queries[i].test(obj)) {
                return false;
            }
        }
        return true;
    };
}
exports.$and = $and;


/***/ }),

/***/ 7676:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(7770), exports);
__exportStar(__webpack_require__(4538), exports);
__exportStar(__webpack_require__(5002), exports);
__exportStar(__webpack_require__(9967), exports);


/***/ }),

/***/ 4538:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Logical Operators: https://docs.mongodb.com/manual/reference/operator/query-logical/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$nor = void 0;
var util_1 = __webpack_require__(6588);
var or_1 = __webpack_require__(9967);
/**
 * Joins query clauses with a logical NOR returns all documents that fail to match both clauses.
 *
 * @param selector
 * @param value
 * @returns {Function}
 */
function $nor(selector, value, options) {
    (0, util_1.assert)((0, util_1.isArray)(value), "Invalid expression. $nor expects value to be an Array");
    var f = (0, or_1.$or)("$or", value, options);
    return function (obj) { return !f(obj); };
}
exports.$nor = $nor;


/***/ }),

/***/ 5002:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Logical Operators: https://docs.mongodb.com/manual/reference/operator/query-logical/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$not = void 0;
var query_1 = __webpack_require__(7732);
var util_1 = __webpack_require__(6588);
/**
 * Inverts the effect of a query expression and returns documents that do not match the query expression.
 *
 * @param selector
 * @param value
 * @returns {Function}
 */
function $not(selector, value, options) {
    var criteria = {};
    criteria[selector] = (0, util_1.normalize)(value);
    var query = new query_1.Query(criteria, options);
    return function (obj) { return !query.test(obj); };
}
exports.$not = $not;


/***/ }),

/***/ 9967:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

// Query Logical Operators: https://docs.mongodb.com/manual/reference/operator/query-logical/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.$or = void 0;
var query_1 = __webpack_require__(7732);
var util_1 = __webpack_require__(6588);
/**
 * Joins query clauses with a logical OR returns all documents that match the conditions of either clause.
 *
 * @param selector
 * @param value
 * @returns {Function}
 */
function $or(selector, value, options) {
    (0, util_1.assert)((0, util_1.isArray)(value), "Invalid expression. $or expects value to be an Array");
    var queries = value.map(function (expr) { return new query_1.Query(expr, options); });
    return function (obj) {
        for (var i = 0; i < queries.length; i++) {
            if (queries[i].test(obj)) {
                return true;
            }
        }
        return false;
    };
}
exports.$or = $or;


/***/ }),

/***/ 7732:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Query = void 0;
var core_1 = __webpack_require__(7424);
var cursor_1 = __webpack_require__(9537);
var util_1 = __webpack_require__(6588);
/**
 * An object used to filter input documents
 *
 * @param {Object} criteria The criteria for constructing predicates
 * @param {Options} options Options for use by operators
 * @constructor
 */
var Query = /** @class */ (function () {
    function Query(criteria, options) {
        this.criteria = criteria;
        this.options = options;
        this.options = (0, core_1.makeOptions)(options);
        this.compiled = [];
        this.compile();
    }
    Query.prototype.compile = function () {
        (0, util_1.assert)((0, util_1.isObject)(this.criteria), "query criteria must be an object");
        var whereOperator;
        for (var _i = 0, _a = Object.entries(this.criteria); _i < _a.length; _i++) {
            var _b = _a[_i], field = _b[0], expr = _b[1];
            if ("$where" === field) {
                whereOperator = { field: field, expr: expr };
            }
            else if ((0, util_1.inArray)(["$and", "$or", "$nor", "$expr", "$jsonSchema"], field)) {
                this.processOperator(field, field, expr);
            }
            else {
                // normalize expression
                (0, util_1.assert)(!(0, util_1.isOperator)(field), "unknown top level operator: " + field);
                for (var _c = 0, _d = Object.entries((0, util_1.normalize)(expr)); _c < _d.length; _c++) {
                    var _e = _d[_c], operator = _e[0], val = _e[1];
                    this.processOperator(field, operator, val);
                }
            }
            if ((0, util_1.isObject)(whereOperator)) {
                this.processOperator(whereOperator.field, whereOperator.field, whereOperator.expr);
            }
        }
    };
    Query.prototype.processOperator = function (field, operator, value) {
        var call = (0, core_1.getOperator)(core_1.OperatorType.QUERY, operator);
        (0, util_1.assert)(!!call, "unknown operator " + operator);
        var fn = call(field, value, this.options);
        this.compiled.push(fn);
    };
    /**
     * Checks if the object passes the query criteria. Returns true if so, false otherwise.
     *
     * @param obj The object to test
     * @returns {boolean} True or false
     */
    Query.prototype.test = function (obj) {
        for (var i = 0, len = this.compiled.length; i < len; i++) {
            if (!this.compiled[i](obj)) {
                return false;
            }
        }
        return true;
    };
    /**
     * Returns a cursor to select matching documents from the input source.
     *
     * @param source A source providing a sequence of documents
     * @param projection An optional projection criteria
     * @returns {Cursor} A Cursor for iterating over the results
     */
    Query.prototype.find = function (collection, projection) {
        var _this = this;
        return new cursor_1.Cursor(collection, function (x) { return _this.test(x); }, projection || {}, this.options);
    };
    /**
     * Remove matched documents from the collection returning the remainder
     *
     * @param collection An array of documents
     * @returns {Array} A new array with matching elements removed
     */
    Query.prototype.remove = function (collection) {
        var _this = this;
        return collection.reduce(function (acc, obj) {
            if (!_this.test(obj))
                acc.push(obj);
            return acc;
        }, []);
    };
    return Query;
}());
exports.Query = Query;


/***/ }),

/***/ 6588:
/***/ (function(__unused_webpack_module, exports) {

"use strict";

/**
 * Utility constants and functions
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.normalize = exports.isOperator = exports.removeValue = exports.setValue = exports.traverse = exports.filterMissing = exports.resolveGraph = exports.resolve = exports.memoize = exports.into = exports.groupBy = exports.sortBy = exports.compare = exports.hashCode = exports.unique = exports.isEqual = exports.flatten = exports.union = exports.intersection = exports.merge = exports.objectMap = exports.has = exports.ensureArray = exports.isEmpty = exports.truthy = exports.notInArray = exports.inArray = exports.isUndefined = exports.isNull = exports.isNil = exports.isFunction = exports.isRegExp = exports.isDate = exports.isObjectLike = exports.isObject = exports.isArray = exports.isNumber = exports.isString = exports.isBoolean = exports.getType = exports.cloneDeep = exports.assert = exports.BsonType = exports.JsType = exports.MIN_LONG = exports.MAX_LONG = exports.MIN_INT = exports.MAX_INT = void 0;
exports.MAX_INT = 2147483647;
exports.MIN_INT = -2147483648;
exports.MAX_LONG = Number.MAX_SAFE_INTEGER;
exports.MIN_LONG = Number.MIN_SAFE_INTEGER;
// special value to identify missing items. treated differently from undefined
var MISSING = {};
var DEFAULT_HASH_FUNC = function (value) {
    var s = encode(value);
    var hash = 0;
    var i = s.length;
    while (i)
        hash = ((hash << 5) - hash) ^ s.charCodeAt(--i);
    var code = hash >>> 0;
    return code.toString();
};
// Javascript native types
var JsType;
(function (JsType) {
    JsType["NULL"] = "null";
    JsType["UNDEFINED"] = "undefined";
    JsType["BOOLEAN"] = "boolean";
    JsType["NUMBER"] = "number";
    JsType["STRING"] = "string";
    JsType["DATE"] = "date";
    JsType["REGEXP"] = "regexp";
    JsType["ARRAY"] = "array";
    JsType["OBJECT"] = "object";
    JsType["FUNCTION"] = "function";
})(JsType = exports.JsType || (exports.JsType = {}));
// MongoDB BSON types
var BsonType;
(function (BsonType) {
    BsonType["BOOL"] = "bool";
    BsonType["INT"] = "int";
    BsonType["LONG"] = "long";
    BsonType["DOUBLE"] = "double";
    BsonType["DECIMAL"] = "decimal";
    BsonType["REGEX"] = "regex";
})(BsonType = exports.BsonType || (exports.BsonType = {}));
// no array, object, or function types
var JS_SIMPLE_TYPES = [
    JsType.NULL,
    JsType.UNDEFINED,
    JsType.BOOLEAN,
    JsType.NUMBER,
    JsType.STRING,
    JsType.DATE,
    JsType.REGEXP,
];
var OBJECT_PROTOTYPE = Object.getPrototypeOf({});
var OBJECT_TAG = "[object Object]";
var OBJECT_TYPE_RE = /^\[object ([a-zA-Z0-9]+)\]$/;
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
exports.assert = assert;
/**
 * Deep clone an object
 */
function cloneDeep(obj) {
    if (obj instanceof Array)
        return obj.map(cloneDeep);
    if (obj instanceof Date)
        return new Date(obj);
    if (isObject(obj))
        return objectMap(obj, cloneDeep);
    return obj;
}
exports.cloneDeep = cloneDeep;
/**
 * Returns the name of type as specified in the tag returned by a call to Object.prototype.toString
 * @param v A value
 */
function getType(v) {
    return OBJECT_TYPE_RE.exec(Object.prototype.toString.call(v))[1];
}
exports.getType = getType;
function isBoolean(v) {
    return typeof v === JsType.BOOLEAN;
}
exports.isBoolean = isBoolean;
function isString(v) {
    return typeof v === JsType.STRING;
}
exports.isString = isString;
function isNumber(v) {
    return !isNaN(v) && typeof v === JsType.NUMBER;
}
exports.isNumber = isNumber;
exports.isArray = Array.isArray;
function isObject(v) {
    if (!v)
        return false;
    var proto = Object.getPrototypeOf(v);
    return ((proto === OBJECT_PROTOTYPE || proto === null) &&
        OBJECT_TAG === Object.prototype.toString.call(v));
}
exports.isObject = isObject;
function isObjectLike(v) {
    return v === Object(v);
} // objects, arrays, functions, date, custom object
exports.isObjectLike = isObjectLike;
function isDate(v) {
    return v instanceof Date;
}
exports.isDate = isDate;
function isRegExp(v) {
    return v instanceof RegExp;
}
exports.isRegExp = isRegExp;
function isFunction(v) {
    return typeof v === JsType.FUNCTION;
}
exports.isFunction = isFunction;
function isNil(v) {
    return v === null || v === undefined;
}
exports.isNil = isNil;
function isNull(v) {
    return v === null;
}
exports.isNull = isNull;
function isUndefined(v) {
    return v === undefined;
}
exports.isUndefined = isUndefined;
exports.inArray = (function () {
    // if Array.includes is not supported
    if (!Array.prototype.includes) {
        return function (arr, item) {
            return isNaN(item) && !isString(item)
                ? arr.some(function (v) { return isNaN(v) && !isString(v); })
                : arr.indexOf(item) > -1;
        };
    }
    // default
    return function (arr, item) { return arr.includes(item); };
})();
function notInArray(arr, item) {
    return !(0, exports.inArray)(arr, item);
}
exports.notInArray = notInArray;
function truthy(arg) {
    return !!arg;
}
exports.truthy = truthy;
function isEmpty(x) {
    return (isNil(x) ||
        (isString(x) && !x) ||
        (x instanceof Array && x.length === 0) ||
        (isObject(x) && Object.keys(x).length === 0));
}
exports.isEmpty = isEmpty;
// ensure a value is an array or wrapped within one
function ensureArray(x) {
    return x instanceof Array ? x : [x];
}
exports.ensureArray = ensureArray;
function has(obj, prop) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, prop);
}
exports.has = has;
/**
 * Transform values in an object
 *
 * @param  {Object}   obj   An object whose values to transform
 * @param  {Function} fn The transform function
 * @return {Array|Object} Result object after applying the transform
 */
function objectMap(obj, fn) {
    var o = {};
    var objKeys = Object.keys(obj);
    for (var i = 0; i < objKeys.length; i++) {
        var k = objKeys[i];
        o[k] = fn(obj[k], k);
    }
    return o;
}
exports.objectMap = objectMap;
/**
 * Deep merge objects or arrays.
 * When the inputs have unmergeable types, the source value (right hand side) is returned.
 * If inputs are arrays of same length and all elements are mergable, elements in the same position are merged together.
 * If AnyVal of the elements are unmergeable, elements in the source are appended to the target.
 * @param target {Object|Array} the target to merge into
 * @param obj {Object|Array} the source object
 */
function merge(target, obj, options) {
    // take care of missing inputs
    if (target === MISSING)
        return obj;
    if (obj === MISSING)
        return target;
    var inputs = [target, obj];
    if (!(inputs.every(isObject) || inputs.every(exports.isArray))) {
        throw Error("mismatched types. must both be array or object");
    }
    // default options
    options = options || { flatten: false };
    if ((0, exports.isArray)(target)) {
        var result = target;
        var input = obj;
        if (options.flatten) {
            var i = 0;
            var j = 0;
            while (i < result.length && j < input.length) {
                result[i] = merge(result[i++], input[j++], options);
            }
            while (j < input.length) {
                result.push(obj[j++]);
            }
        }
        else {
            Array.prototype.push.apply(result, input);
        }
    }
    else {
        Object.keys(obj).forEach(function (k) {
            if (has(obj, k)) {
                if (has(target, k)) {
                    target[k] = merge(target[k], obj[k], options);
                }
                else {
                    target[k] = obj[k];
                }
            }
        });
    }
    return target;
}
exports.merge = merge;
/**
 * Returns the intersection between two arrays
 *
 * @param  {Array} a The first array
 * @param  {Array} b The second array
 * @param  {Function} hashFunction Custom function to hash values, default the hashCode method
 * @return {Array}    Result array
 */
function intersection(a, b, hashFunction) {
    var flipped = false;
    // we ensure the left array is always smallest
    if (a.length > b.length) {
        var t = a;
        a = b;
        b = t;
        flipped = true;
    }
    var maxSize = Math.max(a.length, b.length);
    var maxResult = Math.min(a.length, b.length);
    var lookup = a.reduce(function (memo, v, i) {
        memo[hashCode(v, hashFunction)] = i;
        return memo;
    }, {});
    var indexes = new Array();
    for (var i = 0, j = 0; i < maxSize && j < maxResult; i++) {
        var k = lookup[hashCode(b[i], hashFunction)];
        if (k !== undefined) {
            indexes.push(k);
            j++;
        }
    }
    // unless we flipped the arguments we must sort the indexes to keep stability
    if (!flipped)
        indexes.sort();
    return indexes.map(function (i) { return a[i]; });
}
exports.intersection = intersection;
/**
 * Returns the union of two arrays
 *
 * @param  {Array} xs The first array
 * @param  {Array} ys The second array
 * @return {Array}   The result array
 */
function union(xs, ys, hashFunction) {
    var hash = {};
    xs.concat(ys).forEach(function (e, i) {
        var k = hashCode(e, hashFunction);
        if (!hash[k])
            hash[k] = [e, i];
    });
    var result = Object.values(hash)
        .sort(function (a, b) { return (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0); })
        .map(function (e) { return e[0]; });
    return result;
}
exports.union = union;
/**
 * Flatten the array
 *
 * @param  {Array} xs The array to flatten
 * @param {Number} depth The number of nested lists to iterate
 */
function flatten(xs, depth) {
    var arr = [];
    function flatten2(ys, n) {
        for (var i = 0, len = ys.length; i < len; i++) {
            if ((0, exports.isArray)(ys[i]) && (n > 0 || n < 0)) {
                flatten2(ys[i], Math.max(-1, n - 1));
            }
            else {
                arr.push(ys[i]);
            }
        }
    }
    flatten2(xs, depth);
    return arr;
}
exports.flatten = flatten;
/**
 * Determine whether two values are the same or strictly equivalent
 *
 * @param  {*}  a The first value
 * @param  {*}  b The second value
 * @return {Boolean}   Result of comparison
 */
function isEqual(a, b) {
    var lhs = [a];
    var rhs = [b];
    while (lhs.length > 0) {
        a = lhs.pop();
        b = rhs.pop();
        // strictly equal must be equal.
        if (a === b)
            continue;
        // unequal types and functions cannot be equal.
        var nativeType = getType(a).toLowerCase();
        if (nativeType !== getType(b).toLowerCase() ||
            nativeType === JsType.FUNCTION) {
            return false;
        }
        // leverage toString for Date and RegExp types
        if (nativeType === JsType.ARRAY) {
            var xs = a;
            var ys = b;
            if (xs.length !== ys.length)
                return false;
            if (xs.length === ys.length && xs.length === 0)
                continue;
            into(lhs, xs);
            into(rhs, ys);
        }
        else if (nativeType === JsType.OBJECT) {
            // deep compare objects
            var ka = Object.keys(a);
            var kb = Object.keys(b);
            // check length of keys early
            if (ka.length !== kb.length)
                return false;
            // we know keys are strings so we sort before comparing
            ka.sort();
            kb.sort();
            // compare keys
            for (var i = 0, len = ka.length; i < len; i++) {
                var tempKey = ka[i];
                if (tempKey !== kb[i]) {
                    return false;
                }
                else {
                    // save later work
                    lhs.push(a[tempKey]);
                    rhs.push(b[tempKey]);
                }
            }
        }
        else {
            // compare encoded values
            if (encode(a) !== encode(b))
                return false;
        }
    }
    return lhs.length === 0;
}
exports.isEqual = isEqual;
/**
 * Return a new unique version of the collection
 * @param  {Array} xs The input collection
 * @return {Array}    A new collection with unique values
 */
function unique(xs, hashFunction) {
    var h = {};
    var arr = [];
    for (var _i = 0, xs_1 = xs; _i < xs_1.length; _i++) {
        var item = xs_1[_i];
        var k = hashCode(item, hashFunction);
        if (!has(h, k)) {
            arr.push(item);
            h[k] = 0;
        }
    }
    return arr;
}
exports.unique = unique;
/**
 * Encode value to string using a simple non-colliding stable scheme.
 *
 * @param value
 * @returns {*}
 */
function encode(value) {
    var type = getType(value).toLowerCase();
    switch (type) {
        case JsType.BOOLEAN:
        case JsType.NUMBER:
        case JsType.REGEXP:
            return value.toString();
        case JsType.STRING:
            return JSON.stringify(value);
        case JsType.DATE:
            return value.toISOString();
        case JsType.NULL:
        case JsType.UNDEFINED:
            return type;
        case JsType.ARRAY:
            return "[" + value.map(encode).join(",") + "]";
        default:
            break;
    }
    // default case
    var prefix = type === JsType.OBJECT ? "" : "" + getType(value);
    var objKeys = Object.keys(value);
    objKeys.sort();
    return (prefix + "{" +
        objKeys.map(function (k) { return encode(k) + ":" + encode(value[k]); }).join(",") +
        "}");
}
/**
 * Generate hash code
 * This selected function is the result of benchmarking various hash functions.
 * This version performs well and can hash 10^6 documents in ~3s with on average 100 collisions.
 *
 * @param value
 * @returns {number|null}
 */
function hashCode(value, hashFunction) {
    if (hashFunction === void 0) { hashFunction = DEFAULT_HASH_FUNC; }
    if (isNil(value))
        return null;
    return hashFunction(value);
}
exports.hashCode = hashCode;
/**
 * Default compare function
 * @param {*} a
 * @param {*} b
 */
function compare(a, b) {
    if (a < b)
        return -1;
    if (a > b)
        return 1;
    return 0;
}
exports.compare = compare;
/**
 * Returns a (stably) sorted copy of list, ranked in ascending order by the results of running each value through iteratee
 *
 * This implementation treats null/undefined sort keys as less than every other type
 *
 * @param {Array}   collection
 * @param {Function} keyFn The sort key function used to resolve sort keys
 * @param {Function} comparator The comparator function to use for comparing keys. Defaults to standard comparison via `compare(...)`
 * @return {Array} Returns a new sorted array by the given key and comparator function
 */
function sortBy(collection, keyFn, comparator) {
    var sorted = new Array();
    var result = new Array();
    var hash = {};
    comparator = comparator || compare;
    if (isEmpty(collection))
        return collection;
    for (var i = 0; i < collection.length; i++) {
        var obj = collection[i];
        var key = keyFn(obj, i);
        // objects with nil keys will go in first
        if (isNil(key)) {
            result.push(obj);
        }
        else {
            // null suffix to differentiate string keys from native object properties
            if (isString(key))
                key += "\0";
            if (hash[key]) {
                hash[key].push(obj);
            }
            else {
                hash[key] = [obj];
            }
            sorted.push(key);
        }
    }
    // use native array sorting but enforce stableness
    sorted.sort(comparator);
    for (var i = 0; i < sorted.length; i++) {
        into(result, hash[sorted[i]]);
    }
    return result;
}
exports.sortBy = sortBy;
/**
 * Groups the collection into sets by the returned key
 *
 * @param collection
 * @param keyFn {Function} to compute the group key of an item in the collection
 * @returns {{keys: Array, groups: Array}}
 */
function groupBy(collection, keyFn, hashFunction) {
    var result = {
        keys: new Array(),
        groups: new Array(),
    };
    var lookup = {};
    for (var _i = 0, collection_1 = collection; _i < collection_1.length; _i++) {
        var obj = collection_1[_i];
        var key = keyFn(obj);
        var hash = hashCode(key, hashFunction);
        var index = -1;
        if (lookup[hash] === undefined) {
            index = result.keys.length;
            lookup[hash] = index;
            result.keys.push(key);
            result.groups.push([]);
        }
        index = lookup[hash];
        result.groups[index].push(obj);
    }
    return result;
}
exports.groupBy = groupBy;
// max elements to push.
// See argument limit https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply
var MAX_ARRAY_PUSH = 50000;
/**
 * Merge elements into the dest
 *
 * @param {*} target The target object
 * @param {*} rest The array of elements to merge into dest
 */
function into(target) {
    var rest = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        rest[_i - 1] = arguments[_i];
    }
    if (target instanceof Array) {
        return rest.reduce(function (acc, arr) {
            // push arrary in batches to handle large inputs
            var i = Math.ceil(arr.length / MAX_ARRAY_PUSH);
            var begin = 0;
            while (i-- > 0) {
                Array.prototype.push.apply(acc, arr.slice(begin, begin + MAX_ARRAY_PUSH));
                begin += MAX_ARRAY_PUSH;
            }
            return acc;
        }, target);
    }
    else if (isObject(target)) {
        // merge objects. same behaviour as Object.assign
        return rest.filter(isObjectLike).reduce(function (acc, item) {
            Object.assign(acc, item);
            return acc;
        }, target);
    }
    return null;
}
exports.into = into;
/**
 * This is a generic memoization function
 *
 * This implementation uses a cache independent of the function being memoized
 * to allow old values to be garbage collected when the memoized function goes out of scope.
 *
 * @param {*} fn The function object to memoize
 */
function memoize(fn, hashFunction) {
    var _this = this;
    return (function (memo) {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var key = hashCode(args, hashFunction);
            if (!has(memo, key)) {
                memo[key] = fn.apply(_this, args);
            }
            return memo[key];
        };
    })({
    /* storage */
    });
}
exports.memoize = memoize;
// mingo internal
/**
 * Retrieve the value of a given key on an object
 * @param obj
 * @param key
 * @returns {*}
 * @private
 */
function getValue(obj, key) {
    return isObjectLike(obj) ? obj[key] : undefined;
}
/**
 * Unwrap a single element array to specified depth
 * @param {Array} arr
 * @param {Number} depth
 */
function unwrap(arr, depth) {
    if (depth < 1)
        return arr;
    while (depth-- && arr.length === 1)
        arr = arr[0];
    return arr;
}
/**
 * Resolve the value of the field (dot separated) on the given object
 * @param obj {Object} the object context
 * @param selector {String} dot separated path to field
 * @returns {*}
 */
function resolve(obj, selector, options) {
    var depth = 0;
    // options
    options = options || { unwrapArray: false };
    function resolve2(o, path) {
        var value = o;
        var _loop_1 = function (i) {
            var field = path[i];
            var isText = /^\d+$/.exec(field) === null;
            // using instanceof to aid typescript compiler
            if (isText && value instanceof Array) {
                // On the first iteration, we check if we received a stop flag.
                // If so, we stop to prevent iterating over a nested array value
                // on consecutive object keys in the selector.
                if (i === 0 && depth > 0)
                    return "break";
                depth += 1;
                // only look at the rest of the path
                var subpath_1 = path.slice(i);
                value = value.reduce(function (acc, item) {
                    var v = resolve2(item, subpath_1);
                    if (v !== undefined)
                        acc.push(v);
                    return acc;
                }, []);
                return "break";
            }
            else {
                value = getValue(value, field);
            }
            if (value === undefined)
                return "break";
        };
        for (var i = 0; i < path.length; i++) {
            var state_1 = _loop_1(i);
            if (state_1 === "break")
                break;
        }
        return value;
    }
    var result = (0, exports.inArray)(JS_SIMPLE_TYPES, getType(obj).toLowerCase())
        ? obj
        : resolve2(obj, selector.split("."));
    return result instanceof Array && options.unwrapArray
        ? unwrap(result, depth)
        : result;
}
exports.resolve = resolve;
/**
 * Returns the full object to the resolved value given by the selector.
 * This function excludes empty values as they aren't practically useful.
 *
 * @param obj {Object} the object context
 * @param selector {String} dot separated path to field
 */
function resolveGraph(obj, selector, options) {
    // options
    if (options === undefined) {
        options = { preserveMissing: false };
    }
    var names = selector.split(".");
    var key = names[0];
    // get the next part of the selector
    var next = names.slice(1).join(".");
    var isIndex = /^\d+$/.exec(key) !== null;
    var hasNext = names.length > 1;
    var result;
    var value;
    if (obj instanceof Array) {
        if (isIndex) {
            result = getValue(obj, Number(key));
            if (hasNext) {
                result = resolveGraph(result, next, options);
            }
            result = [result];
        }
        else {
            result = [];
            for (var _i = 0, obj_1 = obj; _i < obj_1.length; _i++) {
                var item = obj_1[_i];
                value = resolveGraph(item, selector, options);
                if (options.preserveMissing) {
                    if (value === undefined) {
                        value = MISSING;
                    }
                    result.push(value);
                }
                else if (value !== undefined) {
                    result.push(value);
                }
            }
        }
    }
    else {
        value = getValue(obj, key);
        if (hasNext) {
            value = resolveGraph(value, next, options);
        }
        if (value === undefined)
            return undefined;
        result = options.preserveKeys ? __assign({}, obj) : {};
        result[key] = value;
    }
    return result;
}
exports.resolveGraph = resolveGraph;
/**
 * Filter out all MISSING values from the object in-place
 *
 * @param obj The object to filter
 */
function filterMissing(obj) {
    if (obj instanceof Array) {
        for (var i = obj.length - 1; i >= 0; i--) {
            if (obj[i] === MISSING) {
                obj.splice(i, 1);
            }
            else {
                filterMissing(obj[i]);
            }
        }
    }
    else if (isObject(obj)) {
        for (var k in obj) {
            if (has(obj, k)) {
                filterMissing(obj[k]);
            }
        }
    }
}
exports.filterMissing = filterMissing;
/**
 * Walk the object graph and execute the given transform function
 *
 * @param  {Object|Array} obj   The object to traverse
 * @param  {String} selector    The selector
 * @param  {Function} fn Function to execute for value at the end the traversal
 * @param  {Boolean} force Force generating missing parts of object graph
 * @return {*}
 */
function traverse(obj, selector, fn, force) {
    var names = selector.split(".");
    var key = names[0];
    var next = names.slice(1).join(".");
    if (names.length === 1) {
        fn(obj, key);
    }
    else {
        // force the rest of the graph while traversing
        if (force === true && isNil(obj[key])) {
            obj[key] = {};
        }
        traverse(obj[key], next, fn, force);
    }
}
exports.traverse = traverse;
/**
 * Set the value of the given object field
 *
 * @param obj {Object|Array} the object context
 * @param selector {String} path to field
 * @param value {*} the value to set
 */
function setValue(obj, selector, value) {
    traverse(obj, selector, function (item, key) {
        item[key] = value;
    }, true);
}
exports.setValue = setValue;
/**
 * Removes an element from the container.
 * If the selector resolves to an array and the leaf is a non-numeric key,
 * the remove operation will be performed on objects of the array.
 *
 * @param obj {ArrayOrObject} object or array
 * @param selector {String} dot separated path to element to remove
 */
function removeValue(obj, selector) {
    traverse(obj, selector, function (item, key) {
        if (item instanceof Array) {
            if (/^\d+$/.test(key)) {
                item.splice(parseInt(key), 1);
            }
            else {
                for (var _i = 0, item_1 = item; _i < item_1.length; _i++) {
                    var elem = item_1[_i];
                    if (isObject(elem)) {
                        delete elem[key];
                    }
                }
            }
        }
        else if (isObject(item)) {
            delete item[key];
        }
    });
}
exports.removeValue = removeValue;
var OPERATOR_NAME_PATTERN = /^\$[a-zA-Z0-9_]+$/;
/**
 * Check whether the given name passes for an operator. We assume AnyVal field name starting with '$' is an operator.
 * This is cheap and safe to do since keys beginning with '$' should be reserved for internal use.
 * @param {String} name
 */
function isOperator(name) {
    return OPERATOR_NAME_PATTERN.test(name);
}
exports.isOperator = isOperator;
/**
 * Simplify expression for easy evaluation with query operators map
 * @param expr
 * @returns {*}
 */
function normalize(expr) {
    // normalized primitives
    if ((0, exports.inArray)(JS_SIMPLE_TYPES, getType(expr).toLowerCase())) {
        return isRegExp(expr) ? { $regex: expr } : { $eq: expr };
    }
    // normalize object expression. using ObjectLike handles custom types
    if (isObjectLike(expr)) {
        // no valid query operator found, so we do simple comparison
        if (!Object.keys(expr).some(isOperator)) {
            return { $eq: expr };
        }
        // ensure valid regex
        if (has(expr, "$regex")) {
            return {
                $regex: new RegExp(expr["$regex"], expr["$options"]),
            };
        }
    }
    return expr;
}
exports.normalize = normalize;


/***/ }),

/***/ 1528:
/***/ (function(module, exports) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (root, factory) {
  'use strict'

  /*istanbul ignore next:cant test*/
  if ( true && typeof module.exports === 'object') {
    module.exports = factory()
  } else if (true) {
    // AMD. Register as an anonymous module.
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))
  } else {}
})(this, function () {
  'use strict'

  var toStr = Object.prototype.toString

  function hasOwnProperty (obj, prop) {
    if (obj == null) {
      return false
    }
    //to handle objects with null prototypes (too edge case?)
    return Object.prototype.hasOwnProperty.call(obj, prop)
  }

  function isEmpty (value) {
    if (!value) {
      return true
    }
    if (isArray(value) && value.length === 0) {
      return true
    } else if (typeof value !== 'string') {
      for (var i in value) {
        if (hasOwnProperty(value, i)) {
          return false
        }
      }
      return true
    }
    return false
  }

  function toString (type) {
    return toStr.call(type)
  }

  function isObject (obj) {
    return typeof obj === 'object' && toString(obj) === '[object Object]'
  }

  var isArray = Array.isArray || function (obj) {
    /*istanbul ignore next:cant test*/
    return toStr.call(obj) === '[object Array]'
  }

  function isBoolean (obj) {
    return typeof obj === 'boolean' || toString(obj) === '[object Boolean]'
  }

  function getKey (key) {
    var intKey = parseInt(key)
    if (intKey.toString() === key) {
      return intKey
    }
    return key
  }

  function factory (options) {
    options = options || {}

    var objectPath = function (obj) {
      return Object.keys(objectPath).reduce(function (proxy, prop) {
        if (prop === 'create') {
          return proxy
        }

        /*istanbul ignore else*/
        if (typeof objectPath[prop] === 'function') {
          proxy[prop] = objectPath[prop].bind(objectPath, obj)
        }

        return proxy
      }, {})
    }

    var hasShallowProperty
    if (options.includeInheritedProps) {
      hasShallowProperty = function () {
        return true
      }
    } else {
      hasShallowProperty = function (obj, prop) {
        return (typeof prop === 'number' && Array.isArray(obj)) || hasOwnProperty(obj, prop)
      }
    }

    function getShallowProperty (obj, prop) {
      if (hasShallowProperty(obj, prop)) {
        return obj[prop]
      }
    }

    var getShallowPropertySafely
    if (options.includeInheritedProps) {
      getShallowPropertySafely = function (obj, currentPath) {
        if (typeof currentPath !== 'string' && typeof currentPath !== 'number') {
          currentPath = String(currentPath)
        }
        var currentValue = getShallowProperty(obj, currentPath)
        if (currentPath === '__proto__' || currentPath === 'prototype' ||
          (currentPath === 'constructor' && typeof currentValue === 'function')) {
          throw new Error('For security reasons, object\'s magic properties cannot be set')
        }
        return currentValue
      }
    } else {
      getShallowPropertySafely = function (obj, currentPath) {
        return getShallowProperty(obj, currentPath)
      }
    }

    function set (obj, path, value, doNotReplace) {
      if (typeof path === 'number') {
        path = [path]
      }
      if (!path || path.length === 0) {
        return obj
      }
      if (typeof path === 'string') {
        return set(obj, path.split('.').map(getKey), value, doNotReplace)
      }
      var currentPath = path[0]
      var currentValue = getShallowPropertySafely(obj, currentPath)
      if (path.length === 1) {
        if (currentValue === void 0 || !doNotReplace) {
          obj[currentPath] = value
        }
        return currentValue
      }

      if (currentValue === void 0) {
        //check if we assume an array
        if (typeof path[1] === 'number') {
          obj[currentPath] = []
        } else {
          obj[currentPath] = {}
        }
      }

      return set(obj[currentPath], path.slice(1), value, doNotReplace)
    }

    objectPath.has = function (obj, path) {
      if (typeof path === 'number') {
        path = [path]
      } else if (typeof path === 'string') {
        path = path.split('.')
      }

      if (!path || path.length === 0) {
        return !!obj
      }

      for (var i = 0; i < path.length; i++) {
        var j = getKey(path[i])

        if ((typeof j === 'number' && isArray(obj) && j < obj.length) ||
          (options.includeInheritedProps ? (j in Object(obj)) : hasOwnProperty(obj, j))) {
          obj = obj[j]
        } else {
          return false
        }
      }

      return true
    }

    objectPath.ensureExists = function (obj, path, value) {
      return set(obj, path, value, true)
    }

    objectPath.set = function (obj, path, value, doNotReplace) {
      return set(obj, path, value, doNotReplace)
    }

    objectPath.insert = function (obj, path, value, at) {
      var arr = objectPath.get(obj, path)
      at = ~~at
      if (!isArray(arr)) {
        arr = []
        objectPath.set(obj, path, arr)
      }
      arr.splice(at, 0, value)
    }

    objectPath.empty = function (obj, path) {
      if (isEmpty(path)) {
        return void 0
      }
      if (obj == null) {
        return void 0
      }

      var value, i
      if (!(value = objectPath.get(obj, path))) {
        return void 0
      }

      if (typeof value === 'string') {
        return objectPath.set(obj, path, '')
      } else if (isBoolean(value)) {
        return objectPath.set(obj, path, false)
      } else if (typeof value === 'number') {
        return objectPath.set(obj, path, 0)
      } else if (isArray(value)) {
        value.length = 0
      } else if (isObject(value)) {
        for (i in value) {
          if (hasShallowProperty(value, i)) {
            delete value[i]
          }
        }
      } else {
        return objectPath.set(obj, path, null)
      }
    }

    objectPath.push = function (obj, path /*, values */) {
      var arr = objectPath.get(obj, path)
      if (!isArray(arr)) {
        arr = []
        objectPath.set(obj, path, arr)
      }

      arr.push.apply(arr, Array.prototype.slice.call(arguments, 2))
    }

    objectPath.coalesce = function (obj, paths, defaultValue) {
      var value

      for (var i = 0, len = paths.length; i < len; i++) {
        if ((value = objectPath.get(obj, paths[i])) !== void 0) {
          return value
        }
      }

      return defaultValue
    }

    objectPath.get = function (obj, path, defaultValue) {
      if (typeof path === 'number') {
        path = [path]
      }
      if (!path || path.length === 0) {
        return obj
      }
      if (obj == null) {
        return defaultValue
      }
      if (typeof path === 'string') {
        return objectPath.get(obj, path.split('.'), defaultValue)
      }

      var currentPath = getKey(path[0])
      var nextObj = getShallowPropertySafely(obj, currentPath)
      if (nextObj === void 0) {
        return defaultValue
      }

      if (path.length === 1) {
        return nextObj
      }

      return objectPath.get(obj[currentPath], path.slice(1), defaultValue)
    }

    objectPath.del = function del (obj, path) {
      if (typeof path === 'number') {
        path = [path]
      }

      if (obj == null) {
        return obj
      }

      if (isEmpty(path)) {
        return obj
      }
      if (typeof path === 'string') {
        return objectPath.del(obj, path.split('.'))
      }

      var currentPath = getKey(path[0])
      getShallowPropertySafely(obj, currentPath)
      if (!hasShallowProperty(obj, currentPath)) {
        return obj
      }

      if (path.length === 1) {
        if (isArray(obj)) {
          obj.splice(currentPath, 1)
        } else {
          delete obj[currentPath]
        }
      } else {
        return objectPath.del(obj[currentPath], path.slice(1))
      }

      return obj
    }

    return objectPath
  }

  var mod = factory()
  mod.create = factory
  mod.withInheritedProps = factory({includeInheritedProps: true})
  return mod
})


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";

// UNUSED EXPORTS: test

;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/createClass.js
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}
;// CONCATENATED MODULE: ./node_modules/custom-idle-queue/dist/es/index.js
/**
 * Creates a new Idle-Queue
 * @constructor
 * @param {number} [parallels=1] amount of parrallel runs of the limited-ressource
 */
var IdleQueue = function IdleQueue() {
  var parallels = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  this._parallels = parallels || 1;
  /**
   * _queueCounter
   * each lock() increased this number
   * each unlock() decreases this number
   * If _qC==0, the state is in idle
   * @type {Number}
   */

  this._qC = 0;
  /**
   * _idleCalls
   * contains all promises that where added via requestIdlePromise()
   * and not have been resolved
   * @type {Set<Promise>} _iC with oldest promise first
   */

  this._iC = new Set();
  /**
   * _lastHandleNumber
   * @type {Number}
   */

  this._lHN = 0;
  /**
   * _handlePromiseMap
   * Contains the handleNumber on the left
   * And the assigned promise on the right.
   * This is stored so you can use cancelIdleCallback(handleNumber)
   * to stop executing the callback.
   * @type {Map<Number><Promise>}
   */

  this._hPM = new Map();
  this._pHM = new Map(); // _promiseHandleMap
};
IdleQueue.prototype = {
  isIdle: function isIdle() {
    return this._qC < this._parallels;
  },

  /**
   * creates a lock in the queue
   * and returns an unlock-function to remove the lock from the queue
   * @return {function} unlock function than must be called afterwards
   */
  lock: function lock() {
    this._qC++;
  },
  unlock: function unlock() {
    this._qC--;

    _tryIdleCall(this);
  },

  /**
   * wraps a function with lock/unlock and runs it
   * @param  {function}  fun
   * @return {Promise<any>}
   */
  wrapCall: function wrapCall(fun) {
    var _this = this;

    this.lock();
    var maybePromise;

    try {
      maybePromise = fun();
    } catch (err) {
      this.unlock();
      throw err;
    }

    if (!maybePromise.then || typeof maybePromise.then !== 'function') {
      // no promise
      this.unlock();
      return maybePromise;
    } else {
      // promise
      return maybePromise.then(function (ret) {
        // sucessfull -> unlock before return
        _this.unlock();

        return ret;
      })["catch"](function (err) {
        // not sucessfull -> unlock before throwing
        _this.unlock();

        throw err;
      });
    }
  },

  /**
   * does the same as requestIdleCallback() but uses promises instead of the callback
   * @param {{timeout?: number}} options like timeout
   * @return {Promise<void>} promise that resolves when the database is in idle-mode
   */
  requestIdlePromise: function requestIdlePromise(options) {
    var _this2 = this;

    options = options || {};
    var resolve;
    var prom = new Promise(function (res) {
      return resolve = res;
    });

    var resolveFromOutside = function resolveFromOutside() {
      _removeIdlePromise(_this2, prom);

      resolve();
    };

    prom._manRes = resolveFromOutside;

    if (options.timeout) {
      // if timeout has passed, resolve promise even if not idle
      var timeoutObj = setTimeout(function () {
        prom._manRes();
      }, options.timeout);
      prom._timeoutObj = timeoutObj;
    }

    this._iC.add(prom);

    _tryIdleCall(this);

    return prom;
  },

  /**
   * remove the promise so it will never be resolved
   * @param  {Promise} promise from requestIdlePromise()
   * @return {void}
   */
  cancelIdlePromise: function cancelIdlePromise(promise) {
    _removeIdlePromise(this, promise);
  },

  /**
   * api equal to
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
   * @param  {Function} callback
   * @param  {options}   options  [description]
   * @return {number} handle which can be used with cancelIdleCallback()
   */
  requestIdleCallback: function requestIdleCallback(callback, options) {
    var handle = this._lHN++;
    var promise = this.requestIdlePromise(options);

    this._hPM.set(handle, promise);

    this._pHM.set(promise, handle);

    promise.then(function () {
      return callback();
    });
    return handle;
  },

  /**
   * API equal to
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelIdleCallback
   * @param  {number} handle returned from requestIdleCallback()
   * @return {void}
   */
  cancelIdleCallback: function cancelIdleCallback(handle) {
    var promise = this._hPM.get(handle);

    this.cancelIdlePromise(promise);
  },

  /**
   * clears and resets everything
   * @return {void}
   */
  clear: function clear() {
    var _this3 = this;

    // remove all non-cleared
    this._iC.forEach(function (promise) {
      return _removeIdlePromise(_this3, promise);
    });

    this._qC = 0;

    this._iC.clear();

    this._hPM = new Map();
    this._pHM = new Map();
  }
};
/**
 * processes the oldest call of the idleCalls-queue
 * @return {Promise<void>}
 */

function _resolveOneIdleCall(idleQueue) {
  if (idleQueue._iC.size === 0) return;

  var iterator = idleQueue._iC.values();

  var oldestPromise = iterator.next().value;

  oldestPromise._manRes(); // try to call the next tick


  setTimeout(function () {
    return _tryIdleCall(idleQueue);
  }, 0);
}
/**
 * removes the promise from the queue and maps and also its corresponding handle-number
 * @param  {Promise} promise from requestIdlePromise()
 * @return {void}
 */


function _removeIdlePromise(idleQueue, promise) {
  if (!promise) return; // remove timeout if exists

  if (promise._timeoutObj) clearTimeout(promise._timeoutObj); // remove handle-nr if exists

  if (idleQueue._pHM.has(promise)) {
    var handle = idleQueue._pHM.get(promise);

    idleQueue._hPM["delete"](handle);

    idleQueue._pHM["delete"](promise);
  } // remove from queue


  idleQueue._iC["delete"](promise);
}
/**
 * resolves the last entry of this._iC
 * but only if the queue is empty
 * @return {Promise}
 */


function _tryIdleCall(idleQueue) {
  // ensure this does not run in parallel
  if (idleQueue._tryIR || idleQueue._iC.size === 0) return;
  idleQueue._tryIR = true; // w8 one tick

  setTimeout(function () {
    // check if queue empty
    if (!idleQueue.isIdle()) {
      idleQueue._tryIR = false;
      return;
    }
    /**
     * wait 1 tick here
     * because many functions do IO->CPU->IO
     * which means the queue is empty for a short time
     * but the ressource is not idle
     */


    setTimeout(function () {
      // check if queue still empty
      if (!idleQueue.isIdle()) {
        idleQueue._tryIR = false;
        return;
      } // ressource is idle


      _resolveOneIdleCall(idleQueue);

      idleQueue._tryIR = false;
    }, 0);
  }, 0);
}
// EXTERNAL MODULE: ./node_modules/clone/clone.js
var clone_clone = __webpack_require__(6313);
var clone_default = /*#__PURE__*/__webpack_require__.n(clone_clone);
// EXTERNAL MODULE: ./node_modules/is-electron/index.js
var is_electron = __webpack_require__(9134);
var is_electron_default = /*#__PURE__*/__webpack_require__.n(is_electron);
;// CONCATENATED MODULE: ./node_modules/js-base64/base64.mjs
/**
 *  base64.ts
 *
 *  Licensed under the BSD 3-Clause License.
 *    http://opensource.org/licenses/BSD-3-Clause
 *
 *  References:
 *    http://en.wikipedia.org/wiki/Base64
 *
 * @author Dan Kogai (https://github.com/dankogai)
 */
const version = '3.7.2';
/**
 * @deprecated use lowercase `version`.
 */
const VERSION = version;
const _hasatob = typeof atob === 'function';
const _hasbtoa = typeof btoa === 'function';
const _hasBuffer = typeof Buffer === 'function';
const _TD = typeof TextDecoder === 'function' ? new TextDecoder() : undefined;
const _TE = typeof TextEncoder === 'function' ? new TextEncoder() : undefined;
const b64ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const b64chs = Array.prototype.slice.call(b64ch);
const b64tab = ((a) => {
    let tab = {};
    a.forEach((c, i) => tab[c] = i);
    return tab;
})(b64chs);
const b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
const _fromCC = String.fromCharCode.bind(String);
const _U8Afrom = typeof Uint8Array.from === 'function'
    ? Uint8Array.from.bind(Uint8Array)
    : (it, fn = (x) => x) => new Uint8Array(Array.prototype.slice.call(it, 0).map(fn));
const _mkUriSafe = (src) => src
    .replace(/=/g, '').replace(/[+\/]/g, (m0) => m0 == '+' ? '-' : '_');
const _tidyB64 = (s) => s.replace(/[^A-Za-z0-9\+\/]/g, '');
/**
 * polyfill version of `btoa`
 */
const btoaPolyfill = (bin) => {
    // console.log('polyfilled');
    let u32, c0, c1, c2, asc = '';
    const pad = bin.length % 3;
    for (let i = 0; i < bin.length;) {
        if ((c0 = bin.charCodeAt(i++)) > 255 ||
            (c1 = bin.charCodeAt(i++)) > 255 ||
            (c2 = bin.charCodeAt(i++)) > 255)
            throw new TypeError('invalid character found');
        u32 = (c0 << 16) | (c1 << 8) | c2;
        asc += b64chs[u32 >> 18 & 63]
            + b64chs[u32 >> 12 & 63]
            + b64chs[u32 >> 6 & 63]
            + b64chs[u32 & 63];
    }
    return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
};
/**
 * does what `window.btoa` of web browsers do.
 * @param {String} bin binary string
 * @returns {string} Base64-encoded string
 */
const _btoa = _hasbtoa ? (bin) => btoa(bin)
    : _hasBuffer ? (bin) => Buffer.from(bin, 'binary').toString('base64')
        : btoaPolyfill;
const _fromUint8Array = _hasBuffer
    ? (u8a) => Buffer.from(u8a).toString('base64')
    : (u8a) => {
        // cf. https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string/12713326#12713326
        const maxargs = 0x1000;
        let strs = [];
        for (let i = 0, l = u8a.length; i < l; i += maxargs) {
            strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
        }
        return _btoa(strs.join(''));
    };
/**
 * converts a Uint8Array to a Base64 string.
 * @param {boolean} [urlsafe] URL-and-filename-safe a la RFC4648 §5
 * @returns {string} Base64 string
 */
const fromUint8Array = (u8a, urlsafe = false) => urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a);
// This trick is found broken https://github.com/dankogai/js-base64/issues/130
// const utob = (src: string) => unescape(encodeURIComponent(src));
// reverting good old fationed regexp
const cb_utob = (c) => {
    if (c.length < 2) {
        var cc = c.charCodeAt(0);
        return cc < 0x80 ? c
            : cc < 0x800 ? (_fromCC(0xc0 | (cc >>> 6))
                + _fromCC(0x80 | (cc & 0x3f)))
                : (_fromCC(0xe0 | ((cc >>> 12) & 0x0f))
                    + _fromCC(0x80 | ((cc >>> 6) & 0x3f))
                    + _fromCC(0x80 | (cc & 0x3f)));
    }
    else {
        var cc = 0x10000
            + (c.charCodeAt(0) - 0xD800) * 0x400
            + (c.charCodeAt(1) - 0xDC00);
        return (_fromCC(0xf0 | ((cc >>> 18) & 0x07))
            + _fromCC(0x80 | ((cc >>> 12) & 0x3f))
            + _fromCC(0x80 | ((cc >>> 6) & 0x3f))
            + _fromCC(0x80 | (cc & 0x3f)));
    }
};
const re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
/**
 * @deprecated should have been internal use only.
 * @param {string} src UTF-8 string
 * @returns {string} UTF-16 string
 */
const utob = (u) => u.replace(re_utob, cb_utob);
//
const _encode = _hasBuffer
    ? (s) => Buffer.from(s, 'utf8').toString('base64')
    : _TE
        ? (s) => _fromUint8Array(_TE.encode(s))
        : (s) => _btoa(utob(s));
/**
 * converts a UTF-8-encoded string to a Base64 string.
 * @param {boolean} [urlsafe] if `true` make the result URL-safe
 * @returns {string} Base64 string
 */
const base64_encode = (src, urlsafe = false) => urlsafe
    ? _mkUriSafe(_encode(src))
    : _encode(src);
/**
 * converts a UTF-8-encoded string to URL-safe Base64 RFC4648 §5.
 * @returns {string} Base64 string
 */
const base64_encodeURI = (src) => base64_encode(src, true);
// This trick is found broken https://github.com/dankogai/js-base64/issues/130
// const btou = (src: string) => decodeURIComponent(escape(src));
// reverting good old fationed regexp
const re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
const cb_btou = (cccc) => {
    switch (cccc.length) {
        case 4:
            var cp = ((0x07 & cccc.charCodeAt(0)) << 18)
                | ((0x3f & cccc.charCodeAt(1)) << 12)
                | ((0x3f & cccc.charCodeAt(2)) << 6)
                | (0x3f & cccc.charCodeAt(3)), offset = cp - 0x10000;
            return (_fromCC((offset >>> 10) + 0xD800)
                + _fromCC((offset & 0x3FF) + 0xDC00));
        case 3:
            return _fromCC(((0x0f & cccc.charCodeAt(0)) << 12)
                | ((0x3f & cccc.charCodeAt(1)) << 6)
                | (0x3f & cccc.charCodeAt(2)));
        default:
            return _fromCC(((0x1f & cccc.charCodeAt(0)) << 6)
                | (0x3f & cccc.charCodeAt(1)));
    }
};
/**
 * @deprecated should have been internal use only.
 * @param {string} src UTF-16 string
 * @returns {string} UTF-8 string
 */
const btou = (b) => b.replace(re_btou, cb_btou);
/**
 * polyfill version of `atob`
 */
const atobPolyfill = (asc) => {
    // console.log('polyfilled');
    asc = asc.replace(/\s+/g, '');
    if (!b64re.test(asc))
        throw new TypeError('malformed base64.');
    asc += '=='.slice(2 - (asc.length & 3));
    let u24, bin = '', r1, r2;
    for (let i = 0; i < asc.length;) {
        u24 = b64tab[asc.charAt(i++)] << 18
            | b64tab[asc.charAt(i++)] << 12
            | (r1 = b64tab[asc.charAt(i++)]) << 6
            | (r2 = b64tab[asc.charAt(i++)]);
        bin += r1 === 64 ? _fromCC(u24 >> 16 & 255)
            : r2 === 64 ? _fromCC(u24 >> 16 & 255, u24 >> 8 & 255)
                : _fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
    }
    return bin;
};
/**
 * does what `window.atob` of web browsers do.
 * @param {String} asc Base64-encoded string
 * @returns {string} binary string
 */
const _atob = _hasatob ? (asc) => atob(_tidyB64(asc))
    : _hasBuffer ? (asc) => Buffer.from(asc, 'base64').toString('binary')
        : atobPolyfill;
//
const _toUint8Array = _hasBuffer
    ? (a) => _U8Afrom(Buffer.from(a, 'base64'))
    : (a) => _U8Afrom(_atob(a), c => c.charCodeAt(0));
/**
 * converts a Base64 string to a Uint8Array.
 */
const toUint8Array = (a) => _toUint8Array(_unURI(a));
//
const _decode = _hasBuffer
    ? (a) => Buffer.from(a, 'base64').toString('utf8')
    : _TD
        ? (a) => _TD.decode(_toUint8Array(a))
        : (a) => btou(_atob(a));
const _unURI = (a) => _tidyB64(a.replace(/[-_]/g, (m0) => m0 == '-' ? '+' : '/'));
/**
 * converts a Base64 string to a UTF-8 string.
 * @param {String} src Base64 string.  Both normal and URL-safe are supported
 * @returns {string} UTF-8 string
 */
const base64_decode = (src) => _decode(_unURI(src));
/**
 * check if a value is a valid Base64 string
 * @param {String} src a value to check
  */
const isValid = (src) => {
    if (typeof src !== 'string')
        return false;
    const s = src.replace(/\s+/g, '').replace(/={0,2}$/, '');
    return !/[^\s0-9a-zA-Z\+/]/.test(s) || !/[^\s0-9a-zA-Z\-_]/.test(s);
};
//
const _noEnum = (v) => {
    return {
        value: v, enumerable: false, writable: true, configurable: true
    };
};
/**
 * extend String.prototype with relevant methods
 */
const extendString = function () {
    const _add = (name, body) => Object.defineProperty(String.prototype, name, _noEnum(body));
    _add('fromBase64', function () { return base64_decode(this); });
    _add('toBase64', function (urlsafe) { return base64_encode(this, urlsafe); });
    _add('toBase64URI', function () { return base64_encode(this, true); });
    _add('toBase64URL', function () { return base64_encode(this, true); });
    _add('toUint8Array', function () { return toUint8Array(this); });
};
/**
 * extend Uint8Array.prototype with relevant methods
 */
const extendUint8Array = function () {
    const _add = (name, body) => Object.defineProperty(Uint8Array.prototype, name, _noEnum(body));
    _add('toBase64', function (urlsafe) { return fromUint8Array(this, urlsafe); });
    _add('toBase64URI', function () { return fromUint8Array(this, true); });
    _add('toBase64URL', function () { return fromUint8Array(this, true); });
};
/**
 * extend Builtin prototypes with relevant methods
 */
const extendBuiltins = () => {
    extendString();
    extendUint8Array();
};
const gBase64 = {
    version: version,
    VERSION: VERSION,
    atob: _atob,
    atobPolyfill: atobPolyfill,
    btoa: _btoa,
    btoaPolyfill: btoaPolyfill,
    fromBase64: base64_decode,
    toBase64: base64_encode,
    encode: base64_encode,
    encodeURI: base64_encodeURI,
    encodeURL: base64_encodeURI,
    utob: utob,
    btou: btou,
    decode: base64_decode,
    isValid: isValid,
    fromUint8Array: fromUint8Array,
    toUint8Array: toUint8Array,
    extendString: extendString,
    extendUint8Array: extendUint8Array,
    extendBuiltins: extendBuiltins,
};
// makecjs:CUT //




















// and finally,


;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/util.js


/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
function pluginMissing(pluginKey) {
  var keyParts = pluginKey.split('-');
  var pluginName = 'RxDB';
  keyParts.forEach(function (part) {
    pluginName += ucfirst(part);
  });
  pluginName += 'Plugin';
  return new Error("You are using a function which must be overwritten by a plugin.\n        You should either prevent the usage of this function or add the plugin via:\n            import { " + pluginName + " } from 'rxdb/plugins/" + pluginKey + "';\n            addRxPlugin(" + pluginName + ");\n        ");
}

/**
 * This is a very fast hash method
 * but it is not cryptographically secure.
 * For each run it will append a number between 0 and 2147483647 (=biggest 32 bit int).
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @return a string as hash-result
 */
function fastUnsecureHash(inputString,
// used to test the polyfill
doNotUseTextEncoder) {
  var hashValue = 0,
    i,
    chr,
    len;

  /**
   * For better performance we first transform all
   * chars into their ascii numbers at once.
   * 
   * This is what makes the murmurhash implementation such fast.
   * @link https://github.com/perezd/node-murmurhash/blob/master/murmurhash.js#L4
   */
  var encoded;

  /**
   * All modern browsers support the TextEncoder
   * @link https://caniuse.com/textencoder
   * But to make RxDB work in other JavaScript runtimes,
   * like when using it in flutter or QuickJS, we need to
   * make it work even when there is no TextEncoder.
   */
  if (typeof TextEncoder !== 'undefined' && !doNotUseTextEncoder) {
    encoded = new TextEncoder().encode(inputString);
  } else {
    encoded = [];
    for (var _i = 0; _i < inputString.length; _i++) {
      encoded.push(inputString.charCodeAt(_i));
    }
  }
  for (i = 0, len = inputString.length; i < len; i++) {
    chr = encoded[i];
    hashValue = (hashValue << 5) - hashValue + chr;
    hashValue |= 0; // Convert to 32bit integer
  }

  if (hashValue < 0) {
    hashValue = hashValue * -1;
  }

  /**
   * To make the output smaller
   * but still have it to represent the same value,
   * we use the biggest radix of 36 instead of just
   * transforming it into a hex string.
   */
  return hashValue.toString(36);
}

/**
 * Default hash method used to create revision hashes
 * that do not have to be cryptographically secure.
 * IMPORTANT: Changing the default hashing method
 * requires a BREAKING change!
 */
function defaultHashFunction(input) {
  return fastUnsecureHash(input);
}

/**
 * Returns the current unix time in milliseconds (with two decmials!)
 * Because the accuracy of getTime() in javascript is bad,
 * and we cannot rely on performance.now() on all plattforms,
 * this method implements a way to never return the same value twice.
 * This ensures that when now() is called often, we do not loose the information
 * about which call came first and which came after.
 * 
 * We had to move from having no decimals, to having two decimal
 * because it turned out that some storages are such fast that
 * calling this method too often would return 'the future'.
 */
var _lastNow = 0;
/**
 * Returns the current time in milliseconds,
 * also ensures to not return the same value twice.
 */
function util_now() {
  var ret = new Date().getTime();
  ret = ret + 0.01;
  if (ret <= _lastNow) {
    ret = _lastNow + 0.01;
  }

  /**
   * Strip the returned number to max two decimals.
   * In theory we would not need this but
   * in practice JavaScript has no such good number precision
   * so rounding errors could add another decimal place.
   */
  var twoDecimals = parseFloat(ret.toFixed(2));
  _lastNow = twoDecimals;
  return twoDecimals;
}

/**
 * returns a promise that resolves on the next tick
 */
function nextTick() {
  return new Promise(function (res) {
    return setTimeout(res, 0);
  });
}
function promiseWait() {
  var ms = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return new Promise(function (res) {
    return setTimeout(res, ms);
  });
}
function toPromise(maybePromise) {
  if (maybePromise && typeof maybePromise.then === 'function') {
    // is promise
    return maybePromise;
  } else {
    return Promise.resolve(maybePromise);
  }
}
var PROMISE_RESOLVE_TRUE = Promise.resolve(true);
var PROMISE_RESOLVE_FALSE = Promise.resolve(false);
var PROMISE_RESOLVE_NULL = Promise.resolve(null);
var PROMISE_RESOLVE_VOID = Promise.resolve();
function requestIdlePromise() {
  var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
  if (typeof window === 'object' && window['requestIdleCallback']) {
    return new Promise(function (res) {
      return window['requestIdleCallback'](res, {
        timeout: timeout
      });
    });
  } else {
    return promiseWait(0);
  }
}

/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
 */
function promiseSeries(tasks, initial) {
  return tasks.reduce(function (current, next) {
    return current.then(next);
  }, Promise.resolve(initial));
}

/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 */
function requestIdleCallbackIfAvailable(fun) {
  if (typeof window === 'object' && window['requestIdleCallback']) window['requestIdleCallback'](fun);
}

/**
 * uppercase first char
 */
function ucfirst(str) {
  str += '';
  var f = str.charAt(0).toUpperCase();
  return f + str.substr(1);
}

/**
 * removes trailing and ending dots from the string
 */
function trimDots(str) {
  // start
  while (str.charAt(0) === '.') {
    str = str.substr(1);
  }

  // end
  while (str.slice(-1) === '.') {
    str = str.slice(0, -1);
  }
  return str;
}
function runXTimes(xTimes, fn) {
  new Array(xTimes).fill(0).forEach(function (_v, idx) {
    return fn(idx);
  });
}
function util_ensureNotFalsy(obj) {
  if (!obj) {
    throw new Error('ensureNotFalsy() is falsy');
  }
  return obj;
}
function ensureInteger(obj) {
  if (!Number.isInteger(obj)) {
    throw new Error('ensureInteger() is falsy');
  }
  return obj;
}

/**
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object if no-array-sort not set
 */
function sortObject(obj) {
  var noArraySort = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  if (!obj) return obj; // do not sort null, false or undefined

  // array
  if (!noArraySort && Array.isArray(obj)) {
    return obj.sort(function (a, b) {
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      if (typeof a === 'object') return 1;else return -1;
    }).map(function (i) {
      return sortObject(i, noArraySort);
    });
  }

  // object
  // array is also of type object
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (obj instanceof RegExp) return obj;
    var out = {};
    Object.keys(obj).sort(function (a, b) {
      return a.localeCompare(b);
    }).forEach(function (key) {
      out[key] = sortObject(obj[key], noArraySort);
    });
    return out;
  }

  // everything else
  return obj;
}

/**
 * used to JSON.stringify() objects that contain a regex
 * @link https://stackoverflow.com/a/33416684 thank you Fabian Jakobs!
 */
function stringifyFilter(key, value) {
  if (value instanceof RegExp) {
    return value.toString();
  }
  return value;
}

/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 */
function randomCouchString() {
  var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
  var text = '';
  var possible = 'abcdefghijklmnopqrstuvwxyz';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * A random string that is never inside of any storage
 */
var RANDOM_STRING = 'Fz7SZXPmYJujkzjY1rpXWvlWBqoGAfAX';
function lastOfArray(ar) {
  return ar[ar.length - 1];
}

/**
 * shuffle the given array
 */
function shuffleArray(arr) {
  return arr.sort(function () {
    return Math.random() - 0.5;
  });
}

/**
 * Split array with items into smaller arrays with items
 * @link https://stackoverflow.com/a/7273794/3443137
 */
function batchArray(array, batchSize) {
  array = array.slice(0);
  var ret = [];
  while (array.length) {
    var batch = array.splice(0, batchSize);
    ret.push(batch);
  }
  return ret;
}

/**
 * @link https://stackoverflow.com/a/15996017
 */
function removeOneFromArrayIfMatches(ar, condition) {
  ar = ar.slice();
  var i = ar.length;
  var done = false;
  while (i-- && !done) {
    if (condition(ar[i])) {
      done = true;
      ar.splice(i, 1);
    }
  }
  return ar;
}

/**
 * transforms the given adapter into a pouch-compatible object
 */
function adapterObject(adapter) {
  var adapterObj = {
    db: adapter
  };
  if (typeof adapter === 'string') {
    adapterObj = {
      adapter: adapter,
      db: undefined
    };
  }
  return adapterObj;
}
function recursiveDeepCopy(o) {
  if (!o) return o;
  return clone_default()(o, false);
}
var util_clone = recursiveDeepCopy;

/**
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
function util_flatClone(obj) {
  return Object.assign({}, obj);
}

/**
 * @link https://stackoverflow.com/a/11509718/3443137
 */
function firstPropertyNameOfObject(obj) {
  return Object.keys(obj)[0];
}
function util_firstPropertyValueOfObject(obj) {
  var key = Object.keys(obj)[0];
  return obj[key];
}

var isElectronRenderer = is_electron_default()();

/**
 * returns a flattened object
 * @link https://gist.github.com/penguinboy/762197
 */
function flattenObject(ob) {
  var toReturn = {};
  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if (typeof ob[i] === 'object') {
      var flatObject = flattenObject(ob[i]);
      for (var _x in flatObject) {
        if (!flatObject.hasOwnProperty(_x)) continue;
        toReturn[i + '.' + _x] = flatObject[_x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}
function parseRevision(revision) {
  var split = revision.split('-');
  return {
    height: parseInt(split[0], 10),
    hash: split[1]
  };
}
function getHeightOfRevision(revision) {
  return parseRevision(revision).height;
}

/**
 * Creates the next write revision for a given document.
 */
function util_createRevision(hashFunction, docData, previousDocData) {
  var previousRevision = previousDocData ? previousDocData._rev : null;
  var previousRevisionHeigth = previousRevision ? parseRevision(previousRevision).height : 0;
  var newRevisionHeight = previousRevisionHeigth + 1;
  var docWithoutRev = Object.assign({}, docData, {
    _rev: undefined,
    _rev_tree: undefined,
    /**
     * All _meta properties MUST NOT be part of the
     * revision hash.
     * Plugins might temporarily store data in the _meta
     * field and strip it away when the document is replicated
     * or written to another storage.
     */
    _meta: undefined
  });

  /**
   * The revision height must be part of the hash
   * as the last parameter of the document data.
   * This is required to ensure we never ever create
   * two different document states that have the same revision
   * hash. Even writing the exact same document data
   * must have to result in a different hash so that
   * the replication can known if the state just looks equal
   * or if it is really exactly the equal state in data and time.
   */
  delete docWithoutRev._rev;
  docWithoutRev._rev = previousDocData ? newRevisionHeight : 1;
  var diggestString = JSON.stringify(docWithoutRev);
  var revisionHash = hashFunction(diggestString);
  return newRevisionHeight + '-' + revisionHash;
}

/**
 * overwrites the getter with the actual value
 * Mostly used for caching stuff on the first run
 */
function overwriteGetterForCaching(obj, getterName, value) {
  Object.defineProperty(obj, getterName, {
    get: function get() {
      return value;
    }
  });
  return value;
}

/**
 * returns true if the given name is likely a folder path
 */
function isFolderPath(name) {
  // do not check, if foldername is given
  if (name.includes('/') ||
  // unix
  name.includes('\\') // windows
  ) {
    return true;
  } else {
    return false;
  }
}
function getFromMapOrThrow(map, key) {
  var val = map.get(key);
  if (typeof val === 'undefined') {
    throw new Error('missing value from map ' + key);
  }
  return val;
}
function getFromObjectOrThrow(obj, key) {
  var val = obj[key];
  if (!val) {
    throw new Error('missing value from object ' + key);
  }
  return val;
}

/**
 * returns true if the supplied argument is either an Array<T> or a Readonly<Array<T>>
 */
function isMaybeReadonlyArray(x) {
  // While this looks strange, it's a workaround for an issue in TypeScript:
  // https://github.com/microsoft/TypeScript/issues/17002
  //
  // The problem is that `Array.isArray` as a type guard returns `false` for a readonly array,
  // but at runtime the object is an array and the runtime call to `Array.isArray` would return `true`.
  // The type predicate here allows for both `Array<T>` and `Readonly<Array<T>>` to pass a type check while
  // still performing runtime type inspection.
  return Array.isArray(x);
}

/**
 * Use this in array.filter() to remove all empty slots
 * and have the correct typings afterwards.
 * @link https://stackoverflow.com/a/46700791/3443137
 */
function arrayFilterNotEmpty(value) {
  if (value === null || value === undefined) {
    return false;
  }
  return true;
}

/**
 * NO! We cannot just use btoa() and atob()
 * because they do not work correctly with binary data.
 * @link https://stackoverflow.com/q/30106476/3443137
 */


/**
 * atob() and btoa() do not work well with non ascii chars,
 * so we have to use these helper methods instead.
 * @link https://stackoverflow.com/a/30106551/3443137
 */
// Encoding UTF8 -> base64
function b64EncodeUnicode(str) {
  return encode(str);
}

// Decoding base64 -> UTF8
function b64DecodeUnicode(str) {
  return decode(str);
}

/**
 * @link https://stackoverflow.com/a/9458996/3443137
 */
function arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * This is an abstraction over the Blob/Buffer data structure.
 * We need this because it behaves different in different JavaScript runtimes.
 * Since RxDB 13.0.0 we switch to Blob-only because Node.js does not support
 * the Blob data structure which is also supported by the browsers.
 */
var blobBufferUtil = {
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */createBlobBuffer: function createBlobBuffer(data, type) {
    var blobBuffer = new Blob([data], {
      type: type
    });
    return blobBuffer;
  },
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */createBlobBufferFromBase64: function createBlobBufferFromBase64(base64String, type) {
    try {
      return Promise.resolve(fetch("data:" + type + ";base64," + base64String)).then(function (base64Response) {
        return Promise.resolve(base64Response.blob());
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },
  isBlobBuffer: function isBlobBuffer(data) {
    if (data instanceof Blob || typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
      return true;
    } else {
      return false;
    }
  },
  toString: function toString(blobBuffer) {
    /**
     * in the electron-renderer we have a typed array insteaf of a blob
     * so we have to transform it.
     * @link https://github.com/pubkey/rxdb/issues/1371
     */
    var blobBufferType = Object.prototype.toString.call(blobBuffer);
    if (blobBufferType === '[object Uint8Array]') {
      blobBuffer = new Blob([blobBuffer]);
    }
    if (typeof blobBuffer === 'string') {
      return Promise.resolve(blobBuffer);
    }
    return blobBuffer.text();
  },
  toBase64String: function toBase64String(blobBuffer) {
    try {
      if (typeof blobBuffer === 'string') {
        return Promise.resolve(blobBuffer);
      }

      /**
       * in the electron-renderer we have a typed array insteaf of a blob
       * so we have to transform it.
       * @link https://github.com/pubkey/rxdb/issues/1371
       */
      var blobBufferType = Object.prototype.toString.call(blobBuffer);
      if (blobBufferType === '[object Uint8Array]') {
        blobBuffer = new Blob([blobBuffer]);
      }
      return Promise.resolve(fetch(URL.createObjectURL(blobBuffer)).then(function (res) {
        return res.arrayBuffer();
      })).then(arrayBufferToBase64);
    } catch (e) {
      return Promise.reject(e);
    }
  },
  size: function size(blobBuffer) {
    return blobBuffer.size;
  }
};

/**
 * Using shareReplay() without settings will not unsubscribe
 * if there are no more subscribers.
 * So we use these defaults.
 * @link https://cartant.medium.com/rxjs-whats-changed-with-sharereplay-65c098843e95
 */
var RXJS_SHARE_REPLAY_DEFAULTS = {
  bufferSize: 1,
  refCount: true
};

/**
 * We use 1 as minimum so that the value is never falsy.
 * This const is used in several places because querying
 * with a value lower then the minimum could give false results.
 */
var RX_META_LWT_MINIMUM = 1;
function getDefaultRxDocumentMeta() {
  return {
    /**
     * Set this to 1 to not waste performance
     * while calling new Date()..
     * The storage wrappers will anyway update
     * the lastWrite time while calling transformDocumentDataFromRxDBToRxStorage()
     */
    lwt: RX_META_LWT_MINIMUM
  };
}

/**
 * Returns a revision that is not valid.
 * Use this to have correct typings
 * while the storage wrapper anyway will overwrite the revision.
 */
function util_getDefaultRevision() {
  /**
   * Use a non-valid revision format,
   * to ensure that the RxStorage will throw
   * when the revision is not replaced downstream.
   */
  return '';
}
function getSortDocumentsByLastWriteTimeComparator(primaryPath) {
  return function (a, b) {
    if (a._meta.lwt === b._meta.lwt) {
      if (b[primaryPath] < a[primaryPath]) {
        return 1;
      } else {
        return -1;
      }
    } else {
      return a._meta.lwt - b._meta.lwt;
    }
  };
}
function sortDocumentsByLastWriteTime(primaryPath, docs) {
  return docs.sort(getSortDocumentsByLastWriteTimeComparator(primaryPath));
}

/**
 * To get specific nested path values from objects,
 * RxDB normally uses the 'object-path' npm module.
 * But when performance is really relevant, this is not fast enough.
 * Instead we use a monad that can prepare some stuff up front
 * and we can re-use the generated function.
 */

function objectPathMonad(objectPath) {
  var splitted = objectPath.split('.');

  /**
   * Performance shortcut,
   * if no nested path is used,
   * directly return the field of the object.
   */
  if (splitted.length === 1) {
    return function (obj) {
      return obj[objectPath];
    };
  }
  return function (obj) {
    var currentVal = obj;
    var t = 0;
    while (t < splitted.length) {
      var subPath = splitted[t];
      currentVal = currentVal[subPath];
      if (typeof currentVal === 'undefined') {
        return currentVal;
      }
      t++;
    }
    return currentVal;
  };
}
//# sourceMappingURL=util.js.map
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _setPrototypeOf(o, p);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/inheritsLoose.js

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  _setPrototypeOf(subClass, superClass);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/getPrototypeOf.js
function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/isNativeFunction.js
function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/isNativeReflectConstruct.js
function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/construct.js


function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct.bind();
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }

  return _construct.apply(null, arguments);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/wrapNativeSuper.js




function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;

  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;

    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }

    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);

      _cache.set(Class, Wrapper);
    }

    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }

    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class);
  };

  return _wrapNativeSuper(Class);
}
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/overwritable.js
/**
 * functions that can or should be overwritten by plugins
 * IMPORTANT: Do not import any big stuff from RxDB here!
 * An 'overwritable' can be used inside WebWorkers for RxStorage only,
 * and we do not want to have the full RxDB lib bundled in them.
 */

var overwritable = {
  /**
   * if this method is overwritten with one
   * that returns true, we do additional checks
   * which help the developer but have bad performance
   */isDevMode: function isDevMode() {
    return false;
  },
  /**
   * Deep freezes and object when in dev-mode.
   * Deep-Freezing has the same performance as deep-cloning, so we only do that in dev-mode.
   * Also, we can ensure the readonly state via typescript
   * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
   */deepFreezeWhenDevMode: function deepFreezeWhenDevMode(obj) {
    return obj;
  },
  /**
   * overwritten to map error-codes to text-messages
   */tunnelErrorMessage: function tunnelErrorMessage(message) {
    return "RxDB Error-Code " + message + ".\n        Error messages are not included in RxDB core to reduce build size.\n        - To find out what this error means, either use the dev-mode-plugin https://rxdb.info/dev-mode.html\n        - or search for the error code here: https://github.com/pubkey/rxdb/search?q=" + message + "\n        ";
  }
};
//# sourceMappingURL=overwritable.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-error.js



/**
 * here we use custom errors with the additional field 'parameters'
 */


/**
 * transform an object of parameters to a presentable string
 */
function parametersToString(parameters) {
  var ret = '';
  if (Object.keys(parameters).length === 0) return ret;
  ret += 'Given parameters: {\n';
  ret += Object.keys(parameters).map(function (k) {
    var paramStr = '[object Object]';
    try {
      paramStr = JSON.stringify(parameters[k], function (_k, v) {
        return v === undefined ? null : v;
      }, 2);
    } catch (e) {}
    return k + ':' + paramStr;
  }).join('\n');
  ret += '}';
  return ret;
}
function messageForError(message, code, parameters) {
  return 'RxError (' + code + '):' + '\n' + message + '\n' + parametersToString(parameters);
}
var RxError = /*#__PURE__*/function (_Error) {
  _inheritsLoose(RxError, _Error);
  function RxError(code, message) {
    var _this;
    var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var mes = messageForError(message, code, parameters);
    _this = _Error.call(this, mes) || this;
    _this.code = code;
    _this.message = mes;
    _this.parameters = parameters;
    _this.rxdb = true; // tag them as internal
    return _this;
  }
  var _proto = RxError.prototype;
  _proto.toString = function toString() {
    return this.message;
  };
  _createClass(RxError, [{
    key: "name",
    get: function get() {
      return 'RxError (' + this.code + ')';
    }
  }, {
    key: "typeError",
    get: function get() {
      return false;
    }
  }]);
  return RxError;
}( /*#__PURE__*/_wrapNativeSuper(Error));
var RxTypeError = /*#__PURE__*/function (_TypeError) {
  _inheritsLoose(RxTypeError, _TypeError);
  function RxTypeError(code, message) {
    var _this2;
    var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var mes = messageForError(message, code, parameters);
    _this2 = _TypeError.call(this, mes) || this;
    _this2.code = code;
    _this2.message = mes;
    _this2.parameters = parameters;
    _this2.rxdb = true; // tag them as internal
    return _this2;
  }
  var _proto2 = RxTypeError.prototype;
  _proto2.toString = function toString() {
    return this.message;
  };
  _createClass(RxTypeError, [{
    key: "name",
    get: function get() {
      return 'RxTypeError (' + this.code + ')';
    }
  }, {
    key: "typeError",
    get: function get() {
      return true;
    }
  }]);
  return RxTypeError;
}( /*#__PURE__*/_wrapNativeSuper(TypeError));
function newRxError(code, parameters) {
  return new RxError(code, overwritable.tunnelErrorMessage(code), parameters);
}
function newRxTypeError(code, parameters) {
  return new RxTypeError(code, overwritable.tunnelErrorMessage(code), parameters);
}

/**
 * Returns the error if it is a 409 conflict,
 * return false if it is another error.
 */
function rx_error_isBulkWriteConflictError(err) {
  if (err.status === 409) {
    return err;
  } else {
    return false;
  }
}
//# sourceMappingURL=rx-error.js.map
// EXTERNAL MODULE: ./node_modules/fast-deep-equal/index.js
var fast_deep_equal = __webpack_require__(4063);
var fast_deep_equal_default = /*#__PURE__*/__webpack_require__.n(fast_deep_equal);
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/hooks.js
/**
 * hook-functions that can be extended by the plugin
 */
var HOOKS = {
  /**
   * Runs before a plugin is added.
   * Use this to block the usage of non-compatible plugins.
   */
  preAddRxPlugin: [],
  /**
   * functions that run before the database is created
   */
  preCreateRxDatabase: [],
  /**
   * runs after the database is created and prepared
   * but before the instance is returned to the user
   * @async
   */
  createRxDatabase: [],
  preCreateRxCollection: [],
  createRxCollection: [],
  /**
  * runs at the end of the destroy-process of a collection
  * @async
  */
  postDestroyRxCollection: [],
  /**
   * Runs after a collection is removed.
   * @async
   */
  postRemoveRxCollection: [],
  /**
    * functions that get the json-schema as input
    * to do additionally checks/manipulation
    */
  preCreateRxSchema: [],
  /**
   * functions that run after the RxSchema is created
   * gets RxSchema as attribute
   */
  createRxSchema: [],
  preCreateRxQuery: [],
  /**
   * Runs before a query is send to the
   * prepareQuery function of the storage engine.
   */
  prePrepareQuery: [],
  createRxDocument: [],
  /**
   * runs after a RxDocument is created,
   * cannot be async
   */
  postCreateRxDocument: [],
  /**
   * Runs before a RxStorageInstance is created
   * gets the params of createStorageInstance()
   * as attribute so you can manipulate them.
   * Notice that you have to clone stuff before mutating the inputs.
   */
  preCreateRxStorageInstance: [],
  /**
   * runs on the document-data before the document is migrated
   * {
   *   doc: Object, // originam doc-data
   *   migrated: // migrated doc-data after run throught migration-strategies
   * }
   */
  preMigrateDocument: [],
  /**
   * runs after the migration of a document has been done
   */
  postMigrateDocument: [],
  /**
   * runs at the beginning of the destroy-process of a database
   */
  preDestroyRxDatabase: [],
  /**
   * runs after a database has been removed
   * @async
   */
  postRemoveRxDatabase: []
};
function runPluginHooks(hookKey, obj) {
  HOOKS[hookKey].forEach(function (fun) {
    return fun(obj);
  });
}

/**
 * TODO
 * we should not run the hooks in parallel
 * this makes stuff unpredictable.
 */
function runAsyncPluginHooks(hookKey, obj) {
  return Promise.all(HOOKS[hookKey].map(function (fun) {
    return fun(obj);
  }));
}

/**
 * used in tests to remove hooks
 */
function _clearHook(type, fun) {
  HOOKS[type] = HOOKS[type].filter(function (h) {
    return h !== fun;
  });
}
//# sourceMappingURL=hooks.js.map
// EXTERNAL MODULE: ./node_modules/object-path/index.js
var object_path = __webpack_require__(1528);
var object_path_default = /*#__PURE__*/__webpack_require__.n(object_path);
;// CONCATENATED MODULE: ../../../../node_modules/tslib/tslib.es6.js
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    }
    return __assign.apply(this, arguments);
}

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
});

function __exportStar(m, o) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

/** @deprecated */
function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/** @deprecated */
function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
};

function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function __classPrivateFieldIn(state, receiver) {
    if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
    return typeof state === "function" ? receiver === state : state.has(receiver);
}

;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/isFunction.js
function isFunction_isFunction(value) {
    return typeof value === 'function';
}
//# sourceMappingURL=isFunction.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js
function createErrorClass(createImpl) {
    var _super = function (instance) {
        Error.call(instance);
        instance.stack = new Error().stack;
    };
    var ctorFunc = createImpl(_super);
    ctorFunc.prototype = Object.create(Error.prototype);
    ctorFunc.prototype.constructor = ctorFunc;
    return ctorFunc;
}
//# sourceMappingURL=createErrorClass.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/UnsubscriptionError.js

var UnsubscriptionError = createErrorClass(function (_super) {
    return function UnsubscriptionErrorImpl(errors) {
        _super(this);
        this.message = errors
            ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ')
            : '';
        this.name = 'UnsubscriptionError';
        this.errors = errors;
    };
});
//# sourceMappingURL=UnsubscriptionError.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/arrRemove.js
function arrRemove(arr, item) {
    if (arr) {
        var index = arr.indexOf(item);
        0 <= index && arr.splice(index, 1);
    }
}
//# sourceMappingURL=arrRemove.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/Subscription.js




var Subscription = (function () {
    function Subscription(initialTeardown) {
        this.initialTeardown = initialTeardown;
        this.closed = false;
        this._parentage = null;
        this._finalizers = null;
    }
    Subscription.prototype.unsubscribe = function () {
        var e_1, _a, e_2, _b;
        var errors;
        if (!this.closed) {
            this.closed = true;
            var _parentage = this._parentage;
            if (_parentage) {
                this._parentage = null;
                if (Array.isArray(_parentage)) {
                    try {
                        for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                            var parent_1 = _parentage_1_1.value;
                            parent_1.remove(this);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                else {
                    _parentage.remove(this);
                }
            }
            var initialFinalizer = this.initialTeardown;
            if (isFunction_isFunction(initialFinalizer)) {
                try {
                    initialFinalizer();
                }
                catch (e) {
                    errors = e instanceof UnsubscriptionError ? e.errors : [e];
                }
            }
            var _finalizers = this._finalizers;
            if (_finalizers) {
                this._finalizers = null;
                try {
                    for (var _finalizers_1 = __values(_finalizers), _finalizers_1_1 = _finalizers_1.next(); !_finalizers_1_1.done; _finalizers_1_1 = _finalizers_1.next()) {
                        var finalizer = _finalizers_1_1.value;
                        try {
                            execFinalizer(finalizer);
                        }
                        catch (err) {
                            errors = errors !== null && errors !== void 0 ? errors : [];
                            if (err instanceof UnsubscriptionError) {
                                errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                            }
                            else {
                                errors.push(err);
                            }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_finalizers_1_1 && !_finalizers_1_1.done && (_b = _finalizers_1.return)) _b.call(_finalizers_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            if (errors) {
                throw new UnsubscriptionError(errors);
            }
        }
    };
    Subscription.prototype.add = function (teardown) {
        var _a;
        if (teardown && teardown !== this) {
            if (this.closed) {
                execFinalizer(teardown);
            }
            else {
                if (teardown instanceof Subscription) {
                    if (teardown.closed || teardown._hasParent(this)) {
                        return;
                    }
                    teardown._addParent(this);
                }
                (this._finalizers = (_a = this._finalizers) !== null && _a !== void 0 ? _a : []).push(teardown);
            }
        }
    };
    Subscription.prototype._hasParent = function (parent) {
        var _parentage = this._parentage;
        return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
    };
    Subscription.prototype._addParent = function (parent) {
        var _parentage = this._parentage;
        this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
    };
    Subscription.prototype._removeParent = function (parent) {
        var _parentage = this._parentage;
        if (_parentage === parent) {
            this._parentage = null;
        }
        else if (Array.isArray(_parentage)) {
            arrRemove(_parentage, parent);
        }
    };
    Subscription.prototype.remove = function (teardown) {
        var _finalizers = this._finalizers;
        _finalizers && arrRemove(_finalizers, teardown);
        if (teardown instanceof Subscription) {
            teardown._removeParent(this);
        }
    };
    Subscription.EMPTY = (function () {
        var empty = new Subscription();
        empty.closed = true;
        return empty;
    })();
    return Subscription;
}());

var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
function isSubscription(value) {
    return (value instanceof Subscription ||
        (value && 'closed' in value && isFunction_isFunction(value.remove) && isFunction_isFunction(value.add) && isFunction_isFunction(value.unsubscribe)));
}
function execFinalizer(finalizer) {
    if (isFunction_isFunction(finalizer)) {
        finalizer();
    }
    else {
        finalizer.unsubscribe();
    }
}
//# sourceMappingURL=Subscription.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/config.js
var config = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: undefined,
    useDeprecatedSynchronousErrorHandling: false,
    useDeprecatedNextContext: false,
};
//# sourceMappingURL=config.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduler/timeoutProvider.js

var timeoutProvider = {
    setTimeout: function (handler, timeout) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        var delegate = timeoutProvider.delegate;
        if (delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) {
            return delegate.setTimeout.apply(delegate, __spreadArray([handler, timeout], __read(args)));
        }
        return setTimeout.apply(void 0, __spreadArray([handler, timeout], __read(args)));
    },
    clearTimeout: function (handle) {
        var delegate = timeoutProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
    },
    delegate: undefined,
};
//# sourceMappingURL=timeoutProvider.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/reportUnhandledError.js


function reportUnhandledError(err) {
    timeoutProvider.setTimeout(function () {
        var onUnhandledError = config.onUnhandledError;
        if (onUnhandledError) {
            onUnhandledError(err);
        }
        else {
            throw err;
        }
    });
}
//# sourceMappingURL=reportUnhandledError.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/noop.js
function noop() { }
//# sourceMappingURL=noop.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/NotificationFactories.js
var COMPLETE_NOTIFICATION = (function () { return createNotification('C', undefined, undefined); })();
function errorNotification(error) {
    return createNotification('E', undefined, error);
}
function nextNotification(value) {
    return createNotification('N', value, undefined);
}
function createNotification(kind, value, error) {
    return {
        kind: kind,
        value: value,
        error: error,
    };
}
//# sourceMappingURL=NotificationFactories.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/errorContext.js

var context = null;
function errorContext(cb) {
    if (config.useDeprecatedSynchronousErrorHandling) {
        var isRoot = !context;
        if (isRoot) {
            context = { errorThrown: false, error: null };
        }
        cb();
        if (isRoot) {
            var _a = context, errorThrown = _a.errorThrown, error = _a.error;
            context = null;
            if (errorThrown) {
                throw error;
            }
        }
    }
    else {
        cb();
    }
}
function captureError(err) {
    if (config.useDeprecatedSynchronousErrorHandling && context) {
        context.errorThrown = true;
        context.error = err;
    }
}
//# sourceMappingURL=errorContext.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/Subscriber.js









var Subscriber = (function (_super) {
    __extends(Subscriber, _super);
    function Subscriber(destination) {
        var _this = _super.call(this) || this;
        _this.isStopped = false;
        if (destination) {
            _this.destination = destination;
            if (isSubscription(destination)) {
                destination.add(_this);
            }
        }
        else {
            _this.destination = EMPTY_OBSERVER;
        }
        return _this;
    }
    Subscriber.create = function (next, error, complete) {
        return new SafeSubscriber(next, error, complete);
    };
    Subscriber.prototype.next = function (value) {
        if (this.isStopped) {
            handleStoppedNotification(nextNotification(value), this);
        }
        else {
            this._next(value);
        }
    };
    Subscriber.prototype.error = function (err) {
        if (this.isStopped) {
            handleStoppedNotification(errorNotification(err), this);
        }
        else {
            this.isStopped = true;
            this._error(err);
        }
    };
    Subscriber.prototype.complete = function () {
        if (this.isStopped) {
            handleStoppedNotification(COMPLETE_NOTIFICATION, this);
        }
        else {
            this.isStopped = true;
            this._complete();
        }
    };
    Subscriber.prototype.unsubscribe = function () {
        if (!this.closed) {
            this.isStopped = true;
            _super.prototype.unsubscribe.call(this);
            this.destination = null;
        }
    };
    Subscriber.prototype._next = function (value) {
        this.destination.next(value);
    };
    Subscriber.prototype._error = function (err) {
        try {
            this.destination.error(err);
        }
        finally {
            this.unsubscribe();
        }
    };
    Subscriber.prototype._complete = function () {
        try {
            this.destination.complete();
        }
        finally {
            this.unsubscribe();
        }
    };
    return Subscriber;
}(Subscription));

var _bind = Function.prototype.bind;
function bind(fn, thisArg) {
    return _bind.call(fn, thisArg);
}
var ConsumerObserver = (function () {
    function ConsumerObserver(partialObserver) {
        this.partialObserver = partialObserver;
    }
    ConsumerObserver.prototype.next = function (value) {
        var partialObserver = this.partialObserver;
        if (partialObserver.next) {
            try {
                partialObserver.next(value);
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
    };
    ConsumerObserver.prototype.error = function (err) {
        var partialObserver = this.partialObserver;
        if (partialObserver.error) {
            try {
                partialObserver.error(err);
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
        else {
            handleUnhandledError(err);
        }
    };
    ConsumerObserver.prototype.complete = function () {
        var partialObserver = this.partialObserver;
        if (partialObserver.complete) {
            try {
                partialObserver.complete();
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
    };
    return ConsumerObserver;
}());
var SafeSubscriber = (function (_super) {
    __extends(SafeSubscriber, _super);
    function SafeSubscriber(observerOrNext, error, complete) {
        var _this = _super.call(this) || this;
        var partialObserver;
        if (isFunction_isFunction(observerOrNext) || !observerOrNext) {
            partialObserver = {
                next: (observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : undefined),
                error: error !== null && error !== void 0 ? error : undefined,
                complete: complete !== null && complete !== void 0 ? complete : undefined,
            };
        }
        else {
            var context_1;
            if (_this && config.useDeprecatedNextContext) {
                context_1 = Object.create(observerOrNext);
                context_1.unsubscribe = function () { return _this.unsubscribe(); };
                partialObserver = {
                    next: observerOrNext.next && bind(observerOrNext.next, context_1),
                    error: observerOrNext.error && bind(observerOrNext.error, context_1),
                    complete: observerOrNext.complete && bind(observerOrNext.complete, context_1),
                };
            }
            else {
                partialObserver = observerOrNext;
            }
        }
        _this.destination = new ConsumerObserver(partialObserver);
        return _this;
    }
    return SafeSubscriber;
}(Subscriber));

function handleUnhandledError(error) {
    if (config.useDeprecatedSynchronousErrorHandling) {
        captureError(error);
    }
    else {
        reportUnhandledError(error);
    }
}
function defaultErrorHandler(err) {
    throw err;
}
function handleStoppedNotification(notification, subscriber) {
    var onStoppedNotification = config.onStoppedNotification;
    onStoppedNotification && timeoutProvider.setTimeout(function () { return onStoppedNotification(notification, subscriber); });
}
var EMPTY_OBSERVER = {
    closed: true,
    next: noop,
    error: defaultErrorHandler,
    complete: noop,
};
//# sourceMappingURL=Subscriber.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/symbol/observable.js
var observable = (function () { return (typeof Symbol === 'function' && Symbol.observable) || '@@observable'; })();
//# sourceMappingURL=observable.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/identity.js
function identity(x) {
    return x;
}
//# sourceMappingURL=identity.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/pipe.js

function pipe() {
    var fns = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fns[_i] = arguments[_i];
    }
    return pipeFromArray(fns);
}
function pipeFromArray(fns) {
    if (fns.length === 0) {
        return identity;
    }
    if (fns.length === 1) {
        return fns[0];
    }
    return function piped(input) {
        return fns.reduce(function (prev, fn) { return fn(prev); }, input);
    };
}
//# sourceMappingURL=pipe.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/Observable.js







var Observable_Observable = (function () {
    function Observable(subscribe) {
        if (subscribe) {
            this._subscribe = subscribe;
        }
    }
    Observable.prototype.lift = function (operator) {
        var observable = new Observable();
        observable.source = this;
        observable.operator = operator;
        return observable;
    };
    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
        var _this = this;
        var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
        errorContext(function () {
            var _a = _this, operator = _a.operator, source = _a.source;
            subscriber.add(operator
                ?
                    operator.call(subscriber, source)
                : source
                    ?
                        _this._subscribe(subscriber)
                    :
                        _this._trySubscribe(subscriber));
        });
        return subscriber;
    };
    Observable.prototype._trySubscribe = function (sink) {
        try {
            return this._subscribe(sink);
        }
        catch (err) {
            sink.error(err);
        }
    };
    Observable.prototype.forEach = function (next, promiseCtor) {
        var _this = this;
        promiseCtor = getPromiseCtor(promiseCtor);
        return new promiseCtor(function (resolve, reject) {
            var subscriber = new SafeSubscriber({
                next: function (value) {
                    try {
                        next(value);
                    }
                    catch (err) {
                        reject(err);
                        subscriber.unsubscribe();
                    }
                },
                error: reject,
                complete: resolve,
            });
            _this.subscribe(subscriber);
        });
    };
    Observable.prototype._subscribe = function (subscriber) {
        var _a;
        return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable.prototype[observable] = function () {
        return this;
    };
    Observable.prototype.pipe = function () {
        var operations = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            operations[_i] = arguments[_i];
        }
        return pipeFromArray(operations)(this);
    };
    Observable.prototype.toPromise = function (promiseCtor) {
        var _this = this;
        promiseCtor = getPromiseCtor(promiseCtor);
        return new promiseCtor(function (resolve, reject) {
            var value;
            _this.subscribe(function (x) { return (value = x); }, function (err) { return reject(err); }, function () { return resolve(value); });
        });
    };
    Observable.create = function (subscribe) {
        return new Observable(subscribe);
    };
    return Observable;
}());

function getPromiseCtor(promiseCtor) {
    var _a;
    return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
}
function isObserver(value) {
    return value && isFunction_isFunction(value.next) && isFunction_isFunction(value.error) && isFunction_isFunction(value.complete);
}
function isSubscriber(value) {
    return (value && value instanceof Subscriber) || (isObserver(value) && isSubscription(value));
}
//# sourceMappingURL=Observable.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/ObjectUnsubscribedError.js

var ObjectUnsubscribedError = createErrorClass(function (_super) {
    return function ObjectUnsubscribedErrorImpl() {
        _super(this);
        this.name = 'ObjectUnsubscribedError';
        this.message = 'object unsubscribed';
    };
});
//# sourceMappingURL=ObjectUnsubscribedError.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/Subject.js






var Subject = (function (_super) {
    __extends(Subject, _super);
    function Subject() {
        var _this = _super.call(this) || this;
        _this.closed = false;
        _this.currentObservers = null;
        _this.observers = [];
        _this.isStopped = false;
        _this.hasError = false;
        _this.thrownError = null;
        return _this;
    }
    Subject.prototype.lift = function (operator) {
        var subject = new AnonymousSubject(this, this);
        subject.operator = operator;
        return subject;
    };
    Subject.prototype._throwIfClosed = function () {
        if (this.closed) {
            throw new ObjectUnsubscribedError();
        }
    };
    Subject.prototype.next = function (value) {
        var _this = this;
        errorContext(function () {
            var e_1, _a;
            _this._throwIfClosed();
            if (!_this.isStopped) {
                if (!_this.currentObservers) {
                    _this.currentObservers = Array.from(_this.observers);
                }
                try {
                    for (var _b = __values(_this.currentObservers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var observer = _c.value;
                        observer.next(value);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        });
    };
    Subject.prototype.error = function (err) {
        var _this = this;
        errorContext(function () {
            _this._throwIfClosed();
            if (!_this.isStopped) {
                _this.hasError = _this.isStopped = true;
                _this.thrownError = err;
                var observers = _this.observers;
                while (observers.length) {
                    observers.shift().error(err);
                }
            }
        });
    };
    Subject.prototype.complete = function () {
        var _this = this;
        errorContext(function () {
            _this._throwIfClosed();
            if (!_this.isStopped) {
                _this.isStopped = true;
                var observers = _this.observers;
                while (observers.length) {
                    observers.shift().complete();
                }
            }
        });
    };
    Subject.prototype.unsubscribe = function () {
        this.isStopped = this.closed = true;
        this.observers = this.currentObservers = null;
    };
    Object.defineProperty(Subject.prototype, "observed", {
        get: function () {
            var _a;
            return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
        },
        enumerable: false,
        configurable: true
    });
    Subject.prototype._trySubscribe = function (subscriber) {
        this._throwIfClosed();
        return _super.prototype._trySubscribe.call(this, subscriber);
    };
    Subject.prototype._subscribe = function (subscriber) {
        this._throwIfClosed();
        this._checkFinalizedStatuses(subscriber);
        return this._innerSubscribe(subscriber);
    };
    Subject.prototype._innerSubscribe = function (subscriber) {
        var _this = this;
        var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
        if (hasError || isStopped) {
            return EMPTY_SUBSCRIPTION;
        }
        this.currentObservers = null;
        observers.push(subscriber);
        return new Subscription(function () {
            _this.currentObservers = null;
            arrRemove(observers, subscriber);
        });
    };
    Subject.prototype._checkFinalizedStatuses = function (subscriber) {
        var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
        if (hasError) {
            subscriber.error(thrownError);
        }
        else if (isStopped) {
            subscriber.complete();
        }
    };
    Subject.prototype.asObservable = function () {
        var observable = new Observable_Observable();
        observable.source = this;
        return observable;
    };
    Subject.create = function (destination, source) {
        return new AnonymousSubject(destination, source);
    };
    return Subject;
}(Observable_Observable));

var AnonymousSubject = (function (_super) {
    __extends(AnonymousSubject, _super);
    function AnonymousSubject(destination, source) {
        var _this = _super.call(this) || this;
        _this.destination = destination;
        _this.source = source;
        return _this;
    }
    AnonymousSubject.prototype.next = function (value) {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
    };
    AnonymousSubject.prototype.error = function (err) {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
    };
    AnonymousSubject.prototype.complete = function () {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
    };
    AnonymousSubject.prototype._subscribe = function (subscriber) {
        var _a, _b;
        return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : EMPTY_SUBSCRIPTION;
    };
    return AnonymousSubject;
}(Subject));

//# sourceMappingURL=Subject.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js


var BehaviorSubject = (function (_super) {
    __extends(BehaviorSubject, _super);
    function BehaviorSubject(_value) {
        var _this = _super.call(this) || this;
        _this._value = _value;
        return _this;
    }
    Object.defineProperty(BehaviorSubject.prototype, "value", {
        get: function () {
            return this.getValue();
        },
        enumerable: false,
        configurable: true
    });
    BehaviorSubject.prototype._subscribe = function (subscriber) {
        var subscription = _super.prototype._subscribe.call(this, subscriber);
        !subscription.closed && subscriber.next(this._value);
        return subscription;
    };
    BehaviorSubject.prototype.getValue = function () {
        var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, _value = _a._value;
        if (hasError) {
            throw thrownError;
        }
        this._throwIfClosed();
        return _value;
    };
    BehaviorSubject.prototype.next = function (value) {
        _super.prototype.next.call(this, (this._value = value));
    };
    return BehaviorSubject;
}(Subject));

//# sourceMappingURL=BehaviorSubject.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/lift.js

function hasLift(source) {
    return isFunction_isFunction(source === null || source === void 0 ? void 0 : source.lift);
}
function operate(init) {
    return function (source) {
        if (hasLift(source)) {
            return source.lift(function (liftedSource) {
                try {
                    return init(liftedSource, this);
                }
                catch (err) {
                    this.error(err);
                }
            });
        }
        throw new TypeError('Unable to lift unknown Observable type');
    };
}
//# sourceMappingURL=lift.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js


function createOperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
    return new OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize);
}
var OperatorSubscriber = (function (_super) {
    __extends(OperatorSubscriber, _super);
    function OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize, shouldUnsubscribe) {
        var _this = _super.call(this, destination) || this;
        _this.onFinalize = onFinalize;
        _this.shouldUnsubscribe = shouldUnsubscribe;
        _this._next = onNext
            ? function (value) {
                try {
                    onNext(value);
                }
                catch (err) {
                    destination.error(err);
                }
            }
            : _super.prototype._next;
        _this._error = onError
            ? function (err) {
                try {
                    onError(err);
                }
                catch (err) {
                    destination.error(err);
                }
                finally {
                    this.unsubscribe();
                }
            }
            : _super.prototype._error;
        _this._complete = onComplete
            ? function () {
                try {
                    onComplete();
                }
                catch (err) {
                    destination.error(err);
                }
                finally {
                    this.unsubscribe();
                }
            }
            : _super.prototype._complete;
        return _this;
    }
    OperatorSubscriber.prototype.unsubscribe = function () {
        var _a;
        if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
            var closed_1 = this.closed;
            _super.prototype.unsubscribe.call(this);
            !closed_1 && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
        }
    };
    return OperatorSubscriber;
}(Subscriber));

//# sourceMappingURL=OperatorSubscriber.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/map.js


function map(project, thisArg) {
    return operate(function (source, subscriber) {
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            subscriber.next(project.call(thisArg, value, index++));
        }));
    });
}
//# sourceMappingURL=map.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/distinctUntilChanged.js



function distinctUntilChanged(comparator, keySelector) {
    if (keySelector === void 0) { keySelector = identity; }
    comparator = comparator !== null && comparator !== void 0 ? comparator : defaultCompare;
    return operate(function (source, subscriber) {
        var previousKey;
        var first = true;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            var currentKey = keySelector(value);
            if (first || !comparator(previousKey, currentKey)) {
                first = false;
                previousKey = currentKey;
                subscriber.next(value);
            }
        }));
    });
}
function defaultCompare(a, b) {
    return a === b;
}
//# sourceMappingURL=distinctUntilChanged.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-change-event.js
/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */


function getDocumentDataOfRxChangeEvent(rxChangeEvent) {
  if (rxChangeEvent.documentData) {
    return rxChangeEvent.documentData;
  } else {
    return rxChangeEvent.previousDocumentData;
  }
}

/**
 * Might return null which means an
 * already deleted document got modified but still is deleted.
 * Theses kind of events are not relevant for the event-reduce algorithm
 * and must be filtered out.
 */
function rxChangeEventToEventReduceChangeEvent(rxChangeEvent) {
  switch (rxChangeEvent.operation) {
    case 'INSERT':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: rxChangeEvent.documentData,
        previous: null
      };
    case 'UPDATE':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: overwritable.deepFreezeWhenDevMode(rxChangeEvent.documentData),
        previous: rxChangeEvent.previousDocumentData ? rxChangeEvent.previousDocumentData : 'UNKNOWN'
      };
    case 'DELETE':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: null,
        previous: rxChangeEvent.previousDocumentData
      };
  }
}

/**
 * Flattens the given events into a single array of events.
 * Used mostly in tests.
 */
function flattenEvents(input) {
  var output = [];
  if (Array.isArray(input)) {
    input.forEach(function (inputItem) {
      var add = flattenEvents(inputItem);
      output = output.concat(add);
    });
  } else {
    if (input.id && input.events) {
      // is bulk
      input.events.forEach(function (ev) {
        return output.push(ev);
      });
    } else {
      output.push(input);
    }
  }
  var usedIds = new Set();
  var nonDuplicate = [];
  output.forEach(function (ev) {
    if (!usedIds.has(ev.eventId)) {
      usedIds.add(ev.eventId);
      nonDuplicate.push(ev);
    }
  });
  return nonDuplicate;
}
//# sourceMappingURL=rx-change-event.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-schema-helper.js




/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
function getPseudoSchemaForVersion(version, primaryKey) {
  var _properties;
  var pseudoSchema = fillWithDefaultSettings({
    version: version,
    type: 'object',
    primaryKey: primaryKey,
    properties: (_properties = {}, _properties[primaryKey] = {
      type: 'string',
      maxLength: 100
    }, _properties),
    required: [primaryKey]
  });
  return pseudoSchema;
}

/**
 * Returns the sub-schema for a given path
 */
function getSchemaByObjectPath(rxJsonSchema, path) {
  var usePath = path;
  usePath = usePath.replace(/\./g, '.properties.');
  usePath = 'properties.' + usePath;
  usePath = trimDots(usePath);
  var ret = object_path_default().get(rxJsonSchema, usePath);
  return ret;
}
function fillPrimaryKey(primaryPath, jsonSchema, documentData) {
  var cloned = util_flatClone(documentData);
  var newPrimary = getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData);
  var existingPrimary = documentData[primaryPath];
  if (existingPrimary && existingPrimary !== newPrimary) {
    throw newRxError('DOC19', {
      args: {
        documentData: documentData,
        existingPrimary: existingPrimary,
        newPrimary: newPrimary
      },
      schema: jsonSchema
    });
  }
  cloned[primaryPath] = newPrimary;
  return cloned;
}
function rx_schema_helper_getPrimaryFieldOfPrimaryKey(primaryKey) {
  if (typeof primaryKey === 'string') {
    return primaryKey;
  } else {
    return primaryKey.key;
  }
}

/**
 * Returns the composed primaryKey of a document by its data.
 */
function getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData) {
  if (typeof jsonSchema.primaryKey === 'string') {
    return documentData[jsonSchema.primaryKey];
  }
  var compositePrimary = jsonSchema.primaryKey;
  return compositePrimary.fields.map(function (field) {
    var value = object_path_default().get(documentData, field);
    if (typeof value === 'undefined') {
      throw newRxError('DOC18', {
        args: {
          field: field,
          documentData: documentData
        }
      });
    }
    return value;
  }).join(compositePrimary.separator);
}

/**
 * Normalize the RxJsonSchema.
 * We need this to ensure everything is set up properly
 * and we have the same hash on schemas that represent the same value but
 * have different json.
 * 
 * - Orders the schemas attributes by alphabetical order
 * - Adds the primaryKey to all indexes that do not contain the primaryKey
 * - We need this for determinstic sort order on all queries, which is required for event-reduce to work.
 *
 * @return RxJsonSchema - ordered and filled
 */
function normalizeRxJsonSchema(jsonSchema) {
  // TODO do we need the deep clone() here?
  var normalizedSchema = sortObject(util_clone(jsonSchema));

  // indexes must NOT be sorted because sort order is important here.
  if (jsonSchema.indexes) {
    normalizedSchema.indexes = Array.from(jsonSchema.indexes);
  }

  // primaryKey.fields must NOT be sorted because sort order is important here.
  if (typeof normalizedSchema.primaryKey === 'object' && typeof jsonSchema.primaryKey === 'object') {
    normalizedSchema.primaryKey.fields = jsonSchema.primaryKey.fields;
  }
  return normalizedSchema;
}

/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */
function fillWithDefaultSettings(schemaObj) {
  schemaObj = util_flatClone(schemaObj);
  var primaryPath = rx_schema_helper_getPrimaryFieldOfPrimaryKey(schemaObj.primaryKey);
  schemaObj.properties = util_flatClone(schemaObj.properties);

  // additionalProperties is always false
  schemaObj.additionalProperties = false;

  // fill with key-compression-state ()
  if (!schemaObj.hasOwnProperty('keyCompression')) {
    schemaObj.keyCompression = false;
  }

  // indexes must be array
  schemaObj.indexes = schemaObj.indexes ? schemaObj.indexes.slice(0) : [];

  // required must be array
  schemaObj.required = schemaObj.required ? schemaObj.required.slice(0) : [];

  // encrypted must be array
  schemaObj.encrypted = schemaObj.encrypted ? schemaObj.encrypted.slice(0) : [];

  /**
   * TODO we should not need to add the internal fields to the schema.
   * Better remove the fields before validation.
   */
  // add _rev
  schemaObj.properties._rev = {
    type: 'string',
    minLength: 1
  };

  // add attachments
  schemaObj.properties._attachments = {
    type: 'object'
  };

  // add deleted flag
  schemaObj.properties._deleted = {
    type: 'boolean'
  };

  // add meta property
  schemaObj.properties._meta = RX_META_SCHEMA;

  /**
   * meta fields are all required
   */
  schemaObj.required = schemaObj.required ? schemaObj.required.slice(0) : [];
  schemaObj.required.push('_deleted');
  schemaObj.required.push('_rev');
  schemaObj.required.push('_meta');
  schemaObj.required.push('_attachments');

  // final fields are always required
  var finalFields = getFinalFields(schemaObj);
  schemaObj.required = schemaObj.required.concat(finalFields).filter(function (field) {
    return !field.includes('.');
  }).filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  }); // unique;

  // version is 0 by default
  schemaObj.version = schemaObj.version || 0;

  /**
   * Append primary key to indexes that do not contain the primaryKey.
   * All indexes must have the primaryKey to ensure a deterministic sort order.
   */
  if (schemaObj.indexes) {
    schemaObj.indexes = schemaObj.indexes.map(function (index) {
      var arIndex = isMaybeReadonlyArray(index) ? index.slice(0) : [index];
      if (!arIndex.includes(primaryPath)) {
        var modifiedIndex = arIndex.slice(0);
        modifiedIndex.push(primaryPath);
        return modifiedIndex;
      }
      return arIndex;
    });
  }
  return schemaObj;
}
var RX_META_SCHEMA = {
  type: 'object',
  properties: {
    /**
     * The last-write time.
     * Unix time in milliseconds.
     */
    lwt: {
      type: 'number',
      /**
       * We use 1 as minimum so that the value is never falsy.
       */
      minimum: RX_META_LWT_MINIMUM,
      maximum: 1000000000000000,
      multipleOf: 0.01
    }
  },
  /**
   * Additional properties are allowed
   * and can be used by plugins to set various flags.
   */
  additionalProperties: true,
  required: ['lwt']
};

/**
 * returns the final-fields of the schema
 * @return field-names of the final-fields
 */
function getFinalFields(jsonSchema) {
  var ret = Object.keys(jsonSchema.properties).filter(function (key) {
    return jsonSchema.properties[key]["final"];
  });

  // primary is also final
  var primaryPath = rx_schema_helper_getPrimaryFieldOfPrimaryKey(jsonSchema.primaryKey);
  ret.push(primaryPath);

  // fields of composite primary are final
  if (typeof jsonSchema.primaryKey !== 'string') {
    jsonSchema.primaryKey.fields.forEach(function (field) {
      return ret.push(field);
    });
  }
  return ret;
}
var DEFAULT_CHECKPOINT_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string'
    },
    lwt: {
      type: 'number'
    }
  },
  required: ['id', 'lwt'],
  additionalProperties: false
};
//# sourceMappingURL=rx-schema-helper.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-storage-helper.js
/**
 * Helper functions for accessing the RxStorage instances.
 */





/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
var rx_storage_helper_writeSingle = function writeSingle(instance, writeRow, context) {
  try {
    return Promise.resolve(instance.bulkWrite([writeRow], context)).then(function (writeResult) {
      if (Object.keys(writeResult.error).length > 0) {
        var error = firstPropertyValueOfObject(writeResult.error);
        throw error;
      } else {
        var ret = firstPropertyValueOfObject(writeResult.success);
        return ret;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Checkpoints must be stackable over another.
 * This is required form some RxStorage implementations
 * like the sharding plugin, where a checkpoint only represents
 * the document state from some, but not all shards.
 */
var rx_storage_helper_getSingleDocument = function getSingleDocument(storageInstance, documentId) {
  try {
    return Promise.resolve(storageInstance.findDocumentsById([documentId], false)).then(function (results) {
      var doc = results[documentId];
      if (doc) {
        return doc;
      } else {
        return null;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var INTERNAL_STORAGE_NAME = '_rxdb_internal';
var RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';
function stackCheckpoints(checkpoints) {
  return Object.assign.apply(Object, [{}].concat(checkpoints));
}
function storageChangeEventToRxChangeEvent(isLocal, rxStorageChangeEvent, rxCollection) {
  var documentData = rxStorageChangeEvent.documentData;
  var previousDocumentData = rxStorageChangeEvent.previousDocumentData;
  var ret = {
    eventId: rxStorageChangeEvent.eventId,
    documentId: rxStorageChangeEvent.documentId,
    collectionName: rxCollection ? rxCollection.name : undefined,
    startTime: rxStorageChangeEvent.startTime,
    endTime: rxStorageChangeEvent.endTime,
    isLocal: isLocal,
    operation: rxStorageChangeEvent.operation,
    documentData: overwritable.deepFreezeWhenDevMode(documentData),
    previousDocumentData: overwritable.deepFreezeWhenDevMode(previousDocumentData)
  };
  return ret;
}
function throwIfIsStorageWriteError(collection, documentId, writeData, error) {
  if (error) {
    if (error.status === 409) {
      throw newRxError('COL19', {
        collection: collection.name,
        id: documentId,
        error: error,
        data: writeData
      });
    } else {
      throw error;
    }
  }
}
function getNewestOfDocumentStates(primaryPath, docs) {
  var ret = null;
  docs.forEach(function (doc) {
    if (!ret || doc._meta.lwt > ret._meta.lwt || doc._meta.lwt === ret._meta.lwt && doc[primaryPath] > ret[primaryPath]) {
      ret = doc;
    }
  });
  return util_ensureNotFalsy(ret);
}

/**
 * Analyzes a list of BulkWriteRows and determines
 * which documents must be inserted, updated or deleted
 * and which events must be emitted and which documents cause a conflict
 * and must not be written.
 * Used as helper inside of some RxStorage implementations.
 */
function categorizeBulkWriteRows(storageInstance, primaryPath,
/**
 * Current state of the documents
 * inside of the storage. Used to determine
 * which writes cause conflicts.
 * This can be a Map for better performance
 * but it can also be an object because some storages
 * need to work with something that is JSON-stringify-able
 * and we do not want to transform a big object into a Map
 * each time we use it.
 */
docsInDb,
/**
 * The write rows that are passed to
 * RxStorageInstance().bulkWrite().
 */
bulkWriteRows, context) {
  var hasAttachments = !!storageInstance.schema.attachments;
  var bulkInsertDocs = [];
  var bulkUpdateDocs = [];
  var errors = {};
  var changedDocumentIds = [];
  var eventBulk = {
    id: randomCouchString(10),
    events: [],
    checkpoint: null,
    context: context
  };
  var attachmentsAdd = [];
  var attachmentsRemove = [];
  var attachmentsUpdate = [];
  var startTime = util_now();
  var docsByIdIsMap = typeof docsInDb.get === 'function';
  bulkWriteRows.forEach(function (writeRow) {
    var id = writeRow.document[primaryPath];
    var documentInDb = docsByIdIsMap ? docsInDb.get(id) : docsInDb[id];
    var attachmentError;
    if (!documentInDb) {
      /**
       * It is possible to insert already deleted documents,
       * this can happen on replication.
       */
      var insertedIsDeleted = writeRow.document._deleted ? true : false;
      Object.entries(writeRow.document._attachments).forEach(function (_ref) {
        var attachmentId = _ref[0],
          attachmentData = _ref[1];
        if (!attachmentData.data) {
          attachmentError = {
            documentId: id,
            isError: true,
            status: 510,
            writeRow: writeRow
          };
          errors[id] = attachmentError;
        } else {
          attachmentsAdd.push({
            documentId: id,
            attachmentId: attachmentId,
            attachmentData: attachmentData
          });
        }
      });
      if (!attachmentError) {
        if (hasAttachments) {
          bulkInsertDocs.push(stripAttachmentsDataFromRow(writeRow));
        } else {
          bulkInsertDocs.push(writeRow);
        }
      }
      if (!insertedIsDeleted) {
        changedDocumentIds.push(id);
        eventBulk.events.push({
          eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow),
          documentId: id,
          operation: 'INSERT',
          documentData: hasAttachments ? stripAttachmentsDataFromDocument(writeRow.document) : writeRow.document,
          previousDocumentData: hasAttachments && writeRow.previous ? stripAttachmentsDataFromDocument(writeRow.previous) : writeRow.previous,
          startTime: startTime,
          endTime: util_now()
        });
      }
    } else {
      // update existing document
      var revInDb = documentInDb._rev;

      /**
       * Check for conflict
       */
      if (!writeRow.previous || !!writeRow.previous && revInDb !== writeRow.previous._rev) {
        // is conflict error
        var err = {
          isError: true,
          status: 409,
          documentId: id,
          writeRow: writeRow,
          documentInDb: documentInDb
        };
        errors[id] = err;
        return;
      }

      // handle attachments data
      if (writeRow.document._deleted) {
        /**
         * Deleted documents must have cleared all their attachments.
         */
        if (writeRow.previous) {
          Object.keys(writeRow.previous._attachments).forEach(function (attachmentId) {
            attachmentsRemove.push({
              documentId: id,
              attachmentId: attachmentId
            });
          });
        }
      } else {
        // first check for errors
        Object.entries(writeRow.document._attachments).find(function (_ref2) {
          var attachmentId = _ref2[0],
            attachmentData = _ref2[1];
          var previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;
          if (!previousAttachmentData && !attachmentData.data) {
            attachmentError = {
              documentId: id,
              documentInDb: documentInDb,
              isError: true,
              status: 510,
              writeRow: writeRow
            };
          }
          return true;
        });
        if (!attachmentError) {
          Object.entries(writeRow.document._attachments).forEach(function (_ref3) {
            var attachmentId = _ref3[0],
              attachmentData = _ref3[1];
            var previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;
            if (!previousAttachmentData) {
              attachmentsAdd.push({
                documentId: id,
                attachmentId: attachmentId,
                attachmentData: attachmentData
              });
            } else {
              if (attachmentData.data && attachmentData.digest !== previousAttachmentData.digest) {
                attachmentsUpdate.push({
                  documentId: id,
                  attachmentId: attachmentId,
                  attachmentData: attachmentData
                });
              }
            }
          });
        }
      }
      if (attachmentError) {
        errors[id] = attachmentError;
      } else {
        if (hasAttachments) {
          bulkUpdateDocs.push(stripAttachmentsDataFromRow(writeRow));
        } else {
          bulkUpdateDocs.push(writeRow);
        }
      }
      var writeDoc = writeRow.document;
      var eventDocumentData = null;
      var previousEventDocumentData = null;
      var operation = null;
      if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
        operation = 'INSERT';
        eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc;
      } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
        operation = 'UPDATE';
        eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc;
        previousEventDocumentData = writeRow.previous;
      } else if (writeDoc._deleted) {
        operation = 'DELETE';
        eventDocumentData = util_ensureNotFalsy(writeRow.document);
        previousEventDocumentData = writeRow.previous;
      } else {
        throw newRxError('SNH', {
          args: {
            writeRow: writeRow
          }
        });
      }
      changedDocumentIds.push(id);
      eventBulk.events.push({
        eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow),
        documentId: id,
        documentData: util_ensureNotFalsy(eventDocumentData),
        previousDocumentData: previousEventDocumentData,
        operation: operation,
        startTime: startTime,
        endTime: util_now()
      });
    }
  });
  return {
    bulkInsertDocs: bulkInsertDocs,
    bulkUpdateDocs: bulkUpdateDocs,
    errors: errors,
    changedDocumentIds: changedDocumentIds,
    eventBulk: eventBulk,
    attachmentsAdd: attachmentsAdd,
    attachmentsRemove: attachmentsRemove,
    attachmentsUpdate: attachmentsUpdate
  };
}
function stripAttachmentsDataFromRow(writeRow) {
  return {
    previous: writeRow.previous,
    document: stripAttachmentsDataFromDocument(writeRow.document)
  };
}
function stripAttachmentsDataFromDocument(doc) {
  var useDoc = util_flatClone(doc);
  useDoc._attachments = {};
  Object.entries(doc._attachments).forEach(function (_ref4) {
    var attachmentId = _ref4[0],
      attachmentData = _ref4[1];
    useDoc._attachments[attachmentId] = {
      digest: attachmentData.digest,
      length: attachmentData.length,
      type: attachmentData.type
    };
  });
  return useDoc;
}

/**
 * Flat clone the document data
 * and also the _meta field.
 * Used many times when we want to change the meta
 * during replication etc.
 */
function flatCloneDocWithMeta(doc) {
  var ret = util_flatClone(doc);
  ret._meta = util_flatClone(doc._meta);
  return ret;
}

/**
 * Each event is labeled with the id
 * to make it easy to filter out duplicates.
 */
function getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow) {
  var docId = writeRow.document[primaryPath];
  var binaryValues = [!!writeRow.previous, writeRow.previous && writeRow.previous._deleted, !!writeRow.document._deleted];
  var binary = binaryValues.map(function (v) {
    return v ? '1' : '0';
  }).join('');
  var eventKey = storageInstance.databaseName + '|' + storageInstance.collectionName + '|' + docId + '|' + '|' + binary + '|' + writeRow.document._rev;
  return eventKey;
}

/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */
function getWrappedStorageInstance(database, storageInstance,
/**
 * The original RxJsonSchema
 * before it was mutated by hooks.
 */
rxJsonSchema) {
  overwritable.deepFreezeWhenDevMode(rxJsonSchema);
  var primaryPath = rx_schema_helper_getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);
  function transformDocumentDataFromRxDBToRxStorage(writeRow) {
    var data = util_flatClone(writeRow.document);
    data._meta = util_flatClone(data._meta);

    /**
     * Do some checks in dev-mode
     * that would be too performance expensive
     * in production.
     */
    if (overwritable.isDevMode()) {
      // ensure that the primary key has not been changed
      data = fillPrimaryKey(primaryPath, rxJsonSchema, data);

      /**
       * Ensure that the new revision is higher
       * then the previous one
       */
      if (writeRow.previous) {
        // TODO run this in the dev-mode plugin
        // const prev = parseRevision(writeRow.previous._rev);
        // const current = parseRevision(writeRow.document._rev);
        // if (current.height <= prev.height) {
        //     throw newRxError('SNH', {
        //         dataBefore: writeRow.previous,
        //         dataAfter: writeRow.document,
        //         args: {
        //             prev,
        //             current
        //         }
        //     });
        // }
      }

      /**
       * Ensure that _meta fields have been merged
       * and not replaced.
       * This is important so that when one plugin A
       * sets a _meta field and another plugin B does a write
       * to the document, it must be ensured that the
       * field of plugin A was not removed.
       */
      if (writeRow.previous) {
        Object.keys(writeRow.previous._meta).forEach(function (metaFieldName) {
          if (!writeRow.document._meta.hasOwnProperty(metaFieldName)) {
            throw newRxError('SNH', {
              dataBefore: writeRow.previous,
              dataAfter: writeRow.document
            });
          }
        });
      }
    }
    data._meta.lwt = util_now();

    /**
     * Yes we really want to set the revision here.
     * If you make a plugin that relies on having it's own revision
     * stored into the storage, use this.originalStorageInstance.bulkWrite() instead.
     */
    data._rev = util_createRevision(database.hashFunction, data, writeRow.previous);
    return {
      document: data,
      previous: writeRow.previous
    };
  }
  var ret = {
    schema: storageInstance.schema,
    internals: storageInstance.internals,
    collectionName: storageInstance.collectionName,
    databaseName: storageInstance.databaseName,
    options: storageInstance.options,
    bulkWrite: function bulkWrite(rows, context) {
      var toStorageWriteRows = rows.map(function (row) {
        return transformDocumentDataFromRxDBToRxStorage(row);
      });
      return database.lockedRun(function () {
        return storageInstance.bulkWrite(toStorageWriteRows, context);
      })
      /**
       * The RxStorageInstance MUST NOT allow to insert already _deleted documents,
       * without sending the previous document version.
       * But for better developer experience, RxDB does allow to re-insert deleted documents.
       * We do this by automatically fixing the conflict errors for that case
       * by running another bulkWrite() and merging the results.
       * @link https://github.com/pubkey/rxdb/pull/3839
       */.then(function (writeResult) {
        var reInsertErrors = Object.values(writeResult.error).filter(function (error) {
          if (error.status === 409 && !error.writeRow.previous && !error.writeRow.document._deleted && util_ensureNotFalsy(error.documentInDb)._deleted) {
            return true;
          }
          return false;
        });
        if (reInsertErrors.length > 0) {
          var useWriteResult = {
            error: util_flatClone(writeResult.error),
            success: util_flatClone(writeResult.success)
          };
          var reInserts = reInsertErrors.map(function (error) {
            delete useWriteResult.error[error.documentId];
            return {
              previous: error.documentInDb,
              document: Object.assign({}, error.writeRow.document, {
                _rev: util_createRevision(database.hashFunction, error.writeRow.document, error.documentInDb)
              })
            };
          });
          return database.lockedRun(function () {
            return storageInstance.bulkWrite(reInserts, context);
          }).then(function (subResult) {
            useWriteResult.error = Object.assign(useWriteResult.error, subResult.error);
            useWriteResult.success = Object.assign(useWriteResult.success, subResult.success);
            return useWriteResult;
          });
        }
        return writeResult;
      });
    },
    query: function query(preparedQuery) {
      return database.lockedRun(function () {
        return storageInstance.query(preparedQuery);
      });
    },
    findDocumentsById: function findDocumentsById(ids, deleted) {
      return database.lockedRun(function () {
        return storageInstance.findDocumentsById(ids, deleted);
      });
    },
    getAttachmentData: function getAttachmentData(documentId, attachmentId) {
      return database.lockedRun(function () {
        return storageInstance.getAttachmentData(documentId, attachmentId);
      });
    },
    getChangedDocumentsSince: function getChangedDocumentsSince(limit, checkpoint) {
      return database.lockedRun(function () {
        return storageInstance.getChangedDocumentsSince(limit, checkpoint);
      });
    },
    cleanup: function cleanup(minDeletedTime) {
      return database.lockedRun(function () {
        return storageInstance.cleanup(minDeletedTime);
      });
    },
    remove: function remove() {
      return database.lockedRun(function () {
        return storageInstance.remove();
      });
    },
    close: function close() {
      return database.lockedRun(function () {
        return storageInstance.close();
      });
    },
    changeStream: function changeStream() {
      return storageInstance.changeStream();
    },
    conflictResultionTasks: function conflictResultionTasks() {
      return storageInstance.conflictResultionTasks();
    },
    resolveConflictResultionTask: function resolveConflictResultionTask(taskSolution) {
      if (taskSolution.output.isEqual) {
        return storageInstance.resolveConflictResultionTask(taskSolution);
      }
      var doc = Object.assign({}, taskSolution.output.documentData, {
        _meta: getDefaultRxDocumentMeta(),
        _rev: util_getDefaultRevision(),
        _attachments: {}
      });
      var documentData = util_flatClone(doc);
      delete documentData._meta;
      delete documentData._rev;
      delete documentData._attachments;
      return storageInstance.resolveConflictResultionTask({
        id: taskSolution.id,
        output: {
          isEqual: false,
          documentData: documentData
        }
      });
    }
  };
  ret.originalStorageInstance = storageInstance;
  return ret;
}

/**
 * Each RxStorage implementation should
 * run this method at the first step of createStorageInstance()
 * to ensure that the configuration is correct.
 */
function rx_storage_helper_ensureRxStorageInstanceParamsAreCorrect(params) {
  if (params.schema.keyCompression) {
    throw newRxError('UT5', {
      args: {
        params: params
      }
    });
  }
  if (hasEncryption(params.schema)) {
    throw newRxError('UT6', {
      args: {
        params: params
      }
    });
  }
}
function hasEncryption(jsonSchema) {
  if (!!jsonSchema.encrypted && jsonSchema.encrypted.length > 0 || jsonSchema.attachments && jsonSchema.attachments.encrypted) {
    return true;
  } else {
    return false;
  }
}
//# sourceMappingURL=rx-storage-helper.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-document.js










function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }
        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }
    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }
    pact.s = state;
    pact.v = value;
    var observer = pact.o;
    if (observer) {
      observer(pact);
    }
  }
}
var _Pact = /*#__PURE__*/function () {
  function _Pact() {}
  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;
    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;
      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }
        return result;
      } else {
        return this;
      }
    }
    this.o = function (_this) {
      try {
        var value = _this.v;
        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };
    return result;
  };
  return _Pact;
}();
function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}
function _for(test, update, body) {
  var stage;
  for (;;) {
    var shouldContinue = test();
    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }
    if (!shouldContinue) {
      return result;
    }
    if (shouldContinue.then) {
      stage = 0;
      break;
    }
    var result = body();
    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }
    if (update) {
      var updateValue = update();
      if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }
  var pact = new _Pact();
  var reject = _settle.bind(null, pact, 2);
  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;
  function _resumeAfterBody(value) {
    result = value;
    do {
      if (update) {
        updateValue = update();
        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }
      shouldContinue = test();
      if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
        _settle(pact, 1, result);
        return;
      }
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }
      result = body();
      if (_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);
    result.then(_resumeAfterBody).then(void 0, reject);
  }
  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();
      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
}
var basePrototype = {
  /**
   * TODO
   * instead of appliying the _this-hack
   * we should make these accesors functions instead of getters.
   */
  get _data() {
    var _this = this;
    /**
     * Might be undefined when vuejs-devtools are used
     * @link https://github.com/pubkey/rxdb/issues/1126
     */
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._dataSync$.getValue();
  },
  get primaryPath() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this.collection.schema.primaryPath;
  },
  get primary() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._data[_this.primaryPath];
  },
  get revision() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._data._rev;
  },
  get deleted$() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._isDeleted$.asObservable();
  },
  get deleted() {
    var _this = this;
    if (!_this.isInstanceOfRxDocument) {
      return undefined;
    }
    return _this._isDeleted$.getValue();
  },
  /**
   * returns the observable which emits the plain-data of this document
   */
  get $() {
    var _this = this;
    return _this._dataSync$.asObservable().pipe(map(function (docData) {
      return overwritable.deepFreezeWhenDevMode(docData);
    }));
  },
  _handleChangeEvent: function _handleChangeEvent(changeEvent) {
    if (changeEvent.documentId !== this.primary) {
      return;
    }

    // ensure that new _rev is higher then current
    var docData = getDocumentDataOfRxChangeEvent(changeEvent);
    var newRevNr = getHeightOfRevision(docData._rev);
    var currentRevNr = getHeightOfRevision(this._data._rev);
    if (currentRevNr > newRevNr) return;
    switch (changeEvent.operation) {
      case 'INSERT':
        break;
      case 'UPDATE':
        var newData = changeEvent.documentData;
        this._dataSync$.next(newData);
        break;
      case 'DELETE':
        // remove from docCache to assure new upserted RxDocuments will be a new instance
        this.collection._docCache["delete"](this.primary);
        this._isDeleted$.next(true);
        break;
    }
  },
  /**
   * returns observable of the value of the given path
   */get$: function get$(path) {
    if (path.includes('.item.')) {
      throw newRxError('DOC1', {
        path: path
      });
    }
    if (path === this.primaryPath) throw newRxError('DOC2');

    // final fields cannot be modified and so also not observed
    if (this.collection.schema.finalFields.includes(path)) {
      throw newRxError('DOC3', {
        path: path
      });
    }
    var schemaObj = getSchemaByObjectPath(this.collection.schema.jsonSchema, path);
    if (!schemaObj) {
      throw newRxError('DOC4', {
        path: path
      });
    }
    return this._dataSync$.pipe(map(function (data) {
      return object_path_default().get(data, path);
    }), distinctUntilChanged());
  },
  /**
   * populate the given path
   */populate: function populate(path) {
    var schemaObj = getSchemaByObjectPath(this.collection.schema.jsonSchema, path);
    var value = this.get(path);
    if (!value) {
      return PROMISE_RESOLVE_NULL;
    }
    if (!schemaObj) {
      throw newRxError('DOC5', {
        path: path
      });
    }
    if (!schemaObj.ref) {
      throw newRxError('DOC6', {
        path: path,
        schemaObj: schemaObj
      });
    }
    var refCollection = this.collection.database.collections[schemaObj.ref];
    if (!refCollection) {
      throw newRxError('DOC7', {
        ref: schemaObj.ref,
        path: path,
        schemaObj: schemaObj
      });
    }
    if (schemaObj.type === 'array') {
      return refCollection.findByIds(value).then(function (res) {
        var valuesIterator = res.values();
        return Array.from(valuesIterator);
      });
    } else {
      return refCollection.findOne(value).exec();
    }
  },
  /**
   * get data by objectPath
   */get: function get(objPath) {
    if (!this._data) return undefined;
    var valueObj = object_path_default().get(this._data, objPath);

    // direct return if array or non-object
    if (typeof valueObj !== 'object' || Array.isArray(valueObj)) {
      return overwritable.deepFreezeWhenDevMode(valueObj);
    }

    /**
     * TODO find a way to deep-freeze together with defineGetterSetter
     * so we do not have to do a deep clone here.
     */
    valueObj = util_clone(valueObj);
    defineGetterSetter(this.collection.schema, valueObj, objPath, this);
    return valueObj;
  },
  toJSON: function toJSON() {
    var withMetaFields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    if (!withMetaFields) {
      var data = util_flatClone(this._data);
      delete data._rev;
      delete data._attachments;
      delete data._deleted;
      delete data._meta;
      return overwritable.deepFreezeWhenDevMode(data);
    } else {
      return overwritable.deepFreezeWhenDevMode(this._data);
    }
  },
  toMutableJSON: function toMutableJSON() {
    var withMetaFields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    return util_clone(this.toJSON(withMetaFields));
  },
  /**
   * updates document
   * @overwritten by plugin (optinal)
   * @param updateObj mongodb-like syntax
   */update: function update(_updateObj) {
    throw pluginMissing('update');
  },
  putAttachment: function putAttachment() {
    throw pluginMissing('attachments');
  },
  getAttachment: function getAttachment() {
    throw pluginMissing('attachments');
  },
  allAttachments: function allAttachments() {
    throw pluginMissing('attachments');
  },
  get allAttachments$() {
    throw pluginMissing('attachments');
  },
  /**
   * runs an atomic update over the document
   * @param function that takes the document-data and returns a new data-object
   */atomicUpdate: function atomicUpdate(mutationFunction) {
    var _this2 = this;
    return new Promise(function (res, rej) {
      _this2._atomicQueue = _this2._atomicQueue.then(function () {
        try {
          var _temp6 = function _temp6(_result3) {
            if (_exit2) return _result3;
            res(_this2);
          };
          var _exit2 = false;
          var done = false;
          // we need a hacky while loop to stay incide the chain-link of _atomicQueue
          // while still having the option to run a retry on conflicts
          var _temp7 = _for(function () {
            return !_exit2 && !done;
          }, void 0, function () {
            function _temp3(_result) {
              if (_exit2) return _result;
              var _temp = _catch(function () {
                return Promise.resolve(_this2._saveData(newData, oldData)).then(function () {
                  done = true;
                });
              }, function (err) {
                var useError = err.parameters && err.parameters.error ? err.parameters.error : err;
                /**
                 * conflicts cannot happen by just using RxDB in one process
                 * There are two ways they still can appear which is
                 * replication and multi-tab usage
                 * Because atomicUpdate has a mutation function,
                 * we can just re-run the mutation until there is no conflict
                 */
                var isConflict = rx_error_isBulkWriteConflictError(useError);
                if (isConflict) {} else {
                  rej(useError);
                  _exit2 = true;
                }
              });
              if (_temp && _temp.then) return _temp.then(function () {});
            }
            var oldData = _this2._dataSync$.getValue();
            // always await because mutationFunction might be async
            var newData;
            var _temp2 = _catch(function () {
              return Promise.resolve(mutationFunction(util_clone(oldData), _this2)).then(function (_mutationFunction) {
                newData = _mutationFunction;
                if (_this2.collection) {
                  newData = _this2.collection.schema.fillObjectWithDefaults(newData);
                }
              });
            }, function (err) {
              rej(err);
              _exit2 = true;
            });
            return _temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2);
          });
          return Promise.resolve(_temp7 && _temp7.then ? _temp7.then(_temp6) : _temp6(_temp7));
        } catch (e) {
          return Promise.reject(e);
        }
      });
    });
  },
  /**
   * patches the given properties
   */atomicPatch: function atomicPatch(patch) {
    return this.atomicUpdate(function (docData) {
      Object.entries(patch).forEach(function (_ref) {
        var k = _ref[0],
          v = _ref[1];
        docData[k] = v;
      });
      return docData;
    });
  },
  /**
   * saves the new document-data
   * and handles the events
   */_saveData: function _saveData(newData, oldData) {
    try {
      var _this4 = this;
      newData = util_flatClone(newData);

      // deleted documents cannot be changed
      if (_this4._isDeleted$.getValue()) {
        throw newRxError('DOC11', {
          id: _this4.primary,
          document: _this4
        });
      }

      /**
       * Meta values must always be merged
       * instead of overwritten.
       * This ensures that different plugins do not overwrite
       * each others meta properties.
       */
      newData._meta = Object.assign({}, oldData._meta, newData._meta);

      // ensure modifications are ok
      if (overwritable.isDevMode()) {
        _this4.collection.schema.validateChange(oldData, newData);
      }
      return Promise.resolve(_this4.collection._runHooks('pre', 'save', newData, _this4)).then(function () {
        return Promise.resolve(_this4.collection.storageInstance.bulkWrite([{
          previous: oldData,
          document: newData
        }], 'rx-document-save-data')).then(function (writeResult) {
          var isError = writeResult.error[_this4.primary];
          throwIfIsStorageWriteError(_this4.collection, _this4.primary, newData, isError);
          return _this4.collection._runHooks('post', 'save', newData, _this4);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },
  /**
   * remove the document,
   * this not not equal to a pouchdb.remove(),
   * instead we keep the values and only set _deleted: true
   */remove: function remove() {
    var _this5 = this;
    var collection = this.collection;
    if (this.deleted) {
      return Promise.reject(newRxError('DOC13', {
        document: this,
        id: this.primary
      }));
    }
    var deletedData = util_flatClone(this._data);
    return collection._runHooks('pre', 'remove', deletedData, this).then(function () {
      try {
        deletedData._deleted = true;
        return Promise.resolve(collection.storageInstance.bulkWrite([{
          previous: _this5._data,
          document: deletedData
        }], 'rx-document-remove')).then(function (writeResult) {
          var isError = writeResult.error[_this5.primary];
          throwIfIsStorageWriteError(collection, _this5.primary, deletedData, isError);
          return util_ensureNotFalsy(writeResult.success[_this5.primary]);
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }).then(function () {
      return _this5.collection._runHooks('post', 'remove', deletedData, _this5);
    }).then(function () {
      return _this5;
    });
  },
  destroy: function destroy() {
    throw newRxError('DOC14');
  }
};
function createRxDocumentConstructor() {
  var proto = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : basePrototype;
  var constructor = function RxDocumentConstructor(collection, jsonData) {
    this.collection = collection;

    // assume that this is always equal to the doc-data in the database
    this._dataSync$ = new BehaviorSubject(jsonData);
    this._isDeleted$ = new BehaviorSubject(false);
    this._atomicQueue = PROMISE_RESOLVE_VOID;

    /**
     * because of the prototype-merge,
     * we can not use the native instanceof operator
     */
    this.isInstanceOfRxDocument = true;
  };
  constructor.prototype = proto;
  return constructor;
}
function defineGetterSetter(schema, valueObj) {
  var objPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var thisObj = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  if (valueObj === null) return;
  var pathProperties = getSchemaByObjectPath(schema.jsonSchema, objPath);
  if (typeof pathProperties === 'undefined') return;
  if (pathProperties.properties) pathProperties = pathProperties.properties;
  Object.keys(pathProperties).forEach(function (key) {
    var fullPath = trimDots(objPath + '.' + key);

    // getter - value
    valueObj.__defineGetter__(key, function () {
      var _this = thisObj ? thisObj : this;
      if (!_this.get || typeof _this.get !== 'function') {
        /**
         * When an object gets added to the state of a vuejs-component,
         * it happens that this getter is called with another scope.
         * To prevent errors, we have to return undefined in this case
         */
        return undefined;
      }
      var ret = _this.get(fullPath);
      return ret;
    });
    // getter - observable$
    Object.defineProperty(valueObj, key + '$', {
      get: function get() {
        var _this = thisObj ? thisObj : this;
        return _this.get$(fullPath);
      },
      enumerable: false,
      configurable: false
    });
    // getter - populate_
    Object.defineProperty(valueObj, key + '_', {
      get: function get() {
        var _this = thisObj ? thisObj : this;
        return _this.populate(fullPath);
      },
      enumerable: false,
      configurable: false
    });
    // setter - value
    valueObj.__defineSetter__(key, function (val) {
      var _this = thisObj ? thisObj : this;
      return _this.set(fullPath, val);
    });
  });
}
function createWithConstructor(constructor, collection, jsonData) {
  var primary = jsonData[collection.schema.primaryPath];
  if (primary && primary.startsWith('_design')) {
    return null;
  }
  var doc = new constructor(collection, jsonData);
  runPluginHooks('createRxDocument', doc);
  return doc;
}
function isRxDocument(obj) {
  if (typeof obj === 'undefined') return false;
  return !!obj.isInstanceOfRxDocument;
}
//# sourceMappingURL=rx-document.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-schema.js








var RxSchema = /*#__PURE__*/function () {
  function RxSchema(jsonSchema) {
    this.jsonSchema = jsonSchema;
    this.indexes = getIndexes(this.jsonSchema);

    // primary is always required
    this.primaryPath = rx_schema_helper_getPrimaryFieldOfPrimaryKey(this.jsonSchema.primaryKey);
    this.finalFields = getFinalFields(this.jsonSchema);
  }
  var _proto = RxSchema.prototype;
  /**
   * checks if a given change on a document is allowed
   * Ensures that:
   * - final fields are not modified
   * @throws {Error} if not valid
   */_proto.validateChange = function validateChange(dataBefore, dataAfter) {
    var _this = this;
    this.finalFields.forEach(function (fieldName) {
      if (!fast_deep_equal_default()(dataBefore[fieldName], dataAfter[fieldName])) {
        throw newRxError('DOC9', {
          dataBefore: dataBefore,
          dataAfter: dataAfter,
          fieldName: fieldName,
          schema: _this.jsonSchema
        });
      }
    });
  }

  /**
   * fills all unset fields with default-values if set
   */;
  _proto.fillObjectWithDefaults = function fillObjectWithDefaults(obj) {
    obj = util_flatClone(obj);
    Object.entries(this.defaultValues).filter(function (_ref) {
      var k = _ref[0];
      return !obj.hasOwnProperty(k) || typeof obj[k] === 'undefined';
    }).forEach(function (_ref2) {
      var k = _ref2[0],
        v = _ref2[1];
      return obj[k] = v;
    });
    return obj;
  }

  /**
   * creates the schema-based document-prototype,
   * see RxCollection.getDocumentPrototype()
   */;
  _proto.getDocumentPrototype = function getDocumentPrototype() {
    var proto = {};
    defineGetterSetter(this, proto, '');
    overwriteGetterForCaching(this, 'getDocumentPrototype', function () {
      return proto;
    });
    return proto;
  };
  _proto.getPrimaryOfDocumentData = function getPrimaryOfDocumentData(documentData) {
    return getComposedPrimaryKeyOfDocumentData(this.jsonSchema, documentData);
  };
  _createClass(RxSchema, [{
    key: "version",
    get: function get() {
      return this.jsonSchema.version;
    }
  }, {
    key: "defaultValues",
    get: function get() {
      var values = {};
      Object.entries(this.jsonSchema.properties).filter(function (_ref3) {
        var v = _ref3[1];
        return v.hasOwnProperty('default');
      }).forEach(function (_ref4) {
        var k = _ref4[0],
          v = _ref4[1];
        return values[k] = v["default"];
      });
      return overwriteGetterForCaching(this, 'defaultValues', values);
    }

    /**
     * @overrides itself on the first call
     */
  }, {
    key: "hash",
    get: function get() {
      return overwriteGetterForCaching(this, 'hash', fastUnsecureHash(JSON.stringify(this.jsonSchema)));
    }
  }]);
  return RxSchema;
}();
function getIndexes(jsonSchema) {
  return (jsonSchema.indexes || []).map(function (index) {
    return isMaybeReadonlyArray(index) ? index : [index];
  });
}

/**
 * array with previous version-numbers
 */
function getPreviousVersions(schema) {
  var version = schema.version ? schema.version : 0;
  var c = 0;
  return new Array(version).fill(0).map(function () {
    return c++;
  });
}
function createRxSchema(jsonSchema) {
  var runPreCreateHooks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  if (runPreCreateHooks) {
    runPluginHooks('preCreateRxSchema', jsonSchema);
  }
  var useJsonSchema = fillWithDefaultSettings(jsonSchema);
  useJsonSchema = normalizeRxJsonSchema(useJsonSchema);
  overwritable.deepFreezeWhenDevMode(useJsonSchema);
  var schema = new RxSchema(useJsonSchema);
  runPluginHooks('createRxSchema', schema);
  return schema;
}
function isInstanceOf(obj) {
  return obj instanceof RxSchema;
}

/**
 * Used as helper function the generate the document type out of the schema via typescript.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */
function toTypedRxJsonSchema(schema) {
  return schema;
}
//# sourceMappingURL=rx-schema.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/isArrayLike.js
var isArrayLike = (function (x) { return x && typeof x.length === 'number' && typeof x !== 'function'; });
//# sourceMappingURL=isArrayLike.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/isPromise.js

function isPromise(value) {
    return isFunction_isFunction(value === null || value === void 0 ? void 0 : value.then);
}
//# sourceMappingURL=isPromise.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/isInteropObservable.js


function isInteropObservable(input) {
    return isFunction_isFunction(input[observable]);
}
//# sourceMappingURL=isInteropObservable.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/isAsyncIterable.js

function isAsyncIterable(obj) {
    return Symbol.asyncIterator && isFunction_isFunction(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
}
//# sourceMappingURL=isAsyncIterable.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/throwUnobservableError.js
function createInvalidObservableTypeError(input) {
    return new TypeError("You provided " + (input !== null && typeof input === 'object' ? 'an invalid object' : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
}
//# sourceMappingURL=throwUnobservableError.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/symbol/iterator.js
function getSymbolIterator() {
    if (typeof Symbol !== 'function' || !Symbol.iterator) {
        return '@@iterator';
    }
    return Symbol.iterator;
}
var iterator_iterator = getSymbolIterator();
//# sourceMappingURL=iterator.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/isIterable.js


function isIterable(input) {
    return isFunction_isFunction(input === null || input === void 0 ? void 0 : input[iterator_iterator]);
}
//# sourceMappingURL=isIterable.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/isReadableStreamLike.js


function readableStreamLikeToAsyncGenerator(readableStream) {
    return __asyncGenerator(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
        var reader, _a, value, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    reader = readableStream.getReader();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 9, 10]);
                    _b.label = 2;
                case 2:
                    if (false) {}
                    return [4, __await(reader.read())];
                case 3:
                    _a = _b.sent(), value = _a.value, done = _a.done;
                    if (!done) return [3, 5];
                    return [4, __await(void 0)];
                case 4: return [2, _b.sent()];
                case 5: return [4, __await(value)];
                case 6: return [4, _b.sent()];
                case 7:
                    _b.sent();
                    return [3, 2];
                case 8: return [3, 10];
                case 9:
                    reader.releaseLock();
                    return [7];
                case 10: return [2];
            }
        });
    });
}
function isReadableStreamLike(obj) {
    return isFunction_isFunction(obj === null || obj === void 0 ? void 0 : obj.getReader);
}
//# sourceMappingURL=isReadableStreamLike.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/observable/innerFrom.js












function innerFrom(input) {
    if (input instanceof Observable_Observable) {
        return input;
    }
    if (input != null) {
        if (isInteropObservable(input)) {
            return fromInteropObservable(input);
        }
        if (isArrayLike(input)) {
            return fromArrayLike(input);
        }
        if (isPromise(input)) {
            return fromPromise(input);
        }
        if (isAsyncIterable(input)) {
            return fromAsyncIterable(input);
        }
        if (isIterable(input)) {
            return fromIterable(input);
        }
        if (isReadableStreamLike(input)) {
            return fromReadableStreamLike(input);
        }
    }
    throw createInvalidObservableTypeError(input);
}
function fromInteropObservable(obj) {
    return new Observable_Observable(function (subscriber) {
        var obs = obj[observable]();
        if (isFunction_isFunction(obs.subscribe)) {
            return obs.subscribe(subscriber);
        }
        throw new TypeError('Provided object does not correctly implement Symbol.observable');
    });
}
function fromArrayLike(array) {
    return new Observable_Observable(function (subscriber) {
        for (var i = 0; i < array.length && !subscriber.closed; i++) {
            subscriber.next(array[i]);
        }
        subscriber.complete();
    });
}
function fromPromise(promise) {
    return new Observable_Observable(function (subscriber) {
        promise
            .then(function (value) {
            if (!subscriber.closed) {
                subscriber.next(value);
                subscriber.complete();
            }
        }, function (err) { return subscriber.error(err); })
            .then(null, reportUnhandledError);
    });
}
function fromIterable(iterable) {
    return new Observable_Observable(function (subscriber) {
        var e_1, _a;
        try {
            for (var iterable_1 = __values(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
                var value = iterable_1_1.value;
                subscriber.next(value);
                if (subscriber.closed) {
                    return;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return)) _a.call(iterable_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        subscriber.complete();
    });
}
function fromAsyncIterable(asyncIterable) {
    return new Observable_Observable(function (subscriber) {
        innerFrom_process(asyncIterable, subscriber).catch(function (err) { return subscriber.error(err); });
    });
}
function fromReadableStreamLike(readableStream) {
    return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
}
function innerFrom_process(asyncIterable, subscriber) {
    var asyncIterable_1, asyncIterable_1_1;
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function () {
        var value, e_2_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, 6, 11]);
                    asyncIterable_1 = __asyncValues(asyncIterable);
                    _b.label = 1;
                case 1: return [4, asyncIterable_1.next()];
                case 2:
                    if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done)) return [3, 4];
                    value = asyncIterable_1_1.value;
                    subscriber.next(value);
                    if (subscriber.closed) {
                        return [2];
                    }
                    _b.label = 3;
                case 3: return [3, 1];
                case 4: return [3, 11];
                case 5:
                    e_2_1 = _b.sent();
                    e_2 = { error: e_2_1 };
                    return [3, 11];
                case 6:
                    _b.trys.push([6, , 9, 10]);
                    if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return))) return [3, 8];
                    return [4, _a.call(asyncIterable_1)];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [3, 10];
                case 9:
                    if (e_2) throw e_2.error;
                    return [7];
                case 10: return [7];
                case 11:
                    subscriber.complete();
                    return [2];
            }
        });
    });
}
//# sourceMappingURL=innerFrom.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/executeSchedule.js
function executeSchedule(parentSubscription, scheduler, work, delay, repeat) {
    if (delay === void 0) { delay = 0; }
    if (repeat === void 0) { repeat = false; }
    var scheduleSubscription = scheduler.schedule(function () {
        work();
        if (repeat) {
            parentSubscription.add(this.schedule(null, delay));
        }
        else {
            this.unsubscribe();
        }
    }, delay);
    parentSubscription.add(scheduleSubscription);
    if (!repeat) {
        return scheduleSubscription;
    }
}
//# sourceMappingURL=executeSchedule.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/mergeInternals.js



function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalFinalizer) {
    var buffer = [];
    var active = 0;
    var index = 0;
    var isComplete = false;
    var checkComplete = function () {
        if (isComplete && !buffer.length && !active) {
            subscriber.complete();
        }
    };
    var outerNext = function (value) { return (active < concurrent ? doInnerSub(value) : buffer.push(value)); };
    var doInnerSub = function (value) {
        expand && subscriber.next(value);
        active++;
        var innerComplete = false;
        innerFrom(project(value, index++)).subscribe(createOperatorSubscriber(subscriber, function (innerValue) {
            onBeforeNext === null || onBeforeNext === void 0 ? void 0 : onBeforeNext(innerValue);
            if (expand) {
                outerNext(innerValue);
            }
            else {
                subscriber.next(innerValue);
            }
        }, function () {
            innerComplete = true;
        }, undefined, function () {
            if (innerComplete) {
                try {
                    active--;
                    var _loop_1 = function () {
                        var bufferedValue = buffer.shift();
                        if (innerSubScheduler) {
                            executeSchedule(subscriber, innerSubScheduler, function () { return doInnerSub(bufferedValue); });
                        }
                        else {
                            doInnerSub(bufferedValue);
                        }
                    };
                    while (buffer.length && active < concurrent) {
                        _loop_1();
                    }
                    checkComplete();
                }
                catch (err) {
                    subscriber.error(err);
                }
            }
        }));
    };
    source.subscribe(createOperatorSubscriber(subscriber, outerNext, function () {
        isComplete = true;
        checkComplete();
    }));
    return function () {
        additionalFinalizer === null || additionalFinalizer === void 0 ? void 0 : additionalFinalizer();
    };
}
//# sourceMappingURL=mergeInternals.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js





function mergeMap(project, resultSelector, concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    if (isFunction_isFunction(resultSelector)) {
        return mergeMap(function (a, i) { return map(function (b, ii) { return resultSelector(a, b, i, ii); })(innerFrom(project(a, i))); }, concurrent);
    }
    else if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
    }
    return operate(function (source, subscriber) { return mergeInternals(source, subscriber, project, concurrent); });
}
//# sourceMappingURL=mergeMap.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/filter.js


function filter(predicate, thisArg) {
    return operate(function (source, subscriber) {
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) { return predicate.call(thisArg, value, index++) && subscriber.next(value); }));
    });
}
//# sourceMappingURL=filter.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js


function mergeAll(concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    return mergeMap(identity, concurrent);
}
//# sourceMappingURL=mergeAll.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/concatAll.js

function concatAll() {
    return mergeAll(1);
}
//# sourceMappingURL=concatAll.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/isScheduler.js

function isScheduler(value) {
    return value && isFunction_isFunction(value.schedule);
}
//# sourceMappingURL=isScheduler.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/args.js


function last(arr) {
    return arr[arr.length - 1];
}
function popResultSelector(args) {
    return isFunction(last(args)) ? args.pop() : undefined;
}
function popScheduler(args) {
    return isScheduler(last(args)) ? args.pop() : undefined;
}
function popNumber(args, defaultValue) {
    return typeof last(args) === 'number' ? args.pop() : defaultValue;
}
//# sourceMappingURL=args.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/observeOn.js



function observeOn(scheduler, delay) {
    if (delay === void 0) { delay = 0; }
    return operate(function (source, subscriber) {
        source.subscribe(createOperatorSubscriber(subscriber, function (value) { return executeSchedule(subscriber, scheduler, function () { return subscriber.next(value); }, delay); }, function () { return executeSchedule(subscriber, scheduler, function () { return subscriber.complete(); }, delay); }, function (err) { return executeSchedule(subscriber, scheduler, function () { return subscriber.error(err); }, delay); }));
    });
}
//# sourceMappingURL=observeOn.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/subscribeOn.js

function subscribeOn(scheduler, delay) {
    if (delay === void 0) { delay = 0; }
    return operate(function (source, subscriber) {
        subscriber.add(scheduler.schedule(function () { return source.subscribe(subscriber); }, delay));
    });
}
//# sourceMappingURL=subscribeOn.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduled/scheduleObservable.js



function scheduleObservable(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}
//# sourceMappingURL=scheduleObservable.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduled/schedulePromise.js



function schedulePromise(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}
//# sourceMappingURL=schedulePromise.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduled/scheduleArray.js

function scheduleArray(input, scheduler) {
    return new Observable_Observable(function (subscriber) {
        var i = 0;
        return scheduler.schedule(function () {
            if (i === input.length) {
                subscriber.complete();
            }
            else {
                subscriber.next(input[i++]);
                if (!subscriber.closed) {
                    this.schedule();
                }
            }
        });
    });
}
//# sourceMappingURL=scheduleArray.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduled/scheduleIterable.js




function scheduleIterable(input, scheduler) {
    return new Observable_Observable(function (subscriber) {
        var iterator;
        executeSchedule(subscriber, scheduler, function () {
            iterator = input[iterator_iterator]();
            executeSchedule(subscriber, scheduler, function () {
                var _a;
                var value;
                var done;
                try {
                    (_a = iterator.next(), value = _a.value, done = _a.done);
                }
                catch (err) {
                    subscriber.error(err);
                    return;
                }
                if (done) {
                    subscriber.complete();
                }
                else {
                    subscriber.next(value);
                }
            }, 0, true);
        });
        return function () { return isFunction_isFunction(iterator === null || iterator === void 0 ? void 0 : iterator.return) && iterator.return(); };
    });
}
//# sourceMappingURL=scheduleIterable.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduled/scheduleAsyncIterable.js


function scheduleAsyncIterable(input, scheduler) {
    if (!input) {
        throw new Error('Iterable cannot be null');
    }
    return new Observable_Observable(function (subscriber) {
        executeSchedule(subscriber, scheduler, function () {
            var iterator = input[Symbol.asyncIterator]();
            executeSchedule(subscriber, scheduler, function () {
                iterator.next().then(function (result) {
                    if (result.done) {
                        subscriber.complete();
                    }
                    else {
                        subscriber.next(result.value);
                    }
                });
            }, 0, true);
        });
    });
}
//# sourceMappingURL=scheduleAsyncIterable.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduled/scheduleReadableStreamLike.js


function scheduleReadableStreamLike(input, scheduler) {
    return scheduleAsyncIterable(readableStreamLikeToAsyncGenerator(input), scheduler);
}
//# sourceMappingURL=scheduleReadableStreamLike.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduled/scheduled.js













function scheduled(input, scheduler) {
    if (input != null) {
        if (isInteropObservable(input)) {
            return scheduleObservable(input, scheduler);
        }
        if (isArrayLike(input)) {
            return scheduleArray(input, scheduler);
        }
        if (isPromise(input)) {
            return schedulePromise(input, scheduler);
        }
        if (isAsyncIterable(input)) {
            return scheduleAsyncIterable(input, scheduler);
        }
        if (isIterable(input)) {
            return scheduleIterable(input, scheduler);
        }
        if (isReadableStreamLike(input)) {
            return scheduleReadableStreamLike(input, scheduler);
        }
    }
    throw createInvalidObservableTypeError(input);
}
//# sourceMappingURL=scheduled.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/observable/from.js


function from(input, scheduler) {
    return scheduler ? scheduled(input, scheduler) : innerFrom(input);
}
//# sourceMappingURL=from.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/observable/concat.js



function concat() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return concatAll()(from(args, popScheduler(args)));
}
//# sourceMappingURL=concat.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/startWith.js



function startWith() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    var scheduler = popScheduler(values);
    return operate(function (source, subscriber) {
        (scheduler ? concat(values, source, scheduler) : concat(values, source)).subscribe(subscriber);
    });
}
//# sourceMappingURL=startWith.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/scheduler/dateTimestampProvider.js
var dateTimestampProvider = {
    now: function () {
        return (dateTimestampProvider.delegate || Date).now();
    },
    delegate: undefined,
};
//# sourceMappingURL=dateTimestampProvider.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/ReplaySubject.js



var ReplaySubject = (function (_super) {
    __extends(ReplaySubject, _super);
    function ReplaySubject(_bufferSize, _windowTime, _timestampProvider) {
        if (_bufferSize === void 0) { _bufferSize = Infinity; }
        if (_windowTime === void 0) { _windowTime = Infinity; }
        if (_timestampProvider === void 0) { _timestampProvider = dateTimestampProvider; }
        var _this = _super.call(this) || this;
        _this._bufferSize = _bufferSize;
        _this._windowTime = _windowTime;
        _this._timestampProvider = _timestampProvider;
        _this._buffer = [];
        _this._infiniteTimeWindow = true;
        _this._infiniteTimeWindow = _windowTime === Infinity;
        _this._bufferSize = Math.max(1, _bufferSize);
        _this._windowTime = Math.max(1, _windowTime);
        return _this;
    }
    ReplaySubject.prototype.next = function (value) {
        var _a = this, isStopped = _a.isStopped, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow, _timestampProvider = _a._timestampProvider, _windowTime = _a._windowTime;
        if (!isStopped) {
            _buffer.push(value);
            !_infiniteTimeWindow && _buffer.push(_timestampProvider.now() + _windowTime);
        }
        this._trimBuffer();
        _super.prototype.next.call(this, value);
    };
    ReplaySubject.prototype._subscribe = function (subscriber) {
        this._throwIfClosed();
        this._trimBuffer();
        var subscription = this._innerSubscribe(subscriber);
        var _a = this, _infiniteTimeWindow = _a._infiniteTimeWindow, _buffer = _a._buffer;
        var copy = _buffer.slice();
        for (var i = 0; i < copy.length && !subscriber.closed; i += _infiniteTimeWindow ? 1 : 2) {
            subscriber.next(copy[i]);
        }
        this._checkFinalizedStatuses(subscriber);
        return subscription;
    };
    ReplaySubject.prototype._trimBuffer = function () {
        var _a = this, _bufferSize = _a._bufferSize, _timestampProvider = _a._timestampProvider, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow;
        var adjustedBufferSize = (_infiniteTimeWindow ? 1 : 2) * _bufferSize;
        _bufferSize < Infinity && adjustedBufferSize < _buffer.length && _buffer.splice(0, _buffer.length - adjustedBufferSize);
        if (!_infiniteTimeWindow) {
            var now = _timestampProvider.now();
            var last = 0;
            for (var i = 1; i < _buffer.length && _buffer[i] <= now; i += 2) {
                last = i;
            }
            last && _buffer.splice(0, last + 1);
        }
    };
    return ReplaySubject;
}(Subject));

//# sourceMappingURL=ReplaySubject.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/share.js





function share(options) {
    if (options === void 0) { options = {}; }
    var _a = options.connector, connector = _a === void 0 ? function () { return new Subject(); } : _a, _b = options.resetOnError, resetOnError = _b === void 0 ? true : _b, _c = options.resetOnComplete, resetOnComplete = _c === void 0 ? true : _c, _d = options.resetOnRefCountZero, resetOnRefCountZero = _d === void 0 ? true : _d;
    return function (wrapperSource) {
        var connection;
        var resetConnection;
        var subject;
        var refCount = 0;
        var hasCompleted = false;
        var hasErrored = false;
        var cancelReset = function () {
            resetConnection === null || resetConnection === void 0 ? void 0 : resetConnection.unsubscribe();
            resetConnection = undefined;
        };
        var reset = function () {
            cancelReset();
            connection = subject = undefined;
            hasCompleted = hasErrored = false;
        };
        var resetAndUnsubscribe = function () {
            var conn = connection;
            reset();
            conn === null || conn === void 0 ? void 0 : conn.unsubscribe();
        };
        return operate(function (source, subscriber) {
            refCount++;
            if (!hasErrored && !hasCompleted) {
                cancelReset();
            }
            var dest = (subject = subject !== null && subject !== void 0 ? subject : connector());
            subscriber.add(function () {
                refCount--;
                if (refCount === 0 && !hasErrored && !hasCompleted) {
                    resetConnection = handleReset(resetAndUnsubscribe, resetOnRefCountZero);
                }
            });
            dest.subscribe(subscriber);
            if (!connection &&
                refCount > 0) {
                connection = new SafeSubscriber({
                    next: function (value) { return dest.next(value); },
                    error: function (err) {
                        hasErrored = true;
                        cancelReset();
                        resetConnection = handleReset(reset, resetOnError, err);
                        dest.error(err);
                    },
                    complete: function () {
                        hasCompleted = true;
                        cancelReset();
                        resetConnection = handleReset(reset, resetOnComplete);
                        dest.complete();
                    },
                });
                innerFrom(source).subscribe(connection);
            }
        })(wrapperSource);
    };
}
function handleReset(reset, on) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    if (on === true) {
        reset();
        return;
    }
    if (on === false) {
        return;
    }
    var onSubscriber = new SafeSubscriber({
        next: function () {
            onSubscriber.unsubscribe();
            reset();
        },
    });
    return on.apply(void 0, __spreadArray([], __read(args))).subscribe(onSubscriber);
}
//# sourceMappingURL=share.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/operators/shareReplay.js


function shareReplay(configOrBufferSize, windowTime, scheduler) {
    var _a, _b, _c;
    var bufferSize;
    var refCount = false;
    if (configOrBufferSize && typeof configOrBufferSize === 'object') {
        (_a = configOrBufferSize.bufferSize, bufferSize = _a === void 0 ? Infinity : _a, _b = configOrBufferSize.windowTime, windowTime = _b === void 0 ? Infinity : _b, _c = configOrBufferSize.refCount, refCount = _c === void 0 ? false : _c, scheduler = configOrBufferSize.scheduler);
    }
    else {
        bufferSize = (configOrBufferSize !== null && configOrBufferSize !== void 0 ? configOrBufferSize : Infinity);
    }
    return share({
        connector: function () { return new ReplaySubject(bufferSize, windowTime, scheduler); },
        resetOnError: true,
        resetOnComplete: false,
        resetOnRefCountZero: refCount,
    });
}
//# sourceMappingURL=shareReplay.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-database-internal-store.js




function rx_database_internal_store_catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
} /**
   * returns the primary for a given collection-data
   * used in the internal store of a RxDatabase
   */
function rx_database_internal_store_settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof rx_database_internal_store_Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }
        value = value.v;
      } else {
        value.o = rx_database_internal_store_settle.bind(null, pact, state);
        return;
      }
    }
    if (value && value.then) {
      value.then(rx_database_internal_store_settle.bind(null, pact, state), rx_database_internal_store_settle.bind(null, pact, 2));
      return;
    }
    pact.s = state;
    pact.v = value;
    var observer = pact.o;
    if (observer) {
      observer(pact);
    }
  }
}
var rx_database_internal_store_Pact = /*#__PURE__*/(/* unused pure expression or super */ null && (function () {
  function _Pact() {}
  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;
    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;
      if (callback) {
        try {
          rx_database_internal_store_settle(result, 1, callback(this.v));
        } catch (e) {
          rx_database_internal_store_settle(result, 2, e);
        }
        return result;
      } else {
        return this;
      }
    }
    this.o = function (_this) {
      try {
        var value = _this.v;
        if (_this.s & 1) {
          rx_database_internal_store_settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          rx_database_internal_store_settle(result, 1, onRejected(value));
        } else {
          rx_database_internal_store_settle(result, 2, value);
        }
      } catch (e) {
        rx_database_internal_store_settle(result, 2, e);
      }
    };
    return result;
  };
  return _Pact;
}()));
function rx_database_internal_store_isSettledPact(thenable) {
  return thenable instanceof rx_database_internal_store_Pact && thenable.s & 1;
}
function rx_database_internal_store_for(test, update, body) {
  var stage;
  for (;;) {
    var shouldContinue = test();
    if (rx_database_internal_store_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }
    if (!shouldContinue) {
      return result;
    }
    if (shouldContinue.then) {
      stage = 0;
      break;
    }
    var result = body();
    if (result && result.then) {
      if (rx_database_internal_store_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }
    if (update) {
      var updateValue = update();
      if (updateValue && updateValue.then && !rx_database_internal_store_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }
  var pact = new rx_database_internal_store_Pact();
  var reject = rx_database_internal_store_settle.bind(null, pact, 2);
  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;
  function _resumeAfterBody(value) {
    result = value;
    do {
      if (update) {
        updateValue = update();
        if (updateValue && updateValue.then && !rx_database_internal_store_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }
      shouldContinue = test();
      if (!shouldContinue || rx_database_internal_store_isSettledPact(shouldContinue) && !shouldContinue.v) {
        rx_database_internal_store_settle(pact, 1, result);
        return;
      }
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }
      result = body();
      if (rx_database_internal_store_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);
    result.then(_resumeAfterBody).then(void 0, reject);
  }
  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();
      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      rx_database_internal_store_settle(pact, 1, result);
    }
  }
  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      rx_database_internal_store_settle(pact, 1, result);
    }
  }
}
var addConnectedStorageToCollection = function addConnectedStorageToCollection(collection, storageCollectionName, schema) {
  try {
    var _exit2 = false;
    var collectionNameWithVersion = _collectionNamePrimary(collection.name, collection.schema.jsonSchema);
    var collectionDocId = getPrimaryKeyOfInternalDocument(collectionNameWithVersion, INTERNAL_CONTEXT_COLLECTION);
    return Promise.resolve(rx_database_internal_store_for(function () {
      return !_exit2;
    }, void 0, function () {
      return Promise.resolve(getSingleDocument(collection.database.internalStore, collectionDocId)).then(function (collectionDoc) {
        var saveData = clone(ensureNotFalsy(collectionDoc));
        /**
         * Add array if not exist for backwards compatibility
         * TODO remove this in 2023
         */
        if (!saveData.data.connectedStorages) {
          saveData.data.connectedStorages = [];
        }

        // do nothing if already in array
        var alreadyThere = saveData.data.connectedStorages.find(function (row) {
          return row.collectionName === storageCollectionName && row.schema.version === schema.version;
        });
        if (alreadyThere) {
          _exit2 = true;
          return;
        }

        // otherwise add to array and save
        saveData.data.connectedStorages.push({
          collectionName: storageCollectionName,
          schema: schema
        });
        return rx_database_internal_store_catch(function () {
          return Promise.resolve(writeSingle(collection.database.internalStore, {
            previous: ensureNotFalsy(collectionDoc),
            document: saveData
          }, 'add-connected-storage-to-collection')).then(function () {});
        }, function (err) {
          if (!isBulkWriteConflictError(err)) {
            throw err;
          }
        });
      });
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};
var ensureStorageTokenDocumentExists = function ensureStorageTokenDocumentExists(rxDatabase) {
  try {
    /**
     * To have less read-write cycles,
     * we just try to insert a new document
     * and only fetch the existing one if a conflict happened.
     */
    var storageToken = randomCouchString(10);
    var passwordHash = rxDatabase.password ? fastUnsecureHash(rxDatabase.password) : undefined;
    var docData = {
      id: STORAGE_TOKEN_DOCUMENT_ID,
      context: INTERNAL_CONTEXT_STORAGE_TOKEN,
      key: STORAGE_TOKEN_DOCUMENT_KEY,
      data: {
        token: storageToken,
        /**
         * We add the instance token here
         * to be able to detect if a given RxDatabase instance
         * is the first instance that was ever created
         * or if databases have existed earlier on that storage
         * with the same database name.
         */
        instanceToken: rxDatabase.token,
        passwordHash: passwordHash
      },
      _deleted: false,
      _meta: getDefaultRxDocumentMeta(),
      _rev: util_getDefaultRevision(),
      _attachments: {}
    };
    return Promise.resolve(rxDatabase.internalStore.bulkWrite([{
      document: docData
    }], 'internal-add-storage-token')).then(function (writeResult) {
      if (writeResult.success[STORAGE_TOKEN_DOCUMENT_ID]) {
        return writeResult.success[STORAGE_TOKEN_DOCUMENT_ID];
      }

      /**
       * If we get a 409 error,
       * it means another instance already inserted the storage token.
       * So we get that token from the database and return that one.
       */
      var error = util_ensureNotFalsy(writeResult.error[STORAGE_TOKEN_DOCUMENT_ID]);
      if (error.isError && error.status === 409) {
        var conflictError = error;
        if (passwordHash && passwordHash !== util_ensureNotFalsy(conflictError.documentInDb).data.passwordHash) {
          throw newRxError('DB1', {
            passwordHash: passwordHash,
            existingPasswordHash: util_ensureNotFalsy(conflictError.documentInDb).data.passwordHash
          });
        }
        var storageTokenDocInDb = conflictError.documentInDb;
        return util_ensureNotFalsy(storageTokenDocInDb);
      }
      throw error;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Returns all internal documents
 * with context 'collection'
 */
var getAllCollectionDocuments = function getAllCollectionDocuments(storageStatics, storageInstance) {
  try {
    var getAllQueryPrepared = storageStatics.prepareQuery(storageInstance.schema, {
      selector: {
        context: INTERNAL_CONTEXT_COLLECTION
      },
      sort: [{
        id: 'asc'
      }],
      skip: 0
    });
    return Promise.resolve(storageInstance.query(getAllQueryPrepared)).then(function (queryResult) {
      var allDocs = queryResult.documents;
      return allDocs;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
var INTERNAL_CONTEXT_COLLECTION = 'collection';
var INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';

/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */
var INTERNAL_STORE_SCHEMA_TITLE = 'RxInternalDocument';
var INTERNAL_STORE_SCHEMA = fillWithDefaultSettings({
  version: 0,
  title: INTERNAL_STORE_SCHEMA_TITLE,
  primaryKey: {
    key: 'id',
    fields: ['context', 'key'],
    separator: '|'
  },
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 200
    },
    key: {
      type: 'string'
    },
    context: {
      type: 'string',
      "enum": [INTERNAL_CONTEXT_COLLECTION, INTERNAL_CONTEXT_STORAGE_TOKEN, 'OTHER']
    },
    data: {
      type: 'object',
      additionalProperties: true
    }
  },
  indexes: [],
  required: ['key', 'context', 'data'],
  additionalProperties: false,
  /**
   * If the sharding plugin is used,
   * it must not shard on the internal RxStorageInstance
   * because that one anyway has only a small amount of documents
   * and also its creation is in the hot path of the initial page load,
   * so we should spend less time creating multiple RxStorageInstances.
   */
  sharding: {
    shards: 1,
    mode: 'collection'
  }
});
function getPrimaryKeyOfInternalDocument(key, context) {
  return getComposedPrimaryKeyOfDocumentData(INTERNAL_STORE_SCHEMA, {
    key: key,
    context: context
  });
}
var STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
var STORAGE_TOKEN_DOCUMENT_ID = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}
//# sourceMappingURL=rx-database-internal-store.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-collection-helper.js






/**
 * fills in the default data.
 * This also clones the data.
 */

/**
 * Removes the main storage of the collection
 * and all connected storages like the ones from the replication meta etc.
 */
var removeCollectionStorages = function removeCollectionStorages(storage, databaseInternalStorage, databaseInstanceToken, databaseName, collectionName,
/**
 * If no hash function is provided,
 * we assume that the whole internal store is removed anyway
 * so we do not have to delete the meta documents.
 */
hashFunction) {
  try {
    return Promise.resolve(getAllCollectionDocuments(storage.statics, databaseInternalStorage)).then(function (allCollectionMetaDocs) {
      var relevantCollectionMetaDocs = allCollectionMetaDocs.filter(function (metaDoc) {
        return metaDoc.data.name === collectionName;
      });
      var removeStorages = [];
      relevantCollectionMetaDocs.forEach(function (metaDoc) {
        removeStorages.push({
          collectionName: metaDoc.data.name,
          schema: metaDoc.data.schema,
          isCollection: true
        });
        metaDoc.data.connectedStorages.forEach(function (row) {
          return removeStorages.push({
            collectionName: row.collectionName,
            isCollection: false,
            schema: row.schema
          });
        });
      });

      // ensure uniqueness
      var alreadyAdded = new Set();
      removeStorages = removeStorages.filter(function (row) {
        var key = row.collectionName + '||' + row.schema.version;
        if (alreadyAdded.has(key)) {
          return false;
        } else {
          alreadyAdded.add(key);
          return true;
        }
      });

      // remove all the storages
      return Promise.resolve(Promise.all(removeStorages.map(function (row) {
        try {
          return Promise.resolve(storage.createStorageInstance({
            collectionName: row.collectionName,
            databaseInstanceToken: databaseInstanceToken,
            databaseName: databaseName,
            multiInstance: false,
            options: {},
            schema: row.schema
          })).then(function (storageInstance) {
            return Promise.resolve(storageInstance.remove()).then(function () {
              var _temp2 = function () {
                if (row.isCollection) {
                  return Promise.resolve(runAsyncPluginHooks('postRemoveRxCollection', {
                    storage: storage,
                    databaseName: databaseName,
                    collectionName: collectionName
                  })).then(function () {});
                }
              }();
              if (_temp2 && _temp2.then) return _temp2.then(function () {});
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }))).then(function () {
        var _temp = function () {
          if (hashFunction) {
            var writeRows = relevantCollectionMetaDocs.map(function (doc) {
              var writeDoc = flatCloneDocWithMeta(doc);
              writeDoc._deleted = true;
              writeDoc._meta.lwt = util_now();
              writeDoc._rev = util_createRevision(hashFunction, writeDoc, doc);
              return {
                previous: doc,
                document: writeDoc
              };
            });
            return Promise.resolve(databaseInternalStorage.bulkWrite(writeRows, 'rx-database-remove-collection-all')).then(function () {});
          }
        }();
        if (_temp && _temp.then) return _temp.then(function () {});
      }); // remove the meta documents
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Creates the storage instances that are used internally in the collection
 */
var createRxCollectionStorageInstance = function createRxCollectionStorageInstance(rxDatabase, storageInstanceCreationParams) {
  try {
    storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
    return Promise.resolve(rxDatabase.storage.createStorageInstance(storageInstanceCreationParams));
  } catch (e) {
    return Promise.reject(e);
  }
};
function fillObjectDataBeforeInsert(schema, data) {
  var useJson = schema.fillObjectWithDefaults(data);
  useJson = fillPrimaryKey(schema.primaryPath, schema.jsonSchema, useJson);
  useJson._meta = getDefaultRxDocumentMeta();
  if (!useJson.hasOwnProperty('_deleted')) {
    useJson._deleted = false;
  }
  if (!useJson.hasOwnProperty('_attachments')) {
    useJson._attachments = {};
  }
  if (!useJson.hasOwnProperty('_rev')) {
    useJson._rev = util_getDefaultRevision();
  }
  return useJson;
}
//# sourceMappingURL=rx-collection-helper.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/util/EmptyError.js

var EmptyError = createErrorClass(function (_super) { return function EmptyErrorImpl() {
    _super(this);
    this.name = 'EmptyError';
    this.message = 'no elements in sequence';
}; });
//# sourceMappingURL=EmptyError.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/firstValueFrom.js


function firstValueFrom(source, config) {
    var hasConfig = typeof config === 'object';
    return new Promise(function (resolve, reject) {
        var subscriber = new SafeSubscriber({
            next: function (value) {
                resolve(value);
                subscriber.unsubscribe();
            },
            error: reject,
            complete: function () {
                if (hasConfig) {
                    resolve(config.defaultValue);
                }
                else {
                    reject(new EmptyError());
                }
            },
        });
        source.subscribe(subscriber);
    });
}
//# sourceMappingURL=firstValueFrom.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/observable/empty.js

var EMPTY = new Observable_Observable(function (subscriber) { return subscriber.complete(); });
function empty(scheduler) {
    return scheduler ? emptyScheduled(scheduler) : EMPTY;
}
function emptyScheduled(scheduler) {
    return new Observable(function (subscriber) { return scheduler.schedule(function () { return subscriber.complete(); }); });
}
//# sourceMappingURL=empty.js.map
;// CONCATENATED MODULE: ../../../../node_modules/rxjs/dist/esm5/internal/observable/merge.js





function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    var concurrent = popNumber(args, Infinity);
    var sources = args;
    return !sources.length
        ?
            EMPTY
        : sources.length === 1
            ?
                innerFrom(sources[0])
            :
                mergeAll(concurrent)(from(sources, scheduler));
}
//# sourceMappingURL=merge.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-document-prototype-merge.js
/**
 * For the ORM capabilities,
 * we have to merge the document prototype
 * with the ORM functions and the data
 * We do this itterating over the properties and
 * adding them to a new object.
 * In the future we should do this by chaining the __proto__ objects
 */





// caches
var protoForCollection = new WeakMap();
var constructorForCollection = new WeakMap();
function getDocumentPrototype(rxCollection) {
  if (!protoForCollection.has(rxCollection)) {
    var schemaProto = rxCollection.schema.getDocumentPrototype();
    var ormProto = getDocumentOrmPrototype(rxCollection);
    var baseProto = basePrototype;
    var proto = {};
    [schemaProto, ormProto, baseProto].forEach(function (obj) {
      var props = Object.getOwnPropertyNames(obj);
      props.forEach(function (key) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        /**
         * When enumerable is true, it will show on console.dir(instance)
         * To not polute the output, only getters and methods are enumerable
         */
        var enumerable = true;
        if (key.startsWith('_') || key.endsWith('_') || key.startsWith('$') || key.endsWith('$')) enumerable = false;
        if (typeof desc.value === 'function') {
          // when getting a function, we automatically do a .bind(this)
          Object.defineProperty(proto, key, {
            get: function get() {
              return desc.value.bind(this);
            },
            enumerable: enumerable,
            configurable: false
          });
        } else {
          desc.enumerable = enumerable;
          desc.configurable = false;
          if (desc.writable) desc.writable = false;
          Object.defineProperty(proto, key, desc);
        }
      });
    });
    protoForCollection.set(rxCollection, proto);
  }
  return protoForCollection.get(rxCollection);
}
function getRxDocumentConstructor(rxCollection) {
  if (!constructorForCollection.has(rxCollection)) {
    var ret = createRxDocumentConstructor(getDocumentPrototype(rxCollection));
    constructorForCollection.set(rxCollection, ret);
  }
  return constructorForCollection.get(rxCollection);
}

/**
 * Create a RxDocument-instance from the jsonData
 * and the prototype merge.
 * If the document already exists in the _docCache,
 * return that instead to ensure we have no duplicates.
 */
function createRxDocument(rxCollection, docData) {
  var primary = docData[rxCollection.schema.primaryPath];

  // return from cache if exists
  var cacheDoc = rxCollection._docCache.get(primary);
  if (cacheDoc) {
    return cacheDoc;
  }
  var doc = createWithConstructor(getRxDocumentConstructor(rxCollection), rxCollection, overwritable.deepFreezeWhenDevMode(docData));
  rxCollection._docCache.set(primary, doc);
  rxCollection._runHooksSync('post', 'create', docData, doc);
  runPluginHooks('postCreateRxDocument', doc);
  return doc;
}

/**
 * create RxDocument from the docs-array
 */
function createRxDocuments(rxCollection, docsJSON) {
  return docsJSON.map(function (json) {
    return createRxDocument(rxCollection, json);
  });
}

/**
 * returns the prototype-object
 * that contains the orm-methods,
 * used in the proto-merge
 */
function getDocumentOrmPrototype(rxCollection) {
  var proto = {};
  Object.entries(rxCollection.methods).forEach(function (_ref) {
    var k = _ref[0],
      v = _ref[1];
    proto[k] = v;
  });
  return proto;
}
//# sourceMappingURL=rx-document-prototype-merge.js.map
;// CONCATENATED MODULE: ./node_modules/array-push-at-sort-position/dist/es/index.js
/**
 * copied and adapted from npm 'binary-search-insert'
 * @link https://www.npmjs.com/package/binary-search-insert
 */
function pushAtSortPosition(array, item, compareFunction, noCopy) {
  var ret = noCopy ? array : array.slice(0);
  var high = ret.length - 1;
  var low = 0;
  var mid = 0;
  /**
   * Optimization shortcut.
   */

  if (ret.length === 0) {
    ret.push(item);
    return [ret, 0];
  }
  /**
   * So we do not have to ghet the ret[mid] doc again
   * at the last we store it here.
   */


  var lastMidDoc;

  while (low <= high) {
    // https://github.com/darkskyapp/binary-search
    // http://googleresearch.blogspot.com/2006/06/extra-extra-read-all-about-it-nearly.html
    mid = low + (high - low >> 1);
    lastMidDoc = ret[mid];

    if (compareFunction(lastMidDoc, item) <= 0.0) {
      // searching too low
      low = mid + 1;
    } else {
      // searching too high
      high = mid - 1;
    }
  }

  if (compareFunction(lastMidDoc, item) <= 0.0) {
    mid++;
  }
  /**
   * Insert at correct position
   */


  ret.splice(mid, 0, item);
  return [ret, mid];
}
;// CONCATENATED MODULE: ./node_modules/event-reduce-js/dist/es/actions/action-functions.js

var doNothing = function (_input) { };
var insertFirst = function (input) {
    input.previousResults.unshift(input.changeEvent.doc);
    if (input.keyDocumentMap) {
        input.keyDocumentMap.set(input.changeEvent.id, input.changeEvent.doc);
    }
};
var insertLast = function (input) {
    input.previousResults.push(input.changeEvent.doc);
    if (input.keyDocumentMap) {
        input.keyDocumentMap.set(input.changeEvent.id, input.changeEvent.doc);
    }
};
var removeFirstItem = function (input) {
    var first = input.previousResults.shift();
    if (input.keyDocumentMap && first) {
        input.keyDocumentMap.delete(first[input.queryParams.primaryKey]);
    }
};
var removeLastItem = function (input) {
    var last = input.previousResults.pop();
    if (input.keyDocumentMap && last) {
        input.keyDocumentMap.delete(last[input.queryParams.primaryKey]);
    }
};
var removeFirstInsertLast = function (input) {
    removeFirstItem(input);
    insertLast(input);
};
var removeLastInsertFirst = function (input) {
    removeLastItem(input);
    insertFirst(input);
};
var removeFirstInsertFirst = function (input) {
    removeFirstItem(input);
    insertFirst(input);
};
var removeLastInsertLast = function (input) {
    removeLastItem(input);
    insertLast(input);
};
var removeExisting = function (input) {
    if (input.keyDocumentMap) {
        input.keyDocumentMap.delete(input.changeEvent.id);
    }
    // find index of document
    var primary = input.queryParams.primaryKey;
    var results = input.previousResults;
    for (var i = 0; i < results.length; i++) {
        var item = results[i];
        // remove
        // console.dir(item);
        if (item[primary] === input.changeEvent.id) {
            results.splice(i, 1);
            break;
        }
    }
};
var replaceExisting = function (input) {
    // find index of document
    var doc = input.changeEvent.doc;
    var primary = input.queryParams.primaryKey;
    var results = input.previousResults;
    for (var i = 0; i < results.length; i++) {
        var item = results[i];
        // replace
        if (item[primary] === input.changeEvent.id) {
            results[i] = doc;
            if (input.keyDocumentMap) {
                input.keyDocumentMap.set(input.changeEvent.id, doc);
            }
            break;
        }
    }
};
/**
 * this function always returns wrong results
 * it must be later optimised out
 * otherwise there is something broken
 */
var alwaysWrong = function (input) {
    var wrongHuman = {
        _id: 'wrongHuman' + new Date().getTime()
    };
    input.previousResults.length = 0; // clear array
    input.previousResults.push(wrongHuman);
    if (input.keyDocumentMap) {
        input.keyDocumentMap.clear();
        input.keyDocumentMap.set(wrongHuman._id, wrongHuman);
    }
};
var insertAtSortPosition = function (input) {
    var docId = input.changeEvent.id;
    var doc = input.changeEvent.doc;
    if (input.keyDocumentMap) {
        if (input.keyDocumentMap.has(docId)) {
            /**
             * If document is already in results,
             * we cannot add it again because it would throw on non-deterministic ordering.
             */
            return;
        }
        input.keyDocumentMap.set(docId, doc);
    }
    else {
        var isDocInResults = input.previousResults.find(function (d) { return d[input.queryParams.primaryKey] === docId; });
        /**
         * If document is already in results,
         * we cannot add it again because it would throw on non-deterministic ordering.
         */
        if (isDocInResults) {
            return;
        }
    }
    pushAtSortPosition(input.previousResults, doc, input.queryParams.sortComparator, true);
};
var removeExistingAndInsertAtSortPosition = function (input) {
    removeExisting(input);
    insertAtSortPosition(input);
};
var runFullQueryAgain = function (_input) {
    throw new Error('Action runFullQueryAgain must be implemented by yourself');
};
var unknownAction = function (_input) {
    throw new Error('Action unknownAction should never be called');
};
//# sourceMappingURL=action-functions.js.map
;// CONCATENATED MODULE: ./node_modules/event-reduce-js/dist/es/actions/index.js

/**
 * all actions ordered by performance-cost
 * cheapest first
 * TODO run tests on which is really the fastest
 */
var orderedActionList = [
    'doNothing',
    'insertFirst',
    'insertLast',
    'removeFirstItem',
    'removeLastItem',
    'removeFirstInsertLast',
    'removeLastInsertFirst',
    'removeFirstInsertFirst',
    'removeLastInsertLast',
    'removeExisting',
    'replaceExisting',
    'alwaysWrong',
    'insertAtSortPosition',
    'removeExistingAndInsertAtSortPosition',
    'runFullQueryAgain',
    'unknownAction'
];
var actions_actionFunctions = {
    doNothing: doNothing,
    insertFirst: insertFirst,
    insertLast: insertLast,
    removeFirstItem: removeFirstItem,
    removeLastItem: removeLastItem,
    removeFirstInsertLast: removeFirstInsertLast,
    removeLastInsertFirst: removeLastInsertFirst,
    removeFirstInsertFirst: removeFirstInsertFirst,
    removeLastInsertLast: removeLastInsertLast,
    removeExisting: removeExisting,
    replaceExisting: replaceExisting,
    alwaysWrong: alwaysWrong,
    insertAtSortPosition: insertAtSortPosition,
    removeExistingAndInsertAtSortPosition: removeExistingAndInsertAtSortPosition,
    runFullQueryAgain: runFullQueryAgain,
    unknownAction: unknownAction
};
//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/binary-decision-diagram/dist/es/util.js
var util_read = (undefined && undefined.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
function booleanStringToBoolean(str) {
    if (str === '1') {
        return true;
    }
    else {
        return false;
    }
}
function booleanToBooleanString(b) {
    if (b) {
        return '1';
    }
    else {
        return '0';
    }
}
function oppositeBoolean(input) {
    if (input === '1') {
        return '0';
    }
    else {
        return '1';
    }
}
function lastChar(str) {
    return str.slice(-1);
}
/**
 * @link https://stackoverflow.com/a/1349426
 */
function makeid(length) {
    if (length === void 0) { length = 6; }
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
var nodeIdPrefix = makeid(4);
var lastIdGen = 0;
function nextNodeId() {
    var ret = 'node_' + nodeIdPrefix + '_' + lastIdGen;
    lastIdGen++;
    return ret;
}
/**
 * @link https://stackoverflow.com/a/16155417
 */
function decimalToPaddedBinary(decimal, padding) {
    var binary = (decimal >>> 0).toString(2);
    var padded = binary.padStart(padding, '0');
    return padded;
}
function oppositeBinary(i) {
    if (i === '1') {
        return '0';
    }
    else if (i === '0') {
        return '1';
    }
    else {
        throw new Error('non-binary given');
    }
}
function binaryToDecimal(binary) {
    return parseInt(binary, 2);
}
function minBinaryWithLength(length) {
    return new Array(length).fill(0).map(function () { return '0'; }).join('');
}
function maxBinaryWithLength(length) {
    return new Array(length).fill(0).map(function () { return '1'; }).join('');
}
function getNextStateSet(stateSet) {
    var decimal = binaryToDecimal(stateSet);
    var increase = decimal + 1;
    var binary = decimalToPaddedBinary(increase, stateSet.length);
    return binary;
}
function firstKeyOfMap(map) {
    var iterator1 = map.keys();
    return iterator1.next().value;
}
/**
 * Shuffles array in place. ES6 version
 * @link https://stackoverflow.com/a/6274381
 */
function util_shuffleArray(a) {
    var _a;
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = util_read([a[j], a[i]], 2), a[i] = _a[0], a[j] = _a[1];
    }
    return a;
}
function util_lastOfArray(ar) {
    return ar[ar.length - 1];
}
/**
 * @link https://stackoverflow.com/a/6259536
 */
function splitStringToChunks(str, chunkSize) {
    var chunks = [];
    for (var i = 0, charsLength = str.length; i < charsLength; i += chunkSize) {
        chunks.push(str.substring(i, i + chunkSize));
    }
    return chunks;
}
//# sourceMappingURL=util.js.map
;// CONCATENATED MODULE: ./node_modules/binary-decision-diagram/dist/es/minimal-string/string-format.js
/*
let t = 0;
while (t < 10000) {
    const char = String.fromCharCode(t);
    console.log(t + ' : ' + char);
    t++;
}
*/
/*

To have a really small string representation, we have to hack some stuff
which makes is complicated but effective.

Rules for the string:
- The string starts with a number like '23' that defines how many leaf-nodes we have
- leaf nodes consist of two chars like 'ab'
    - the first char is the id
    - the second the value is a number you can get via String.charCodeAt()
- Internal nodes have four chars like 'abcd'
    - the first char is the id
    - the second char is the id of the 0-branch
    - the third char is the id of the 1-branch
    - the last char is the id of the boolean-function (= level)
- The last 3 chars of the string is the root node like 'abc'
    - it looks like the internal-node but without the id (first char)

*/
// we use this because 39 is the quotes which causes problems
var CHAR_CODE_OFFSET = 40; // String.fromCharCode(33) === ')'
function getCharOfLevel(level) {
    var charCode = CHAR_CODE_OFFSET + level;
    return String.fromCharCode(charCode);
}
function getNumberOfChar(char) {
    var charCode = char.charCodeAt(0);
    return charCode - CHAR_CODE_OFFSET;
}
function getCharOfValue(value) {
    var charCode = CHAR_CODE_OFFSET + value;
    return String.fromCharCode(charCode);
}
var FIRST_CHAR_CODE_FOR_ID = 97; // String.fromCharCode(97) === 'a'
function getNextCharId(lastCode) {
    // jump these codes because they look strange
    if (lastCode >= 128 && lastCode <= 160) {
        lastCode = 161;
    }
    var char = String.fromCharCode(lastCode);
    return {
        char: char,
        nextCode: lastCode + 1
    };
}
//# sourceMappingURL=string-format.js.map
;// CONCATENATED MODULE: ./node_modules/binary-decision-diagram/dist/es/minimal-string/minimal-string-to-simple-bdd.js


function minimalStringToSimpleBdd(str) {
    var nodesById = new Map();
    // parse leaf nodes
    var leafNodeAmount = parseInt(str.charAt(0) + str.charAt(1), 10);
    var lastLeafNodeChar = (2 + leafNodeAmount * 2);
    var leafNodeChars = str.substring(2, lastLeafNodeChar);
    var leafNodeChunks = splitStringToChunks(leafNodeChars, 2);
    for (var i = 0; i < leafNodeChunks.length; i++) {
        var chunk = leafNodeChunks[i];
        var id = chunk.charAt(0);
        var value = getNumberOfChar(chunk.charAt(1));
        nodesById.set(id, value);
    }
    // parse internal nodes
    var internalNodeChars = str.substring(lastLeafNodeChar, str.length - 3);
    var internalNodeChunks = splitStringToChunks(internalNodeChars, 4);
    for (var i = 0; i < internalNodeChunks.length; i++) {
        var chunk = internalNodeChunks[i];
        var id = chunk.charAt(0);
        var idOf0Branch = chunk.charAt(1);
        var idOf1Branch = chunk.charAt(2);
        var level = getNumberOfChar(chunk.charAt(3));
        if (!nodesById.has(idOf0Branch)) {
            throw new Error('missing node with id ' + idOf0Branch);
        }
        if (!nodesById.has(idOf1Branch)) {
            throw new Error('missing node with id ' + idOf1Branch);
        }
        var node0 = nodesById.get(idOf0Branch);
        var node1 = nodesById.get(idOf1Branch);
        var node = {
            l: level,
            0: node0,
            1: node1
        };
        nodesById.set(id, node);
    }
    // parse root node
    var last3 = str.slice(-3);
    var idOf0 = last3.charAt(0);
    var idOf1 = last3.charAt(1);
    var levelOfRoot = getNumberOfChar(last3.charAt(2));
    var nodeOf0 = nodesById.get(idOf0);
    var nodeOf1 = nodesById.get(idOf1);
    var rootNode = {
        l: levelOfRoot,
        0: nodeOf0,
        1: nodeOf1,
    };
    return rootNode;
}
//# sourceMappingURL=minimal-string-to-simple-bdd.js.map
;// CONCATENATED MODULE: ./node_modules/binary-decision-diagram/dist/es/minimal-string/resolve-with-simple-bdd.js

function resolveWithSimpleBdd(simpleBdd, fns, input) {
    var currentNode = simpleBdd;
    var currentLevel = simpleBdd.l;
    while (true) {
        var booleanResult = fns[currentLevel](input);
        var branchKey = booleanToBooleanString(booleanResult);
        currentNode = currentNode[branchKey];
        if (typeof currentNode === 'number' || typeof currentNode === 'string') {
            return currentNode;
        }
        else {
            currentLevel = currentNode.l;
        }
    }
}
//# sourceMappingURL=resolve-with-simple-bdd.js.map
;// CONCATENATED MODULE: ./node_modules/event-reduce-js/dist/es/util.js
var es_util_read = (undefined && undefined.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var util_spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var UNKNOWN_VALUE = 'UNKNOWN';
function es_util_lastOfArray(ar) {
    return ar[ar.length - 1];
}
/**
 * @link https://stackoverflow.com/a/5915122
 */
function randomOfArray(items) {
    return items[Math.floor(Math.random() * items.length)];
}
function es_util_shuffleArray(arr) {
    return arr.slice().sort(function () { return (Math.random() - 0.5); });
}
/**
 * if the previous doc-data is unknown,
 * try to get it from previous results
 * @mutate the changeEvent of input
 */
function tryToFillPreviousDoc(input) {
    var prev = input.changeEvent.previous;
    if (prev === UNKNOWN_VALUE) {
        var id_1 = input.changeEvent.id;
        var primary_1 = input.queryParams.primaryKey;
        if (input.keyDocumentMap) {
            var doc = input.keyDocumentMap.get(id_1);
            if (doc) {
                input.changeEvent.previous = doc;
            }
        }
        else {
            var found = input.previousResults.find(function (item) { return item[primary_1] === id_1; });
            if (found) {
                input.changeEvent.previous = found;
            }
        }
    }
}
/**
 * normalizes sort-field
 * in: '-age'
 * out: 'age'
 */
function normalizeSortField(field) {
    if (field.startsWith('-')) {
        return field.substr(1);
    }
    else {
        return field;
    }
}
function getSortFieldsOfQuery(query) {
    if (!query.sort) {
        // if no sort-order is set, use the primary key
        return ['_id'];
    }
    return query.sort.map(function (maybeArray) {
        if (Array.isArray(maybeArray)) {
            return maybeArray[0].map(function (field) { return normalizeSortField(field); });
        }
        else {
            return normalizeSortField(maybeArray);
        }
    });
}
/**
 *  @link https://stackoverflow.com/a/1431113
 */
function replaceCharAt(str, index, replacement) {
    return str.substr(0, index) + replacement + str.substr(index + replacement.length);
}
function mapToObject(map) {
    var ret = {};
    map.forEach(function (value, key) {
        ret[key] = value;
    });
    return ret;
}
function objectToMap(object) {
    var ret = new Map();
    Object.entries(object).forEach(function (_a) {
        var _b = es_util_read(_a, 2), k = _b[0], v = _b[1];
        ret.set(k, v);
    });
    return ret;
}
function cloneMap(map) {
    var ret = new Map();
    map.forEach(function (value, key) {
        ret[key] = value;
    });
    return ret;
}
/**
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
function es_util_flatClone(obj) {
    return Object.assign({}, obj);
}
function es_util_ensureNotFalsy(obj) {
    if (!obj) {
        throw new Error('ensureNotFalsy() is falsy');
    }
    return obj;
}
function mergeSets(sets) {
    var ret = new Set();
    sets.forEach(function (set) {
        ret = new Set(util_spreadArray(util_spreadArray([], es_util_read(ret), false), es_util_read(set), false));
    });
    return ret;
}
/**
 * @link https://stackoverflow.com/a/12830454/3443137
 */
function roundToTwoDecimals(num) {
    return parseFloat(num.toFixed(2));
}
//# sourceMappingURL=util.js.map
;// CONCATENATED MODULE: ./node_modules/event-reduce-js/dist/es/states/state-resolver.js


var hasLimit = function (input) {
    return !!input.queryParams.limit;
};
var isFindOne = function (input) {
    return input.queryParams.limit === 1;
};
var hasSkip = function (input) {
    if (input.queryParams.skip && input.queryParams.skip > 0) {
        return true;
    }
    else {
        return false;
    }
};
var isDelete = function (input) {
    return input.changeEvent.operation === 'DELETE';
};
var isInsert = function (input) {
    return input.changeEvent.operation === 'INSERT';
};
var isUpdate = function (input) {
    return input.changeEvent.operation === 'UPDATE';
};
var previousUnknown = function (input) {
    return input.changeEvent.previous === UNKNOWN_VALUE;
};
var wasLimitReached = function (input) {
    return hasLimit(input) && input.previousResults.length >= input.queryParams.limit;
};
var sortParamsChanged = function (input) {
    var sortFields = input.queryParams.sortFields;
    var prev = input.changeEvent.previous;
    var doc = input.changeEvent.doc;
    if (!doc) {
        return false;
    }
    if (!prev || prev === UNKNOWN_VALUE) {
        return true;
    }
    for (var i = 0; i < sortFields.length; i++) {
        var field = sortFields[i];
        var beforeData = object_path_default().get(prev, field);
        var afterData = object_path_default().get(doc, field);
        if (beforeData !== afterData) {
            return true;
        }
    }
    return false;
};
var wasInResult = function (input) {
    var id = input.changeEvent.id;
    if (input.keyDocumentMap) {
        var has = input.keyDocumentMap.has(id);
        return has;
    }
    else {
        var primary = input.queryParams.primaryKey;
        var results = input.previousResults;
        for (var i = 0; i < results.length; i++) {
            var item = results[i];
            if (item[primary] === id) {
                return true;
            }
        }
        return false;
    }
};
var wasFirst = function (input) {
    var first = input.previousResults[0];
    if (first && first[input.queryParams.primaryKey] === input.changeEvent.id) {
        return true;
    }
    else {
        return false;
    }
};
var wasLast = function (input) {
    var last = es_util_lastOfArray(input.previousResults);
    if (last && last[input.queryParams.primaryKey] === input.changeEvent.id) {
        return true;
    }
    else {
        return false;
    }
};
var wasSortedBeforeFirst = function (input) {
    var prev = input.changeEvent.previous;
    if (!prev || prev === UNKNOWN_VALUE) {
        return false;
    }
    var first = input.previousResults[0];
    if (!first) {
        return false;
    }
    /**
     * If the changed document is the same as the first,
     * we cannot sort-compare them, because it might end in a non-deterministic
     * sort order. Because both document could be equal.
     * So instead we have to return true.
     */
    if (first[input.queryParams.primaryKey] === input.changeEvent.id) {
        return true;
    }
    var comp = input.queryParams.sortComparator(prev, first);
    return comp < 0;
};
var wasSortedAfterLast = function (input) {
    var prev = input.changeEvent.previous;
    if (!prev || prev === UNKNOWN_VALUE) {
        return false;
    }
    var last = es_util_lastOfArray(input.previousResults);
    if (!last) {
        return false;
    }
    if (last[input.queryParams.primaryKey] === input.changeEvent.id) {
        return true;
    }
    var comp = input.queryParams.sortComparator(prev, last);
    return comp > 0;
};
var isSortedBeforeFirst = function (input) {
    var doc = input.changeEvent.doc;
    if (!doc) {
        return false;
    }
    var first = input.previousResults[0];
    if (!first) {
        return false;
    }
    if (first[input.queryParams.primaryKey] === input.changeEvent.id) {
        return true;
    }
    var comp = input.queryParams.sortComparator(doc, first);
    return comp < 0;
};
var isSortedAfterLast = function (input) {
    var doc = input.changeEvent.doc;
    if (!doc) {
        return false;
    }
    var last = es_util_lastOfArray(input.previousResults);
    if (!last) {
        return false;
    }
    if (last[input.queryParams.primaryKey] === input.changeEvent.id) {
        return true;
    }
    var comp = input.queryParams.sortComparator(doc, last);
    return comp > 0;
};
var wasMatching = function (input) {
    var prev = input.changeEvent.previous;
    if (!prev || prev === UNKNOWN_VALUE) {
        return false;
    }
    return input.queryParams.queryMatcher(prev);
};
var doesMatchNow = function (input) {
    var doc = input.changeEvent.doc;
    if (!doc) {
        return false;
    }
    var ret = input.queryParams.queryMatcher(doc);
    return ret;
};
var wasResultsEmpty = function (input) {
    return input.previousResults.length === 0;
};
//# sourceMappingURL=state-resolver.js.map
;// CONCATENATED MODULE: ./node_modules/event-reduce-js/dist/es/states/index.js


/**
 * all states ordered by performance-cost
 * cheapest first
 * TODO run tests on which is really the fastest
 */
var orderedStateList = (/* unused pure expression or super */ null && ([
    'isInsert',
    'isUpdate',
    'isDelete',
    'hasLimit',
    'isFindOne',
    'hasSkip',
    'wasResultsEmpty',
    'previousUnknown',
    'wasLimitReached',
    'wasFirst',
    'wasLast',
    'sortParamsChanged',
    'wasInResult',
    'wasSortedBeforeFirst',
    'wasSortedAfterLast',
    'isSortedBeforeFirst',
    'isSortedAfterLast',
    'wasMatching',
    'doesMatchNow'
]));
var stateResolveFunctions = {
    isInsert: isInsert,
    isUpdate: isUpdate,
    isDelete: isDelete,
    hasLimit: hasLimit,
    isFindOne: isFindOne,
    hasSkip: hasSkip,
    wasResultsEmpty: wasResultsEmpty,
    previousUnknown: previousUnknown,
    wasLimitReached: wasLimitReached,
    wasFirst: wasFirst,
    wasLast: wasLast,
    sortParamsChanged: sortParamsChanged,
    wasInResult: wasInResult,
    wasSortedBeforeFirst: wasSortedBeforeFirst,
    wasSortedAfterLast: wasSortedAfterLast,
    isSortedBeforeFirst: isSortedBeforeFirst,
    isSortedAfterLast: isSortedAfterLast,
    wasMatching: wasMatching,
    doesMatchNow: doesMatchNow
};
var stateResolveFunctionByIndex = {
    0: isInsert,
    1: isUpdate,
    2: isDelete,
    3: hasLimit,
    4: isFindOne,
    5: hasSkip,
    6: wasResultsEmpty,
    7: previousUnknown,
    8: wasLimitReached,
    9: wasFirst,
    10: wasLast,
    11: sortParamsChanged,
    12: wasInResult,
    13: wasSortedBeforeFirst,
    14: wasSortedAfterLast,
    15: isSortedBeforeFirst,
    16: isSortedAfterLast,
    17: wasMatching,
    18: doesMatchNow
};
function resolveState(stateName, input) {
    var fn = stateResolveFunctions[stateName];
    if (!fn) {
        throw new Error('resolveState() has no function for ' + stateName);
    }
    return fn(input);
}
function states_getStateSet(input) {
    var set = '';
    for (var i = 0; i < orderedStateList.length; i++) {
        var name_1 = orderedStateList[i];
        var value = resolveState(name_1, input);
        var add = value ? '1' : '0';
        set += add;
    }
    return set;
}
function logStateSet(stateSet) {
    orderedStateList.forEach(function (state, index) {
        console.log('state: ' + state + ' : ' + stateSet[index]);
    });
}
//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/event-reduce-js/dist/es/bdd/bdd.generated.js


var minimalBddString = '14a2b0c/d1e,f+g5h.i4j*k-l)m(n6ohk1pdf1qef1rin-sjn-ton-ugn-vmn-whn-xkn-yln-zdf5{ef5|wx5}df7~dz7ef7¡bk7¢e{7£g|7¤ry7¥dp7¦gk7§eq7¨gt7©ac7ªmv7«gu7¬nm7­iy7®nw7¯¤s8°«¦8±¬k8²ªm8³®v8´«n8µ¬n8¶vm8·xv8¸mn8¹­j8º®m8»xm8¼­¹3½}~3¾©°3¿¢3À¡£3Ám±3Â®º3Ãmº3Ä©´3Åb®3Æmµ3Çm»3Èx»3Ékn3Êm¸3Ë¼j6ÌÂm6ÍÆÃ6ÎÈm6Ïnm6ÐÊÇ6ÑÌÎ,ÒÍÐ,ÓÅÉ,Ô²¶,Õ³·,Ö®n,×º»,Ømf9ÙËÁ9Úym9ÛmÏ9ÜÑÒ9Ýz{2Þpq2ß½¿2à¾À2á¥§2â°¨2ãÄÓ2ä´Ö2åÝn0æÞn0çØÛ0èÙÜ0éßn0êàã0ë²Ô0ì¯Õ0íán0îâä0ï¹×0ðçv/ñåæ/òçë/óèì/ôéí/õêî/öÚy/÷òm(øóï(ùöy(ú÷ø:ûôõ:ümù:ýðñ4þúû4ÿþý*Āüm*ÿĀ.';
var simpleBdd;
function getSimpleBdd() {
    if (!simpleBdd) {
        simpleBdd = minimalStringToSimpleBdd(minimalBddString);
    }
    return simpleBdd;
}
var resolveInput = function (input) {
    return resolveWithSimpleBdd(getSimpleBdd(), stateResolveFunctionByIndex, input);
};
//# sourceMappingURL=bdd.generated.js.map
;// CONCATENATED MODULE: ./node_modules/event-reduce-js/dist/es/index.js





function calculateActionFromMap(stateSetToActionMap, input) {
    var stateSet = getStateSet(input);
    var actionName = stateSetToActionMap.get(stateSet);
    if (!actionName) {
        return {
            action: 'runFullQueryAgain',
            stateSet: stateSet
        };
    }
    else {
        return {
            action: actionName,
            stateSet: stateSet
        };
    }
}
function calculateActionName(input) {
    var resolvedActionId = resolveInput(input);
    return orderedActionList[resolvedActionId];
}
function calculateActionFunction(input) {
    var actionName = calculateActionName(input);
    return actionFunctions[actionName];
}
/**
 * for performance reasons,
 * @mutates the input
 * @returns the new results
 */
function runAction(action, queryParams, changeEvent, previousResults, keyDocumentMap) {
    var fn = actions_actionFunctions[action];
    fn({
        queryParams: queryParams,
        changeEvent: changeEvent,
        previousResults: previousResults,
        keyDocumentMap: keyDocumentMap
    });
    return previousResults;
}
//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/query-planner.js

var INDEX_MAX = String.fromCharCode(65535);
var INDEX_MIN = -Infinity;

/**
 * Returns the query plan which contains
 * information about how to run the query
 * and which indexes to use.
 * 
 * This is used in some storage like Memory, dexie.js and IndexedDB.
 */
function getQueryPlan(schema, query) {
  var primaryPath = rx_schema_helper_getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var selector = query.selector;
  var indexes = schema.indexes ? schema.indexes.slice(0) : [];
  if (query.index) {
    indexes = [query.index];
  } else {
    indexes.push([primaryPath]);
  }
  var optimalSortIndex = query.sort.map(function (sortField) {
    return Object.keys(sortField)[0];
  });
  var optimalSortIndexCompareString = optimalSortIndex.join(',');
  /**
   * Most storages do not support descending indexes
   * so having a 'desc' in the sorting, means we always have to re-sort the results.
   */
  var hasDescSorting = !!query.sort.find(function (sortField) {
    return Object.values(sortField)[0] === 'desc';
  });
  var currentBestQuality = -1;
  var currentBestQueryPlan;
  indexes.forEach(function (index) {
    var opts = index.map(function (indexField) {
      var matcher = selector[indexField];
      var operators = matcher ? Object.keys(matcher) : [];
      if (!matcher || !operators.length) {
        return {
          startKey: INDEX_MIN,
          endKey: INDEX_MAX,
          inclusiveStart: true,
          inclusiveEnd: true
        };
      }
      var matcherOpts = {};
      operators.forEach(function (operator) {
        if (isLogicalOperator(operator)) {
          var operatorValue = matcher[operator];
          var partialOpts = getMatcherQueryOpts(operator, operatorValue);
          matcherOpts = Object.assign(matcherOpts, partialOpts);
        }
      });

      // fill missing attributes
      if (typeof matcherOpts.startKey === 'undefined') {
        matcherOpts.startKey = INDEX_MIN;
      }
      if (typeof matcherOpts.endKey === 'undefined') {
        matcherOpts.endKey = INDEX_MAX;
      }
      if (typeof matcherOpts.inclusiveStart === 'undefined') {
        matcherOpts.inclusiveStart = true;
      }
      if (typeof matcherOpts.inclusiveEnd === 'undefined') {
        matcherOpts.inclusiveEnd = true;
      }
      return matcherOpts;
    });
    var queryPlan = {
      index: index,
      startKeys: opts.map(function (opt) {
        return opt.startKey;
      }),
      endKeys: opts.map(function (opt) {
        return opt.endKey;
      }),
      inclusiveEnd: !opts.find(function (opt) {
        return !opt.inclusiveEnd;
      }),
      inclusiveStart: !opts.find(function (opt) {
        return !opt.inclusiveStart;
      }),
      sortFieldsSameAsIndexFields: !hasDescSorting && optimalSortIndexCompareString === index.join(',')
    };
    var quality = rateQueryPlan(schema, query, queryPlan);
    if (quality > 0 && quality > currentBestQuality || query.index) {
      currentBestQuality = quality;
      currentBestQueryPlan = queryPlan;
    }
  });

  /**
   * No index found, use the default index
   */
  if (!currentBestQueryPlan) {
    return {
      index: [primaryPath],
      startKeys: [INDEX_MIN],
      endKeys: [INDEX_MAX],
      inclusiveEnd: true,
      inclusiveStart: true,
      sortFieldsSameAsIndexFields: !hasDescSorting && optimalSortIndexCompareString === primaryPath
    };
  }
  return currentBestQueryPlan;
}
var LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte']);
function isLogicalOperator(operator) {
  return LOGICAL_OPERATORS.has(operator);
}
function getMatcherQueryOpts(operator, operatorValue) {
  switch (operator) {
    case '$eq':
      return {
        startKey: operatorValue,
        endKey: operatorValue
      };
    case '$lte':
      return {
        endKey: operatorValue
      };
    case '$gte':
      return {
        startKey: operatorValue
      };
    case '$lt':
      return {
        endKey: operatorValue,
        inclusiveEnd: false
      };
    case '$gt':
      return {
        startKey: operatorValue,
        inclusiveStart: false
      };
    default:
      throw new Error('SNH');
  }
}

/**
 * Returns a number that determines the quality of the query plan.
 * Higher number means better query plan.
 */
function rateQueryPlan(schema, query, queryPlan) {
  var quality = 0;
  var pointsPerMatchingKey = 10;
  var idxOfFirstMinStartKey = queryPlan.startKeys.findIndex(function (keyValue) {
    return keyValue === INDEX_MIN;
  });
  if (idxOfFirstMinStartKey > 0) {
    quality = quality + idxOfFirstMinStartKey * pointsPerMatchingKey;
  }
  var idxOfFirstMaxEndKey = queryPlan.endKeys.findIndex(function (keyValue) {
    return keyValue === INDEX_MAX;
  });
  if (idxOfFirstMaxEndKey > 0) {
    quality = quality + idxOfFirstMaxEndKey * pointsPerMatchingKey;
  }
  var pointsIfNoReSortMustBeDone = 5;
  if (queryPlan.sortFieldsSameAsIndexFields) {
    quality = quality + pointsIfNoReSortMustBeDone;
  }
  return quality;
}
//# sourceMappingURL=query-planner.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-query-helper.js




/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
function normalizeMangoQuery(schema, mangoQuery) {
  var primaryKey = rx_schema_helper_getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var normalizedMangoQuery = util_flatClone(mangoQuery);
  if (typeof normalizedMangoQuery.skip !== 'number') {
    normalizedMangoQuery.skip = 0;
  }
  if (!normalizedMangoQuery.selector) {
    normalizedMangoQuery.selector = {};
  } else {
    normalizedMangoQuery.selector = util_flatClone(normalizedMangoQuery.selector);
    /**
     * In mango query, it is possible to have an
     * equals comparison by directly assigning a value
     * to a property, without the '$eq' operator.
     * Like:
     * selector: {
     *   foo: 'bar'
     * }
     * For normalization, we have to normalize this
     * so our checks can perform properly.
     */
    Object.entries(normalizedMangoQuery.selector).forEach(function (_ref) {
      var field = _ref[0],
        matcher = _ref[1];
      if (typeof matcher !== 'object' || matcher === null) {
        normalizedMangoQuery.selector[field] = {
          $eq: matcher
        };
      }
    });
  }

  /**
   * Ensure that if an index is specified,
   * the primaryKey is inside of it.
   */
  if (normalizedMangoQuery.index) {
    var indexAr = Array.isArray(normalizedMangoQuery.index) ? normalizedMangoQuery.index.slice(0) : [normalizedMangoQuery.index];
    if (!indexAr.includes(primaryKey)) {
      indexAr.push(primaryKey);
    }
    normalizedMangoQuery.index = indexAr;
  }

  /**
   * To ensure a deterministic sorting,
   * we have to ensure the primary key is always part
   * of the sort query.
   * Primary sorting is added as last sort parameter,
   * similiar to how we add the primary key to indexes that do not have it.
   * 
   */
  if (!normalizedMangoQuery.sort) {
    /**
     * If no sort is given at all,
     * we can assume that the user does not care about sort order at al.
     * 
     * we cannot just use the primary key as sort parameter
     * because it would likely cause the query to run over the primary key index
     * which has a bad performance in most cases.
     */
    if (normalizedMangoQuery.index) {
      normalizedMangoQuery.sort = normalizedMangoQuery.index.map(function (field) {
        var _ref2;
        return _ref2 = {}, _ref2[field] = 'asc', _ref2;
      });
    } else {
      /**
       * Find the index that best matches the fields with the logical operators
       */
      if (schema.indexes) {
        var fieldsWithLogicalOperator = new Set();
        Object.entries(normalizedMangoQuery.selector).forEach(function (_ref3) {
          var field = _ref3[0],
            matcher = _ref3[1];
          var hasLogical = false;
          if (typeof matcher === 'object' && matcher !== null) {
            hasLogical = !!Object.keys(matcher).find(function (operator) {
              return isLogicalOperator(operator);
            });
          } else {
            hasLogical = true;
          }
          if (hasLogical) {
            fieldsWithLogicalOperator.add(field);
          }
        });
        var currentFieldsAmount = -1;
        var currentBestIndexForSort;
        schema.indexes.forEach(function (index) {
          var useIndex = isMaybeReadonlyArray(index) ? index : [index];
          var firstWrongIndex = useIndex.findIndex(function (indexField) {
            return !fieldsWithLogicalOperator.has(indexField);
          });
          if (firstWrongIndex > 0 && firstWrongIndex > currentFieldsAmount) {
            currentFieldsAmount = firstWrongIndex;
            currentBestIndexForSort = useIndex;
          }
        });
        if (currentBestIndexForSort) {
          normalizedMangoQuery.sort = currentBestIndexForSort.map(function (field) {
            var _ref4;
            return _ref4 = {}, _ref4[field] = 'asc', _ref4;
          });
        }
      }

      /**
       * Fall back to the primary key as sort order
       * if no better one has been found
       */
      if (!normalizedMangoQuery.sort) {
        var _ref5;
        normalizedMangoQuery.sort = [(_ref5 = {}, _ref5[primaryKey] = 'asc', _ref5)];
      }
    }
  } else {
    var isPrimaryInSort = normalizedMangoQuery.sort.find(function (p) {
      return firstPropertyNameOfObject(p) === primaryKey;
    });
    if (!isPrimaryInSort) {
      var _normalizedMangoQuery;
      normalizedMangoQuery.sort = normalizedMangoQuery.sort.slice(0);
      normalizedMangoQuery.sort.push((_normalizedMangoQuery = {}, _normalizedMangoQuery[primaryKey] = 'asc', _normalizedMangoQuery));
    }
  }
  return normalizedMangoQuery;
}
//# sourceMappingURL=rx-query-helper.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/event-reduce.js




function event_reduce_getSortFieldsOfQuery(primaryKey, query) {
  if (!query.sort || query.sort.length === 0) {
    return [primaryKey];
  } else {
    return query.sort.map(function (part) {
      return Object.keys(part)[0];
    });
  }
}
var RXQUERY_QUERY_PARAMS_CACHE = new WeakMap();
function getQueryParams(rxQuery) {
  if (!RXQUERY_QUERY_PARAMS_CACHE.has(rxQuery)) {
    var collection = rxQuery.collection;
    var preparedQuery = rxQuery.getPreparedQuery();
    var normalizedMangoQuery = normalizeMangoQuery(collection.storageInstance.schema, util_clone(rxQuery.mangoQuery));
    var primaryKey = collection.schema.primaryPath;

    /**
     * Create a custom sort comparator
     * that uses the hooks to ensure
     * we send for example compressed documents to be sorted by compressed queries.
     */
    var sortComparator = collection.database.storage.statics.getSortComparator(collection.schema.jsonSchema, preparedQuery);
    var useSortComparator = function useSortComparator(docA, docB) {
      var sortComparatorData = {
        docA: docA,
        docB: docB,
        rxQuery: rxQuery
      };
      return sortComparator(sortComparatorData.docA, sortComparatorData.docB);
    };

    /**
     * Create a custom query matcher
     * that uses the hooks to ensure
     * we send for example compressed documents to match compressed queries.
     */
    var queryMatcher = collection.database.storage.statics.getQueryMatcher(collection.schema.jsonSchema, preparedQuery);
    var useQueryMatcher = function useQueryMatcher(doc) {
      var queryMatcherData = {
        doc: doc,
        rxQuery: rxQuery
      };
      return queryMatcher(queryMatcherData.doc);
    };
    var ret = {
      primaryKey: rxQuery.collection.schema.primaryPath,
      skip: normalizedMangoQuery.skip,
      limit: normalizedMangoQuery.limit,
      sortFields: event_reduce_getSortFieldsOfQuery(primaryKey, normalizedMangoQuery),
      sortComparator: useSortComparator,
      queryMatcher: useQueryMatcher
    };
    RXQUERY_QUERY_PARAMS_CACHE.set(rxQuery, ret);
    return ret;
  } else {
    return RXQUERY_QUERY_PARAMS_CACHE.get(rxQuery);
  }
}
function calculateNewResults(rxQuery, rxChangeEvents) {
  if (!rxQuery.collection.database.eventReduce) {
    return {
      runFullQueryAgain: true
    };
  }
  var queryParams = getQueryParams(rxQuery);
  var previousResults = util_ensureNotFalsy(rxQuery._result).docsData.slice(0);
  var previousResultsMap = util_ensureNotFalsy(rxQuery._result).docsDataMap;
  var changed = false;
  var eventReduceEvents = rxChangeEvents.map(function (cE) {
    return rxChangeEventToEventReduceChangeEvent(cE);
  }).filter(arrayFilterNotEmpty);
  var foundNonOptimizeable = eventReduceEvents.find(function (eventReduceEvent) {
    var stateResolveFunctionInput = {
      queryParams: queryParams,
      changeEvent: eventReduceEvent,
      previousResults: previousResults,
      keyDocumentMap: previousResultsMap
    };
    var actionName = calculateActionName(stateResolveFunctionInput);
    if (actionName === 'runFullQueryAgain') {
      return true;
    } else if (actionName !== 'doNothing') {
      changed = true;
      runAction(actionName, queryParams, eventReduceEvent, previousResults, previousResultsMap);
      return false;
    }
  });
  if (foundNonOptimizeable) {
    return {
      runFullQueryAgain: true
    };
  } else {
    return {
      runFullQueryAgain: false,
      changed: changed,
      newResults: previousResults
    };
  }
}
//# sourceMappingURL=event-reduce.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/query-cache.js
/**
 * the query-cache makes sure that on every query-state, exactly one instance can exist
 * if you use the same mango-query more then once, it will reuse the first RxQuery
 */


var QueryCache = /*#__PURE__*/function () {
  function QueryCache() {
    this._map = new Map();
  }
  var _proto = QueryCache.prototype;
  /**
   * check if an equal query is in the cache,
   * if true, return the cached one,
   * if false, save the given one and return it
   */_proto.getByQuery = function getByQuery(rxQuery) {
    var stringRep = rxQuery.toString();
    if (!this._map.has(stringRep)) {
      this._map.set(stringRep, rxQuery);
    }
    return this._map.get(stringRep);
  };
  return QueryCache;
}();
function createQueryCache() {
  return new QueryCache();
}
function uncacheRxQuery(queryCache, rxQuery) {
  rxQuery.uncached = true;
  var stringRep = rxQuery.toString();
  queryCache._map["delete"](stringRep);
}
function countRxQuerySubscribers(rxQuery) {
  return rxQuery.refCount$.observers.length;
}
var DEFAULT_TRY_TO_KEEP_MAX = 100;
var DEFAULT_UNEXECUTED_LIFETME = 30 * 1000;

/**
 * The default cache replacement policy
 * See docs-src/query-cache.md to learn how it should work.
 * Notice that this runs often and should block the cpu as less as possible
 * This is a monad which makes it easier to unit test
 */
var defaultCacheReplacementPolicyMonad = function defaultCacheReplacementPolicyMonad(tryToKeepMax, unExecutedLifetime) {
  return function (_collection, queryCache) {
    if (queryCache._map.size < tryToKeepMax) {
      return;
    }
    var minUnExecutedLifetime = util_now() - unExecutedLifetime;
    var maybeUncash = [];
    var queriesInCache = Array.from(queryCache._map.values());
    for (var _i = 0, _queriesInCache = queriesInCache; _i < _queriesInCache.length; _i++) {
      var rxQuery = _queriesInCache[_i];
      // filter out queries with subscribers
      if (countRxQuerySubscribers(rxQuery) > 0) {
        continue;
      }
      // directly uncache queries that never executed and are older then unExecutedLifetime
      if (rxQuery._lastEnsureEqual === 0 && rxQuery._creationTime < minUnExecutedLifetime) {
        uncacheRxQuery(queryCache, rxQuery);
        continue;
      }
      maybeUncash.push(rxQuery);
    }
    var mustUncache = maybeUncash.length - tryToKeepMax;
    if (mustUncache <= 0) {
      return;
    }
    var sortedByLastUsage = maybeUncash.sort(function (a, b) {
      return a._lastEnsureEqual - b._lastEnsureEqual;
    });
    var toRemove = sortedByLastUsage.slice(0, mustUncache);
    toRemove.forEach(function (rxQuery) {
      return uncacheRxQuery(queryCache, rxQuery);
    });
  };
};
var defaultCacheReplacementPolicy = defaultCacheReplacementPolicyMonad(DEFAULT_TRY_TO_KEEP_MAX, DEFAULT_UNEXECUTED_LIFETME);
var COLLECTIONS_WITH_RUNNING_CLEANUP = new WeakSet();

/**
 * Triggers the cache replacement policy after waitTime has passed.
 * We do not run this directly because at exactly the time a query is created,
 * we need all CPU to minimize latency.
 * Also this should not be triggered multiple times when waitTime is still waiting.
 */
function triggerCacheReplacement(rxCollection) {
  if (COLLECTIONS_WITH_RUNNING_CLEANUP.has(rxCollection)) {
    // already started
    return;
  }
  COLLECTIONS_WITH_RUNNING_CLEANUP.add(rxCollection);

  /**
   * Do not run directly to not reduce result latency of a new query
   */
  nextTick() // wait at least one tick
  .then(function () {
    return requestIdlePromise(200);
  }) // and then wait for the CPU to be idle
  .then(function () {
    if (!rxCollection.destroyed) {
      rxCollection.cacheReplacementPolicy(rxCollection, rxCollection._queryCache);
    }
    COLLECTIONS_WITH_RUNNING_CLEANUP["delete"](rxCollection);
  });
}
//# sourceMappingURL=query-cache.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-query.js











/**
 * Runs the query over the storage instance
 * of the collection.
 * Does some optimizations to ensuer findById is used
 * when specific queries are used.
 */
var queryCollection = function queryCollection(rxQuery) {
  try {
    var docs = [];
    var _collection = rxQuery.collection;

    /**
     * Optimizations shortcut.
     * If query is find-one-document-by-id,
     * then we do not have to use the slow query() method
     * but instead can use findDocumentsById()
     */
    var _temp2 = function () {
      if (rxQuery.isFindOneByIdQuery) {
        var docId = rxQuery.isFindOneByIdQuery;
        return Promise.resolve(_collection.storageInstance.findDocumentsById([docId], false)).then(function (docsMap) {
          var docData = docsMap[docId];
          if (docData) {
            docs.push(docData);
          }
        });
      } else {
        var preparedQuery = rxQuery.getPreparedQuery();
        return Promise.resolve(_collection.storageInstance.query(preparedQuery)).then(function (queryResult) {
          docs = queryResult.documents;
        });
      }
    }();
    return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {
      return docs;
    }) : docs);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Returns true if the given query
 * selects exactly one document by its id.
 * Used to optimize performance because these kind of
 * queries do not have to run over an index and can use get-by-id instead.
 * Returns false if no query of that kind.
 * Returns the document id otherwise.
 */
var _queryCount = 0;
var newQueryID = function newQueryID() {
  return ++_queryCount;
};
var RxQueryBase = /*#__PURE__*/function () {
  /**
   * Some stats then are used for debugging and cache replacement policies
   */

  // used in the query-cache to determine if the RxQuery can be cleaned up.

  // used by some plugins

  // used to count the subscribers to the query

  /**
   * Contains the current result state
   * or null if query has not run yet.
   */

  function RxQueryBase(op, mangoQuery, collection) {
    this.id = newQueryID();
    this._execOverDatabaseCount = 0;
    this._creationTime = util_now();
    this._lastEnsureEqual = 0;
    this.other = {};
    this.uncached = false;
    this.refCount$ = new BehaviorSubject(null);
    this._result = null;
    this._latestChangeEvent = -1;
    this._lastExecStart = 0;
    this._lastExecEnd = 0;
    this._ensureEqualQueue = PROMISE_RESOLVE_FALSE;
    this.op = op;
    this.mangoQuery = mangoQuery;
    this.collection = collection;
    if (!mangoQuery) {
      this.mangoQuery = _getDefaultQuery();
    }
    this.isFindOneByIdQuery = isFindOneByIdQuery(this.collection.schema.primaryPath, mangoQuery);
  }
  var _proto = RxQueryBase.prototype;
  /**
   * set the new result-data as result-docs of the query
   * @param newResultData json-docs that were received from pouchdb
   */_proto._setResultData = function _setResultData(newResultData) {
    var docs = createRxDocuments(this.collection, newResultData);

    /**
     * Instead of using the newResultData in the result cache,
     * we directly use the objects that are stored in the RxDocument
     * to ensure we do not store the same data twice and fill up the memory.
     */
    var primPath = this.collection.schema.primaryPath;
    var docsDataMap = new Map();
    var docsData = docs.map(function (doc) {
      var docData = doc._dataSync$.getValue();
      var id = docData[primPath];
      docsDataMap.set(id, docData);
      return docData;
    });
    this._result = {
      docsData: docsData,
      docsDataMap: docsDataMap,
      docs: docs,
      time: util_now()
    };
  }

  /**
   * executes the query on the database
   * @return results-array with document-data
   */;
  _proto._execOverDatabase = function _execOverDatabase() {
    var _this = this;
    this._execOverDatabaseCount = this._execOverDatabaseCount + 1;
    this._lastExecStart = util_now();
    var docsPromise = queryCollection(this);
    return docsPromise.then(function (docs) {
      _this._lastExecEnd = util_now();
      return docs;
    });
  }

  /**
   * Execute the query
   * To have an easier implementations,
   * just subscribe and use the first result
   */;
  _proto.exec = function exec(throwIfMissing) {
    var _this2 = this;
    if (throwIfMissing && this.op !== 'findOne') {
      throw newRxError('QU9', {
        collection: this.collection.name,
        query: this.mangoQuery,
        op: this.op
      });
    }

    /**
     * run _ensureEqual() here,
     * this will make sure that errors in the query which throw inside of the RxStorage,
     * will be thrown at this execution context and not in the background.
     */
    return _ensureEqual(this).then(function () {
      return firstValueFrom(_this2.$);
    }).then(function (result) {
      if (!result && throwIfMissing) {
        throw newRxError('QU10', {
          collection: _this2.collection.name,
          query: _this2.mangoQuery,
          op: _this2.op
        });
      } else {
        return result;
      }
    });
  }

  /**
   * cached call to get the queryMatcher
   * @overwrites itself with the actual value
   */;
  /**
   * returns a string that is used for equal-comparisons
   * @overwrites itself with the actual value
   */_proto.toString = function toString() {
    var stringObj = sortObject({
      op: this.op,
      query: this.mangoQuery,
      other: this.other
    }, true);
    var value = JSON.stringify(stringObj, stringifyFilter);
    this.toString = function () {
      return value;
    };
    return value;
  }

  /**
   * returns the prepared query
   * which can be send to the storage instance to query for documents.
   * @overwrites itself with the actual value.
   */;
  _proto.getPreparedQuery = function getPreparedQuery() {
    var hookInput = {
      rxQuery: this,
      // can be mutated by the hooks so we have to deep clone first.
      mangoQuery: normalizeMangoQuery(this.collection.schema.jsonSchema, util_clone(this.mangoQuery))
    };
    runPluginHooks('prePrepareQuery', hookInput);
    var value = this.collection.database.storage.statics.prepareQuery(this.collection.schema.jsonSchema, hookInput.mangoQuery);
    this.getPreparedQuery = function () {
      return value;
    };
    return value;
  }

  /**
   * returns true if the document matches the query,
   * does not use the 'skip' and 'limit'
   */;
  _proto.doesDocumentDataMatch = function doesDocumentDataMatch(docData) {
    // if doc is deleted, it cannot match
    if (docData._deleted) {
      return false;
    }
    return this.queryMatcher(docData);
  }

  /**
   * deletes all found documents
   * @return promise with deleted documents
   */;
  _proto.remove = function remove() {
    var ret;
    return this.exec().then(function (docs) {
      ret = docs;
      if (Array.isArray(docs)) {
        // TODO use a bulk operation instead of running .remove() on each document
        return Promise.all(docs.map(function (doc) {
          return doc.remove();
        }));
      } else {
        return docs.remove();
      }
    }).then(function () {
      return ret;
    });
  }

  /**
   * helper function to transform RxQueryBase to RxQuery type
   */;
  /**
   * updates all found documents
   * @overwritten by plugin (optional)
   */_proto.update = function update(_updateObj) {
    throw pluginMissing('update');
  }

  // we only set some methods of query-builder here
  // because the others depend on these ones
  ;
  _proto.where = function where(_queryObj) {
    throw pluginMissing('query-builder');
  };
  _proto.sort = function sort(_params) {
    throw pluginMissing('query-builder');
  };
  _proto.skip = function skip(_amount) {
    throw pluginMissing('query-builder');
  };
  _proto.limit = function limit(_amount) {
    throw pluginMissing('query-builder');
  };
  _createClass(RxQueryBase, [{
    key: "$",
    get: function get() {
      var _this3 = this;
      if (!this._$) {
        var results$ = this.collection.$.pipe(
        /**
         * Performance shortcut.
         * Changes to local documents are not relevant for the query.
         */
        filter(function (changeEvent) {
          return !changeEvent.isLocal;
        }),
        /**
         * Start once to ensure the querying also starts
         * when there where no changes.
         */
        startWith(null),
        // ensure query results are up to date.
        mergeMap(function () {
          return _ensureEqual(_this3);
        }),
        // use the current result set, written by _ensureEqual().
        map(function () {
          return _this3._result;
        }),
        // do not run stuff above for each new subscriber, only once.
        shareReplay(RXJS_SHARE_REPLAY_DEFAULTS),
        // do not proceed if result set has not changed.
        distinctUntilChanged(function (prev, curr) {
          if (prev && prev.time === util_ensureNotFalsy(curr).time) {
            return true;
          } else {
            return false;
          }
        }), filter(function (result) {
          return !!result;
        }),
        /**
         * Map the result set to a single RxDocument or an array,
         * depending on query type
         */
        map(function (result) {
          var useResult = util_ensureNotFalsy(result);
          if (_this3.op === 'findOne') {
            // findOne()-queries emit RxDocument or null
            return useResult.docs.length === 0 ? null : useResult.docs[0];
          } else {
            // find()-queries emit RxDocument[]
            // Flat copy the array so it wont matter if the user modifies it.
            return useResult.docs.slice(0);
          }
        }));
        this._$ = merge(results$,
        /**
         * Also add the refCount$ to the query observable
         * to allow us to count the amount of subscribers.
         */
        this.refCount$.pipe(filter(function () {
          return false;
        })));
      }
      return this._$;
    }

    // stores the changeEvent-number of the last handled change-event
  }, {
    key: "queryMatcher",
    get: function get() {
      var schema = this.collection.schema.jsonSchema;

      /**
       * Instead of calling this.getPreparedQuery(),
       * we have to prepare the query for the query matcher
       * so that it does not contain modifications from the hooks
       * like the key compression.
       */
      var usePreparedQuery = this.collection.database.storage.statics.prepareQuery(schema, normalizeMangoQuery(this.collection.schema.jsonSchema, util_clone(this.mangoQuery)));
      return overwriteGetterForCaching(this, 'queryMatcher', this.collection.database.storage.statics.getQueryMatcher(schema, usePreparedQuery));
    }
  }, {
    key: "asRxQuery",
    get: function get() {
      return this;
    }
  }]);
  return RxQueryBase;
}();
function _getDefaultQuery() {
  return {
    selector: {}
  };
}

/**
 * run this query through the QueryCache
 */
function tunnelQueryCache(rxQuery) {
  return rxQuery.collection._queryCache.getByQuery(rxQuery);
}
function createRxQuery(op, queryObj, collection) {
  runPluginHooks('preCreateRxQuery', {
    op: op,
    queryObj: queryObj,
    collection: collection
  });
  var ret = new RxQueryBase(op, queryObj, collection);

  // ensure when created with same params, only one is created
  ret = tunnelQueryCache(ret);
  triggerCacheReplacement(collection);
  return ret;
}

/**
 * Check if the current results-state is in sync with the database
 * which means that no write event happened since the last run.
 * @return false if not which means it should re-execute
 */
function _isResultsInSync(rxQuery) {
  var currentLatestEventNumber = rxQuery.asRxQuery.collection._changeEventBuffer.counter;
  if (rxQuery._latestChangeEvent >= currentLatestEventNumber) {
    return true;
  } else {
    return false;
  }
}

/**
 * wraps __ensureEqual()
 * to ensure it does not run in parallel
 * @return true if has changed, false if not
 */
function _ensureEqual(rxQuery) {
  // Optimisation shortcut
  if (rxQuery.collection.database.destroyed || _isResultsInSync(rxQuery)) {
    return PROMISE_RESOLVE_FALSE;
  }
  rxQuery._ensureEqualQueue = rxQuery._ensureEqualQueue.then(function () {
    return __ensureEqual(rxQuery);
  });
  return rxQuery._ensureEqualQueue;
}

/**
 * ensures that the results of this query is equal to the results which a query over the database would give
 * @return true if results have changed
 */
function __ensureEqual(rxQuery) {
  rxQuery._lastEnsureEqual = util_now();

  /**
   * Optimisation shortcuts
   */
  if (
  // db is closed
  rxQuery.collection.database.destroyed ||
  // nothing happend since last run
  _isResultsInSync(rxQuery)) {
    return PROMISE_RESOLVE_FALSE;
  }
  var ret = false;
  var mustReExec = false; // if this becomes true, a whole execution over the database is made
  if (rxQuery._latestChangeEvent === -1) {
    // have not executed yet -> must run
    mustReExec = true;
  }

  /**
   * try to use EventReduce to calculate the new results
   */
  if (!mustReExec) {
    var missedChangeEvents = rxQuery.asRxQuery.collection._changeEventBuffer.getFrom(rxQuery._latestChangeEvent + 1);
    if (missedChangeEvents === null) {
      // changeEventBuffer is of bounds -> we must re-execute over the database
      mustReExec = true;
    } else {
      rxQuery._latestChangeEvent = rxQuery.asRxQuery.collection._changeEventBuffer.counter;
      var runChangeEvents = rxQuery.asRxQuery.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);
      var eventReduceResult = calculateNewResults(rxQuery, runChangeEvents);
      if (eventReduceResult.runFullQueryAgain) {
        // could not calculate the new results, execute must be done
        mustReExec = true;
      } else if (eventReduceResult.changed) {
        // we got the new results, we do not have to re-execute, mustReExec stays false
        ret = true; // true because results changed
        rxQuery._setResultData(eventReduceResult.newResults);
      }
    }
  }

  // oh no we have to re-execute the whole query over the database
  if (mustReExec) {
    // counter can change while _execOverDatabase() is running so we save it here
    var latestAfter = rxQuery.collection._changeEventBuffer.counter;
    return rxQuery._execOverDatabase().then(function (newResultData) {
      rxQuery._latestChangeEvent = latestAfter;
      if (!rxQuery._result || !fast_deep_equal_default()(newResultData, rxQuery._result.docsData)) {
        ret = true; // true because results changed
        rxQuery._setResultData(newResultData);
      }
      return ret;
    });
  }
  return Promise.resolve(ret); // true if results have changed
}

function isFindOneByIdQuery(primaryPath, query) {
  if (!query.skip && query.selector && Object.keys(query.selector).length === 1 && query.selector[primaryPath]) {
    if (typeof query.selector[primaryPath] === 'string') {
      return query.selector[primaryPath];
    } else if (Object.keys(query.selector[primaryPath]).length === 1 && typeof query.selector[primaryPath].$eq === 'string') {
      return query.selector[primaryPath].$eq;
    }
  }
  return false;
}
function rx_query_isInstanceOf(obj) {
  return obj instanceof RxQueryBase;
}
//# sourceMappingURL=rx-query.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/doc-cache.js
var DocCache = /*#__PURE__*/function () {
  function DocCache() {
    this._map = new Map();
    this._map = new Map();
  }
  var _proto = DocCache.prototype;
  _proto.get = function get(id) {
    return this._map.get(id);
  };
  _proto.set = function set(id, obj) {
    return this._map.set(id, obj);
  };
  _proto["delete"] = function _delete(id) {
    return this._map["delete"](id);
  };
  return DocCache;
}();
//# sourceMappingURL=doc-cache.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/change-event-buffer.js
/**
 * a buffer-cache which holds the last X changeEvents of the collection
 */


var ChangeEventBuffer = /*#__PURE__*/function () {
  /**
   * array with changeEvents
   * starts with oldest known event, ends with newest
   */

  function ChangeEventBuffer(collection) {
    var _this = this;
    this.subs = [];
    this.limit = 100;
    this.counter = 0;
    this.eventCounterMap = new WeakMap();
    this.buffer = [];
    this.collection = collection;
    this.subs.push(this.collection.$.pipe(filter(function (cE) {
      return !cE.isLocal;
    })).subscribe(function (cE) {
      return _this._handleChangeEvent(cE);
    }));
  }
  var _proto = ChangeEventBuffer.prototype;
  _proto._handleChangeEvent = function _handleChangeEvent(changeEvent) {
    this.counter++;
    this.buffer.push(changeEvent);
    this.eventCounterMap.set(changeEvent, this.counter);
    while (this.buffer.length > this.limit) {
      this.buffer.shift();
    }
  }

  /**
   * gets the array-index for the given pointer
   * @return arrayIndex which can be used to itterate from there. If null, pointer is out of lower bound
   */;
  _proto.getArrayIndexByPointer = function getArrayIndexByPointer(pointer) {
    var oldestEvent = this.buffer[0];
    var oldestCounter = this.eventCounterMap.get(oldestEvent);
    if (pointer < oldestCounter) return null; // out of bounds

    var rest = pointer - oldestCounter;
    return rest;
  }

  /**
   * get all changeEvents which came in later than the pointer-event
   * @return array with change-events. Iif null, pointer out of bounds
   */;
  _proto.getFrom = function getFrom(pointer) {
    var ret = [];
    var currentIndex = this.getArrayIndexByPointer(pointer);
    if (currentIndex === null)
      // out of bounds
      return null;
    while (true) {
      var nextEvent = this.buffer[currentIndex];
      currentIndex++;
      if (!nextEvent) {
        return ret;
      } else {
        ret.push(nextEvent);
      }
    }
  };
  _proto.runFrom = function runFrom(pointer, fn) {
    var ret = this.getFrom(pointer);
    if (ret === null) {
      throw new Error('out of bounds');
    } else {
      ret.forEach(function (cE) {
        return fn(cE);
      });
    }
  }

  /**
   * no matter how many operations are done on one document,
   * only the last operation has to be checked to calculate the new state
   * this function reduces the events to the last ChangeEvent of each doc
   */;
  _proto.reduceByLastOfDoc = function reduceByLastOfDoc(changeEvents) {
    return changeEvents.slice(0);
    // TODO the old implementation was wrong
    // because it did not correctly reassigned the previousData of the changeevents
    // this should be added to the event-reduce library and not be done in RxDB
    var docEventMap = {};
    changeEvents.forEach(function (changeEvent) {
      docEventMap[changeEvent.documentId] = changeEvent;
    });
    return Object.values(docEventMap);
  };
  _proto.destroy = function destroy() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
  };
  return ChangeEventBuffer;
}();
function createChangeEventBuffer(collection) {
  return new ChangeEventBuffer(collection);
}
//# sourceMappingURL=change-event-buffer.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/replication-protocol/conflicts.js


/**
 * Resolves a conflict error or determines that the given document states are equal.
 * Returns the resolved document that must be written to the fork.
 * Then the new document state can be pushed upstream.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the upstream, never in the downstream.
 */
var resolveConflictError = function resolveConflictError(state, input, forkState) {
  try {
    var conflictHandler = state.input.conflictHandler;
    return Promise.resolve(conflictHandler(input, 'replication-resolve-conflict')).then(function (conflictHandlerOutput) {
      if (conflictHandlerOutput.isEqual) {
        /**
         * Documents are equal,
         * so this is not a conflict -> do nothing.
         */
        return undefined;
      } else {
        /**
         * We have a resolved conflict,
         * use the resolved document data.
         */
        var resolvedDoc = Object.assign({}, conflictHandlerOutput.documentData, {
          /**
           * Because the resolved conflict is written to the fork,
           * we have to keep/update the forks _meta data, not the masters.
           */
          _meta: flatClone(forkState._meta),
          _rev: getDefaultRevision(),
          _attachments: flatClone(forkState._attachments)
        });
        resolvedDoc._meta.lwt = now();
        resolvedDoc._rev = createRevision(state.input.hashFunction, resolvedDoc, forkState);
        return {
          resolvedDoc: resolvedDoc,
          output: conflictHandlerOutput
        };
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var defaultConflictHandler = function defaultConflictHandler(i, _context) {
  /**
   * If the documents are deep equal,
   * we have no conflict.
   * On your custom conflict handler you might only
   * check some properties, like the updatedAt time,
   * for better performance, because deepEqual is expensive.
   */
  if (fast_deep_equal_default()(i.newDocumentState, i.realMasterState)) {
    return Promise.resolve({
      isEqual: true
    });
  }

  /**
   * The default conflict handler will always
   * drop the fork state and use the master state instead.
   */
  return Promise.resolve({
    isEqual: false,
    documentData: i.realMasterState
  });
};
//# sourceMappingURL=conflicts.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-collection.js













var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
var hooksApplied = false;
var RxCollectionBase = /*#__PURE__*/function () {
  /**
   * Stores all 'normal' documents
   */

  function RxCollectionBase(database, name, schema, internalStorageInstance) {
    var instanceCreationOptions = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    var migrationStrategies = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    var methods = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
    var attachments = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    var options = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : {};
    var cacheReplacementPolicy = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : defaultCacheReplacementPolicy;
    var statics = arguments.length > 10 && arguments[10] !== undefined ? arguments[10] : {};
    var conflictHandler = arguments.length > 11 && arguments[11] !== undefined ? arguments[11] : defaultConflictHandler;
    this.storageInstance = {};
    this.timeouts = new Set();
    this._atomicUpsertQueues = new Map();
    this.synced = false;
    this.hooks = {};
    this._subs = [];
    this._docCache = new DocCache();
    this._queryCache = createQueryCache();
    this.$ = {};
    this._changeEventBuffer = {};
    this.onDestroy = [];
    this.destroyed = false;
    this.database = database;
    this.name = name;
    this.schema = schema;
    this.internalStorageInstance = internalStorageInstance;
    this.instanceCreationOptions = instanceCreationOptions;
    this.migrationStrategies = migrationStrategies;
    this.methods = methods;
    this.attachments = attachments;
    this.options = options;
    this.cacheReplacementPolicy = cacheReplacementPolicy;
    this.statics = statics;
    this.conflictHandler = conflictHandler;
    _applyHookFunctions(this.asRxCollection);
  }
  var _proto = RxCollectionBase.prototype;
  _proto.prepare = function prepare() {
    try {
      var _this2 = this;
      _this2.storageInstance = getWrappedStorageInstance(_this2.database, _this2.internalStorageInstance, _this2.schema.jsonSchema);
      _this2.$ = _this2.database.eventBulks$.pipe(filter(function (changeEventBulk) {
        return changeEventBulk.collectionName === _this2.name;
      }), mergeMap(function (changeEventBulk) {
        return changeEventBulk.events;
      }));
      _this2._changeEventBuffer = createChangeEventBuffer(_this2.asRxCollection);

      /**
       * Instead of resolving the EventBulk array here and spit it into
       * single events, we should fully work with event bulks internally
       * to save performance.
       */
      return Promise.resolve(_this2.database.storageToken).then(function (databaseStorageToken) {
        var subDocs = _this2.storageInstance.changeStream().subscribe(function (eventBulk) {
          var changeEventBulk = {
            id: eventBulk.id,
            internal: false,
            collectionName: _this2.name,
            storageToken: databaseStorageToken,
            events: eventBulk.events.map(function (ev) {
              return storageChangeEventToRxChangeEvent(false, ev, _this2);
            }),
            databaseToken: _this2.database.token,
            checkpoint: eventBulk.checkpoint,
            context: eventBulk.context
          };
          _this2.database.$emit(changeEventBulk);
        });
        _this2._subs.push(subDocs);

        /**
         * When a write happens to the collection
         * we find the changed document in the docCache
         * and tell it that it has to change its data.
         */
        _this2._subs.push(_this2.$.pipe(filter(function (cE) {
          return !cE.isLocal;
        })).subscribe(function (cE) {
          // when data changes, send it to RxDocument in docCache
          var doc = _this2._docCache.get(cE.documentId);
          if (doc) {
            doc._handleChangeEvent(cE);
          }
        }));

        /**
         * Resolve the conflict tasks
         * of the RxStorageInstance
         */
        _this2._subs.push(_this2.storageInstance.conflictResultionTasks().subscribe(function (task) {
          _this2.conflictHandler(task.input, task.context).then(function (output) {
            _this2.storageInstance.resolveConflictResultionTask({
              id: task.id,
              output: output
            });
          });
        }));
        return PROMISE_RESOLVE_VOID;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  } // overwritte by migration-plugin
  ;
  _proto.migrationNeeded = function migrationNeeded() {
    throw pluginMissing('migration');
  };
  _proto.getDataMigrator = function getDataMigrator() {
    throw pluginMissing('migration');
  };
  _proto.migrate = function migrate() {
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return this.getDataMigrator().migrate(batchSize);
  };
  _proto.migratePromise = function migratePromise() {
    var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
    return this.getDataMigrator().migratePromise(batchSize);
  };
  _proto.insert = function insert(json) {
    try {
      var _this4 = this;
      var useJson = fillObjectDataBeforeInsert(_this4.schema, json);
      return Promise.resolve(_this4.bulkInsert([useJson])).then(function (writeResult) {
        var isError = writeResult.error[0];
        throwIfIsStorageWriteError(_this4, useJson[_this4.schema.primaryPath], json, isError);
        var insertResult = util_ensureNotFalsy(writeResult.success[0]);
        return insertResult;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.bulkInsert = function bulkInsert(docsData) {
    try {
      var _temp4 = function _temp4(docs) {
        var docsMap = new Map();
        var insertRows = docs.map(function (doc) {
          docsMap.set(doc[_this6.schema.primaryPath], doc);
          var docData = Object.assign(doc, {
            _attachments: {},
            _meta: getDefaultRxDocumentMeta(),
            _rev: util_getDefaultRevision(),
            _deleted: false
          });
          var row = {
            document: docData
          };
          return row;
        });
        return Promise.resolve(_this6.storageInstance.bulkWrite(insertRows, 'rx-collection-bulk-insert')).then(function (results) {
          function _temp2() {
            return {
              success: rxDocuments,
              error: Object.values(results.error)
            };
          }
          // create documents
          var successDocData = Object.values(results.success);
          var rxDocuments = successDocData.map(function (writtenDocData) {
            var doc = createRxDocument(_this6, writtenDocData);
            return doc;
          });
          var _temp = function () {
            if (_this6.hasHooks('post', 'insert')) {
              return Promise.resolve(Promise.all(rxDocuments.map(function (doc) {
                return _this6._runHooks('post', 'insert', docsMap.get(doc.primary), doc);
              }))).then(function () {});
            }
          }();
          return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
        });
      };
      var _this6 = this;
      /**
       * Optimization shortcut,
       * do nothing when called with an empty array
       */
      if (docsData.length === 0) {
        return Promise.resolve({
          success: [],
          error: []
        });
      }
      var useDocs = docsData.map(function (docData) {
        var useDocData = fillObjectDataBeforeInsert(_this6.schema, docData);
        return useDocData;
      });
      var _this5$hasHooks2 = _this6.hasHooks('pre', 'insert');
      return Promise.resolve(_this5$hasHooks2 ? Promise.resolve(Promise.all(useDocs.map(function (doc) {
        return _this6._runHooks('pre', 'insert', doc).then(function () {
          return doc;
        });
      }))).then(_temp4) : _temp4(useDocs));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.bulkRemove = function bulkRemove(ids) {
    try {
      var _this8 = this;
      /**
       * Optimization shortcut,
       * do nothing when called with an empty array
       */
      if (ids.length === 0) {
        return Promise.resolve({
          success: [],
          error: []
        });
      }
      return Promise.resolve(_this8.findByIds(ids)).then(function (rxDocumentMap) {
        var docsData = [];
        var docsMap = new Map();
        Array.from(rxDocumentMap.values()).forEach(function (rxDocument) {
          var data = util_clone(rxDocument.toJSON(true));
          docsData.push(data);
          docsMap.set(rxDocument.primary, data);
        });
        return Promise.resolve(Promise.all(docsData.map(function (doc) {
          var primary = doc[_this8.schema.primaryPath];
          return _this8._runHooks('pre', 'remove', doc, rxDocumentMap.get(primary));
        }))).then(function () {
          var removeDocs = docsData.map(function (doc) {
            var writeDoc = util_flatClone(doc);
            writeDoc._deleted = true;
            return {
              previous: doc,
              document: writeDoc
            };
          });
          return Promise.resolve(_this8.storageInstance.bulkWrite(removeDocs, 'rx-collection-bulk-remove')).then(function (results) {
            var successIds = Object.keys(results.success);

            // run hooks
            return Promise.resolve(Promise.all(successIds.map(function (id) {
              return _this8._runHooks('post', 'remove', docsMap.get(id), rxDocumentMap.get(id));
            }))).then(function () {
              var rxDocuments = successIds.map(function (id) {
                return rxDocumentMap.get(id);
              });
              return {
                success: rxDocuments,
                error: Object.values(results.error)
              };
            });
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  } /**
     * same as bulkInsert but overwrites existing document with same primary
     */;
  _proto.bulkUpsert = function bulkUpsert(docsData) {
    try {
      var _this10 = this;
      var insertData = [];
      var useJsonByDocId = new Map();
      docsData.forEach(function (docData) {
        var useJson = fillObjectDataBeforeInsert(_this10.schema, docData);
        var primary = useJson[_this10.schema.primaryPath];
        if (!primary) {
          throw newRxError('COL3', {
            primaryPath: _this10.schema.primaryPath,
            data: useJson,
            schema: _this10.schema.jsonSchema
          });
        }
        useJsonByDocId.set(primary, useJson);
        insertData.push(useJson);
      });
      return Promise.resolve(_this10.bulkInsert(insertData)).then(function (insertResult) {
        var ret = insertResult.success.slice(0);
        return Promise.resolve(Promise.all(insertResult.error.map(function (error) {
          var id = error.documentId;
          var writeData = getFromMapOrThrow(useJsonByDocId, id);
          var docDataInDb = util_ensureNotFalsy(error.documentInDb);
          var doc = createRxDocument(_this10.asRxCollection, docDataInDb);
          return doc.atomicUpdate(function () {
            return writeData;
          });
        }))).then(function (updatedDocs) {
          ret = ret.concat(updatedDocs);
          return ret;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  } /**
     * same as insert but overwrites existing document with same primary
     */;
  _proto.upsert = function upsert(json) {
    return this.bulkUpsert([json]).then(function (result) {
      return result[0];
    });
  }

  /**
   * upserts to a RxDocument, uses atomicUpdate if document already exists
   */;
  _proto.atomicUpsert = function atomicUpsert(json) {
    var _this11 = this;
    var useJson = fillObjectDataBeforeInsert(this.schema, json);
    var primary = useJson[this.schema.primaryPath];
    if (!primary) {
      throw newRxError('COL4', {
        data: json
      });
    }

    // ensure that it wont try 2 parallel runs
    var queue = this._atomicUpsertQueues.get(primary);
    if (!queue) {
      queue = PROMISE_RESOLVE_VOID;
    }
    queue = queue.then(function () {
      return _atomicUpsertEnsureRxDocumentExists(_this11, primary, useJson);
    }).then(function (wasInserted) {
      if (!wasInserted.inserted) {
        return _atomicUpsertUpdate(wasInserted.doc, useJson).then(function () {
          return wasInserted.doc;
        });
      } else {
        return wasInserted.doc;
      }
    });
    this._atomicUpsertQueues.set(primary, queue);
    return queue;
  };
  _proto.find = function find(queryObj) {
    if (typeof queryObj === 'string') {
      throw newRxError('COL5', {
        queryObj: queryObj
      });
    }
    if (!queryObj) {
      queryObj = _getDefaultQuery();
    }
    var query = createRxQuery('find', queryObj, this);
    return query;
  };
  _proto.findOne = function findOne(queryObj) {
    var query;
    if (typeof queryObj === 'string') {
      var _selector;
      query = createRxQuery('findOne', {
        selector: (_selector = {}, _selector[this.schema.primaryPath] = queryObj, _selector),
        limit: 1
      }, this);
    } else {
      if (!queryObj) {
        queryObj = _getDefaultQuery();
      }

      // cannot have limit on findOne queries because it will be overwritte
      if (queryObj.limit) {
        throw newRxError('QU6');
      }
      queryObj.limit = 1;
      query = createRxQuery('findOne', queryObj, this);
    }
    if (typeof queryObj === 'number' || Array.isArray(queryObj)) {
      throw newRxTypeError('COL6', {
        queryObj: queryObj
      });
    }
    return query;
  }

  /**
   * find a list documents by their primary key
   * has way better performance then running multiple findOne() or a find() with a complex $or-selected
   */;
  _proto.findByIds = function findByIds(ids) {
    try {
      var _this13 = this;
      var ret = new Map();
      var mustBeQueried = [];

      // first try to fill from docCache
      ids.forEach(function (id) {
        var doc = _this13._docCache.get(id);
        if (doc) {
          ret.set(id, doc);
        } else {
          mustBeQueried.push(id);
        }
      });

      // find everything which was not in docCache
      var _temp6 = function () {
        if (mustBeQueried.length > 0) {
          return Promise.resolve(_this13.storageInstance.findDocumentsById(mustBeQueried, false)).then(function (docs) {
            Object.values(docs).forEach(function (docData) {
              var doc = createRxDocument(_this13, docData);
              ret.set(doc.primary, doc);
            });
          });
        }
      }();
      return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(function () {
        return ret;
      }) : ret);
    } catch (e) {
      return Promise.reject(e);
    }
  } /**
     * like this.findByIds but returns an observable
     * that always emits the current state
     */;
  _proto.findByIds$ = function findByIds$(ids) {
    var _this14 = this;
    var currentValue = null;
    var lastChangeEvent = -1;

    /**
     * Ensure we do not process events in parallel
     */
    var queue = PROMISE_RESOLVE_VOID;
    var initialPromise = this.findByIds(ids).then(function (docsMap) {
      lastChangeEvent = _this14._changeEventBuffer.counter;
      currentValue = docsMap;
    });
    var firstEmitDone = false;
    return this.$.pipe(startWith(null),
    /**
     * Optimization shortcut.
     * Do not proceed if the emited RxChangeEvent
     * is not relevant for the query.
     */
    filter(function (changeEvent) {
      if (
      // first emit has no event
      changeEvent && (
      // local documents are not relevant for the query
      changeEvent.isLocal ||
      // document of the change is not in the ids list.
      !ids.includes(changeEvent.documentId))) {
        return false;
      } else {
        return true;
      }
    }), mergeMap(function () {
      return initialPromise;
    }),
    /**
     * Because shareReplay with refCount: true
     * will often subscribe/unsusbscribe
     * we always ensure that we handled all missed events
     * since the last subscription.
     */
    mergeMap(function () {
      queue = queue.then(function () {
        try {
          var _temp10 = function _temp10(_result) {
            if (_exit2) return _result;
            firstEmitDone = true;
            return currentValue;
          };
          var _exit2 = false;
          /**
           * We first have to clone the Map
           * to ensure we do not create side effects by mutating
           * a Map that has already been returned before.
           */
          currentValue = new Map(util_ensureNotFalsy(currentValue));
          var missedChangeEvents = _this14._changeEventBuffer.getFrom(lastChangeEvent + 1);
          lastChangeEvent = _this14._changeEventBuffer.counter;
          var _temp11 = function () {
            if (missedChangeEvents === null) {
              /**
               * changeEventBuffer is of bounds -> we must re-execute over the database
               * because we cannot calculate the new results just from the events.
               */return Promise.resolve(_this14.findByIds(ids)).then(function (newResult) {
                lastChangeEvent = _this14._changeEventBuffer.counter;
                _exit2 = true;
                return newResult;
              });
            } else {
              var resultHasChanged = false;
              missedChangeEvents.forEach(function (rxChangeEvent) {
                var docId = rxChangeEvent.documentId;
                if (!ids.includes(docId)) {
                  // document is not relevant for the result set
                  return;
                }
                var op = rxChangeEvent.operation;
                if (op === 'INSERT' || op === 'UPDATE') {
                  resultHasChanged = true;
                  var rxDocument = createRxDocument(_this14.asRxCollection, rxChangeEvent.documentData);
                  util_ensureNotFalsy(currentValue).set(docId, rxDocument);
                } else {
                  if (util_ensureNotFalsy(currentValue).has(docId)) {
                    resultHasChanged = true;
                    util_ensureNotFalsy(currentValue)["delete"](docId);
                  }
                }
              });

              // nothing happened that affects the result -> do not emit
              if (!resultHasChanged && firstEmitDone) {
                var _temp12 = false;
                _exit2 = true;
                return _temp12;
              }
            }
          }();
          return Promise.resolve(_temp11 && _temp11.then ? _temp11.then(_temp10) : _temp10(_temp11));
        } catch (e) {
          return Promise.reject(e);
        }
      });
      return queue;
    }), filter(function (x) {
      return !!x;
    }), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
  }

  /**
   * Export collection to a JSON friendly format.
   */;
  _proto.exportJSON = function exportJSON() {
    throw pluginMissing('json-dump');
  }

  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
   */;
  _proto.importJSON = function importJSON(_exportedJSON) {
    throw pluginMissing('json-dump');
  }

  /**
   * sync with a CouchDB endpoint
   */;
  _proto.syncCouchDB = function syncCouchDB(_syncOptions) {
    throw pluginMissing('replication');
  }

  /**
   * sync with a GraphQL endpoint
   */;
  _proto.syncGraphQL = function syncGraphQL(_options) {
    throw pluginMissing('replication-graphql');
  }

  /**
   * HOOKS
   */;
  _proto.addHook = function addHook(when, key, fun) {
    var parallel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    if (typeof fun !== 'function') {
      throw newRxTypeError('COL7', {
        key: key,
        when: when
      });
    }
    if (!HOOKS_WHEN.includes(when)) {
      throw newRxTypeError('COL8', {
        key: key,
        when: when
      });
    }
    if (!HOOKS_KEYS.includes(key)) {
      throw newRxError('COL9', {
        key: key
      });
    }
    if (when === 'post' && key === 'create' && parallel === true) {
      throw newRxError('COL10', {
        when: when,
        key: key,
        parallel: parallel
      });
    }

    // bind this-scope to hook-function
    var boundFun = fun.bind(this);
    var runName = parallel ? 'parallel' : 'series';
    this.hooks[key] = this.hooks[key] || {};
    this.hooks[key][when] = this.hooks[key][when] || {
      series: [],
      parallel: []
    };
    this.hooks[key][when][runName].push(boundFun);
  };
  _proto.getHooks = function getHooks(when, key) {
    if (!this.hooks[key] || !this.hooks[key][when]) {
      return {
        series: [],
        parallel: []
      };
    }
    return this.hooks[key][when];
  };
  _proto.hasHooks = function hasHooks(when, key) {
    var hooks = this.getHooks(when, key);
    if (!hooks) {
      return false;
    }
    return hooks.series.length > 0 || hooks.parallel.length > 0;
  };
  _proto._runHooks = function _runHooks(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) {
      return PROMISE_RESOLVE_VOID;
    }

    // run parallel: false
    var tasks = hooks.series.map(function (hook) {
      return function () {
        return hook(data, instance);
      };
    });
    return promiseSeries(tasks)
    // run parallel: true
    .then(function () {
      return Promise.all(hooks.parallel.map(function (hook) {
        return hook(data, instance);
      }));
    });
  }

  /**
   * does the same as ._runHooks() but with non-async-functions
   */;
  _proto._runHooksSync = function _runHooksSync(when, key, data, instance) {
    var hooks = this.getHooks(when, key);
    if (!hooks) return;
    hooks.series.forEach(function (hook) {
      return hook(data, instance);
    });
  }

  /**
   * Returns a promise that resolves after the given time.
   * Ensures that is properly cleans up when the collection is destroyed
   * so that no running timeouts prevent the exit of the JavaScript process.
   */;
  _proto.promiseWait = function promiseWait(time) {
    var _this15 = this;
    var ret = new Promise(function (res) {
      var timeout = setTimeout(function () {
        _this15.timeouts["delete"](timeout);
        res();
      }, time);
      _this15.timeouts.add(timeout);
    });
    return ret;
  };
  _proto.destroy = function destroy() {
    var _this16 = this;
    if (this.destroyed) {
      return PROMISE_RESOLVE_FALSE;
    }

    /**
     * Settings destroyed = true
     * must be the first thing to do,
     * so for example the replication can directly stop
     * instead of sending requests to a closed storage.
     */
    this.destroyed = true;
    Array.from(this.timeouts).forEach(function (timeout) {
      return clearTimeout(timeout);
    });
    if (this._changeEventBuffer) {
      this._changeEventBuffer.destroy();
    }
    /**
     * First wait until the whole database is idle.
     * This ensures that the storage does not get closed
     * while some operation is running.
     * It is important that we do not intercept a running call
     * because it might lead to undefined behavior like when a doc is written
     * but the change is not added to the changes collection.
     */
    return this.database.requestIdlePromise().then(function () {
      return Promise.all(_this16.onDestroy.map(function (fn) {
        return fn();
      }));
    }).then(function () {
      return _this16.storageInstance.close();
    }).then(function () {
      /**
       * Unsubscribing must be done AFTER the storageInstance.close()
       * Because the conflict handling is part of the subscriptions and
       * otherwise there might be open conflicts to be resolved which
       * will then stuck and never resolve.
       */
      _this16._subs.forEach(function (sub) {
        return sub.unsubscribe();
      });
      delete _this16.database.collections[_this16.name];
      return runAsyncPluginHooks('postDestroyRxCollection', _this16).then(function () {
        return true;
      });
    });
  }

  /**
   * remove all data of the collection
   */;
  _proto.remove = function remove() {
    try {
      var _this18 = this;
      return Promise.resolve(_this18.destroy()).then(function () {
        return Promise.resolve(removeCollectionStorages(_this18.database.storage, _this18.database.internalStore, _this18.database.token, _this18.database.name, _this18.name, _this18.database.hashFunction)).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _createClass(RxCollectionBase, [{
    key: "insert$",
    get: function get() {
      return this.$.pipe(filter(function (cE) {
        return cE.operation === 'INSERT';
      }));
    }
  }, {
    key: "update$",
    get: function get() {
      return this.$.pipe(filter(function (cE) {
        return cE.operation === 'UPDATE';
      }));
    }
  }, {
    key: "remove$",
    get: function get() {
      return this.$.pipe(filter(function (cE) {
        return cE.operation === 'DELETE';
      }));
    }
  }, {
    key: "asRxCollection",
    get: function get() {
      return this;
    }
  }]);
  return RxCollectionBase;
}();

/**
 * adds the hook-functions to the collections prototype
 * this runs only once
 */
function _applyHookFunctions(collection) {
  if (hooksApplied) return; // already run
  hooksApplied = true;
  var colProto = Object.getPrototypeOf(collection);
  HOOKS_KEYS.forEach(function (key) {
    HOOKS_WHEN.map(function (when) {
      var fnName = when + ucfirst(key);
      colProto[fnName] = function (fun, parallel) {
        return this.addHook(when, key, fun, parallel);
      };
    });
  });
}
function _atomicUpsertUpdate(doc, json) {
  return doc.atomicUpdate(function (_innerDoc) {
    return json;
  }).then(function () {
    return nextTick();
  }).then(function () {
    return doc;
  });
}

/**
 * ensures that the given document exists
 * @return promise that resolves with new doc and flag if inserted
 */
function _atomicUpsertEnsureRxDocumentExists(rxCollection, primary, json) {
  /**
   * Optimisation shortcut,
   * first try to find the document in the doc-cache
   */
  var docFromCache = rxCollection._docCache.get(primary);
  if (docFromCache) {
    return Promise.resolve({
      doc: docFromCache,
      inserted: false
    });
  }
  return rxCollection.findOne(primary).exec().then(function (doc) {
    if (!doc) {
      return rxCollection.insert(json).then(function (newDoc) {
        return {
          doc: newDoc,
          inserted: true
        };
      });
    } else {
      return {
        doc: doc,
        inserted: false
      };
    }
  });
}

/**
 * creates and prepares a new collection
 */
function createRxCollection(_ref) {
  var database = _ref.database,
    name = _ref.name,
    schema = _ref.schema,
    _ref$instanceCreation = _ref.instanceCreationOptions,
    instanceCreationOptions = _ref$instanceCreation === void 0 ? {} : _ref$instanceCreation,
    _ref$migrationStrateg = _ref.migrationStrategies,
    migrationStrategies = _ref$migrationStrateg === void 0 ? {} : _ref$migrationStrateg,
    _ref$autoMigrate = _ref.autoMigrate,
    autoMigrate = _ref$autoMigrate === void 0 ? true : _ref$autoMigrate,
    _ref$statics = _ref.statics,
    statics = _ref$statics === void 0 ? {} : _ref$statics,
    _ref$methods = _ref.methods,
    methods = _ref$methods === void 0 ? {} : _ref$methods,
    _ref$attachments = _ref.attachments,
    attachments = _ref$attachments === void 0 ? {} : _ref$attachments,
    _ref$options = _ref.options,
    options = _ref$options === void 0 ? {} : _ref$options,
    _ref$localDocuments = _ref.localDocuments,
    localDocuments = _ref$localDocuments === void 0 ? false : _ref$localDocuments,
    _ref$cacheReplacement = _ref.cacheReplacementPolicy,
    cacheReplacementPolicy = _ref$cacheReplacement === void 0 ? defaultCacheReplacementPolicy : _ref$cacheReplacement,
    _ref$conflictHandler = _ref.conflictHandler,
    conflictHandler = _ref$conflictHandler === void 0 ? defaultConflictHandler : _ref$conflictHandler;
  var storageInstanceCreationParams = {
    databaseInstanceToken: database.token,
    databaseName: database.name,
    collectionName: name,
    schema: schema.jsonSchema,
    options: instanceCreationOptions,
    multiInstance: database.multiInstance,
    password: database.password
  };
  runPluginHooks('preCreateRxStorageInstance', storageInstanceCreationParams);
  return createRxCollectionStorageInstance(database, storageInstanceCreationParams).then(function (storageInstance) {
    var collection = new RxCollectionBase(database, name, schema, storageInstance, instanceCreationOptions, migrationStrategies, methods, attachments, options, cacheReplacementPolicy, statics, conflictHandler);
    return collection.prepare().then(function () {
      // ORM add statics
      Object.entries(statics).forEach(function (_ref2) {
        var funName = _ref2[0],
          fun = _ref2[1];
        Object.defineProperty(collection, funName, {
          get: function get() {
            return fun.bind(collection);
          }
        });
      });
      var ret = PROMISE_RESOLVE_VOID;
      if (autoMigrate && collection.schema.version !== 0) {
        ret = collection.migratePromise();
      }
      return ret;
    }).then(function () {
      runPluginHooks('createRxCollection', {
        collection: collection,
        creator: {
          name: name,
          schema: schema,
          storageInstance: storageInstance,
          instanceCreationOptions: instanceCreationOptions,
          migrationStrategies: migrationStrategies,
          methods: methods,
          attachments: attachments,
          options: options,
          cacheReplacementPolicy: cacheReplacementPolicy,
          localDocuments: localDocuments,
          statics: statics
        }
      });
      return collection;
    })
    /**
     * If the collection creation fails,
     * we yet have to close the storage instances.
     */["catch"](function (err) {
      return storageInstance.close().then(function () {
        return Promise.reject(err);
      });
    });
  });
}
function isRxCollection(obj) {
  return obj instanceof RxCollectionBase;
}
//# sourceMappingURL=rx-collection.js.map
;// CONCATENATED MODULE: ./node_modules/oblivious-set/dist/es/index.js
/**
 * this is a set which automatically forgets
 * a given entry when a new entry is set and the ttl
 * of the old one is over
 */
var ObliviousSet = /** @class */ (function () {
    function ObliviousSet(ttl) {
        this.ttl = ttl;
        this.map = new Map();
        /**
         * Creating calls to setTimeout() is expensive,
         * so we only do that if there is not timeout already open.
         */
        this._to = false;
    }
    ObliviousSet.prototype.has = function (value) {
        return this.map.has(value);
    };
    ObliviousSet.prototype.add = function (value) {
        var _this = this;
        this.map.set(value, es_now());
        /**
         * When a new value is added,
         * start the cleanup at the next tick
         * to not block the cpu for more important stuff
         * that might happen.
         */
        if (!this._to) {
            this._to = true;
            setTimeout(function () {
                _this._to = false;
                removeTooOldValues(_this);
            }, 0);
        }
    };
    ObliviousSet.prototype.clear = function () {
        this.map.clear();
    };
    return ObliviousSet;
}());

/**
 * Removes all entries from the set
 * where the TTL has expired
 */
function removeTooOldValues(obliviousSet) {
    var olderThen = es_now() - obliviousSet.ttl;
    var iterator = obliviousSet.map[Symbol.iterator]();
    /**
     * Because we can assume the new values are added at the bottom,
     * we start from the top and stop as soon as we reach a non-too-old value.
     */
    while (true) {
        var next = iterator.next().value;
        if (!next) {
            return; // no more elements
        }
        var value = next[0];
        var time = next[1];
        if (time < olderThen) {
            obliviousSet.map.delete(value);
        }
        else {
            // We reached a value that is not old enough
            return;
        }
    }
}
function es_now() {
    return new Date().getTime();
}
//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/rx-database.js














/**
 * stores the used database names
 * so we can throw when the same database is created more then once.
 */

/**
 * For better performance some tasks run async
 * and are awaited later.
 * But we still have to ensure that there have been no errors
 * on database creation.
 */
var ensureNoStartupErrors = function ensureNoStartupErrors(rxDatabase) {
  try {
    return Promise.resolve(rxDatabase.storageToken).then(function () {
      if (rxDatabase.startupErrors[0]) {
        throw rxDatabase.startupErrors[0];
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Returns true if the given RxDatabase was the first
 * instance that was created on the storage with this name.
 * 
 * Can be used for some optimizations because on the first instantiation,
 * we can assume that no data was written before.
 */
var isRxDatabaseFirstTimeInstantiated = function isRxDatabaseFirstTimeInstantiated(database) {
  try {
    return Promise.resolve(database.storageTokenDocument).then(function (tokenDoc) {
      return tokenDoc.data.instanceToken === database.token;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 * 
 * Returns the names of the removed collections.
 */
var removeRxDatabase = function removeRxDatabase(databaseName, storage) {
  try {
    var databaseInstanceToken = randomCouchString(10);
    return Promise.resolve(createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, {}, false)).then(function (dbInternalsStorageInstance) {
      return Promise.resolve(getAllCollectionDocuments(storage.statics, dbInternalsStorageInstance)).then(function (collectionDocs) {
        var collectionNames = new Set();
        collectionDocs.forEach(function (doc) {
          return collectionNames.add(doc.data.name);
        });
        var removedCollectionNames = Array.from(collectionNames);
        return Promise.resolve(Promise.all(removedCollectionNames.map(function (collectionName) {
          return removeCollectionStorages(storage, dbInternalsStorageInstance, databaseInstanceToken, databaseName, collectionName);
        }))).then(function () {
          return Promise.resolve(runAsyncPluginHooks('postRemoveRxDatabase', {
            databaseName: databaseName,
            storage: storage
          })).then(function () {
            return Promise.resolve(dbInternalsStorageInstance.remove()).then(function () {
              return removedCollectionNames;
            });
          });
        });
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
var createRxDatabaseStorageInstance = function createRxDatabaseStorageInstance(databaseInstanceToken, storage, databaseName, options, multiInstance, password) {
  try {
    return Promise.resolve(storage.createStorageInstance({
      databaseInstanceToken: databaseInstanceToken,
      databaseName: databaseName,
      collectionName: INTERNAL_STORAGE_NAME,
      schema: INTERNAL_STORE_SCHEMA,
      options: options,
      multiInstance: multiInstance,
      password: password
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};
var USED_DATABASE_NAMES = new Set();
var DB_COUNT = 0;
var RxDatabaseBase = /*#__PURE__*/function () {
  function RxDatabaseBase(name,
  /**
   * Uniquely identifies the instance
   * of this RxDatabase.
   */
  token, storage, instanceCreationOptions, password, multiInstance) {
    var _this = this;
    var eventReduce = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
    var options = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    var
    /**
     * Stores information documents about the collections of the database
     */
    internalStore = arguments.length > 8 ? arguments[8] : undefined;
    var hashFunction = arguments.length > 9 ? arguments[9] : undefined;
    var cleanupPolicy = arguments.length > 10 ? arguments[10] : undefined;
    this.idleQueue = new IdleQueue();
    this._subs = [];
    this.startupErrors = [];
    this.onDestroy = [];
    this.destroyed = false;
    this.collections = {};
    this.eventBulks$ = new Subject();
    this.observable$ = this.eventBulks$.pipe(mergeMap(function (changeEventBulk) {
      return changeEventBulk.events;
    }));
    this.storageToken = PROMISE_RESOLVE_FALSE;
    this.storageTokenDocument = PROMISE_RESOLVE_FALSE;
    this.emittedEventBulkIds = new ObliviousSet(60 * 1000);
    this.name = name;
    this.token = token;
    this.storage = storage;
    this.instanceCreationOptions = instanceCreationOptions;
    this.password = password;
    this.multiInstance = multiInstance;
    this.eventReduce = eventReduce;
    this.options = options;
    this.internalStore = internalStore;
    this.hashFunction = hashFunction;
    this.cleanupPolicy = cleanupPolicy;
    DB_COUNT++;

    /**
     * In the dev-mode, we create a pseudoInstance
     * to get all properties of RxDatabase and ensure they do not
     * conflict with the collection names etc.
     * So only if it is not pseudoInstance,
     * we have all values to prepare a real RxDatabase.
     * 
     * TODO this is ugly, we should use a different way in the dev-mode
     * so that all non-dev-mode code can be cleaner.
     */
    if (this.name !== 'pseudoInstance') {
      /**
       * Wrap the internal store
       * to ensure that calls to it also end up in
       * calculation of the idle state and the hooks.
       */
      this.internalStore = getWrappedStorageInstance(this.asRxDatabase, internalStore, INTERNAL_STORE_SCHEMA);

      /**
       * Start writing the storage token.
       * Do not await the creation because it would run
       * in a critical path that increases startup time.
       * 
       * Writing the token takes about 20 milliseconds
       * even on a fast adapter, so this is worth it.
       */
      this.storageTokenDocument = ensureStorageTokenDocumentExists(this.asRxDatabase)["catch"](function (err) {
        return _this.startupErrors.push(err);
      });
      this.storageToken = this.storageTokenDocument.then(function (doc) {
        return doc.data.token;
      })["catch"](function (err) {
        return _this.startupErrors.push(err);
      });
    }
  }
  var _proto = RxDatabaseBase.prototype;
  /**
   * This is the main handle-point for all change events
   * ChangeEvents created by this instance go:
   * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
   * ChangeEvents created by other instances go:
   * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
   */_proto.$emit = function $emit(changeEventBulk) {
    if (this.emittedEventBulkIds.has(changeEventBulk.id)) {
      return;
    }
    this.emittedEventBulkIds.add(changeEventBulk.id);

    // emit into own stream
    this.eventBulks$.next(changeEventBulk);
  }

  /**
   * removes the collection-doc from the internalStore
   */;
  _proto.removeCollectionDoc = function removeCollectionDoc(name, schema) {
    try {
      var _this3 = this;
      return Promise.resolve(rx_storage_helper_getSingleDocument(_this3.internalStore, getPrimaryKeyOfInternalDocument(_collectionNamePrimary(name, schema), INTERNAL_CONTEXT_COLLECTION))).then(function (doc) {
        if (!doc) {
          throw newRxError('SNH', {
            name: name,
            schema: schema
          });
        }
        var writeDoc = flatCloneDocWithMeta(doc);
        writeDoc._deleted = true;
        return Promise.resolve(_this3.internalStore.bulkWrite([{
          document: writeDoc,
          previous: doc
        }], 'rx-database-remove-collection')).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  } /**
     * creates multiple RxCollections at once
     * to be much faster by saving db txs and doing stuff in bulk-operations
     * This function is not called often, but mostly in the critical path at the initial page load
     * So it must be as fast as possible.
     */;
  _proto.addCollections = function addCollections(collectionCreators) {
    try {
      var _this5 = this;
      var jsonSchemas = {};
      var schemas = {};
      var bulkPutDocs = [];
      var useArgsByCollectionName = {};
      Object.entries(collectionCreators).forEach(function (_ref) {
        var name = _ref[0],
          args = _ref[1];
        var collectionName = name;
        var rxJsonSchema = args.schema;
        jsonSchemas[collectionName] = rxJsonSchema;
        var schema = createRxSchema(rxJsonSchema);
        schemas[collectionName] = schema;

        // collection already exists
        if (_this5.collections[name]) {
          throw newRxError('DB3', {
            name: name
          });
        }
        var collectionNameWithVersion = _collectionNamePrimary(name, rxJsonSchema);
        var collectionDocData = {
          id: getPrimaryKeyOfInternalDocument(collectionNameWithVersion, INTERNAL_CONTEXT_COLLECTION),
          key: collectionNameWithVersion,
          context: INTERNAL_CONTEXT_COLLECTION,
          data: {
            name: collectionName,
            schemaHash: schema.hash,
            schema: schema.jsonSchema,
            version: schema.version,
            connectedStorages: []
          },
          _deleted: false,
          _meta: getDefaultRxDocumentMeta(),
          _rev: util_getDefaultRevision(),
          _attachments: {}
        };
        bulkPutDocs.push({
          document: collectionDocData
        });
        var useArgs = Object.assign({}, args, {
          name: collectionName,
          schema: schema,
          database: _this5
        });

        // run hooks
        var hookData = util_flatClone(args);
        hookData.database = _this5;
        hookData.name = name;
        runPluginHooks('preCreateRxCollection', hookData);
        useArgsByCollectionName[collectionName] = useArgs;
      });
      return Promise.resolve(_this5.internalStore.bulkWrite(bulkPutDocs, 'rx-database-add-collection')).then(function (putDocsResult) {
        return Promise.resolve(ensureNoStartupErrors(_this5)).then(function () {
          Object.entries(putDocsResult.error).forEach(function (_ref2) {
            var _id = _ref2[0],
              error = _ref2[1];
            var docInDb = util_ensureNotFalsy(error.documentInDb);
            var collectionName = docInDb.data.name;
            var schema = schemas[collectionName];
            // collection already exists but has different schema
            if (docInDb.data.schemaHash !== schema.hash) {
              throw newRxError('DB6', {
                database: _this5.name,
                collection: collectionName,
                previousSchemaHash: docInDb.data.schemaHash,
                schemaHash: schema.hash,
                previousSchema: docInDb.data.schema,
                schema: util_ensureNotFalsy(jsonSchemas[collectionName])
              });
            }
          });
          var ret = {};
          return Promise.resolve(Promise.all(Object.keys(collectionCreators).map(function (collectionName) {
            try {
              var useArgs = useArgsByCollectionName[collectionName];
              return Promise.resolve(createRxCollection(useArgs)).then(function (collection) {
                ret[collectionName] = collection;

                // set as getter to the database
                _this5.collections[collectionName] = collection;
                if (!_this5[collectionName]) {
                  Object.defineProperty(_this5, collectionName, {
                    get: function get() {
                      return _this5.collections[collectionName];
                    }
                  });
                }
              });
            } catch (e) {
              return Promise.reject(e);
            }
          }))).then(function () {
            return ret;
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  } /**
     * runs the given function between idleQueue-locking
     */;
  _proto.lockedRun = function lockedRun(fn) {
    return this.idleQueue.wrapCall(fn);
  };
  _proto.requestIdlePromise = function requestIdlePromise() {
    return this.idleQueue.requestIdlePromise();
  }

  /**
   * Export database to a JSON friendly format.
   */;
  _proto.exportJSON = function exportJSON(_collections) {
    throw pluginMissing('json-dump');
  }

  /**
   * Import the parsed JSON export into the collection.
   * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
   * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
   * since data could be encrypted.
   */;
  _proto.importJSON = function importJSON(_exportedJSON) {
    throw pluginMissing('json-dump');
  };
  _proto.serverCouchDB = function serverCouchDB(_options) {
    throw pluginMissing('server-couchdb');
  };
  _proto.backup = function backup(_options) {
    throw pluginMissing('backup');
  };
  _proto.leaderElector = function leaderElector() {
    throw pluginMissing('leader-election');
  };
  _proto.isLeader = function isLeader() {
    throw pluginMissing('leader-election');
  }
  /**
   * returns a promise which resolves when the instance becomes leader
   */;
  _proto.waitForLeadership = function waitForLeadership() {
    throw pluginMissing('leader-election');
  };
  _proto.migrationStates = function migrationStates() {
    throw pluginMissing('migration');
  }

  /**
   * destroys the database-instance and all collections
   */;
  _proto.destroy = function destroy() {
    try {
      var _this7 = this;
      if (_this7.destroyed) {
        return Promise.resolve(PROMISE_RESOLVE_FALSE);
      }

      // settings destroyed = true must be the first thing to do.
      _this7.destroyed = true;
      return Promise.resolve(runAsyncPluginHooks('preDestroyRxDatabase', _this7)).then(function () {
        /**
         * Complete the event stream
         * to stop all subscribers who forgot to unsubscribe.
         */
        _this7.eventBulks$.complete();
        DB_COUNT--;
        _this7._subs.map(function (sub) {
          return sub.unsubscribe();
        });

        /**
         * Destroying the pseudo instance will throw
         * because stulff is missing
         * TODO we should not need the pseudo instance on runtime.
         * we should generate the property list on build time.
         */
        return _this7.name === 'pseudoInstance' ? PROMISE_RESOLVE_FALSE : _this7.requestIdlePromise().then(function () {
          return Promise.all(_this7.onDestroy.map(function (fn) {
            return fn();
          }));
        })
        // destroy all collections
        .then(function () {
          return Promise.all(Object.keys(_this7.collections).map(function (key) {
            return _this7.collections[key];
          }).map(function (col) {
            return col.destroy();
          }));
        })
        // destroy internal storage instances
        .then(function () {
          return _this7.internalStore.close();
        })
        // remove combination from USED_COMBINATIONS-map
        .then(function () {
          return USED_DATABASE_NAMES["delete"](_this7.name);
        }).then(function () {
          return true;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  } /**
     * deletes the database and its stored data.
     * Returns the names of all removed collections.
     */;
  _proto.remove = function remove() {
    var _this8 = this;
    return this.destroy().then(function () {
      return removeRxDatabase(_this8.name, _this8.storage);
    });
  };
  _createClass(RxDatabaseBase, [{
    key: "$",
    get: function get() {
      return this.observable$;
    }
  }, {
    key: "asRxDatabase",
    get: function get() {
      return this;
    }
  }]);
  return RxDatabaseBase;
}();

/**
 * checks if an instance with same name and adapter already exists
 * @throws {RxError} if used
 */
function throwIfDatabaseNameUsed(name) {
  if (!USED_DATABASE_NAMES.has(name)) {
    return;
  } else {
    throw newRxError('DB8', {
      name: name,
      link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
    });
  }
}
function createRxDatabase(_ref3) {
  var storage = _ref3.storage,
    instanceCreationOptions = _ref3.instanceCreationOptions,
    name = _ref3.name,
    password = _ref3.password,
    _ref3$multiInstance = _ref3.multiInstance,
    multiInstance = _ref3$multiInstance === void 0 ? true : _ref3$multiInstance,
    _ref3$eventReduce = _ref3.eventReduce,
    eventReduce = _ref3$eventReduce === void 0 ? false : _ref3$eventReduce,
    _ref3$ignoreDuplicate = _ref3.ignoreDuplicate,
    ignoreDuplicate = _ref3$ignoreDuplicate === void 0 ? false : _ref3$ignoreDuplicate,
    _ref3$options = _ref3.options,
    options = _ref3$options === void 0 ? {} : _ref3$options,
    cleanupPolicy = _ref3.cleanupPolicy,
    _ref3$localDocuments = _ref3.localDocuments,
    localDocuments = _ref3$localDocuments === void 0 ? false : _ref3$localDocuments,
    _ref3$hashFunction = _ref3.hashFunction,
    hashFunction = _ref3$hashFunction === void 0 ? defaultHashFunction : _ref3$hashFunction;
  runPluginHooks('preCreateRxDatabase', {
    storage: storage,
    instanceCreationOptions: instanceCreationOptions,
    name: name,
    password: password,
    multiInstance: multiInstance,
    eventReduce: eventReduce,
    ignoreDuplicate: ignoreDuplicate,
    options: options,
    localDocuments: localDocuments
  });
  // check if combination already used
  if (!ignoreDuplicate) {
    throwIfDatabaseNameUsed(name);
  }
  USED_DATABASE_NAMES.add(name);
  var databaseInstanceToken = randomCouchString(10);
  return createRxDatabaseStorageInstance(databaseInstanceToken, storage, name, instanceCreationOptions, multiInstance, password)
  /**
   * Creating the internal store might fail
   * if some RxStorage wrapper is used that does some checks
   * and then throw.
   * In that case we have to properly clean up the database.
   */["catch"](function (err) {
    USED_DATABASE_NAMES["delete"](name);
    throw err;
  }).then(function (storageInstance) {
    var rxDatabase = new RxDatabaseBase(name, databaseInstanceToken, storage, instanceCreationOptions, password, multiInstance, eventReduce, options, storageInstance, hashFunction, cleanupPolicy);
    return runAsyncPluginHooks('createRxDatabase', {
      database: rxDatabase,
      creator: {
        storage: storage,
        instanceCreationOptions: instanceCreationOptions,
        name: name,
        password: password,
        multiInstance: multiInstance,
        eventReduce: eventReduce,
        ignoreDuplicate: ignoreDuplicate,
        options: options,
        localDocuments: localDocuments
      }
    }).then(function () {
      return rxDatabase;
    });
  });
}
function isRxDatabase(obj) {
  return obj instanceof RxDatabaseBase;
}
function dbCount() {
  return DB_COUNT;
}
//# sourceMappingURL=rx-database.js.map
// EXTERNAL MODULE: ./node_modules/mingo/index.js
var mingo = __webpack_require__(4406);
;// CONCATENATED MODULE: ./node_modules/dexie/dist/modern/dexie.min.mjs
const e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:global,t=Object.keys,n=Array.isArray;function r(e,n){return"object"!=typeof n||t(n).forEach((function(t){e[t]=n[t]})),e}"undefined"==typeof Promise||e.Promise||(e.Promise=Promise);const s=Object.getPrototypeOf,i={}.hasOwnProperty;function o(e,t){return i.call(e,t)}function a(e,n){"function"==typeof n&&(n=n(s(e))),("undefined"==typeof Reflect?t:Reflect.ownKeys)(n).forEach((t=>{l(e,t,n[t])}))}const u=Object.defineProperty;function l(e,t,n,s){u(e,t,r(n&&o(n,"get")&&"function"==typeof n.get?{get:n.get,set:n.set,configurable:!0}:{value:n,configurable:!0,writable:!0},s))}function c(e){return{from:function(t){return e.prototype=Object.create(t.prototype),l(e.prototype,"constructor",e),{extend:a.bind(null,e.prototype)}}}}const h=Object.getOwnPropertyDescriptor;function d(e,t){let n;return h(e,t)||(n=s(e))&&d(n,t)}const f=[].slice;function p(e,t,n){return f.call(e,t,n)}function y(e,t){return t(e)}function m(e){if(!e)throw new Error("Assertion Failed")}function v(t){e.setImmediate?setImmediate(t):setTimeout(t,0)}function g(e,t){return e.reduce(((e,n,r)=>{var s=t(n,r);return s&&(e[s[0]]=s[1]),e}),{})}function b(e,t){if(o(e,t))return e[t];if(!t)return e;if("string"!=typeof t){for(var n=[],r=0,s=t.length;r<s;++r){var i=b(e,t[r]);n.push(i)}return n}var a=t.indexOf(".");if(-1!==a){var u=e[t.substr(0,a)];return void 0===u?void 0:b(u,t.substr(a+1))}}function _(e,t,r){if(e&&void 0!==t&&(!("isFrozen"in Object)||!Object.isFrozen(e)))if("string"!=typeof t&&"length"in t){m("string"!=typeof r&&"length"in r);for(var s=0,i=t.length;s<i;++s)_(e,t[s],r[s])}else{var a=t.indexOf(".");if(-1!==a){var u=t.substr(0,a),l=t.substr(a+1);if(""===l)void 0===r?n(e)&&!isNaN(parseInt(u))?e.splice(u,1):delete e[u]:e[u]=r;else{var c=e[u];c&&o(e,u)||(c=e[u]={}),_(c,l,r)}}else void 0===r?n(e)&&!isNaN(parseInt(t))?e.splice(t,1):delete e[t]:e[t]=r}}function w(e){var t={};for(var n in e)o(e,n)&&(t[n]=e[n]);return t}const x=[].concat;function k(e){return x.apply([],e)}const E="Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(k([8,16,32,64].map((e=>["Int","Uint","Float"].map((t=>t+e+"Array")))))).filter((t=>e[t])),P=E.map((t=>e[t]));g(E,(e=>[e,!0]));let K=null;function O(e){K="undefined"!=typeof WeakMap&&new WeakMap;const t=S(e);return K=null,t}function S(e){if(!e||"object"!=typeof e)return e;let t=K&&K.get(e);if(t)return t;if(n(e)){t=[],K&&K.set(e,t);for(var r=0,i=e.length;r<i;++r)t.push(S(e[r]))}else if(P.indexOf(e.constructor)>=0)t=e;else{const n=s(e);for(var a in t=n===Object.prototype?{}:Object.create(n),K&&K.set(e,t),e)o(e,a)&&(t[a]=S(e[a]))}return t}const{toString:A}={};function C(e){return A.call(e).slice(8,-1)}const j="undefined"!=typeof Symbol?Symbol.iterator:"@@iterator",D="symbol"==typeof j?function(e){var t;return null!=e&&(t=e[j])&&t.apply(e)}:function(){return null},I={};function B(e){var t,r,s,i;if(1===arguments.length){if(n(e))return e.slice();if(this===I&&"string"==typeof e)return[e];if(i=D(e)){for(r=[];!(s=i.next()).done;)r.push(s.value);return r}if(null==e)return[e];if("number"==typeof(t=e.length)){for(r=new Array(t);t--;)r[t]=e[t];return r}return[e]}for(t=arguments.length,r=new Array(t);t--;)r[t]=arguments[t];return r}const T="undefined"!=typeof Symbol?e=>"AsyncFunction"===e[Symbol.toStringTag]:()=>!1;var R="undefined"!=typeof location&&/^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);function F(e,t){R=e,M=t}var M=()=>!0;const N=!new Error("").stack;function q(){if(N)try{throw q.arguments,new Error}catch(e){return e}return new Error}function $(e,t){var n=e.stack;return n?(t=t||0,0===n.indexOf(e.name)&&(t+=(e.name+e.message).split("\n").length),n.split("\n").slice(t).filter(M).map((e=>"\n"+e)).join("")):""}var U=["Unknown","Constraint","Data","TransactionInactive","ReadOnly","Version","NotFound","InvalidState","InvalidAccess","Abort","Timeout","QuotaExceeded","Syntax","DataClone"],L=["Modify","Bulk","OpenFailed","VersionChange","Schema","Upgrade","InvalidTable","MissingAPI","NoSuchDatabase","InvalidArgument","SubTransaction","Unsupported","Internal","DatabaseClosed","PrematureCommit","ForeignAwait"].concat(U),V={VersionChanged:"Database version changed by other database connection",DatabaseClosed:"Database has been closed",Abort:"Transaction aborted",TransactionInactive:"Transaction has already completed or failed",MissingAPI:"IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb"};function W(e,t){this._e=q(),this.name=e,this.message=t}function Y(e,t){return e+". Errors: "+Object.keys(t).map((e=>t[e].toString())).filter(((e,t,n)=>n.indexOf(e)===t)).join("\n")}function z(e,t,n,r){this._e=q(),this.failures=t,this.failedKeys=r,this.successCount=n,this.message=Y(e,t)}function G(e,t){this._e=q(),this.name="BulkError",this.failures=Object.keys(t).map((e=>t[e])),this.failuresByPos=t,this.message=Y(e,t)}c(W).from(Error).extend({stack:{get:function(){return this._stack||(this._stack=this.name+": "+this.message+$(this._e,2))}},toString:function(){return this.name+": "+this.message}}),c(z).from(W),c(G).from(W);var H=L.reduce(((e,t)=>(e[t]=t+"Error",e)),{});const Q=W;var X=L.reduce(((e,t)=>{var n=t+"Error";function r(e,r){this._e=q(),this.name=n,e?"string"==typeof e?(this.message=`${e}${r?"\n "+r:""}`,this.inner=r||null):"object"==typeof e&&(this.message=`${e.name} ${e.message}`,this.inner=e):(this.message=V[t]||n,this.inner=null)}return c(r).from(Q),e[t]=r,e}),{});X.Syntax=SyntaxError,X.Type=TypeError,X.Range=RangeError;var J=U.reduce(((e,t)=>(e[t+"Error"]=X[t],e)),{});var Z=L.reduce(((e,t)=>(-1===["Syntax","Type","Range"].indexOf(t)&&(e[t+"Error"]=X[t]),e)),{});function ee(){}function te(e){return e}function ne(e,t){return null==e||e===te?t:function(n){return t(e(n))}}function re(e,t){return function(){e.apply(this,arguments),t.apply(this,arguments)}}function se(e,t){return e===ee?t:function(){var n=e.apply(this,arguments);void 0!==n&&(arguments[0]=n);var r=this.onsuccess,s=this.onerror;this.onsuccess=null,this.onerror=null;var i=t.apply(this,arguments);return r&&(this.onsuccess=this.onsuccess?re(r,this.onsuccess):r),s&&(this.onerror=this.onerror?re(s,this.onerror):s),void 0!==i?i:n}}function ie(e,t){return e===ee?t:function(){e.apply(this,arguments);var n=this.onsuccess,r=this.onerror;this.onsuccess=this.onerror=null,t.apply(this,arguments),n&&(this.onsuccess=this.onsuccess?re(n,this.onsuccess):n),r&&(this.onerror=this.onerror?re(r,this.onerror):r)}}function oe(e,t){return e===ee?t:function(n){var s=e.apply(this,arguments);r(n,s);var i=this.onsuccess,o=this.onerror;this.onsuccess=null,this.onerror=null;var a=t.apply(this,arguments);return i&&(this.onsuccess=this.onsuccess?re(i,this.onsuccess):i),o&&(this.onerror=this.onerror?re(o,this.onerror):o),void 0===s?void 0===a?void 0:a:r(s,a)}}function ae(e,t){return e===ee?t:function(){return!1!==t.apply(this,arguments)&&e.apply(this,arguments)}}function ue(e,t){return e===ee?t:function(){var n=e.apply(this,arguments);if(n&&"function"==typeof n.then){for(var r=this,s=arguments.length,i=new Array(s);s--;)i[s]=arguments[s];return n.then((function(){return t.apply(r,i)}))}return t.apply(this,arguments)}}Z.ModifyError=z,Z.DexieError=W,Z.BulkError=G;var le={};const[ce,he,de]="undefined"==typeof Promise?[]:(()=>{let e=Promise.resolve();if("undefined"==typeof crypto||!crypto.subtle)return[e,s(e),e];const t=crypto.subtle.digest("SHA-512",new Uint8Array([0]));return[t,s(t),e]})(),fe=he&&he.then,pe=ce&&ce.constructor,ye=!!de;var me=!1,ve=de?()=>{de.then(qe)}:e.setImmediate?setImmediate.bind(null,qe):e.MutationObserver?()=>{var e=document.createElement("div");new MutationObserver((()=>{qe(),e=null})).observe(e,{attributes:!0}),e.setAttribute("i","1")}:()=>{setTimeout(qe,0)},ge=function(e,t){Oe.push([e,t]),_e&&(ve(),_e=!1)},be=!0,_e=!0,we=[],xe=[],ke=null,Ee=te,Pe={id:"global",global:!0,ref:0,unhandleds:[],onunhandled:ct,pgp:!1,env:{},finalize:function(){this.unhandleds.forEach((e=>{try{ct(e[0],e[1])}catch(e){}}))}},Ke=Pe,Oe=[],Se=0,Ae=[];function Ce(e){if("object"!=typeof this)throw new TypeError("Promises must be constructed via new");this._listeners=[],this.onuncatched=ee,this._lib=!1;var t=this._PSD=Ke;if(R&&(this._stackHolder=q(),this._prev=null,this._numPrev=0),"function"!=typeof e){if(e!==le)throw new TypeError("Not a function");return this._state=arguments[1],this._value=arguments[2],void(!1===this._state&&Be(this,this._value))}this._state=null,this._value=null,++t.ref,Ie(this,e)}const je={get:function(){var e=Ke,t=Qe;function n(n,r){var s=!e.global&&(e!==Ke||t!==Qe);const i=s&&!et();var o=new Ce(((t,o)=>{Re(this,new De(ut(n,e,s,i),ut(r,e,s,i),t,o,e))}));return R&&Ne(o,this),o}return n.prototype=le,n},set:function(e){l(this,"then",e&&e.prototype===le?je:{get:function(){return e},set:je.set})}};function De(e,t,n,r,s){this.onFulfilled="function"==typeof e?e:null,this.onRejected="function"==typeof t?t:null,this.resolve=n,this.reject=r,this.psd=s}function Ie(e,t){try{t((t=>{if(null===e._state){if(t===e)throw new TypeError("A promise cannot be resolved with itself.");var n=e._lib&&$e();t&&"function"==typeof t.then?Ie(e,((e,n)=>{t instanceof Ce?t._then(e,n):t.then(e,n)})):(e._state=!0,e._value=t,Te(e)),n&&Ue()}}),Be.bind(null,e))}catch(t){Be(e,t)}}function Be(e,t){if(xe.push(t),null===e._state){var n=e._lib&&$e();t=Ee(t),e._state=!1,e._value=t,R&&null!==t&&"object"==typeof t&&!t._promise&&function(e,t,n){try{e.apply(null,n)}catch(e){t&&t(e)}}((()=>{var n=d(t,"stack");t._promise=e,l(t,"stack",{get:()=>me?n&&(n.get?n.get.apply(t):n.value):e.stack})})),function(e){we.some((t=>t._value===e._value))||we.push(e)}(e),Te(e),n&&Ue()}}function Te(e){var t=e._listeners;e._listeners=[];for(var n=0,r=t.length;n<r;++n)Re(e,t[n]);var s=e._PSD;--s.ref||s.finalize(),0===Se&&(++Se,ge((()=>{0==--Se&&Le()}),[]))}function Re(e,t){if(null!==e._state){var n=e._state?t.onFulfilled:t.onRejected;if(null===n)return(e._state?t.resolve:t.reject)(e._value);++t.psd.ref,++Se,ge(Fe,[n,e,t])}else e._listeners.push(t)}function Fe(e,t,n){try{ke=t;var r,s=t._value;t._state?r=e(s):(xe.length&&(xe=[]),r=e(s),-1===xe.indexOf(s)&&function(e){var t=we.length;for(;t;)if(we[--t]._value===e._value)return void we.splice(t,1)}(t)),n.resolve(r)}catch(e){n.reject(e)}finally{ke=null,0==--Se&&Le(),--n.psd.ref||n.psd.finalize()}}function Me(e,t,n){if(t.length===n)return t;var r="";if(!1===e._state){var s,i,o=e._value;null!=o?(s=o.name||"Error",i=o.message||o,r=$(o,0)):(s=o,i=""),t.push(s+(i?": "+i:"")+r)}return R&&((r=$(e._stackHolder,2))&&-1===t.indexOf(r)&&t.push(r),e._prev&&Me(e._prev,t,n)),t}function Ne(e,t){var n=t?t._numPrev+1:0;n<100&&(e._prev=t,e._numPrev=n)}function qe(){$e()&&Ue()}function $e(){var e=be;return be=!1,_e=!1,e}function Ue(){var e,t,n;do{for(;Oe.length>0;)for(e=Oe,Oe=[],n=e.length,t=0;t<n;++t){var r=e[t];r[0].apply(null,r[1])}}while(Oe.length>0);be=!0,_e=!0}function Le(){var e=we;we=[],e.forEach((e=>{e._PSD.onunhandled.call(null,e._value,e)}));for(var t=Ae.slice(0),n=t.length;n;)t[--n]()}function Ve(e){return new Ce(le,!1,e)}function We(e,t){var n=Ke;return function(){var r=$e(),s=Ke;try{return st(n,!0),e.apply(this,arguments)}catch(e){t&&t(e)}finally{st(s,!1),r&&Ue()}}}a(Ce.prototype,{then:je,_then:function(e,t){Re(this,new De(null,null,e,t,Ke))},catch:function(e){if(1===arguments.length)return this.then(null,e);var t=arguments[0],n=arguments[1];return"function"==typeof t?this.then(null,(e=>e instanceof t?n(e):Ve(e))):this.then(null,(e=>e&&e.name===t?n(e):Ve(e)))},finally:function(e){return this.then((t=>(e(),t)),(t=>(e(),Ve(t))))},stack:{get:function(){if(this._stack)return this._stack;try{me=!0;var e=Me(this,[],20).join("\nFrom previous: ");return null!==this._state&&(this._stack=e),e}finally{me=!1}}},timeout:function(e,t){return e<1/0?new Ce(((n,r)=>{var s=setTimeout((()=>r(new X.Timeout(t))),e);this.then(n,r).finally(clearTimeout.bind(null,s))})):this}}),"undefined"!=typeof Symbol&&Symbol.toStringTag&&l(Ce.prototype,Symbol.toStringTag,"Dexie.Promise"),Pe.env=it(),a(Ce,{all:function(){var e=B.apply(null,arguments).map(tt);return new Ce((function(t,n){0===e.length&&t([]);var r=e.length;e.forEach(((s,i)=>Ce.resolve(s).then((n=>{e[i]=n,--r||t(e)}),n)))}))},resolve:e=>{if(e instanceof Ce)return e;if(e&&"function"==typeof e.then)return new Ce(((t,n)=>{e.then(t,n)}));var t=new Ce(le,!0,e);return Ne(t,ke),t},reject:Ve,race:function(){var e=B.apply(null,arguments).map(tt);return new Ce(((t,n)=>{e.map((e=>Ce.resolve(e).then(t,n)))}))},PSD:{get:()=>Ke,set:e=>Ke=e},totalEchoes:{get:()=>Qe},newPSD:Je,usePSD:ot,scheduler:{get:()=>ge,set:e=>{ge=e}},rejectionMapper:{get:()=>Ee,set:e=>{Ee=e}},follow:(e,t)=>new Ce(((n,r)=>Je(((t,n)=>{var r=Ke;r.unhandleds=[],r.onunhandled=n,r.finalize=re((function(){!function(e){function t(){e(),Ae.splice(Ae.indexOf(t),1)}Ae.push(t),++Se,ge((()=>{0==--Se&&Le()}),[])}((()=>{0===this.unhandleds.length?t():n(this.unhandleds[0])}))}),r.finalize),e()}),t,n,r)))}),pe&&(pe.allSettled&&l(Ce,"allSettled",(function(){const e=B.apply(null,arguments).map(tt);return new Ce((t=>{0===e.length&&t([]);let n=e.length;const r=new Array(n);e.forEach(((e,s)=>Ce.resolve(e).then((e=>r[s]={status:"fulfilled",value:e}),(e=>r[s]={status:"rejected",reason:e})).then((()=>--n||t(r)))))}))})),pe.any&&"undefined"!=typeof AggregateError&&l(Ce,"any",(function(){const e=B.apply(null,arguments).map(tt);return new Ce(((t,n)=>{0===e.length&&n(new AggregateError([]));let r=e.length;const s=new Array(r);e.forEach(((e,i)=>Ce.resolve(e).then((e=>t(e)),(e=>{s[i]=e,--r||n(new AggregateError(s))}))))}))})));const Ye={awaits:0,echoes:0,id:0};var ze=0,Ge=[],He=0,Qe=0,Xe=0;function Je(e,t,n,s){var i=Ke,o=Object.create(i);o.parent=i,o.ref=0,o.global=!1,o.id=++Xe;var a=Pe.env;o.env=ye?{Promise:Ce,PromiseProp:{value:Ce,configurable:!0,writable:!0},all:Ce.all,race:Ce.race,allSettled:Ce.allSettled,any:Ce.any,resolve:Ce.resolve,reject:Ce.reject,nthen:lt(a.nthen,o),gthen:lt(a.gthen,o)}:{},t&&r(o,t),++i.ref,o.finalize=function(){--this.parent.ref||this.parent.finalize()};var u=ot(o,e,n,s);return 0===o.ref&&o.finalize(),u}function Ze(){return Ye.id||(Ye.id=++ze),++Ye.awaits,Ye.echoes+=100,Ye.id}function et(){return!!Ye.awaits&&(0==--Ye.awaits&&(Ye.id=0),Ye.echoes=100*Ye.awaits,!0)}function tt(e){return Ye.echoes&&e&&e.constructor===pe?(Ze(),e.then((e=>(et(),e)),(e=>(et(),ht(e))))):e}function nt(e){++Qe,Ye.echoes&&0!=--Ye.echoes||(Ye.echoes=Ye.id=0),Ge.push(Ke),st(e,!0)}function rt(){var e=Ge[Ge.length-1];Ge.pop(),st(e,!1)}function st(t,n){var r=Ke;if((n?!Ye.echoes||He++&&t===Ke:!He||--He&&t===Ke)||at(n?nt.bind(null,t):rt),t!==Ke&&(Ke=t,r===Pe&&(Pe.env=it()),ye)){var s=Pe.env.Promise,i=t.env;he.then=i.nthen,s.prototype.then=i.gthen,(r.global||t.global)&&(Object.defineProperty(e,"Promise",i.PromiseProp),s.all=i.all,s.race=i.race,s.resolve=i.resolve,s.reject=i.reject,i.allSettled&&(s.allSettled=i.allSettled),i.any&&(s.any=i.any))}}function it(){var t=e.Promise;return ye?{Promise:t,PromiseProp:Object.getOwnPropertyDescriptor(e,"Promise"),all:t.all,race:t.race,allSettled:t.allSettled,any:t.any,resolve:t.resolve,reject:t.reject,nthen:he.then,gthen:t.prototype.then}:{}}function ot(e,t,n,r,s){var i=Ke;try{return st(e,!0),t(n,r,s)}finally{st(i,!1)}}function at(e){fe.call(ce,e)}function ut(e,t,n,r){return"function"!=typeof e?e:function(){var s=Ke;n&&Ze(),st(t,!0);try{return e.apply(this,arguments)}finally{st(s,!1),r&&at(et)}}}function lt(e,t){return function(n,r){return e.call(this,ut(n,t),ut(r,t))}}-1===(""+fe).indexOf("[native code]")&&(Ze=et=ee);function ct(t,n){var s;try{s=n.onuncatched(t)}catch(e){}if(!1!==s)try{var i,o={promise:n,reason:t};if(e.document&&document.createEvent?((i=document.createEvent("Event")).initEvent("unhandledrejection",!0,!0),r(i,o)):e.CustomEvent&&r(i=new CustomEvent("unhandledrejection",{detail:o}),o),i&&e.dispatchEvent&&(dispatchEvent(i),!e.PromiseRejectionEvent&&e.onunhandledrejection))try{e.onunhandledrejection(i)}catch(e){}R&&i&&!i.defaultPrevented&&console.warn(`Unhandled rejection: ${t.stack||t}`)}catch(e){}}var ht=Ce.reject;function dt(e,t,n,r){if(e.idbdb&&(e._state.openComplete||Ke.letThrough||e._vip)){var s=e._createTransaction(t,n,e._dbSchema);try{s.create(),e._state.PR1398_maxLoop=3}catch(s){return s.name===H.InvalidState&&e.isOpen()&&--e._state.PR1398_maxLoop>0?(console.warn("Dexie: Need to reopen db"),e._close(),e.open().then((()=>dt(e,t,n,r)))):ht(s)}return s._promise(t,((e,t)=>Je((()=>(Ke.trans=s,r(e,t,s)))))).then((e=>s._completion.then((()=>e))))}if(e._state.openComplete)return ht(new X.DatabaseClosed(e._state.dbOpenError));if(!e._state.isBeingOpened){if(!e._options.autoOpen)return ht(new X.DatabaseClosed);e.open().catch(ee)}return e._state.dbReadyPromise.then((()=>dt(e,t,n,r)))}const ft=String.fromCharCode(65535),pt="Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.",yt=[],mt="undefined"!=typeof navigator&&/(MSIE|Trident|Edge)/.test(navigator.userAgent),vt=mt,gt=mt,bt=e=>!/(dexie\.js|dexie\.min\.js)/.test(e);function _t(e,t){return e?t?function(){return e.apply(this,arguments)&&t.apply(this,arguments)}:e:t}const wt={type:3,lower:-1/0,lowerOpen:!1,upper:[[]],upperOpen:!1};function xt(e){return"string"!=typeof e||/\./.test(e)?e=>e:t=>(void 0===t[e]&&e in t&&delete(t=O(t))[e],t)}function kt(){throw X.Type()}class Et{_trans(e,t,n){const r=this._tx||Ke.trans,s=this.name;function i(e,n,r){if(!r.schema[s])throw new X.NotFound("Table "+s+" not part of transaction");return t(r.idbtrans,r)}const o=$e();try{return r&&r.db===this.db?r===Ke.trans?r._promise(e,i,n):Je((()=>r._promise(e,i,n)),{trans:r,transless:Ke.transless||Ke}):dt(this.db,e,[this.name],i)}finally{o&&Ue()}}get(e,t){return e&&e.constructor===Object?this.where(e).first(t):this._trans("readonly",(t=>this.core.get({trans:t,key:e}).then((e=>this.hook.reading.fire(e))))).then(t)}where(e){if("string"==typeof e)return new this.db.WhereClause(this,e);if(n(e))return new this.db.WhereClause(this,`[${e.join("+")}]`);const r=t(e);if(1===r.length)return this.where(r[0]).equals(e[r[0]]);const s=this.schema.indexes.concat(this.schema.primKey).filter((e=>e.compound&&r.every((t=>e.keyPath.indexOf(t)>=0))&&e.keyPath.every((e=>r.indexOf(e)>=0))))[0];if(s&&this.db._maxKey!==ft)return this.where(s.name).equals(s.keyPath.map((t=>e[t])));!s&&R&&console.warn(`The query ${JSON.stringify(e)} on ${this.name} would benefit of a compound index [${r.join("+")}]`);const{idxByName:i}=this.schema,o=this.db._deps.indexedDB;function a(e,t){try{return 0===o.cmp(e,t)}catch(e){return!1}}const[u,l]=r.reduce((([t,r],s)=>{const o=i[s],u=e[s];return[t||o,t||!o?_t(r,o&&o.multi?e=>{const t=b(e,s);return n(t)&&t.some((e=>a(u,e)))}:e=>a(u,b(e,s))):r]}),[null,null]);return u?this.where(u.name).equals(e[u.keyPath]).filter(l):s?this.filter(l):this.where(r).equals("")}filter(e){return this.toCollection().and(e)}count(e){return this.toCollection().count(e)}offset(e){return this.toCollection().offset(e)}limit(e){return this.toCollection().limit(e)}each(e){return this.toCollection().each(e)}toArray(e){return this.toCollection().toArray(e)}toCollection(){return new this.db.Collection(new this.db.WhereClause(this))}orderBy(e){return new this.db.Collection(new this.db.WhereClause(this,n(e)?`[${e.join("+")}]`:e))}reverse(){return this.toCollection().reverse()}mapToClass(e){const{db:t,name:n}=this;this.schema.mappedClass=e,e.prototype instanceof kt&&(e=class extends e{get db(){return t}table(){return n}});const r=new Set;for(let t=e.prototype;t;t=s(t))Object.getOwnPropertyNames(t).forEach((e=>r.add(e)));const i=t=>{if(!t)return t;const n=Object.create(e.prototype);for(let e in t)if(!r.has(e))try{n[e]=t[e]}catch(e){}return n};return this.schema.readHook&&this.hook.reading.unsubscribe(this.schema.readHook),this.schema.readHook=i,this.hook("reading",i),e}defineClass(){return this.mapToClass((function(e){r(this,e)}))}add(e,t){const{auto:n,keyPath:r}=this.schema.primKey;let s=e;return r&&n&&(s=xt(r)(e)),this._trans("readwrite",(e=>this.core.mutate({trans:e,type:"add",keys:null!=t?[t]:null,values:[s]}))).then((e=>e.numFailures?Ce.reject(e.failures[0]):e.lastResult)).then((t=>{if(r)try{_(e,r,t)}catch(e){}return t}))}update(e,r){if("object"!=typeof e||n(e))return this.where(":id").equals(e).modify(r);{const n=b(e,this.schema.primKey.keyPath);if(void 0===n)return ht(new X.InvalidArgument("Given object does not contain its primary key"));try{"function"!=typeof r?t(r).forEach((t=>{_(e,t,r[t])})):r(e,{value:e,primKey:n})}catch(e){}return this.where(":id").equals(n).modify(r)}}put(e,t){const{auto:n,keyPath:r}=this.schema.primKey;let s=e;return r&&n&&(s=xt(r)(e)),this._trans("readwrite",(e=>this.core.mutate({trans:e,type:"put",values:[s],keys:null!=t?[t]:null}))).then((e=>e.numFailures?Ce.reject(e.failures[0]):e.lastResult)).then((t=>{if(r)try{_(e,r,t)}catch(e){}return t}))}delete(e){return this._trans("readwrite",(t=>this.core.mutate({trans:t,type:"delete",keys:[e]}))).then((e=>e.numFailures?Ce.reject(e.failures[0]):void 0))}clear(){return this._trans("readwrite",(e=>this.core.mutate({trans:e,type:"deleteRange",range:wt}))).then((e=>e.numFailures?Ce.reject(e.failures[0]):void 0))}bulkGet(e){return this._trans("readonly",(t=>this.core.getMany({keys:e,trans:t}).then((e=>e.map((e=>this.hook.reading.fire(e)))))))}bulkAdd(e,t,n){const r=Array.isArray(t)?t:void 0,s=(n=n||(r?void 0:t))?n.allKeys:void 0;return this._trans("readwrite",(t=>{const{auto:n,keyPath:i}=this.schema.primKey;if(i&&r)throw new X.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");if(r&&r.length!==e.length)throw new X.InvalidArgument("Arguments objects and keys must have the same length");const o=e.length;let a=i&&n?e.map(xt(i)):e;return this.core.mutate({trans:t,type:"add",keys:r,values:a,wantResults:s}).then((({numFailures:e,results:t,lastResult:n,failures:r})=>{if(0===e)return s?t:n;throw new G(`${this.name}.bulkAdd(): ${e} of ${o} operations failed`,r)}))}))}bulkPut(e,t,n){const r=Array.isArray(t)?t:void 0,s=(n=n||(r?void 0:t))?n.allKeys:void 0;return this._trans("readwrite",(t=>{const{auto:n,keyPath:i}=this.schema.primKey;if(i&&r)throw new X.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");if(r&&r.length!==e.length)throw new X.InvalidArgument("Arguments objects and keys must have the same length");const o=e.length;let a=i&&n?e.map(xt(i)):e;return this.core.mutate({trans:t,type:"put",keys:r,values:a,wantResults:s}).then((({numFailures:e,results:t,lastResult:n,failures:r})=>{if(0===e)return s?t:n;throw new G(`${this.name}.bulkPut(): ${e} of ${o} operations failed`,r)}))}))}bulkDelete(e){const t=e.length;return this._trans("readwrite",(t=>this.core.mutate({trans:t,type:"delete",keys:e}))).then((({numFailures:e,lastResult:n,failures:r})=>{if(0===e)return n;throw new G(`${this.name}.bulkDelete(): ${e} of ${t} operations failed`,r)}))}}function Pt(e){var r={},s=function(t,n){if(n){for(var s=arguments.length,i=new Array(s-1);--s;)i[s-1]=arguments[s];return r[t].subscribe.apply(null,i),e}if("string"==typeof t)return r[t]};s.addEventType=a;for(var i=1,o=arguments.length;i<o;++i)a(arguments[i]);return s;function a(e,t,n){if("object"==typeof e)return u(e);t||(t=ae),n||(n=ee);var i={subscribers:[],fire:n,subscribe:function(e){-1===i.subscribers.indexOf(e)&&(i.subscribers.push(e),i.fire=t(i.fire,e))},unsubscribe:function(e){i.subscribers=i.subscribers.filter((function(t){return t!==e})),i.fire=i.subscribers.reduce(t,n)}};return r[e]=s[e]=i,i}function u(e){t(e).forEach((function(t){var r=e[t];if(n(r))a(t,e[t][0],e[t][1]);else{if("asap"!==r)throw new X.InvalidArgument("Invalid event config");var s=a(t,te,(function(){for(var e=arguments.length,t=new Array(e);e--;)t[e]=arguments[e];s.subscribers.forEach((function(e){v((function(){e.apply(null,t)}))}))}))}}))}}function Kt(e,t){return c(t).from({prototype:e}),t}function Ot(e,t){return!(e.filter||e.algorithm||e.or)&&(t?e.justLimit:!e.replayFilter)}function St(e,t){e.filter=_t(e.filter,t)}function At(e,t,n){var r=e.replayFilter;e.replayFilter=r?()=>_t(r(),t()):t,e.justLimit=n&&!r}function Ct(e,t){if(e.isPrimKey)return t.primaryKey;const n=t.getIndexByKeyPath(e.index);if(!n)throw new X.Schema("KeyPath "+e.index+" on object store "+t.name+" is not indexed");return n}function jt(e,t,n){const r=Ct(e,t.schema);return t.openCursor({trans:n,values:!e.keysOnly,reverse:"prev"===e.dir,unique:!!e.unique,query:{index:r,range:e.range}})}function Dt(e,t,n,r){const s=e.replayFilter?_t(e.filter,e.replayFilter()):e.filter;if(e.or){const i={},a=(e,n,r)=>{if(!s||s(n,r,(e=>n.stop(e)),(e=>n.fail(e)))){var a=n.primaryKey,u=""+a;"[object ArrayBuffer]"===u&&(u=""+new Uint8Array(a)),o(i,u)||(i[u]=!0,t(e,n,r))}};return Promise.all([e.or._iterate(a,n),It(jt(e,r,n),e.algorithm,a,!e.keysOnly&&e.valueMapper)])}return It(jt(e,r,n),_t(e.algorithm,s),t,!e.keysOnly&&e.valueMapper)}function It(e,t,n,r){var s=We(r?(e,t,s)=>n(r(e),t,s):n);return e.then((e=>{if(e)return e.start((()=>{var n=()=>e.continue();t&&!t(e,(e=>n=e),(t=>{e.stop(t),n=ee}),(t=>{e.fail(t),n=ee}))||s(e.value,e,(e=>n=e)),n()}))}))}function Bt(e,t){try{const n=Tt(e),r=Tt(t);if(n!==r)return"Array"===n?1:"Array"===r?-1:"binary"===n?1:"binary"===r?-1:"string"===n?1:"string"===r?-1:"Date"===n?1:"Date"!==r?NaN:-1;switch(n){case"number":case"Date":case"string":return e>t?1:e<t?-1:0;case"binary":return function(e,t){const n=e.length,r=t.length,s=n<r?n:r;for(let n=0;n<s;++n)if(e[n]!==t[n])return e[n]<t[n]?-1:1;return n===r?0:n<r?-1:1}(Rt(e),Rt(t));case"Array":return function(e,t){const n=e.length,r=t.length,s=n<r?n:r;for(let n=0;n<s;++n){const r=Bt(e[n],t[n]);if(0!==r)return r}return n===r?0:n<r?-1:1}(e,t)}}catch(e){}return NaN}function Tt(e){const t=typeof e;if("object"!==t)return t;if(ArrayBuffer.isView(e))return"binary";const n=C(e);return"ArrayBuffer"===n?"binary":n}function Rt(e){return e instanceof Uint8Array?e:ArrayBuffer.isView(e)?new Uint8Array(e.buffer,e.byteOffset,e.byteLength):new Uint8Array(e)}class Ft{_read(e,t){var n=this._ctx;return n.error?n.table._trans(null,ht.bind(null,n.error)):n.table._trans("readonly",e).then(t)}_write(e){var t=this._ctx;return t.error?t.table._trans(null,ht.bind(null,t.error)):t.table._trans("readwrite",e,"locked")}_addAlgorithm(e){var t=this._ctx;t.algorithm=_t(t.algorithm,e)}_iterate(e,t){return Dt(this._ctx,e,t,this._ctx.table.core)}clone(e){var t=Object.create(this.constructor.prototype),n=Object.create(this._ctx);return e&&r(n,e),t._ctx=n,t}raw(){return this._ctx.valueMapper=null,this}each(e){var t=this._ctx;return this._read((n=>Dt(t,e,n,t.table.core)))}count(e){return this._read((e=>{const t=this._ctx,n=t.table.core;if(Ot(t,!0))return n.count({trans:e,query:{index:Ct(t,n.schema),range:t.range}}).then((e=>Math.min(e,t.limit)));var r=0;return Dt(t,(()=>(++r,!1)),e,n).then((()=>r))})).then(e)}sortBy(e,t){const n=e.split(".").reverse(),r=n[0],s=n.length-1;function i(e,t){return t?i(e[n[t]],t-1):e[r]}var o="next"===this._ctx.dir?1:-1;function a(e,t){var n=i(e,s),r=i(t,s);return n<r?-o:n>r?o:0}return this.toArray((function(e){return e.sort(a)})).then(t)}toArray(e){return this._read((e=>{var t=this._ctx;if("next"===t.dir&&Ot(t,!0)&&t.limit>0){const{valueMapper:n}=t,r=Ct(t,t.table.core.schema);return t.table.core.query({trans:e,limit:t.limit,values:!0,query:{index:r,range:t.range}}).then((({result:e})=>n?e.map(n):e))}{const n=[];return Dt(t,(e=>n.push(e)),e,t.table.core).then((()=>n))}}),e)}offset(e){var t=this._ctx;return e<=0||(t.offset+=e,Ot(t)?At(t,(()=>{var t=e;return(e,n)=>0===t||(1===t?(--t,!1):(n((()=>{e.advance(t),t=0})),!1))})):At(t,(()=>{var t=e;return()=>--t<0}))),this}limit(e){return this._ctx.limit=Math.min(this._ctx.limit,e),At(this._ctx,(()=>{var t=e;return function(e,n,r){return--t<=0&&n(r),t>=0}}),!0),this}until(e,t){return St(this._ctx,(function(n,r,s){return!e(n.value)||(r(s),t)})),this}first(e){return this.limit(1).toArray((function(e){return e[0]})).then(e)}last(e){return this.reverse().first(e)}filter(e){var t,n;return St(this._ctx,(function(t){return e(t.value)})),t=this._ctx,n=e,t.isMatch=_t(t.isMatch,n),this}and(e){return this.filter(e)}or(e){return new this.db.WhereClause(this._ctx.table,e,this)}reverse(){return this._ctx.dir="prev"===this._ctx.dir?"next":"prev",this._ondirectionchange&&this._ondirectionchange(this._ctx.dir),this}desc(){return this.reverse()}eachKey(e){var t=this._ctx;return t.keysOnly=!t.isMatch,this.each((function(t,n){e(n.key,n)}))}eachUniqueKey(e){return this._ctx.unique="unique",this.eachKey(e)}eachPrimaryKey(e){var t=this._ctx;return t.keysOnly=!t.isMatch,this.each((function(t,n){e(n.primaryKey,n)}))}keys(e){var t=this._ctx;t.keysOnly=!t.isMatch;var n=[];return this.each((function(e,t){n.push(t.key)})).then((function(){return n})).then(e)}primaryKeys(e){var t=this._ctx;if("next"===t.dir&&Ot(t,!0)&&t.limit>0)return this._read((e=>{var n=Ct(t,t.table.core.schema);return t.table.core.query({trans:e,values:!1,limit:t.limit,query:{index:n,range:t.range}})})).then((({result:e})=>e)).then(e);t.keysOnly=!t.isMatch;var n=[];return this.each((function(e,t){n.push(t.primaryKey)})).then((function(){return n})).then(e)}uniqueKeys(e){return this._ctx.unique="unique",this.keys(e)}firstKey(e){return this.limit(1).keys((function(e){return e[0]})).then(e)}lastKey(e){return this.reverse().firstKey(e)}distinct(){var e=this._ctx,t=e.index&&e.table.schema.idxByName[e.index];if(!t||!t.multi)return this;var n={};return St(this._ctx,(function(e){var t=e.primaryKey.toString(),r=o(n,t);return n[t]=!0,!r})),this}modify(e){var n=this._ctx;return this._write((r=>{var s;if("function"==typeof e)s=e;else{var i=t(e),o=i.length;s=function(t){for(var n=!1,r=0;r<o;++r){var s=i[r],a=e[s];b(t,s)!==a&&(_(t,s,a),n=!0)}return n}}const a=n.table.core,{outbound:u,extractKey:l}=a.schema.primaryKey,c=this.db._options.modifyChunkSize||200,h=[];let d=0;const f=[],p=(e,n)=>{const{failures:r,numFailures:s}=n;d+=e-s;for(let e of t(r))h.push(r[e])};return this.clone().primaryKeys().then((t=>{const i=o=>{const h=Math.min(c,t.length-o);return a.getMany({trans:r,keys:t.slice(o,o+h),cache:"immutable"}).then((d=>{const f=[],y=[],m=u?[]:null,v=[];for(let e=0;e<h;++e){const n=d[e],r={value:O(n),primKey:t[o+e]};!1!==s.call(r,r.value,r)&&(null==r.value?v.push(t[o+e]):u||0===Bt(l(n),l(r.value))?(y.push(r.value),u&&m.push(t[o+e])):(v.push(t[o+e]),f.push(r.value)))}const g=Ot(n)&&n.limit===1/0&&("function"!=typeof e||e===Mt)&&{index:n.index,range:n.range};return Promise.resolve(f.length>0&&a.mutate({trans:r,type:"add",values:f}).then((e=>{for(let t in e.failures)v.splice(parseInt(t),1);p(f.length,e)}))).then((()=>(y.length>0||g&&"object"==typeof e)&&a.mutate({trans:r,type:"put",keys:m,values:y,criteria:g,changeSpec:"function"!=typeof e&&e}).then((e=>p(y.length,e))))).then((()=>(v.length>0||g&&e===Mt)&&a.mutate({trans:r,type:"delete",keys:v,criteria:g}).then((e=>p(v.length,e))))).then((()=>t.length>o+h&&i(o+c)))}))};return i(0).then((()=>{if(h.length>0)throw new z("Error modifying one or more objects",h,d,f);return t.length}))}))}))}delete(){var e=this._ctx,t=e.range;return Ot(e)&&(e.isPrimKey&&!gt||3===t.type)?this._write((n=>{const{primaryKey:r}=e.table.core.schema,s=t;return e.table.core.count({trans:n,query:{index:r,range:s}}).then((t=>e.table.core.mutate({trans:n,type:"deleteRange",range:s}).then((({failures:e,lastResult:n,results:r,numFailures:s})=>{if(s)throw new z("Could not delete some values",Object.keys(e).map((t=>e[t])),t-s);return t-s}))))})):this.modify(Mt)}}const Mt=(e,t)=>t.value=null;function Nt(e,t){return e<t?-1:e===t?0:1}function qt(e,t){return e>t?-1:e===t?0:1}function $t(e,t,n){var r=e instanceof zt?new e.Collection(e):e;return r._ctx.error=n?new n(t):new TypeError(t),r}function Ut(e){return new e.Collection(e,(()=>Yt(""))).limit(0)}function Lt(e,t,n,r,s,i){for(var o=Math.min(e.length,r.length),a=-1,u=0;u<o;++u){var l=t[u];if(l!==r[u])return s(e[u],n[u])<0?e.substr(0,u)+n[u]+n.substr(u+1):s(e[u],r[u])<0?e.substr(0,u)+r[u]+n.substr(u+1):a>=0?e.substr(0,a)+t[a]+n.substr(a+1):null;s(e[u],l)<0&&(a=u)}return o<r.length&&"next"===i?e+n.substr(e.length):o<e.length&&"prev"===i?e.substr(0,n.length):a<0?null:e.substr(0,a)+r[a]+n.substr(a+1)}function Vt(e,t,n,r){var s,i,o,a,u,l,c,h=n.length;if(!n.every((e=>"string"==typeof e)))return $t(e,"String expected.");function d(e){s=function(e){return"next"===e?e=>e.toUpperCase():e=>e.toLowerCase()}(e),i=function(e){return"next"===e?e=>e.toLowerCase():e=>e.toUpperCase()}(e),o="next"===e?Nt:qt;var t=n.map((function(e){return{lower:i(e),upper:s(e)}})).sort((function(e,t){return o(e.lower,t.lower)}));a=t.map((function(e){return e.upper})),u=t.map((function(e){return e.lower})),l=e,c="next"===e?"":r}d("next");var f=new e.Collection(e,(()=>Wt(a[0],u[h-1]+r)));f._ondirectionchange=function(e){d(e)};var p=0;return f._addAlgorithm((function(e,n,r){var s=e.key;if("string"!=typeof s)return!1;var d=i(s);if(t(d,u,p))return!0;for(var f=null,y=p;y<h;++y){var m=Lt(s,d,a[y],u[y],o,l);null===m&&null===f?p=y+1:(null===f||o(f,m)>0)&&(f=m)}return n(null!==f?function(){e.continue(f+c)}:r),!1})),f}function Wt(e,t,n,r){return{type:2,lower:e,upper:t,lowerOpen:n,upperOpen:r}}function Yt(e){return{type:1,lower:e,upper:e}}class zt{get Collection(){return this._ctx.table.db.Collection}between(e,t,n,r){n=!1!==n,r=!0===r;try{return this._cmp(e,t)>0||0===this._cmp(e,t)&&(n||r)&&(!n||!r)?Ut(this):new this.Collection(this,(()=>Wt(e,t,!n,!r)))}catch(e){return $t(this,pt)}}equals(e){return null==e?$t(this,pt):new this.Collection(this,(()=>Yt(e)))}above(e){return null==e?$t(this,pt):new this.Collection(this,(()=>Wt(e,void 0,!0)))}aboveOrEqual(e){return null==e?$t(this,pt):new this.Collection(this,(()=>Wt(e,void 0,!1)))}below(e){return null==e?$t(this,pt):new this.Collection(this,(()=>Wt(void 0,e,!1,!0)))}belowOrEqual(e){return null==e?$t(this,pt):new this.Collection(this,(()=>Wt(void 0,e)))}startsWith(e){return"string"!=typeof e?$t(this,"String expected."):this.between(e,e+ft,!0,!0)}startsWithIgnoreCase(e){return""===e?this.startsWith(e):Vt(this,((e,t)=>0===e.indexOf(t[0])),[e],ft)}equalsIgnoreCase(e){return Vt(this,((e,t)=>e===t[0]),[e],"")}anyOfIgnoreCase(){var e=B.apply(I,arguments);return 0===e.length?Ut(this):Vt(this,((e,t)=>-1!==t.indexOf(e)),e,"")}startsWithAnyOfIgnoreCase(){var e=B.apply(I,arguments);return 0===e.length?Ut(this):Vt(this,((e,t)=>t.some((t=>0===e.indexOf(t)))),e,ft)}anyOf(){const e=B.apply(I,arguments);let t=this._cmp;try{e.sort(t)}catch(e){return $t(this,pt)}if(0===e.length)return Ut(this);const n=new this.Collection(this,(()=>Wt(e[0],e[e.length-1])));n._ondirectionchange=n=>{t="next"===n?this._ascending:this._descending,e.sort(t)};let r=0;return n._addAlgorithm(((n,s,i)=>{const o=n.key;for(;t(o,e[r])>0;)if(++r,r===e.length)return s(i),!1;return 0===t(o,e[r])||(s((()=>{n.continue(e[r])})),!1)})),n}notEqual(e){return this.inAnyRange([[-(1/0),e],[e,this.db._maxKey]],{includeLowers:!1,includeUppers:!1})}noneOf(){const e=B.apply(I,arguments);if(0===e.length)return new this.Collection(this);try{e.sort(this._ascending)}catch(e){return $t(this,pt)}const t=e.reduce(((e,t)=>e?e.concat([[e[e.length-1][1],t]]):[[-(1/0),t]]),null);return t.push([e[e.length-1],this.db._maxKey]),this.inAnyRange(t,{includeLowers:!1,includeUppers:!1})}inAnyRange(e,t){const n=this._cmp,r=this._ascending,s=this._descending,i=this._min,o=this._max;if(0===e.length)return Ut(this);if(!e.every((e=>void 0!==e[0]&&void 0!==e[1]&&r(e[0],e[1])<=0)))return $t(this,"First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower",X.InvalidArgument);const a=!t||!1!==t.includeLowers,u=t&&!0===t.includeUppers;let l,c=r;function h(e,t){return c(e[0],t[0])}try{l=e.reduce((function(e,t){let r=0,s=e.length;for(;r<s;++r){const s=e[r];if(n(t[0],s[1])<0&&n(t[1],s[0])>0){s[0]=i(s[0],t[0]),s[1]=o(s[1],t[1]);break}}return r===s&&e.push(t),e}),[]),l.sort(h)}catch(e){return $t(this,pt)}let d=0;const f=u?e=>r(e,l[d][1])>0:e=>r(e,l[d][1])>=0,p=a?e=>s(e,l[d][0])>0:e=>s(e,l[d][0])>=0;let y=f;const m=new this.Collection(this,(()=>Wt(l[0][0],l[l.length-1][1],!a,!u)));return m._ondirectionchange=e=>{"next"===e?(y=f,c=r):(y=p,c=s),l.sort(h)},m._addAlgorithm(((e,t,n)=>{for(var s=e.key;y(s);)if(++d,d===l.length)return t(n),!1;return!!function(e){return!f(e)&&!p(e)}(s)||(0===this._cmp(s,l[d][1])||0===this._cmp(s,l[d][0])||t((()=>{c===r?e.continue(l[d][0]):e.continue(l[d][1])})),!1)})),m}startsWithAnyOf(){const e=B.apply(I,arguments);return e.every((e=>"string"==typeof e))?0===e.length?Ut(this):this.inAnyRange(e.map((e=>[e,e+ft]))):$t(this,"startsWithAnyOf() only works with strings")}}function Gt(e){return We((function(t){return Ht(t),e(t.target.error),!1}))}function Ht(e){e.stopPropagation&&e.stopPropagation(),e.preventDefault&&e.preventDefault()}const Qt=Pt(null,"storagemutated");class Xt{_lock(){return m(!Ke.global),++this._reculock,1!==this._reculock||Ke.global||(Ke.lockOwnerFor=this),this}_unlock(){if(m(!Ke.global),0==--this._reculock)for(Ke.global||(Ke.lockOwnerFor=null);this._blockedFuncs.length>0&&!this._locked();){var e=this._blockedFuncs.shift();try{ot(e[1],e[0])}catch(e){}}return this}_locked(){return this._reculock&&Ke.lockOwnerFor!==this}create(e){if(!this.mode)return this;const t=this.db.idbdb,n=this.db._state.dbOpenError;if(m(!this.idbtrans),!e&&!t)switch(n&&n.name){case"DatabaseClosedError":throw new X.DatabaseClosed(n);case"MissingAPIError":throw new X.MissingAPI(n.message,n);default:throw new X.OpenFailed(n)}if(!this.active)throw new X.TransactionInactive;return m(null===this._completion._state),(e=this.idbtrans=e||(this.db.core?this.db.core.transaction(this.storeNames,this.mode,{durability:this.chromeTransactionDurability}):t.transaction(this.storeNames,this.mode,{durability:this.chromeTransactionDurability}))).onerror=We((t=>{Ht(t),this._reject(e.error)})),e.onabort=We((t=>{Ht(t),this.active&&this._reject(new X.Abort(e.error)),this.active=!1,this.on("abort").fire(t)})),e.oncomplete=We((()=>{this.active=!1,this._resolve(),"mutatedParts"in e&&Qt.storagemutated.fire(e.mutatedParts)})),this}_promise(e,t,n){if("readwrite"===e&&"readwrite"!==this.mode)return ht(new X.ReadOnly("Transaction is readonly"));if(!this.active)return ht(new X.TransactionInactive);if(this._locked())return new Ce(((r,s)=>{this._blockedFuncs.push([()=>{this._promise(e,t,n).then(r,s)},Ke])}));if(n)return Je((()=>{var e=new Ce(((e,n)=>{this._lock();const r=t(e,n,this);r&&r.then&&r.then(e,n)}));return e.finally((()=>this._unlock())),e._lib=!0,e}));var r=new Ce(((e,n)=>{var r=t(e,n,this);r&&r.then&&r.then(e,n)}));return r._lib=!0,r}_root(){return this.parent?this.parent._root():this}waitFor(e){var t=this._root();const n=Ce.resolve(e);if(t._waitingFor)t._waitingFor=t._waitingFor.then((()=>n));else{t._waitingFor=n,t._waitingQueue=[];var r=t.idbtrans.objectStore(t.storeNames[0]);!function e(){for(++t._spinCount;t._waitingQueue.length;)t._waitingQueue.shift()();t._waitingFor&&(r.get(-1/0).onsuccess=e)}()}var s=t._waitingFor;return new Ce(((e,r)=>{n.then((n=>t._waitingQueue.push(We(e.bind(null,n)))),(e=>t._waitingQueue.push(We(r.bind(null,e))))).finally((()=>{t._waitingFor===s&&(t._waitingFor=null)}))}))}abort(){this.active&&(this.active=!1,this.idbtrans&&this.idbtrans.abort(),this._reject(new X.Abort))}table(e){const t=this._memoizedTables||(this._memoizedTables={});if(o(t,e))return t[e];const n=this.schema[e];if(!n)throw new X.NotFound("Table "+e+" not part of transaction");const r=new this.db.Table(e,n,this);return r.core=this.db.core.table(e),t[e]=r,r}}function Jt(e,t,n,r,s,i,o){return{name:e,keyPath:t,unique:n,multi:r,auto:s,compound:i,src:(n&&!o?"&":"")+(r?"*":"")+(s?"++":"")+Zt(t)}}function Zt(e){return"string"==typeof e?e:e?"["+[].join.call(e,"+")+"]":""}function en(e,t,n){return{name:e,primKey:t,indexes:n,mappedClass:null,idxByName:g(n,(e=>[e.name,e]))}}let tn=e=>{try{return e.only([[]]),tn=()=>[[]],[[]]}catch(e){return tn=()=>ft,ft}};function nn(e){return null==e?()=>{}:"string"==typeof e?function(e){return 1===e.split(".").length?t=>t[e]:t=>b(t,e)}(e):t=>b(t,e)}function rn(e){return[].slice.call(e)}let sn=0;function on(e){return null==e?":id":"string"==typeof e?e:`[${e.join("+")}]`}function an(e,t,r){function s(e){if(3===e.type)return null;if(4===e.type)throw new Error("Cannot convert never type to IDBKeyRange");const{lower:n,upper:r,lowerOpen:s,upperOpen:i}=e;return void 0===n?void 0===r?null:t.upperBound(r,!!i):void 0===r?t.lowerBound(n,!!s):t.bound(n,r,!!s,!!i)}const{schema:i,hasGetAll:o}=function(e,t){const r=rn(e.objectStoreNames);return{schema:{name:e.name,tables:r.map((e=>t.objectStore(e))).map((e=>{const{keyPath:t,autoIncrement:r}=e,s=n(t),i=null==t,o={},a={name:e.name,primaryKey:{name:null,isPrimaryKey:!0,outbound:i,compound:s,keyPath:t,autoIncrement:r,unique:!0,extractKey:nn(t)},indexes:rn(e.indexNames).map((t=>e.index(t))).map((e=>{const{name:t,unique:r,multiEntry:s,keyPath:i}=e,a={name:t,compound:n(i),keyPath:i,unique:r,multiEntry:s,extractKey:nn(i)};return o[on(i)]=a,a})),getIndexByKeyPath:e=>o[on(e)]};return o[":id"]=a.primaryKey,null!=t&&(o[on(t)]=a.primaryKey),a}))},hasGetAll:r.length>0&&"getAll"in t.objectStore(r[0])&&!("undefined"!=typeof navigator&&/Safari/.test(navigator.userAgent)&&!/(Chrome\/|Edge\/)/.test(navigator.userAgent)&&[].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1]<604)}}(e,r),a=i.tables.map((e=>function(e){const t=e.name;return{name:t,schema:e,mutate:function({trans:e,type:n,keys:r,values:i,range:o}){return new Promise(((a,u)=>{a=We(a);const l=e.objectStore(t),c=null==l.keyPath,h="put"===n||"add"===n;if(!h&&"delete"!==n&&"deleteRange"!==n)throw new Error("Invalid operation type: "+n);const{length:d}=r||i||{length:1};if(r&&i&&r.length!==i.length)throw new Error("Given keys array must have same length as given values array.");if(0===d)return a({numFailures:0,failures:{},results:[],lastResult:void 0});let f;const p=[],y=[];let m=0;const v=e=>{++m,Ht(e)};if("deleteRange"===n){if(4===o.type)return a({numFailures:m,failures:y,results:[],lastResult:void 0});3===o.type?p.push(f=l.clear()):p.push(f=l.delete(s(o)))}else{const[e,t]=h?c?[i,r]:[i,null]:[r,null];if(h)for(let r=0;r<d;++r)p.push(f=t&&void 0!==t[r]?l[n](e[r],t[r]):l[n](e[r])),f.onerror=v;else for(let t=0;t<d;++t)p.push(f=l[n](e[t])),f.onerror=v}const g=e=>{const t=e.target.result;p.forEach(((e,t)=>null!=e.error&&(y[t]=e.error))),a({numFailures:m,failures:y,results:"delete"===n?r:p.map((e=>e.result)),lastResult:t})};f.onerror=e=>{v(e),g(e)},f.onsuccess=g}))},getMany:({trans:e,keys:n})=>new Promise(((r,s)=>{r=We(r);const i=e.objectStore(t),o=n.length,a=new Array(o);let u,l=0,c=0;const h=e=>{const t=e.target;a[t._pos]=t.result,++c===l&&r(a)},d=Gt(s);for(let e=0;e<o;++e)null!=n[e]&&(u=i.get(n[e]),u._pos=e,u.onsuccess=h,u.onerror=d,++l);0===l&&r(a)})),get:({trans:e,key:n})=>new Promise(((r,s)=>{r=We(r);const i=e.objectStore(t).get(n);i.onsuccess=e=>r(e.target.result),i.onerror=Gt(s)})),query:function(e){return n=>new Promise(((r,i)=>{r=We(r);const{trans:o,values:a,limit:u,query:l}=n,c=u===1/0?void 0:u,{index:h,range:d}=l,f=o.objectStore(t),p=h.isPrimaryKey?f:f.index(h.name),y=s(d);if(0===u)return r({result:[]});if(e){const e=a?p.getAll(y,c):p.getAllKeys(y,c);e.onsuccess=e=>r({result:e.target.result}),e.onerror=Gt(i)}else{let e=0;const t=a||!("openKeyCursor"in p)?p.openCursor(y):p.openKeyCursor(y),n=[];t.onsuccess=s=>{const i=t.result;return i?(n.push(a?i.value:i.primaryKey),++e===u?r({result:n}):void i.continue()):r({result:n})},t.onerror=Gt(i)}}))}(o),openCursor:function({trans:e,values:n,query:r,reverse:i,unique:o}){return new Promise(((a,u)=>{a=We(a);const{index:l,range:c}=r,h=e.objectStore(t),d=l.isPrimaryKey?h:h.index(l.name),f=i?o?"prevunique":"prev":o?"nextunique":"next",p=n||!("openKeyCursor"in d)?d.openCursor(s(c),f):d.openKeyCursor(s(c),f);p.onerror=Gt(u),p.onsuccess=We((t=>{const n=p.result;if(!n)return void a(null);n.___id=++sn,n.done=!1;const r=n.continue.bind(n);let s=n.continuePrimaryKey;s&&(s=s.bind(n));const i=n.advance.bind(n),o=()=>{throw new Error("Cursor not stopped")};n.trans=e,n.stop=n.continue=n.continuePrimaryKey=n.advance=()=>{throw new Error("Cursor not started")},n.fail=We(u),n.next=function(){let e=1;return this.start((()=>e--?this.continue():this.stop())).then((()=>this))},n.start=e=>{const t=new Promise(((e,t)=>{e=We(e),p.onerror=Gt(t),n.fail=t,n.stop=t=>{n.stop=n.continue=n.continuePrimaryKey=n.advance=o,e(t)}})),a=()=>{if(p.result)try{e()}catch(e){n.fail(e)}else n.done=!0,n.start=()=>{throw new Error("Cursor behind last entry")},n.stop()};return p.onsuccess=We((e=>{p.onsuccess=a,a()})),n.continue=r,n.continuePrimaryKey=s,n.advance=i,a(),t},a(n)}),u)}))},count({query:e,trans:n}){const{index:r,range:i}=e;return new Promise(((e,o)=>{const a=n.objectStore(t),u=r.isPrimaryKey?a:a.index(r.name),l=s(i),c=l?u.count(l):u.count();c.onsuccess=We((t=>e(t.target.result))),c.onerror=Gt(o)}))}}}(e))),u={};return a.forEach((e=>u[e.name]=e)),{stack:"dbcore",transaction:e.transaction.bind(e),table(e){if(!u[e])throw new Error(`Table '${e}' not found`);return u[e]},MIN_KEY:-1/0,MAX_KEY:tn(t),schema:i}}function un({_novip:e},t){const n=t.db,r=function(e,t,{IDBKeyRange:n,indexedDB:r},s){const i=function(e,t){return t.reduce(((e,{create:t})=>({...e,...t(e)})),e)}(an(t,n,s),e.dbcore);return{dbcore:i}}(e._middlewares,n,e._deps,t);e.core=r.dbcore,e.tables.forEach((t=>{const n=t.name;e.core.schema.tables.some((e=>e.name===n))&&(t.core=e.core.table(n),e[n]instanceof e.Table&&(e[n].core=t.core))}))}function ln({_novip:e},t,n,r){n.forEach((n=>{const s=r[n];t.forEach((t=>{const r=d(t,n);(!r||"value"in r&&void 0===r.value)&&(t===e.Transaction.prototype||t instanceof e.Transaction?l(t,n,{get(){return this.table(n)},set(e){u(this,n,{value:e,writable:!0,configurable:!0,enumerable:!0})}}):t[n]=new e.Table(n,s))}))}))}function cn({_novip:e},t){t.forEach((t=>{for(let n in t)t[n]instanceof e.Table&&delete t[n]}))}function hn(e,t){return e._cfg.version-t._cfg.version}function dn(e,n,r,s){const i=e._dbSchema,o=e._createTransaction("readwrite",e._storeNames,i);o.create(r),o._completion.catch(s);const a=o._reject.bind(o),u=Ke.transless||Ke;Je((()=>{Ke.trans=o,Ke.transless=u,0===n?(t(i).forEach((e=>{pn(r,e,i[e].primKey,i[e].indexes)})),un(e,r),Ce.follow((()=>e.on.populate.fire(o))).catch(a)):function({_novip:e},n,r,s){const i=[],o=e._versions;let a=e._dbSchema=mn(e,e.idbdb,s),u=!1;function l(){return i.length?Ce.resolve(i.shift()(r.idbtrans)).then(l):Ce.resolve()}return o.filter((e=>e._cfg.version>=n)).forEach((o=>{i.push((()=>{const i=a,l=o._cfg.dbschema;vn(e,i,s),vn(e,l,s),a=e._dbSchema=l;const c=fn(i,l);c.add.forEach((e=>{pn(s,e[0],e[1].primKey,e[1].indexes)})),c.change.forEach((e=>{if(e.recreate)throw new X.Upgrade("Not yet support for changing primary key");{const t=s.objectStore(e.name);e.add.forEach((e=>yn(t,e))),e.change.forEach((e=>{t.deleteIndex(e.name),yn(t,e)})),e.del.forEach((e=>t.deleteIndex(e)))}}));const h=o._cfg.contentUpgrade;if(h&&o._cfg.version>n){un(e,s),r._memoizedTables={},u=!0;let n=w(l);c.del.forEach((e=>{n[e]=i[e]})),cn(e,[e.Transaction.prototype]),ln(e,[e.Transaction.prototype],t(n),n),r.schema=n;const o=T(h);let a;o&&Ze();const d=Ce.follow((()=>{if(a=h(r),a&&o){var e=et.bind(null,null);a.then(e,e)}}));return a&&"function"==typeof a.then?Ce.resolve(a):d.then((()=>a))}})),i.push((t=>{if(!u||!vt){!function(e,t){[].slice.call(t.db.objectStoreNames).forEach((n=>null==e[n]&&t.db.deleteObjectStore(n)))}(o._cfg.dbschema,t)}cn(e,[e.Transaction.prototype]),ln(e,[e.Transaction.prototype],e._storeNames,e._dbSchema),r.schema=e._dbSchema}))})),l().then((()=>{var e,n;n=s,t(e=a).forEach((t=>{n.db.objectStoreNames.contains(t)||pn(n,t,e[t].primKey,e[t].indexes)}))}))}(e,n,o,r).catch(a)}))}function fn(e,t){const n={del:[],add:[],change:[]};let r;for(r in e)t[r]||n.del.push(r);for(r in t){const s=e[r],i=t[r];if(s){const e={name:r,def:i,recreate:!1,del:[],add:[],change:[]};if(""+(s.primKey.keyPath||"")!=""+(i.primKey.keyPath||"")||s.primKey.auto!==i.primKey.auto&&!mt)e.recreate=!0,n.change.push(e);else{const t=s.idxByName,r=i.idxByName;let o;for(o in t)r[o]||e.del.push(o);for(o in r){const n=t[o],s=r[o];n?n.src!==s.src&&e.change.push(s):e.add.push(s)}(e.del.length>0||e.add.length>0||e.change.length>0)&&n.change.push(e)}}else n.add.push([r,i])}return n}function pn(e,t,n,r){const s=e.db.createObjectStore(t,n.keyPath?{keyPath:n.keyPath,autoIncrement:n.auto}:{autoIncrement:n.auto});return r.forEach((e=>yn(s,e))),s}function yn(e,t){e.createIndex(t.name,t.keyPath,{unique:t.unique,multiEntry:t.multi})}function mn(e,t,n){const r={};return p(t.objectStoreNames,0).forEach((e=>{const t=n.objectStore(e);let s=t.keyPath;const i=Jt(Zt(s),s||"",!1,!1,!!t.autoIncrement,s&&"string"!=typeof s,!0),o=[];for(let e=0;e<t.indexNames.length;++e){const n=t.index(t.indexNames[e]);s=n.keyPath;var a=Jt(n.name,s,!!n.unique,!!n.multiEntry,!1,s&&"string"!=typeof s,!1);o.push(a)}r[e]=en(e,i,o)})),r}function vn({_novip:t},n,r){const s=r.db.objectStoreNames;for(let e=0;e<s.length;++e){const i=s[e],o=r.objectStore(i);t._hasGetAll="getAll"in o;for(let e=0;e<o.indexNames.length;++e){const t=o.indexNames[e],r=o.index(t).keyPath,s="string"==typeof r?r:"["+p(r).join("+")+"]";if(n[i]){const e=n[i].idxByName[s];e&&(e.name=t,delete n[i].idxByName[s],n[i].idxByName[t]=e)}}}"undefined"!=typeof navigator&&/Safari/.test(navigator.userAgent)&&!/(Chrome\/|Edge\/)/.test(navigator.userAgent)&&e.WorkerGlobalScope&&e instanceof e.WorkerGlobalScope&&[].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1]<604&&(t._hasGetAll=!1)}class gn{_parseStoresSpec(e,r){t(e).forEach((t=>{if(null!==e[t]){var s=e[t].split(",").map(((e,t)=>{const r=(e=e.trim()).replace(/([&*]|\+\+)/g,""),s=/^\[/.test(r)?r.match(/^\[(.*)\]$/)[1].split("+"):r;return Jt(r,s||null,/\&/.test(e),/\*/.test(e),/\+\+/.test(e),n(s),0===t)})),i=s.shift();if(i.multi)throw new X.Schema("Primary key cannot be multi-valued");s.forEach((e=>{if(e.auto)throw new X.Schema("Only primary key can be marked as autoIncrement (++)");if(!e.keyPath)throw new X.Schema("Index must have a name and cannot be an empty string")})),r[t]=en(t,i,s)}}))}stores(e){const n=this.db;this._cfg.storesSource=this._cfg.storesSource?r(this._cfg.storesSource,e):e;const s=n._versions,i={};let o={};return s.forEach((e=>{r(i,e._cfg.storesSource),o=e._cfg.dbschema={},e._parseStoresSpec(i,o)})),n._dbSchema=o,cn(n,[n._allTables,n,n.Transaction.prototype]),ln(n,[n._allTables,n,n.Transaction.prototype,this._cfg.tables],t(o),o),n._storeNames=t(o),this}upgrade(e){return this._cfg.contentUpgrade=ue(this._cfg.contentUpgrade||ee,e),this}}function bn(e,t){let n=e._dbNamesDB;return n||(n=e._dbNamesDB=new Un("__dbnames",{addons:[],indexedDB:e,IDBKeyRange:t}),n.version(1).stores({dbnames:"name"})),n.table("dbnames")}function _n(e){return e&&"function"==typeof e.databases}function wn(e){return Je((function(){return Ke.letThrough=!0,e()}))}function xn(){var e;return!navigator.userAgentData&&/Safari\//.test(navigator.userAgent)&&!/Chrom(e|ium)\//.test(navigator.userAgent)&&indexedDB.databases?new Promise((function(t){var n=function(){return indexedDB.databases().finally(t)};e=setInterval(n,100),n()})).finally((function(){return clearInterval(e)})):Promise.resolve()}function kn(e){const n=e._state,{indexedDB:r}=e._deps;if(n.isBeingOpened||e.idbdb)return n.dbReadyPromise.then((()=>n.dbOpenError?ht(n.dbOpenError):e));R&&(n.openCanceller._stackHolder=q()),n.isBeingOpened=!0,n.dbOpenError=null,n.openComplete=!1;const s=n.openCanceller;function i(){if(n.openCanceller!==s)throw new X.DatabaseClosed("db.open() was cancelled")}let o=n.dbReadyResolve,a=null,u=!1;return Ce.race([s,("undefined"==typeof navigator?Ce.resolve():xn()).then((()=>new Ce(((s,o)=>{if(i(),!r)throw new X.MissingAPI;const l=e.name,c=n.autoSchema?r.open(l):r.open(l,Math.round(10*e.verno));if(!c)throw new X.MissingAPI;c.onerror=Gt(o),c.onblocked=We(e._fireOnBlocked),c.onupgradeneeded=We((t=>{if(a=c.transaction,n.autoSchema&&!e._options.allowEmptyDB){c.onerror=Ht,a.abort(),c.result.close();const e=r.deleteDatabase(l);e.onsuccess=e.onerror=We((()=>{o(new X.NoSuchDatabase(`Database ${l} doesnt exist`))}))}else{a.onerror=Gt(o);var s=t.oldVersion>Math.pow(2,62)?0:t.oldVersion;u=s<1,e._novip.idbdb=c.result,dn(e,s/10,a,o)}}),o),c.onsuccess=We((()=>{a=null;const r=e._novip.idbdb=c.result,i=p(r.objectStoreNames);if(i.length>0)try{const s=r.transaction(1===(o=i).length?o[0]:o,"readonly");n.autoSchema?function({_novip:e},n,r){e.verno=n.version/10;const s=e._dbSchema=mn(0,n,r);e._storeNames=p(n.objectStoreNames,0),ln(e,[e._allTables],t(s),s)}(e,r,s):(vn(e,e._dbSchema,s),function(e,t){const n=fn(mn(0,e.idbdb,t),e._dbSchema);return!(n.add.length||n.change.some((e=>e.add.length||e.change.length)))}(e,s)||console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Some queries may fail.")),un(e,s)}catch(e){}var o;yt.push(e),r.onversionchange=We((t=>{n.vcFired=!0,e.on("versionchange").fire(t)})),r.onclose=We((t=>{e.on("close").fire(t)})),u&&function({indexedDB:e,IDBKeyRange:t},n){!_n(e)&&"__dbnames"!==n&&bn(e,t).put({name:n}).catch(ee)}(e._deps,l),s()}),o)}))))]).then((()=>(i(),n.onReadyBeingFired=[],Ce.resolve(wn((()=>e.on.ready.fire(e.vip)))).then((function t(){if(n.onReadyBeingFired.length>0){let r=n.onReadyBeingFired.reduce(ue,ee);return n.onReadyBeingFired=[],Ce.resolve(wn((()=>r(e.vip)))).then(t)}}))))).finally((()=>{n.onReadyBeingFired=null,n.isBeingOpened=!1})).then((()=>e)).catch((t=>{n.dbOpenError=t;try{a&&a.abort()}catch(e){}return s===n.openCanceller&&e._close(),ht(t)})).finally((()=>{n.openComplete=!0,o()}))}function En(e){var t=t=>e.next(t),r=i(t),s=i((t=>e.throw(t)));function i(e){return t=>{var i=e(t),o=i.value;return i.done?o:o&&"function"==typeof o.then?o.then(r,s):n(o)?Promise.all(o).then(r,s):r(o)}}return i(t)()}function Pn(e,t,n){var r=arguments.length;if(r<2)throw new X.InvalidArgument("Too few arguments");for(var s=new Array(r-1);--r;)s[r-1]=arguments[r];n=s.pop();var i=k(s);return[e,i,n]}function Kn(e,t,n,r,s){return Ce.resolve().then((()=>{const i=Ke.transless||Ke,o=e._createTransaction(t,n,e._dbSchema,r),a={trans:o,transless:i};if(r)o.idbtrans=r.idbtrans;else try{o.create(),e._state.PR1398_maxLoop=3}catch(r){return r.name===H.InvalidState&&e.isOpen()&&--e._state.PR1398_maxLoop>0?(console.warn("Dexie: Need to reopen db"),e._close(),e.open().then((()=>Kn(e,t,n,null,s)))):ht(r)}const u=T(s);let l;u&&Ze();const c=Ce.follow((()=>{if(l=s.call(o,o),l)if(u){var e=et.bind(null,null);l.then(e,e)}else"function"==typeof l.next&&"function"==typeof l.throw&&(l=En(l))}),a);return(l&&"function"==typeof l.then?Ce.resolve(l).then((e=>o.active?e:ht(new X.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn")))):c.then((()=>l))).then((e=>(r&&o._resolve(),o._completion.then((()=>e))))).catch((e=>(o._reject(e),ht(e))))}))}function On(e,t,r){const s=n(e)?e.slice():[e];for(let e=0;e<r;++e)s.push(t);return s}const Sn={stack:"dbcore",name:"VirtualIndexMiddleware",level:1,create:function(e){return{...e,table(t){const n=e.table(t),{schema:r}=n,s={},i=[];function o(e,t,n){const r=on(e),a=s[r]=s[r]||[],u=null==e?0:"string"==typeof e?1:e.length,l=t>0,c={...n,isVirtual:l,keyTail:t,keyLength:u,extractKey:nn(e),unique:!l&&n.unique};if(a.push(c),c.isPrimaryKey||i.push(c),u>1){o(2===u?e[0]:e.slice(0,u-1),t+1,n)}return a.sort(((e,t)=>e.keyTail-t.keyTail)),c}const a=o(r.primaryKey.keyPath,0,r.primaryKey);s[":id"]=[a];for(const e of r.indexes)o(e.keyPath,0,e);function u(t){const n=t.query.index;return n.isVirtual?{...t,query:{index:n,range:(r=t.query.range,s=n.keyTail,{type:1===r.type?2:r.type,lower:On(r.lower,r.lowerOpen?e.MAX_KEY:e.MIN_KEY,s),lowerOpen:!0,upper:On(r.upper,r.upperOpen?e.MIN_KEY:e.MAX_KEY,s),upperOpen:!0})}}:t;var r,s}const l={...n,schema:{...r,primaryKey:a,indexes:i,getIndexByKeyPath:function(e){const t=s[on(e)];return t&&t[0]}},count:e=>n.count(u(e)),query:e=>n.query(u(e)),openCursor(t){const{keyTail:r,isVirtual:s,keyLength:i}=t.query.index;if(!s)return n.openCursor(t);return n.openCursor(u(t)).then((n=>n&&function(n){const s=Object.create(n,{continue:{value:function(s){null!=s?n.continue(On(s,t.reverse?e.MAX_KEY:e.MIN_KEY,r)):t.unique?n.continue(n.key.slice(0,i).concat(t.reverse?e.MIN_KEY:e.MAX_KEY,r)):n.continue()}},continuePrimaryKey:{value(t,s){n.continuePrimaryKey(On(t,e.MAX_KEY,r),s)}},primaryKey:{get:()=>n.primaryKey},key:{get(){const e=n.key;return 1===i?e[0]:e.slice(0,i)}},value:{get:()=>n.value}});return s}(n)))}};return l}}}};function An(e,n,r,s){return r=r||{},s=s||"",t(e).forEach((t=>{if(o(n,t)){var i=e[t],a=n[t];if("object"==typeof i&&"object"==typeof a&&i&&a){const e=C(i);e!==C(a)?r[s+t]=n[t]:"Object"===e?An(i,a,r,s+t+"."):i!==a&&(r[s+t]=n[t])}else i!==a&&(r[s+t]=n[t])}else r[s+t]=void 0})),t(n).forEach((t=>{o(e,t)||(r[s+t]=n[t])})),r}const Cn={stack:"dbcore",name:"HooksMiddleware",level:2,create:e=>({...e,table(t){const n=e.table(t),{primaryKey:r}=n.schema,s={...n,mutate(e){const s=Ke.trans,{deleting:i,creating:a,updating:u}=s.table(t).hook;switch(e.type){case"add":if(a.fire===ee)break;return s._promise("readwrite",(()=>l(e)),!0);case"put":if(a.fire===ee&&u.fire===ee)break;return s._promise("readwrite",(()=>l(e)),!0);case"delete":if(i.fire===ee)break;return s._promise("readwrite",(()=>l(e)),!0);case"deleteRange":if(i.fire===ee)break;return s._promise("readwrite",(()=>function(e){return c(e.trans,e.range,1e4)}(e)),!0)}return n.mutate(e);function l(e){const t=Ke.trans,s=e.keys||function(e,t){return"delete"===t.type?t.keys:t.keys||t.values.map(e.extractKey)}(r,e);if(!s)throw new Error("Keys missing");return"delete"!==(e="add"===e.type||"put"===e.type?{...e,keys:s}:{...e}).type&&(e.values=[...e.values]),e.keys&&(e.keys=[...e.keys]),function(e,t,n){return"add"===t.type?Promise.resolve([]):e.getMany({trans:t.trans,keys:n,cache:"immutable"})}(n,e,s).then((l=>{const c=s.map(((n,s)=>{const c=l[s],h={onerror:null,onsuccess:null};if("delete"===e.type)i.fire.call(h,n,c,t);else if("add"===e.type||void 0===c){const i=a.fire.call(h,n,e.values[s],t);null==n&&null!=i&&(n=i,e.keys[s]=n,r.outbound||_(e.values[s],r.keyPath,n))}else{const r=An(c,e.values[s]),i=u.fire.call(h,r,n,c,t);if(i){const t=e.values[s];Object.keys(i).forEach((e=>{o(t,e)?t[e]=i[e]:_(t,e,i[e])}))}}return h}));return n.mutate(e).then((({failures:t,results:n,numFailures:r,lastResult:i})=>{for(let r=0;r<s.length;++r){const i=n?n[r]:s[r],o=c[r];null==i?o.onerror&&o.onerror(t[r]):o.onsuccess&&o.onsuccess("put"===e.type&&l[r]?e.values[r]:i)}return{failures:t,results:n,numFailures:r,lastResult:i}})).catch((e=>(c.forEach((t=>t.onerror&&t.onerror(e))),Promise.reject(e))))}))}function c(e,t,s){return n.query({trans:e,values:!1,query:{index:r,range:t},limit:s}).then((({result:n})=>l({type:"delete",keys:n,trans:e}).then((r=>r.numFailures>0?Promise.reject(r.failures[0]):n.length<s?{failures:[],numFailures:0,lastResult:void 0}:c(e,{...t,lower:n[n.length-1],lowerOpen:!0},s)))))}}};return s}})};function jn(e,t,n){try{if(!t)return null;if(t.keys.length<e.length)return null;const r=[];for(let s=0,i=0;s<t.keys.length&&i<e.length;++s)0===Bt(t.keys[s],e[i])&&(r.push(n?O(t.values[s]):t.values[s]),++i);return r.length===e.length?r:null}catch(e){return null}}const Dn={stack:"dbcore",level:-1,create:e=>({table:t=>{const n=e.table(t);return{...n,getMany:e=>{if(!e.cache)return n.getMany(e);const t=jn(e.keys,e.trans._cache,"clone"===e.cache);return t?Ce.resolve(t):n.getMany(e).then((t=>(e.trans._cache={keys:e.keys,values:"clone"===e.cache?O(t):t},t)))},mutate:e=>("add"!==e.type&&(e.trans._cache=null),n.mutate(e))}}})};function In(e){return!("from"in e)}const Bn=function(e,t){if(!this){const t=new Bn;return e&&"d"in e&&r(t,e),t}r(this,arguments.length?{d:1,from:e,to:arguments.length>1?t:e}:{d:0})};function Tn(e,t,n){const s=Bt(t,n);if(isNaN(s))return;if(s>0)throw RangeError();if(In(e))return r(e,{from:t,to:n,d:1});const i=e.l,o=e.r;if(Bt(n,e.from)<0)return i?Tn(i,t,n):e.l={from:t,to:n,d:1,l:null,r:null},Nn(e);if(Bt(t,e.to)>0)return o?Tn(o,t,n):e.r={from:t,to:n,d:1,l:null,r:null},Nn(e);Bt(t,e.from)<0&&(e.from=t,e.l=null,e.d=o?o.d+1:1),Bt(n,e.to)>0&&(e.to=n,e.r=null,e.d=e.l?e.l.d+1:1);const a=!e.r;i&&!e.l&&Rn(e,i),o&&a&&Rn(e,o)}function Rn(e,t){In(t)||function e(t,{from:n,to:r,l:s,r:i}){Tn(t,n,r),s&&e(t,s),i&&e(t,i)}(e,t)}function Fn(e,t){const n=Mn(t);let r=n.next();if(r.done)return!1;let s=r.value;const i=Mn(e);let o=i.next(s.from),a=o.value;for(;!r.done&&!o.done;){if(Bt(a.from,s.to)<=0&&Bt(a.to,s.from)>=0)return!0;Bt(s.from,a.from)<0?s=(r=n.next(a.from)).value:a=(o=i.next(s.from)).value}return!1}function Mn(e){let t=In(e)?null:{s:0,n:e};return{next(e){const n=arguments.length>0;for(;t;)switch(t.s){case 0:if(t.s=1,n)for(;t.n.l&&Bt(e,t.n.from)<0;)t={up:t,n:t.n.l,s:1};else for(;t.n.l;)t={up:t,n:t.n.l,s:1};case 1:if(t.s=2,!n||Bt(e,t.n.to)<=0)return{value:t.n,done:!1};case 2:if(t.n.r){t.s=3,t={up:t,n:t.n.r,s:0};continue}case 3:t=t.up}return{done:!0}}}}function Nn(e){var t,n;const r=((null===(t=e.r)||void 0===t?void 0:t.d)||0)-((null===(n=e.l)||void 0===n?void 0:n.d)||0),s=r>1?"r":r<-1?"l":"";if(s){const t="r"===s?"l":"r",n={...e},r=e[s];e.from=r.from,e.to=r.to,e[s]=r[s],n[s]=r[t],e[t]=n,n.d=qn(n)}e.d=qn(e)}function qn({r:e,l:t}){return(e?t?Math.max(e.d,t.d):e.d:t?t.d:0)+1}a(Bn.prototype,{add(e){return Rn(this,e),this},addKey(e){return Tn(this,e,e),this},addKeys(e){return e.forEach((e=>Tn(this,e,e))),this},[j](){return Mn(this)}});const $n={stack:"dbcore",level:0,create:e=>{const r=e.schema.name,s=new Bn(e.MIN_KEY,e.MAX_KEY);return{...e,table:i=>{const o=e.table(i),{schema:a}=o,{primaryKey:u}=a,{extractKey:l,outbound:c}=u,h={...o,mutate:e=>{const t=e.trans,u=t.mutatedParts||(t.mutatedParts={}),l=e=>{const t=`idb://${r}/${i}/${e}`;return u[t]||(u[t]=new Bn)},c=l(""),h=l(":dels"),{type:d}=e;let[f,p]="deleteRange"===e.type?[e.range]:"delete"===e.type?[e.keys]:e.values.length<50?[[],e.values]:[];const y=e.trans._cache;return o.mutate(e).then((e=>{if(n(f)){"delete"!==d&&(f=e.results),c.addKeys(f);const t=jn(f,y);t||"add"===d||h.addKeys(f),(t||p)&&function(e,t,r,s){function i(t){const i=e(t.name||"");function o(e){return null!=e?t.extractKey(e):null}const a=e=>t.multiEntry&&n(e)?e.forEach((e=>i.addKey(e))):i.addKey(e);(r||s).forEach(((e,t)=>{const n=r&&o(r[t]),i=s&&o(s[t]);0!==Bt(n,i)&&(null!=n&&a(n),null!=i&&a(i))}))}t.indexes.forEach(i)}(l,a,t,p)}else if(f){const e={from:f.lower,to:f.upper};h.add(e),c.add(e)}else c.add(s),h.add(s),a.indexes.forEach((e=>l(e.name).add(s)));return e}))}},d=({query:{index:t,range:n}})=>{var r,s;return[t,new Bn(null!==(r=n.lower)&&void 0!==r?r:e.MIN_KEY,null!==(s=n.upper)&&void 0!==s?s:e.MAX_KEY)]},f={get:e=>[u,new Bn(e.key)],getMany:e=>[u,(new Bn).addKeys(e.keys)],count:d,query:d,openCursor:d};return t(f).forEach((e=>{h[e]=function(t){const{subscr:n}=Ke;if(n){const a=e=>{const t=`idb://${r}/${i}/${e}`;return n[t]||(n[t]=new Bn)},u=a(""),h=a(":dels"),[d,p]=f[e](t);if(a(d.name||"").add(p),!d.isPrimaryKey){if("count"!==e){const n="query"===e&&c&&t.values&&o.query({...t,values:!1});return o[e].apply(this,arguments).then((r=>{if("query"===e){if(c&&t.values)return n.then((({result:e})=>(u.addKeys(e),r)));const e=t.values?r.result.map(l):r.result;t.values?u.addKeys(e):h.addKeys(e)}else if("openCursor"===e){const e=r,n=t.values;return e&&Object.create(e,{key:{get:()=>(h.addKey(e.primaryKey),e.key)},primaryKey:{get(){const t=e.primaryKey;return h.addKey(t),t}},value:{get:()=>(n&&u.addKey(e.primaryKey),e.value)}})}return r}))}h.add(s)}}return o[e].apply(this,arguments)}})),h}}}};class Un{constructor(e,t){this._middlewares={},this.verno=0;const n=Un.dependencies;this._options=t={addons:Un.addons,autoOpen:!0,indexedDB:n.indexedDB,IDBKeyRange:n.IDBKeyRange,...t},this._deps={indexedDB:t.indexedDB,IDBKeyRange:t.IDBKeyRange};const{addons:r}=t;this._dbSchema={},this._versions=[],this._storeNames=[],this._allTables={},this.idbdb=null,this._novip=this;const s={dbOpenError:null,isBeingOpened:!1,onReadyBeingFired:null,openComplete:!1,dbReadyResolve:ee,dbReadyPromise:null,cancelOpen:ee,openCanceller:null,autoSchema:!0,PR1398_maxLoop:3};var i;s.dbReadyPromise=new Ce((e=>{s.dbReadyResolve=e})),s.openCanceller=new Ce(((e,t)=>{s.cancelOpen=t})),this._state=s,this.name=e,this.on=Pt(this,"populate","blocked","versionchange","close",{ready:[ue,ee]}),this.on.ready.subscribe=y(this.on.ready.subscribe,(e=>(t,n)=>{Un.vip((()=>{const r=this._state;if(r.openComplete)r.dbOpenError||Ce.resolve().then(t),n&&e(t);else if(r.onReadyBeingFired)r.onReadyBeingFired.push(t),n&&e(t);else{e(t);const r=this;n||e((function e(){r.on.ready.unsubscribe(t),r.on.ready.unsubscribe(e)}))}}))})),this.Collection=(i=this,Kt(Ft.prototype,(function(e,t){this.db=i;let n=wt,r=null;if(t)try{n=t()}catch(e){r=e}const s=e._ctx,o=s.table,a=o.hook.reading.fire;this._ctx={table:o,index:s.index,isPrimKey:!s.index||o.schema.primKey.keyPath&&s.index===o.schema.primKey.name,range:n,keysOnly:!1,dir:"next",unique:"",algorithm:null,filter:null,replayFilter:null,justLimit:!0,isMatch:null,offset:0,limit:1/0,error:r,or:s.or,valueMapper:a!==te?a:null}}))),this.Table=function(e){return Kt(Et.prototype,(function(t,n,r){this.db=e,this._tx=r,this.name=t,this.schema=n,this.hook=e._allTables[t]?e._allTables[t].hook:Pt(null,{creating:[se,ee],reading:[ne,te],updating:[oe,ee],deleting:[ie,ee]})}))}(this),this.Transaction=function(e){return Kt(Xt.prototype,(function(t,n,r,s,i){this.db=e,this.mode=t,this.storeNames=n,this.schema=r,this.chromeTransactionDurability=s,this.idbtrans=null,this.on=Pt(this,"complete","error","abort"),this.parent=i||null,this.active=!0,this._reculock=0,this._blockedFuncs=[],this._resolve=null,this._reject=null,this._waitingFor=null,this._waitingQueue=null,this._spinCount=0,this._completion=new Ce(((e,t)=>{this._resolve=e,this._reject=t})),this._completion.then((()=>{this.active=!1,this.on.complete.fire()}),(e=>{var t=this.active;return this.active=!1,this.on.error.fire(e),this.parent?this.parent._reject(e):t&&this.idbtrans&&this.idbtrans.abort(),ht(e)}))}))}(this),this.Version=function(e){return Kt(gn.prototype,(function(t){this.db=e,this._cfg={version:t,storesSource:null,dbschema:{},tables:{},contentUpgrade:null}}))}(this),this.WhereClause=function(e){return Kt(zt.prototype,(function(t,n,r){this.db=e,this._ctx={table:t,index:":id"===n?null:n,or:r};const s=e._deps.indexedDB;if(!s)throw new X.MissingAPI;this._cmp=this._ascending=s.cmp.bind(s),this._descending=(e,t)=>s.cmp(t,e),this._max=(e,t)=>s.cmp(e,t)>0?e:t,this._min=(e,t)=>s.cmp(e,t)<0?e:t,this._IDBKeyRange=e._deps.IDBKeyRange}))}(this),this.on("versionchange",(e=>{e.newVersion>0?console.warn(`Another connection wants to upgrade database '${this.name}'. Closing db now to resume the upgrade.`):console.warn(`Another connection wants to delete database '${this.name}'. Closing db now to resume the delete request.`),this.close()})),this.on("blocked",(e=>{!e.newVersion||e.newVersion<e.oldVersion?console.warn(`Dexie.delete('${this.name}') was blocked`):console.warn(`Upgrade '${this.name}' blocked by other connection holding version ${e.oldVersion/10}`)})),this._maxKey=tn(t.IDBKeyRange),this._createTransaction=(e,t,n,r)=>new this.Transaction(e,t,n,this._options.chromeTransactionDurability,r),this._fireOnBlocked=e=>{this.on("blocked").fire(e),yt.filter((e=>e.name===this.name&&e!==this&&!e._state.vcFired)).map((t=>t.on("versionchange").fire(e)))},this.use(Sn),this.use(Cn),this.use($n),this.use(Dn),this.vip=Object.create(this,{_vip:{value:!0}}),r.forEach((e=>e(this)))}version(e){if(isNaN(e)||e<.1)throw new X.Type("Given version is not a positive number");if(e=Math.round(10*e)/10,this.idbdb||this._state.isBeingOpened)throw new X.Schema("Cannot add version when database is open");this.verno=Math.max(this.verno,e);const t=this._versions;var n=t.filter((t=>t._cfg.version===e))[0];return n||(n=new this.Version(e),t.push(n),t.sort(hn),n.stores({}),this._state.autoSchema=!1,n)}_whenReady(e){return this.idbdb&&(this._state.openComplete||Ke.letThrough||this._vip)?e():new Ce(((e,t)=>{if(this._state.openComplete)return t(new X.DatabaseClosed(this._state.dbOpenError));if(!this._state.isBeingOpened){if(!this._options.autoOpen)return void t(new X.DatabaseClosed);this.open().catch(ee)}this._state.dbReadyPromise.then(e,t)})).then(e)}use({stack:e,create:t,level:n,name:r}){r&&this.unuse({stack:e,name:r});const s=this._middlewares[e]||(this._middlewares[e]=[]);return s.push({stack:e,create:t,level:null==n?10:n,name:r}),s.sort(((e,t)=>e.level-t.level)),this}unuse({stack:e,name:t,create:n}){return e&&this._middlewares[e]&&(this._middlewares[e]=this._middlewares[e].filter((e=>n?e.create!==n:!!t&&e.name!==t))),this}open(){return kn(this)}_close(){const e=this._state,t=yt.indexOf(this);if(t>=0&&yt.splice(t,1),this.idbdb){try{this.idbdb.close()}catch(e){}this._novip.idbdb=null}e.dbReadyPromise=new Ce((t=>{e.dbReadyResolve=t})),e.openCanceller=new Ce(((t,n)=>{e.cancelOpen=n}))}close(){this._close();const e=this._state;this._options.autoOpen=!1,e.dbOpenError=new X.DatabaseClosed,e.isBeingOpened&&e.cancelOpen(e.dbOpenError)}delete(){const e=arguments.length>0,t=this._state;return new Ce(((n,r)=>{const s=()=>{this.close();var e=this._deps.indexedDB.deleteDatabase(this.name);e.onsuccess=We((()=>{!function({indexedDB:e,IDBKeyRange:t},n){!_n(e)&&"__dbnames"!==n&&bn(e,t).delete(n).catch(ee)}(this._deps,this.name),n()})),e.onerror=Gt(r),e.onblocked=this._fireOnBlocked};if(e)throw new X.InvalidArgument("Arguments not allowed in db.delete()");t.isBeingOpened?t.dbReadyPromise.then(s):s()}))}backendDB(){return this.idbdb}isOpen(){return null!==this.idbdb}hasBeenClosed(){const e=this._state.dbOpenError;return e&&"DatabaseClosed"===e.name}hasFailed(){return null!==this._state.dbOpenError}dynamicallyOpened(){return this._state.autoSchema}get tables(){return t(this._allTables).map((e=>this._allTables[e]))}transaction(){const e=Pn.apply(this,arguments);return this._transaction.apply(this,e)}_transaction(e,t,n){let r=Ke.trans;r&&r.db===this&&-1===e.indexOf("!")||(r=null);const s=-1!==e.indexOf("?");let i,o;e=e.replace("!","").replace("?","");try{if(o=t.map((e=>{var t=e instanceof this.Table?e.name:e;if("string"!=typeof t)throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");return t})),"r"==e||"readonly"===e)i="readonly";else{if("rw"!=e&&"readwrite"!=e)throw new X.InvalidArgument("Invalid transaction mode: "+e);i="readwrite"}if(r){if("readonly"===r.mode&&"readwrite"===i){if(!s)throw new X.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");r=null}r&&o.forEach((e=>{if(r&&-1===r.storeNames.indexOf(e)){if(!s)throw new X.SubTransaction("Table "+e+" not included in parent transaction.");r=null}})),s&&r&&!r.active&&(r=null)}}catch(e){return r?r._promise(null,((t,n)=>{n(e)})):ht(e)}const a=Kn.bind(null,this,i,o,r,n);return r?r._promise(i,a,"lock"):Ke.trans?ot(Ke.transless,(()=>this._whenReady(a))):this._whenReady(a)}table(e){if(!o(this._allTables,e))throw new X.InvalidTable(`Table ${e} does not exist`);return this._allTables[e]}}const Ln="undefined"!=typeof Symbol&&"observable"in Symbol?Symbol.observable:"@@observable";class Vn{constructor(e){this._subscribe=e}subscribe(e,t,n){return this._subscribe(e&&"function"!=typeof e?e:{next:e,error:t,complete:n})}[Ln](){return this}}function Wn(e,n){return t(n).forEach((t=>{Rn(e[t]||(e[t]=new Bn),n[t])})),e}function Yn(e){return new Vn((n=>{const r=T(e);let s=!1,i={},o={};const a={get closed(){return s},unsubscribe:()=>{s=!0,Qt.storagemutated.unsubscribe(h)}};n.start&&n.start(a);let u=!1,l=!1;function c(){return t(o).some((e=>i[e]&&Fn(i[e],o[e])))}const h=e=>{Wn(i,e),c()&&d()},d=()=>{if(u||s)return;i={};const t={},f=function(t){r&&Ze();const n=()=>Je(e,{subscr:t,trans:null}),s=Ke.trans?ot(Ke.transless,n):n();return r&&s.then(et,et),s}(t);l||(Qt("storagemutated",h),l=!0),u=!0,Promise.resolve(f).then((e=>{u=!1,s||(c()?d():(i={},o=t,n.next&&n.next(e)))}),(e=>{["DatabaseClosedError","AbortError"].includes(null==e?void 0:e.name)||(u=!1,n.error&&n.error(e),a.unsubscribe())}))};return d(),a}))}let zn;try{zn={indexedDB:e.indexedDB||e.mozIndexedDB||e.webkitIndexedDB||e.msIndexedDB,IDBKeyRange:e.IDBKeyRange||e.webkitIDBKeyRange}}catch(e){zn={indexedDB:null,IDBKeyRange:null}}const Gn=Un;function Hn(e){let t=Qn;try{Qn=!0,Qt.storagemutated.fire(e)}finally{Qn=t}}a(Gn,{...Z,delete:e=>new Gn(e,{addons:[]}).delete(),exists:e=>new Gn(e,{addons:[]}).open().then((e=>(e.close(),!0))).catch("NoSuchDatabaseError",(()=>!1)),getDatabaseNames(e){try{return function({indexedDB:e,IDBKeyRange:t}){return _n(e)?Promise.resolve(e.databases()).then((e=>e.map((e=>e.name)).filter((e=>"__dbnames"!==e)))):bn(e,t).toCollection().primaryKeys()}(Gn.dependencies).then(e)}catch(e){return ht(new X.MissingAPI)}},defineClass:()=>function(e){r(this,e)},ignoreTransaction:e=>Ke.trans?ot(Ke.transless,e):e(),vip:wn,async:function(e){return function(){try{var t=En(e.apply(this,arguments));return t&&"function"==typeof t.then?t:Ce.resolve(t)}catch(e){return ht(e)}}},spawn:function(e,t,n){try{var r=En(e.apply(n,t||[]));return r&&"function"==typeof r.then?r:Ce.resolve(r)}catch(e){return ht(e)}},currentTransaction:{get:()=>Ke.trans||null},waitFor:function(e,t){const n=Ce.resolve("function"==typeof e?Gn.ignoreTransaction(e):e).timeout(t||6e4);return Ke.trans?Ke.trans.waitFor(n):n},Promise:Ce,debug:{get:()=>R,set:e=>{F(e,"dexie"===e?()=>!0:bt)}},derive:c,extend:r,props:a,override:y,Events:Pt,on:Qt,liveQuery:Yn,extendObservabilitySet:Wn,getByKeyPath:b,setByKeyPath:_,delByKeyPath:function(e,t){"string"==typeof t?_(e,t,void 0):"length"in t&&[].map.call(t,(function(t){_(e,t,void 0)}))},shallowClone:w,deepClone:O,getObjectDiff:An,cmp:Bt,asap:v,minKey:-(1/0),addons:[],connections:yt,errnames:H,dependencies:zn,semVer:"4.0.0-alpha.4",version:"4.0.0-alpha.4".split(".").map((e=>parseInt(e))).reduce(((e,t,n)=>e+t/Math.pow(10,2*n)))}),Gn.maxKey=tn(Gn.dependencies.IDBKeyRange),"undefined"!=typeof dispatchEvent&&"undefined"!=typeof addEventListener&&(Qt("storagemutated",(e=>{if(!Qn){let t;mt?(t=document.createEvent("CustomEvent"),t.initCustomEvent("x-storagemutated-1",!0,!0,e)):t=new CustomEvent("x-storagemutated-1",{detail:e}),Qn=!0,dispatchEvent(t),Qn=!1}})),addEventListener("x-storagemutated-1",(({detail:e})=>{Qn||Hn(e)})));let Qn=!1;if("undefined"!=typeof BroadcastChannel){const e=new BroadcastChannel("x-storagemutated-1");"function"==typeof e.unref&&e.unref(),Qt("storagemutated",(t=>{Qn||e.postMessage(t)})),e.onmessage=e=>{e.data&&Hn(e.data)}}else if("undefined"!=typeof self&&"undefined"!=typeof navigator){Qt("storagemutated",(e=>{try{Qn||("undefined"!=typeof localStorage&&localStorage.setItem("x-storagemutated-1",JSON.stringify({trig:Math.random(),changedParts:e})),"object"==typeof self.clients&&[...self.clients.matchAll({includeUncontrolled:!0})].forEach((t=>t.postMessage({type:"x-storagemutated-1",changedParts:e}))))}catch(e){}})),"undefined"!=typeof addEventListener&&addEventListener("storage",(e=>{if("x-storagemutated-1"===e.key){const t=JSON.parse(e.newValue);t&&Hn(t.changedParts)}}));const e=self.document&&navigator.serviceWorker;e&&e.addEventListener("message",(function({data:e}){e&&"x-storagemutated-1"===e.type&&Hn(e.changedParts)}))}Ce.rejectionMapper=function(e,t){if(!e||e instanceof W||e instanceof TypeError||e instanceof SyntaxError||!e.name||!J[e.name])return e;var n=new J[e.name](t||e.message,e);return"stack"in e&&l(n,"stack",{get:function(){return this.inner.stack}}),n},F(R,bt);
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/plugins/dexie/dexie-helper.js





/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
var getDocsInDb = function getDocsInDb(internals, docIds) {
  return Promise.resolve(internals).then(function (state) {
    return Promise.resolve(Promise.all([state.dexieTable.bulkGet(docIds), state.dexieDeletedTable.bulkGet(docIds)])).then(function (_ref3) {
      var nonDeletedDocsInDb = _ref3[0],
        deletedDocsInDb = _ref3[1];
      var docsInDb = deletedDocsInDb.slice(0);
      nonDeletedDocsInDb.forEach(function (doc, idx) {
        if (doc) {
          docsInDb[idx] = doc;
        }
      });
      return docsInDb;
    });
  });
};
var closeDexieDb = function closeDexieDb(statePromise) {
  return Promise.resolve(statePromise).then(function (state) {
    var prevCount = REF_COUNT_PER_DEXIE_DB.get(statePromise);
    var newCount = prevCount - 1;
    if (newCount === 0) {
      state.dexieDb.close();
      REF_COUNT_PER_DEXIE_DB["delete"](statePromise);
    } else {
      REF_COUNT_PER_DEXIE_DB.set(statePromise, newCount);
    }
  });
};
var DEXIE_DOCS_TABLE_NAME = 'docs';
var DEXIE_DELETED_DOCS_TABLE_NAME = 'deleted-docs';
var DEXIE_CHANGES_TABLE_NAME = 'changes';
var dexie_helper_RX_STORAGE_NAME_DEXIE = 'dexie';
var DEXIE_STATE_DB_BY_NAME = new Map();
var REF_COUNT_PER_DEXIE_DB = new Map();
function getDexieDbWithTables(databaseName, collectionName, settings, schema) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var dexieDbName = 'rxdb-dexie-' + databaseName + '--' + schema.version + '--' + collectionName;
  var state = DEXIE_STATE_DB_BY_NAME.get(dexieDbName);
  if (!state) {
    state = function () {
      try {
        var _dexieStoresSettings;
        /**
         * IndexedDB was not designed for dynamically adding tables on the fly,
         * so we create one dexie database per RxDB storage instance.
         * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
         */
        var useSettings = flatClone(settings);
        useSettings.autoOpen = false;
        var dexieDb = new Dexie(dexieDbName, useSettings);
        var dexieStoresSettings = (_dexieStoresSettings = {}, _dexieStoresSettings[DEXIE_DOCS_TABLE_NAME] = getDexieStoreSchema(schema), _dexieStoresSettings[DEXIE_CHANGES_TABLE_NAME] = '++sequence, id', _dexieStoresSettings[DEXIE_DELETED_DOCS_TABLE_NAME] = primaryPath + ',_meta.lwt,[_meta.lwt+' + primaryPath + ']', _dexieStoresSettings);
        dexieDb.version(1).stores(dexieStoresSettings);
        return Promise.resolve(dexieDb.open()).then(function () {
          return {
            dexieDb: dexieDb,
            dexieTable: dexieDb[DEXIE_DOCS_TABLE_NAME],
            dexieDeletedTable: dexieDb[DEXIE_DELETED_DOCS_TABLE_NAME]
          };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }();
    DEXIE_STATE_DB_BY_NAME.set(dexieDbName, state);
    REF_COUNT_PER_DEXIE_DB.set(state, 0);
  }
  return state;
}
function sortDirectionToMingo(direction) {
  if (direction === 'asc') {
    return 1;
  } else {
    return -1;
  }
}

/**
 * This function is at dexie-helper
 * because we need it in multiple places.
 */
function getDexieSortComparator(_schema, query) {
  var mingoSortObject = {};
  if (!query.sort) {
    throw newRxError('SNH', {
      query: query
    });
  }
  query.sort.forEach(function (sortBlock) {
    var key = Object.keys(sortBlock)[0];
    var direction = Object.values(sortBlock)[0];
    mingoSortObject[key] = sortDirectionToMingo(direction);
  });
  var fun = function fun(a, b) {
    var sorted = mingo/* default.find */.ZP.find([a, b], {}).sort(mingoSortObject);
    var first = sorted.next();
    if (first === a) {
      return -1;
    } else {
      return 1;
    }
  };
  return fun;
}

/**
 * It is not possible to set non-javascript-variable-syntax
 * keys as IndexedDB indexes. So we have to substitute the pipe-char
 * which comes from the key-compression plugin.
 */
var DEXIE_PIPE_SUBSTITUTE = '__';
function dexieReplaceIfStartsWithPipe(str) {
  var split = str.split('.');
  if (split.length > 1) {
    return split.map(function (part) {
      return dexieReplaceIfStartsWithPipe(part);
    }).join('.');
  }
  if (str.startsWith('|')) {
    var withoutFirst = str.substring(1);
    return DEXIE_PIPE_SUBSTITUTE + withoutFirst;
  } else {
    return str;
  }
}
function dexieReplaceIfStartsWithPipeRevert(str) {
  var split = str.split('.');
  if (split.length > 1) {
    return split.map(function (part) {
      return dexieReplaceIfStartsWithPipeRevert(part);
    }).join('.');
  }
  if (str.startsWith(DEXIE_PIPE_SUBSTITUTE)) {
    var withoutFirst = str.substring(DEXIE_PIPE_SUBSTITUTE.length);
    return '|' + withoutFirst;
  } else {
    return str;
  }
}

/**
 * @recursive
 */
function fromStorageToDexie(documentData) {
  if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
    return documentData;
  } else if (Array.isArray(documentData)) {
    return documentData.map(function (row) {
      return fromStorageToDexie(row);
    });
  } else if (typeof documentData === 'object') {
    var ret = {};
    Object.entries(documentData).forEach(function (_ref) {
      var key = _ref[0],
        value = _ref[1];
      if (typeof value === 'object') {
        value = fromStorageToDexie(value);
      }
      ret[dexieReplaceIfStartsWithPipe(key)] = value;
    });
    return ret;
  }
}
function fromDexieToStorage(documentData) {
  if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
    return documentData;
  } else if (Array.isArray(documentData)) {
    return documentData.map(function (row) {
      return fromDexieToStorage(row);
    });
  } else if (typeof documentData === 'object') {
    var ret = {};
    Object.entries(documentData).forEach(function (_ref2) {
      var key = _ref2[0],
        value = _ref2[1];
      if (typeof value === 'object' || Array.isArray(documentData)) {
        value = fromDexieToStorage(value);
      }
      ret[dexieReplaceIfStartsWithPipeRevert(key)] = value;
    });
    return ret;
  }
}

/**
 * Creates a string that can be used to create the dexie store.
 * @link https://dexie.org/docs/API-Reference#quick-reference
 */
function getDexieStoreSchema(rxJsonSchema) {
  var parts = [];

  /**
   * First part must be the primary key
   * @link https://github.com/dexie/Dexie.js/issues/1307#issuecomment-846590912
   */
  var primaryKey = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);
  parts.push([primaryKey]);

  // add other indexes
  if (rxJsonSchema.indexes) {
    rxJsonSchema.indexes.forEach(function (index) {
      var arIndex = Array.isArray(index) ? index : [index];
      parts.push(arIndex);
    });
  }

  // we also need the _meta.lwt+primaryKey index for the getChangedDocumentsSince() method.
  parts.push(['_meta.lwt', primaryKey]);

  /**
   * It is not possible to set non-javascript-variable-syntax
   * keys as IndexedDB indexes. So we have to substitute the pipe-char
   * which comes from the key-compression plugin.
   */
  parts = parts.map(function (part) {
    return part.map(function (str) {
      return dexieReplaceIfStartsWithPipe(str);
    });
  });
  return parts.map(function (part) {
    if (part.length === 1) {
      return part[0];
    } else {
      return '[' + part.join('+') + ']';
    }
  }).join(', ');
}
//# sourceMappingURL=dexie-helper.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/plugins/dexie/rx-storage-dexie.js







var RxStorageDexieStatics = {
  prepareQuery: function prepareQuery(schema, mutateableQuery) {
    if (!mutateableQuery.sort) {
      throw newRxError('SNH', {
        query: mutateableQuery
      });
    }

    /**
     * Store the query plan together with the
     * prepared query to save performance.
     */
    var queryPlan = getQueryPlan(schema, mutateableQuery);
    return {
      query: mutateableQuery,
      queryPlan: queryPlan
    };
  },
  getSortComparator: function getSortComparator(schema, preparedQuery) {
    return getDexieSortComparator(schema, preparedQuery.query);
  },
  getQueryMatcher: function getQueryMatcher(_schema, preparedQuery) {
    var query = preparedQuery.query;
    var mingoQuery = new mingo/* Query */.AE(query.selector);
    var fun = function fun(doc) {
      if (doc._deleted) {
        return false;
      }
      var cursor = mingoQuery.find([doc]);
      var next = cursor.next();
      if (next) {
        return true;
      } else {
        return false;
      }
    };
    return fun;
  },
  checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};
var RxStorageDexie = /*#__PURE__*/(/* unused pure expression or super */ null && (function () {
  function RxStorageDexie(settings) {
    this.name = RX_STORAGE_NAME_DEXIE;
    this.statics = RxStorageDexieStatics;
    this.settings = settings;
  }
  var _proto = RxStorageDexie.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
    return createDexieStorageInstance(this, params, this.settings);
  };
  return RxStorageDexie;
}()));
function getRxStorageDexie() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = new RxStorageDexie(settings);
  return storage;
}
//# sourceMappingURL=rx-storage-dexie.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/custom-index.js
/**
 * For some RxStorage implementations,
 * we need to use our custom crafted indexes
 * so we can easily iterate over them. And sort plain arrays of document data.
 */





/**
 * Crafts an indexable string that can be used
 * to check if a document would be sorted below or above 
 * another documents, dependent on the index values.
 * @monad for better performance
 * 
 * IMPORTANT: Performance is really important here
 * which is why we code so 'strange'.
 * Always run performance tests when you want to
 * change something in this method.
 */
function getIndexableStringMonad(schema, index) {
  /**
   * Prepare all relevant information
   * outside of the returned function
   * to save performance when the returned
   * function is called many times.
   */
  var fieldNameProperties = index.map(function (fieldName) {
    var schemaPart = getSchemaByObjectPath(schema, fieldName);
    var type = schemaPart.type;
    var parsedLengths;
    if (type === 'number' || type === 'integer') {
      parsedLengths = getStringLengthOfIndexNumber(schemaPart);
    }
    return {
      fieldName: fieldName,
      schemaPart: schemaPart,
      parsedLengths: parsedLengths,
      hasComplexPath: fieldName.includes('.'),
      getValueFn: objectPathMonad(fieldName)
    };
  });
  var ret = function ret(docData) {
    var str = '';
    fieldNameProperties.forEach(function (props) {
      var schemaPart = props.schemaPart;
      var type = schemaPart.type;
      var fieldValue = props.getValueFn(docData);
      if (type === 'string') {
        if (!fieldValue) {
          fieldValue = '';
        }
        str += fieldValue.padStart(schemaPart.maxLength, ' ');
      } else if (type === 'boolean') {
        var boolToStr = fieldValue ? '1' : '0';
        str += boolToStr;
      } else {
        var parsedLengths = util_ensureNotFalsy(props.parsedLengths);
        if (!fieldValue) {
          fieldValue = 0;
        }
        str += getNumberIndexString(parsedLengths, fieldValue);
      }
    });
    return str;
  };
  return ret;
}
function getStringLengthOfIndexNumber(schemaPart) {
  var minimum = Math.floor(schemaPart.minimum);
  var maximum = Math.ceil(schemaPart.maximum);
  var multipleOf = schemaPart.multipleOf;
  var valueSpan = maximum - minimum;
  var nonDecimals = valueSpan.toString().length;
  var multipleOfParts = multipleOf.toString().split('.');
  var decimals = 0;
  if (multipleOfParts.length > 1) {
    decimals = multipleOfParts[1].length;
  }
  return {
    nonDecimals: nonDecimals,
    decimals: decimals,
    roundedMinimum: minimum
  };
}
function getNumberIndexString(parsedLengths, fieldValue) {
  var str = '';
  var nonDecimalsValueAsString = (Math.floor(fieldValue) - parsedLengths.roundedMinimum).toString();
  str += nonDecimalsValueAsString.padStart(parsedLengths.nonDecimals, '0');
  var splittedByDecimalPoint = fieldValue.toString().split('.');
  var decimalValueAsString = splittedByDecimalPoint.length > 1 ? splittedByDecimalPoint[1] : '0';
  str += decimalValueAsString.padEnd(parsedLengths.decimals, '0');
  return str;
}
function getStartIndexStringFromLowerBound(schema, index, lowerBound) {
  var str = '';
  index.forEach(function (fieldName, idx) {
    var schemaPart = getSchemaByObjectPath(schema, fieldName);
    var bound = lowerBound[idx];
    var type = schemaPart.type;
    switch (type) {
      case 'string':
        var maxLength = util_ensureNotFalsy(schemaPart.maxLength);
        if (typeof bound === 'string') {
          str += bound.padStart(maxLength, ' ');
        } else {
          str += ''.padStart(maxLength, ' ');
        }
        break;
      case 'boolean':
        if (bound === null) {
          str += '0';
        } else {
          var boolToStr = bound ? '1' : '0';
          str += boolToStr;
        }
        break;
      case 'number':
      case 'integer':
        var parsedLengths = getStringLengthOfIndexNumber(schemaPart);
        if (bound === null) {
          str += '0'.repeat(parsedLengths.nonDecimals + parsedLengths.decimals);
        } else {
          str += getNumberIndexString(parsedLengths, bound);
        }
        break;
      default:
        throw new Error('unknown index type ' + type);
    }
  });
  return str;
}
function getStartIndexStringFromUpperBound(schema, index, upperBound) {
  var str = '';
  index.forEach(function (fieldName, idx) {
    var schemaPart = getSchemaByObjectPath(schema, fieldName);
    var bound = upperBound[idx];
    var type = schemaPart.type;
    switch (type) {
      case 'string':
        var maxLength = util_ensureNotFalsy(schemaPart.maxLength);
        if (typeof bound === 'string') {
          str += bound.padStart(maxLength, INDEX_MAX);
        } else {
          str += ''.padStart(maxLength, INDEX_MAX);
        }
        break;
      case 'boolean':
        if (bound === null) {
          str += '1';
        } else {
          var boolToStr = bound ? '1' : '0';
          str += boolToStr;
        }
        break;
      case 'number':
      case 'integer':
        var parsedLengths = getStringLengthOfIndexNumber(schemaPart);
        if (bound === null || bound === INDEX_MAX) {
          str += '9'.repeat(parsedLengths.nonDecimals + parsedLengths.decimals);
        } else {
          str += getNumberIndexString(parsedLengths, bound);
        }
        break;
      default:
        throw new Error('unknown index type ' + type);
    }
  });
  return str;
}
//# sourceMappingURL=custom-index.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/plugins/memory/binary-search-bounds.js
/**
 * Everything in this file was copied and adapted from
 * @link https://github.com/mikolalysenko/binary-search-bounds
 * 
 * TODO We should use the original npm module instead when this bug is fixed:
 * @link https://github.com/mikolalysenko/binary-search-bounds/pull/14
 */

function binary_search_bounds_ge(a, y, c, l, h) {
  var i = h + 1;
  while (l <= h) {
    var m = l + h >>> 1;
    var x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p >= 0) {
      i = m;
      h = m - 1;
    } else {
      l = m + 1;
    }
  }
  return i;
}
function binary_search_bounds_gt(a, y, c, l, h) {
  var i = h + 1;
  while (l <= h) {
    var m = l + h >>> 1,
      x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p > 0) {
      i = m;
      h = m - 1;
    } else {
      l = m + 1;
    }
  }
  return i;
}
function binary_search_bounds_lt(a, y, c, l, h) {
  var i = l - 1;
  while (l <= h) {
    var m = l + h >>> 1,
      x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p < 0) {
      i = m;
      l = m + 1;
    } else {
      h = m - 1;
    }
  }
  return i;
}
function binary_search_bounds_le(a, y, c, l, h) {
  var i = l - 1;
  while (l <= h) {
    var m = l + h >>> 1,
      x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p <= 0) {
      i = m;
      l = m + 1;
    } else {
      h = m - 1;
    }
  }
  return i;
}
function eq(a, y, c, l, h) {
  while (l <= h) {
    var m = l + h >>> 1,
      x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p === 0) {
      return m;
    }
    if (p <= 0) {
      l = m + 1;
    } else {
      h = m - 1;
    }
  }
  return -1;
}
function norm(a, y, c, l, h, f) {
  if (typeof c === 'function') {
    return f(a, y, c, l === undefined ? 0 : l | 0, h === undefined ? a.length - 1 : h | 0);
  }
  return f(a, y, undefined, c === undefined ? 0 : c | 0, l === undefined ? a.length - 1 : l | 0);
}
function boundGE(a, y, c, l, h) {
  return norm(a, y, c, l, h, binary_search_bounds_ge);
}
function boundGT(a, y, c, l, h) {
  return norm(a, y, c, l, h, binary_search_bounds_gt);
}
function boundLT(a, y, c, l, h) {
  return norm(a, y, c, l, h, binary_search_bounds_lt);
}
function boundLE(a, y, c, l, h) {
  return norm(a, y, c, l, h, binary_search_bounds_le);
}
function boundEQ(a, y, c, l, h) {
  return norm(a, y, c, l, h, eq);
}
//# sourceMappingURL=binary-search-bounds.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/plugins/memory/memory-helper.js



function getMemoryCollectionKey(databaseName, collectionName) {
  return databaseName + '--memory--' + collectionName;
}
function ensureNotRemoved(instance) {
  if (instance.internals.removed) {
    throw new Error('removed');
  }
}
function attachmentMapKey(documentId, attachmentId) {
  return documentId + '||' + attachmentId;
}
var SORT_BY_INDEX_STRING = function SORT_BY_INDEX_STRING(a, b) {
  if (a.indexString < b.indexString) {
    return -1;
  } else {
    return 1;
  }
};
function putWriteRowToState(docId, state, stateByIndex, row, docInState) {
  state.documents.set(docId, row.document);
  stateByIndex.forEach(function (byIndex) {
    var docsWithIndex = byIndex.docsWithIndex;
    var newIndexString = byIndex.getIndexableString(row.document);
    var _pushAtSortPosition = pushAtSortPosition(docsWithIndex, {
        id: docId,
        doc: row.document,
        indexString: newIndexString
      }, SORT_BY_INDEX_STRING, true),
      insertPosition = _pushAtSortPosition[1];

    /**
     * Remove previous if it was in the state
     */
    if (docInState) {
      var previousIndexString = byIndex.getIndexableString(docInState);
      if (previousIndexString === newIndexString) {
        /**
         * Index not changed -> The old doc must be before or after the new one.
         */
        var prev = docsWithIndex[insertPosition - 1];
        if (prev && prev.id === docId) {
          docsWithIndex.splice(insertPosition - 1, 1);
        } else {
          var next = docsWithIndex[insertPosition + 1];
          if (next.id === docId) {
            docsWithIndex.splice(insertPosition + 1, 1);
          } else {
            throw newRxError('SNH', {
              args: {
                row: row,
                byIndex: byIndex
              }
            });
          }
        }
      } else {
        /**
         * Index changed, we must search for the old one and remove it.
         */
        var indexBefore = boundEQ(docsWithIndex, {
          indexString: previousIndexString
        }, compareDocsWithIndex);
        docsWithIndex.splice(indexBefore, 1);
      }
    }
  });
}
function removeDocFromState(primaryPath, schema, state, doc) {
  var docId = doc[primaryPath];
  state.documents["delete"](docId);
  Object.values(state.byIndex).forEach(function (byIndex) {
    var docsWithIndex = byIndex.docsWithIndex;
    var indexString = byIndex.getIndexableString(doc);
    var positionInIndex = boundEQ(docsWithIndex, {
      indexString: indexString
    }, compareDocsWithIndex);
    docsWithIndex.splice(positionInIndex, 1);
  });
}
function compareDocsWithIndex(a, b) {
  if (a.indexString < b.indexString) {
    return -1;
  } else if (a.indexString === b.indexString) {
    return 0;
  } else {
    return 1;
  }
}
//# sourceMappingURL=memory-helper.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/plugins/memory/memory-indexes.js


function addIndexesToInternalsState(state, schema) {
  var primaryPath = rx_schema_helper_getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var useIndexes = !schema.indexes ? [] : schema.indexes.map(function (row) {
    return Array.isArray(row) ? row.slice(0) : [row];
  });

  // we need this as default index
  useIndexes.push([primaryPath]);

  // we need this index for running cleanup()
  useIndexes.push(['_meta.lwt', primaryPath]);
  useIndexes.forEach(function (indexAr) {
    /**
     * Running a query will only return non-deleted documents
     * so all indexes must have the the deleted field as first index field.
     */
    indexAr.unshift('_deleted');
    var indexName = getMemoryIndexName(indexAr);
    state.byIndex[indexName] = {
      index: indexAr,
      docsWithIndex: [],
      getIndexableString: getIndexableStringMonad(schema, indexAr)
    };
  });

  // we need this index for the changes()
  var changesIndex = ['_meta.lwt', primaryPath];
  var indexName = getMemoryIndexName(changesIndex);
  state.byIndex[indexName] = {
    index: changesIndex,
    docsWithIndex: [],
    getIndexableString: getIndexableStringMonad(schema, changesIndex)
  };
}
function getMemoryIndexName(index) {
  return index.join(',');
}
//# sourceMappingURL=memory-indexes.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/plugins/memory/rx-storage-instance-memory.js










var RxStorageInstanceMemory = /*#__PURE__*/function () {
  function RxStorageInstanceMemory(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.closed = false;
    this.changes$ = new Subject();
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.primaryPath = rx_schema_helper_getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceMemory.prototype;
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    var _this = this;
    ensureNotRemoved(this);
    var ret = {
      success: {},
      error: {}
    };
    var categorized = categorizeBulkWriteRows(this, this.primaryPath, this.internals.documents, documentWrites, context);
    ret.error = categorized.errors;

    /**
     * Do inserts/updates
     */
    var stateByIndex = Object.values(this.internals.byIndex);
    categorized.bulkInsertDocs.forEach(function (writeRow) {
      var docId = writeRow.document[_this.primaryPath];
      putWriteRowToState(docId, _this.internals, stateByIndex, writeRow, undefined);
      ret.success[docId] = writeRow.document;
    });
    categorized.bulkUpdateDocs.forEach(function (writeRow) {
      var docId = writeRow.document[_this.primaryPath];
      putWriteRowToState(docId, _this.internals, stateByIndex, writeRow, _this.internals.documents.get(docId));
      ret.success[docId] = writeRow.document;
    });

    /**
     * Handle attachments
     */
    var attachmentsMap = this.internals.attachments;
    categorized.attachmentsAdd.forEach(function (attachment) {
      attachmentsMap.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
    });
    categorized.attachmentsUpdate.forEach(function (attachment) {
      attachmentsMap.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
    });
    categorized.attachmentsRemove.forEach(function (attachment) {
      attachmentsMap["delete"](attachmentMapKey(attachment.documentId, attachment.attachmentId));
    });
    if (categorized.eventBulk.events.length > 0) {
      var lastState = getNewestOfDocumentStates(this.primaryPath, Object.values(ret.success));
      categorized.eventBulk.checkpoint = {
        id: lastState[this.primaryPath],
        lwt: lastState._meta.lwt
      };
      this.changes$.next(categorized.eventBulk);
    }
    return Promise.resolve(ret);
  };
  _proto.findDocumentsById = function findDocumentsById(docIds, withDeleted) {
    var _this2 = this;
    var ret = {};
    docIds.forEach(function (docId) {
      var docInDb = _this2.internals.documents.get(docId);
      if (docInDb && (!docInDb._deleted || withDeleted)) {
        ret[docId] = docInDb;
      }
    });
    return Promise.resolve(ret);
  };
  _proto.query = function query(preparedQuery) {
    var queryPlan = preparedQuery.queryPlan;
    var query = preparedQuery.query;
    var skip = query.skip ? query.skip : 0;
    var limit = query.limit ? query.limit : Infinity;
    var skipPlusLimit = skip + limit;
    var queryMatcher = RxStorageDexieStatics.getQueryMatcher(this.schema, preparedQuery);
    var sortComparator = RxStorageDexieStatics.getSortComparator(this.schema, preparedQuery);
    var queryPlanFields = queryPlan.index;
    var mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
    var index = ['_deleted'].concat(queryPlanFields);
    var lowerBound = queryPlan.startKeys;
    lowerBound = [false].concat(lowerBound);
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, lowerBound);
    var upperBound = queryPlan.endKeys;
    upperBound = [false].concat(upperBound);
    var upperBoundString = getStartIndexStringFromUpperBound(this.schema, index, upperBound);
    var indexName = getMemoryIndexName(index);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var indexOfLower = boundGE(docsWithIndex, {
      indexString: lowerBoundString
    }, compareDocsWithIndex);
    var rows = [];
    var done = false;
    while (!done) {
      var currentDoc = docsWithIndex[indexOfLower];
      if (!currentDoc || currentDoc.indexString > upperBoundString) {
        break;
      }
      if (queryMatcher(currentDoc.doc)) {
        rows.push(currentDoc.doc);
      }
      if (rows.length >= skipPlusLimit && !mustManuallyResort || indexOfLower >= docsWithIndex.length) {
        done = true;
      }
      indexOfLower++;
    }
    if (mustManuallyResort) {
      rows = rows.sort(sortComparator);
    }

    // apply skip and limit boundaries.
    rows = rows.slice(skip, skipPlusLimit);
    return Promise.resolve({
      documents: rows
    });
  };
  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    var sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
    var sinceId = checkpoint ? checkpoint.id : '';
    var index = ['_meta.lwt', this.primaryPath];
    var indexName = getMemoryIndexName(index);
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, ['_meta.lwt', this.primaryPath], [sinceLwt, sinceId]);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var indexOfLower = boundGT(docsWithIndex, {
      indexString: lowerBoundString
    }, compareDocsWithIndex);

    // TODO use array.slice() so we do not have to iterate here
    var rows = [];
    while (rows.length < limit && indexOfLower < docsWithIndex.length) {
      var currentDoc = docsWithIndex[indexOfLower];
      rows.push(currentDoc.doc);
      indexOfLower++;
    }
    var lastDoc = lastOfArray(rows);
    return Promise.resolve({
      documents: rows,
      checkpoint: lastDoc ? {
        id: lastDoc[this.primaryPath],
        lwt: lastDoc._meta.lwt
      } : checkpoint ? checkpoint : {
        id: '',
        lwt: 0
      }
    });
  };
  _proto.cleanup = function cleanup(minimumDeletedTime) {
    var maxDeletionTime = util_now() - minimumDeletedTime;
    var index = ['_deleted', '_meta.lwt', this.primaryPath];
    var indexName = getMemoryIndexName(index);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, [true, 0, '']);
    var indexOfLower = boundGT(docsWithIndex, {
      indexString: lowerBoundString
    }, compareDocsWithIndex);
    var done = false;
    while (!done) {
      var currentDoc = docsWithIndex[indexOfLower];
      if (!currentDoc || currentDoc.doc._meta.lwt > maxDeletionTime) {
        done = true;
      } else {
        removeDocFromState(this.primaryPath, this.schema, this.internals, currentDoc.doc);
        indexOfLower++;
      }
    }
    return PROMISE_RESOLVE_TRUE;
  };
  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    ensureNotRemoved(this);
    var data = getFromMapOrThrow(this.internals.attachments, attachmentMapKey(documentId, attachmentId));
    return Promise.resolve(data.data);
  };
  _proto.changeStream = function changeStream() {
    ensureNotRemoved(this);
    return this.changes$.asObservable();
  };
  _proto.remove = function remove() {
    try {
      var _this4 = this;
      ensureNotRemoved(_this4);
      _this4.internals.removed = true;
      _this4.storage.collectionStates["delete"](getMemoryCollectionKey(_this4.databaseName, _this4.collectionName));
      return Promise.resolve(_this4.close()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.close = function close() {
    if (this.closed) {
      return Promise.reject(newRxError('SNH', {
        database: this.databaseName,
        collection: this.collectionName
      }));
    }
    this.closed = true;
    this.changes$.complete();
    this.internals.refCount = this.internals.refCount - 1;
    if (this.internals.refCount === 0) {
      this.storage.collectionStates["delete"](getMemoryCollectionKey(this.databaseName, this.collectionName));
    }
    return PROMISE_RESOLVE_VOID;
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return this.internals.conflictResultionTasks$.asObservable();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return PROMISE_RESOLVE_VOID;
  };
  return RxStorageInstanceMemory;
}();
function createMemoryStorageInstance(storage, params, settings) {
  var collectionKey = getMemoryCollectionKey(params.databaseName, params.collectionName);
  var internals = storage.collectionStates.get(collectionKey);
  if (!internals) {
    internals = {
      removed: false,
      refCount: 1,
      documents: new Map(),
      attachments: params.schema.attachments ? new Map() : undefined,
      byIndex: {},
      conflictResultionTasks$: new Subject()
    };
    addIndexesToInternalsState(internals, params.schema);
    storage.collectionStates.set(collectionKey, internals);
  } else {
    internals.refCount = internals.refCount + 1;
  }
  var instance = new RxStorageInstanceMemory(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  return Promise.resolve(instance);
}
//# sourceMappingURL=rx-storage-instance-memory.js.map
;// CONCATENATED MODULE: ./node_modules/rxdb/dist/es/plugins/memory/index.js




function getRxStorageMemory() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = {
    name: 'memory',
    statics: RxStorageDexieStatics,
    collectionStates: new Map(),
    createStorageInstance: function createStorageInstance(params) {
      rx_storage_helper_ensureRxStorageInstanceParamsAreCorrect(params);

      // TODO we should not need to append the schema version here.
      params = util_flatClone(params);
      params.collectionName = params.collectionName + '-' + params.schema.version;
      var useSettings = Object.assign({}, settings, params.options);
      return createMemoryStorageInstance(this, params, useSettings);
    }
  };
  return storage;
}




//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./src/index.js



function test() {
    return 'test-success';
}




async function run() {
    const db = await createRxDatabase({
        name: 'flutter-test-db',
        storage: getRxStorageMemory(),
        multiInstance: false
    });

    await db.addCollections({
        heroes: {
            schema: {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    name: {
                        type: 'string',
                        maxLength: 100
                    },
                    color: {
                        type: 'string',
                        maxLength: 30
                    }
                },
                indexes: ['name', 'color'],
                required: ['id', 'color']
            }
        }
    });

    const collection = db.heroes;

    const doc = await collection.insert({
        id: 'foobar',
        name: 'barfoo',
        color: 'red'
    });


    return doc.color;
};


(() => {
    process = {
        run,
        test
    }
})();

})();

/******/ })()
;