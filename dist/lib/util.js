'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.promiseWait = exports.assertThrowsAsync = exports.Rx = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var assertThrowsAsync = exports.assertThrowsAsync = function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(test, error) {
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.prev = 0;
                        _context.next = 3;
                        return test();

                    case 3:
                        _context.next = 9;
                        break;

                    case 5:
                        _context.prev = 5;
                        _context.t0 = _context['catch'](0);

                        if (!(!error || _context.t0 instanceof error)) {
                            _context.next = 9;
                            break;
                        }

                        return _context.abrupt('return', 'util.assertThrowsAsync(): everything is fine');

                    case 9:
                        throw new Error('util.assertThrowsAsync(): Missing rejection' + (error ? ' with ' + error.name : ''));

                    case 10:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this, [[0, 5]]);
    }));

    return function assertThrowsAsync(_x, _x2) {
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
    var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
        var ms = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
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


exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.isLevelDown = isLevelDown;
exports.fastUnsecureHash = fastUnsecureHash;
exports.hash = hash;
exports.generate_id = generate_id;
exports.jsonSchemaValidate = jsonSchemaValidate;
exports.promiseWaitResolveable = promiseWaitResolveable;
exports.filledArray = filledArray;

var _randomToken = require('random-token');

var _randomToken2 = _interopRequireDefault(_randomToken);

var _jsonschema = require('jsonschema');

var _Observable = require('rxjs/Observable');

var _Subject = require('rxjs/Subject');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

require('rxjs/add/observable/merge');

require('rxjs/add/observable/interval');

require('rxjs/add/observable/fromEvent');

require('rxjs/add/operator/timeout');

require('rxjs/add/operator/delay');

require('rxjs/add/operator/do');

require('rxjs/add/operator/map');

require('rxjs/add/operator/filter');

require('rxjs/add/operator/first');

require('rxjs/add/operator/startWith');

require('rxjs/add/operator/toPromise');

require('rxjs/add/operator/distinctUntilChanged');

var _aes = require('crypto-js/aes');

var crypto_AES = _interopRequireWildcard(_aes);

var _encUtf = require('crypto-js/enc-utf8');

var crypto_enc = _interopRequireWildcard(_encUtf);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// rxjs cherry-pick
/**
 * this contains a mapping to basic dependencies
 * which should be easy to change
 */

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
}

function fastUnsecureHash(obj) {
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
 *  TODO update spark-md5 to 2.0.2 after pouchdb-find does
 *  @link https://github.com/nolanlawson/pouchdb-find/pull/233
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
}

var VALIDATOR = void 0;
function jsonSchemaValidate(schema, obj) {
    if (!VALIDATOR) VALIDATOR = new _jsonschema.Validator();

    var valid = VALIDATOR.validate(obj, schema);
    if (valid.errors.length > 0) {
        throw new Error(JSON.stringify({
            name: 'object does not match schema',
            errors: valid.errors,
            object: obj,
            schema: schema
        }));
    }
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
}

function filledArray() {
    var size = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

    var ret = [];
    while (ret.length < size) {
        ret.push(ret.lenght);
    }return ret;
}