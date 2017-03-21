'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.waitUntil = exports.promiseWait = exports.assertThrowsAsync = exports.Rx = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * async version of assert.throws
 * @param  {function}  test
 * @param  {Error|TypeError|string} [error=Error] error
 * @param  {?string} [contains=''] contains
 * @return {Promise}       [description]
 */
var assertThrowsAsync = exports.assertThrowsAsync = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(test) {
        var error = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Error;
        var contains = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
        var shouldErrorName;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        shouldErrorName = typeof error === 'string' ? error : error.name;
                        _context.prev = 1;
                        _context.next = 4;
                        return test();

                    case 4:
                        _context.next = 13;
                        break;

                    case 6:
                        _context.prev = 6;
                        _context.t0 = _context['catch'](1);

                        if (!(_context.t0.constructor.name != shouldErrorName)) {
                            _context.next = 10;
                            break;
                        }

                        throw new Error('\n            util.assertThrowsAsync(): Wrong Error-type\n            - is    : ' + _context.t0.constructor.name + '\n            - should: ' + shouldErrorName + '\n            - error: ' + _context.t0.toString() + '\n            ');

                    case 10:
                        if (!(contains != '' && !_context.t0.toString().includes(contains))) {
                            _context.next = 12;
                            break;
                        }

                        throw new Error('\n              util.assertThrowsAsync(): Error does not contain\n              - should contain: ' + contains + '\n              - is string: ' + _context.t0.toString() + '\n            ');

                    case 12:
                        return _context.abrupt('return', 'util.assertThrowsAsync(): everything is fine');

                    case 13:
                        throw new Error('util.assertThrowsAsync(): Missing rejection' + (error ? ' with ' + error.name : ''));

                    case 14:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this, [[1, 6]]);
    }));

    return function assertThrowsAsync(_x) {
        return _ref.apply(this, arguments);
    };
}();

/**
 * this is a very fast hashing but its unsecure
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @param  {object} obj
 * @return {number} a number as hash-result
 */


/**
 * [promiseWait description]
 * @param  {Number}  [ms=0]
 * @return {Promise}
 */
var promiseWait = exports.promiseWait = function () {
    var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
        var ms = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        return _context2.abrupt('return', new Promise(function (res) {
                            return setTimeout(res, ms);
                        }));

                    case 1:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function promiseWait() {
        return _ref2.apply(this, arguments);
    };
}();

/**
 * this returns a promise and the resolve-function
 * which can be called to resolve before the timeout
 * @param  {Number}  [ms=0] [description]
 */


/**
 * waits until the given function returns true
 * @param  {function}  fun
 * @return {Promise}
 */
