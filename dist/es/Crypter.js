import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
/**
 * handle the en/decryption of documents-data
 */

import objectPath from 'object-path';
import clone from 'clone';

import * as util from './util';

var Crypter = function () {
    function Crypter(password, schema) {
        _classCallCheck(this, Crypter);

        this._password = password;
        this._schema = schema;
    }

    Crypter.prototype._encryptValue = function _encryptValue(value) {
        return util.encrypt(JSON.stringify(value), this._password);
    };

    Crypter.prototype._decryptValue = function _decryptValue(encValue) {
        var decrypted = util.decrypt(encValue, this._password);
        return JSON.parse(decrypted);
    };

    Crypter.prototype.encrypt = function encrypt(obj) {
        var _this = this;

        obj = clone(obj);
        if (!this._password) return obj;
        Object.keys(this._schema.encryptedPaths).map(function (path) {
            var value = objectPath.get(obj, path);
            var encrypted = _this._encryptValue(value);
            objectPath.set(obj, path, encrypted);
        });
        return obj;
    };

    Crypter.prototype.decrypt = function decrypt(obj) {
        var _this2 = this;

        obj = clone(obj);
        if (!this._password) return obj;

        Object.keys(this._schema.encryptedPaths).map(function (path) {
            var value = objectPath.get(obj, path);
            var decrypted = _this2._decryptValue(value);
            objectPath.set(obj, path, decrypted);
        });
        return obj;
    };

    return Crypter;
}();

export function create(password, schema) {
    return new Crypter(password, schema);
}