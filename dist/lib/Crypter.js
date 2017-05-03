'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * handle the en/decryption of documents-data
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

exports.create = create;

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Crypter = function () {
    function Crypter(password, schema) {
        _classCallCheck(this, Crypter);

        this._password = password;
        this._schema = schema;
    }

    _createClass(Crypter, [{
        key: '_encryptValue',
        value: function _encryptValue(value) {
            return util.encrypt(JSON.stringify(value), this._password);
        }
    }, {
        key: '_decryptValue',
        value: function _decryptValue(encValue) {
            var decrypted = util.decrypt(encValue, this._password);
            return JSON.parse(decrypted);
        }
    }, {
        key: 'encrypt',
        value: function encrypt(obj) {
            var _this = this;

            obj = (0, _clone2.default)(obj);
            if (!this._password) return obj;
            Object.keys(this._schema.encryptedPaths).map(function (path) {
                var value = _objectPath2.default.get(obj, path);
                var encrypted = _this._encryptValue(value);
                _objectPath2.default.set(obj, path, encrypted);
            });
            return obj;
        }
    }, {
        key: 'decrypt',
        value: function decrypt(obj) {
            var _this2 = this;

            obj = (0, _clone2.default)(obj);
            if (!this._password) return obj;

            Object.keys(this._schema.encryptedPaths).map(function (path) {
                var value = _objectPath2.default.get(obj, path);
                var decrypted = _this2._decryptValue(value);
                _objectPath2.default.set(obj, path, decrypted);
            });
            return obj;
        }
    }]);

    return Crypter;
}();

function create(password, schema) {
    return new Crypter(password, schema);
}
