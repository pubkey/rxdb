'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.prototypes = exports.rxdb = undefined;

var _isMyJsonValid = require('is-my-json-valid');

var _isMyJsonValid2 = _interopRequireDefault(_isMyJsonValid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var validate = function validate(obj) {
    var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    if (!this._validators) this._validators = {};

    if (!this._validators[schemaPath]) {
        var schemaPart = schemaPath == '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);

        if (!schemaPart) {
            throw new Error(JSON.stringify({
                name: 'sub-schema not found',
                error: 'does the field ' + schemaPath + ' exist in your schema?'
            }));
        }
        this._validators[schemaPath] = (0, _isMyJsonValid2['default'])(schemaPart);
    }
    var useValidator = this._validators[schemaPath];
    var isValid = useValidator(obj);
    if (isValid) return obj;else {
        throw new Error(JSON.stringify({
            name: 'object does not match schema',
            errors: useValidator.errors,
            schemaPath: schemaPath,
            obj: obj,
            schema: this.jsonID
        }));
    };
}; /**
    * this plugin validates documents before they can be inserted into the RxCollection.
    * It's using is-my-json-valid as jsonschema-validator
    * @link https://github.com/mafintosh/is-my-json-valid
    */
var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param {[type]} prototype of RxSchema
     */
    RxSchema: function RxSchema(proto) {
        proto.validate = validate;
    }
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes
};
