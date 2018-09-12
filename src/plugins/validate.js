/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import isMyJsonValid from 'is-my-json-valid';
import RxError from '../rx-error';
import {
    requestIdleCallbackIfAvailable
} from '../util';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 * @type {Object<string, any>}
 */
const validatorsCache = {};


/**
 * returns the parsed validator from is-my-json-valid
 * @param {string} [schemaPath=''] if given, the schema for the sub-path is used
 * @
 */
function _getValidator(schemaPath = '') {
    const hash = this.hash;
    if (!validatorsCache[hash])
        validatorsCache[hash] = {};
    const validatorsOfHash = validatorsCache[hash];
    if (!validatorsOfHash[schemaPath]) {
        const schemaPart = schemaPath === '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);
        if (!schemaPart) {
            throw RxError.newRxError('VD1', {
                schemaPath
            });
        }
        validatorsOfHash[schemaPath] = isMyJsonValid(schemaPart);
    }
    return validatorsOfHash[schemaPath];
}

/**
 * validates the given object against the schema
 * @param  {any} obj
 * @param  {String} [schemaPath=''] if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 * @return {any} obj if validation successful
 */
const validate = function (obj, schemaPath = '') {
    const useValidator = this._getValidator(schemaPath);
    const isValid = useValidator(obj);
    if (isValid) return obj;
    else {
        throw RxError.newRxError('VD2', {
            errors: useValidator.errors,
            schemaPath,
            obj,
            schema: this.jsonID
        });
    }
};

const runAfterSchemaCreated = rxSchema => {
    // pre-generate the isMyJsonValid-validator from the schema
    requestIdleCallbackIfAvailable(() => {
        rxSchema._getValidator();
    });
};

export const rxdb = true;
export const prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param {[type]} prototype of RxSchema
     */
    RxSchema: (proto) => {
        proto._getValidator = _getValidator;
        proto.validate = validate;
    }
};
export const hooks = {
    createRxSchema: runAfterSchemaCreated
};

export default {
    rxdb,
    prototypes,
    hooks
};
