/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import validator from 'is-my-json-valid';

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
        this._validators[schemaPath] = validator(schemaPart);
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
};

export var rxdb = true;
export var prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param {[type]} prototype of RxSchema
     */
    RxSchema: function RxSchema(proto) {
        proto.validate = validate;
    }
};

export default {
    rxdb: rxdb,
    prototypes: prototypes
};