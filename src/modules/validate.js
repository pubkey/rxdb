/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import validator from 'is-my-json-valid';

const validate = function(obj, schemaPath = '') {
    if (!this._validators)
        this._validators = {};

    if (!this._validators[schemaPath]) {
        const schemaPart = schemaPath == '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);

        if (!schemaPart) {
            throw new Error(JSON.stringify({
                name: 'sub-schema not found',
                error: 'does the field ' + schemaPath + ' exist in your schema?'
            }));
        }
        this._validators[schemaPath] = validator(schemaPart);
    }
    const useValidator = this._validators[schemaPath];
    const isValid = useValidator(obj);
    if (isValid) return obj;
    else {
        throw new Error(JSON.stringify({
            name: 'object does not match schema',
            errors: useValidator.errors,
            schemaPath,
            obj,
            schema: this.jsonID
        }));
    };
};



export default {
    rxdb: true,
    prototypes: {
        /**
         * set validate-function for the RxSchema.prototype
         * @param {[type]} prototype of RxSchema
         */
        RxSchema: (proto) => {
            proto.validate = validate;
        }
    }
};