var waitUntil = exports.waitUntil = function () {
    var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(fun) {
        var ok;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        ok = false;

                    case 1:
                        if (ok) {
                            _context3.next = 7;
                            break;
                        }

                        _context3.next = 4;
                        return promiseWait(10);

                    case 4:
                        ok = fun();
                        _context3.next = 1;
                        break;

                    case 7:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function waitUntil(_x6) {
        return _ref3.apply(this, arguments);
    };
}();

exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.isLevelDown = isLevelDown;
exports.fastUnsecureHash = fastUnsecureHash;
exports.hash = hash;
exports.generate_id = generate_id;
exports.promiseWaitResolveable = promiseWaitResolveable;
exports.filledArray = filledArray;
exports.ucfirst = ucfirst;
exports.numberToLetter = numberToLetter;
exports.trimDots = trimDots;
exports.validateCouchDBString = validateCouchDBString;
exports.randomCouchString = randomCouchString;
exports.sortObject = sortObject;

var _randomToken = require('random-token');

var _randomToken2 = _interopRequireDefault(_randomToken);

var _Observable = require('rxjs/Observable');

var _Subject = require('rxjs/Subject');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

require('rxjs/add/observable/merge');

require('rxjs/add/observable/interval');

require('rxjs/add/observable/from');

require('rxjs/add/observable/fromEvent');

require('rxjs/add/operator/publishReplay');

require('rxjs/add/operator/timeout');

require('rxjs/add/operator/delay');

require('rxjs/add/operator/do');

require('rxjs/add/operator/map');

require('rxjs/add/operator/mergeMap');

require('rxjs/add/operator/filter');

require('rxjs/add/operator/first');

require('rxjs/add/operator/startWith');

require('rxjs/add/operator/toPromise');

require('rxjs/add/operator/distinctUntilChanged');

require('rxjs/add/operator/distinct');

var _aes = require('crypto-js/aes');

var crypto_AES = _interopRequireWildcard(_aes);

var _encUtf = require('crypto-js/enc-utf8');

var crypto_enc = _interopRequireWildcard(_encUtf);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * this contains a mapping to basic dependencies
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * which should be easy to change
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */

// rxjs cherry-pick


var Rx = exports.Rx = {
    Observable: _Observable.Observable,
    Subject: _Subject.Subject,
    BehaviorSubject: _BehaviorSubject.BehaviorSubject
};

// crypto-js
function encrypt(value, password) {
    var encrypted = crypto_AES.encrypt(value, password);
    return encrypted.toString();
}
function decrypt(ciphertext, password) {
    var decrypted = crypto_AES.decrypt(ciphertext, password);
    return decrypted.toString(crypto_enc);
}

/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
function isLevelDown(adapter) {
    if (!adapter || typeof adapter.super_ !== 'function' || typeof adapter.destroy !== 'function') throw new Error('given leveldown is no valid adapter');
}function fastUnsecureHash(obj) {
    if (typeof obj !== 'string') obj = JSON.stringify(obj);
    var hash = 0,
        i = void 0,
        chr = void 0,
        len = void 0;
    if (obj.length === 0) return hash;
    for (i = 0, len = obj.length; i < len; i++) {
        chr = obj.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    if (hash < 0) hash = hash * -1;
    return hash;
}

/**
 *  spark-md5 is used here
 *  because pouchdb uses the same
 *  and build-size could be reduced by 9kb
 */
var Md5 = require('spark-md5');
function hash(obj) {
    var salt = 'dW8a]Qsà<<>0lW6{3Fqxp3IdößBh:Fot';
    var msg = obj;
    if (typeof obj !== 'string') msg = JSON.stringify(obj);
    return Md5.hash(msg);
}

/**
 * generate a new _id as db-primary-key
 * @return {string}
 */
function generate_id() {
    return (0, _randomToken2.default)(10) + ':' + new Date().getTime();
}function promiseWaitResolveable() {
    var ms = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

    var ret = {};
    ret.promise = new Promise(function (res) {
        ret.resolve = function () {
            return res();
        };
        setTimeout(res, ms);
    });
    return ret;
}function filledArray() {
    var size = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

    return new Array(size).fill(0);
}

/**
 * uppercase first char
 * @param  {string} str
 * @return {string} Str
 */
function ucfirst(str) {
    str += '';
    var f = str.charAt(0).toUpperCase();
    return f + str.substr(1);
}

/**
 * @link https://de.wikipedia.org/wiki/Base58
 * this does not start with the numbers to generate valid variable-names
 */
var base58Chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789';
var base58Length = base58Chars.length;

/**
 * transform a number to a string by using only base58 chars
 * @link https://github.com/matthewmueller/number-to-letter/blob/master/index.js
 * @param {number} nr                                       | 10000000
 * @return {string} the string-representation of the number | '2oMX'
 */
function numberToLetter(nr) {
    var digits = [];
    do {
        var v = nr % base58Length;
        digits.push(v);
        nr = Math.floor(nr / base58Length);
    } while (nr-- > 0);

    return digits.reverse().map(function (d) {
        return base58Chars[d];
    }).join('');
}

/**
 * removes trailing and ending dots from the string
 * @param  {string} str
 * @return {string} str without wrapping dots
 */
function trimDots(str) {
    // start
    while (str.charAt(0) == '.') {
        str = str.substr(1);
    } // end
    while (str.slice(-1) == '.') {
        str = str.slice(0, -1);
    }return str;
}

/**
 * validates that a given string is ok to be used with couchdb-collection-names
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
 * @param  {string} name
 * @throws  {Error}
 * @return {boolean} true
 */
function validateCouchDBString(name) {
    if (typeof name != 'string' || name.length == 0) throw new TypeError('given name is no string or empty');

    // do not check, if foldername is given
    if (name.includes('/')) return true;

    var regStr = '^[a-z][a-z0-9]*$';
    var reg = new RegExp(regStr);
    if (!name.match(reg)) {
        throw new Error('\n            collection- and database-names must match the regex:\n            - regex: ' + regStr + '\n            - given: ' + name + '\n    ');
    }

    return true;
}

/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 * @param {number} [length=10] length
 * @return {string}
 */
function randomCouchString() {
    var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

    var text = '';
    var possible = 'abcdefghijklmnopqrstuvwxyz';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }return text;
}

/**
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object
 * @param  {Object} obj unsorted
 * @return {Object} sorted
 */
function sortObject(obj) {
    // array
    if (Array.isArray(obj)) {
        return obj.sort(function (a, b) {
            if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);

            if ((typeof a === 'undefined' ? 'undefined' : _typeof(a)) === 'object') return 1;else return -1;
        }).map(function (i) {
            return sortObject(i);
        });
    }

    // object
    if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object') {
        var out = {};
        Object.keys(obj).sort(function (a, b) {
            return a.localeCompare(b);
        }).forEach(function (key) {
            out[key] = sortObject(obj[key]);
        });
        return out;
    }

    // everything else
    return obj;
}