/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import isMyJsonValid from 'is-my-json-valid';
import {
    newRxError
} from '../rx-error';
import {
    requestIdleCallbackIfAvailable
} from '../util';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
const validatorsCache: { [k: string]: any } = {};


/**
 * returns the parsed validator from is-my-json-valid
 * @param [schemaPath=''] if given, the schema for the sub-path is used
 * @
 */
function _getValidator(schemaPath: string = '') {
    const hash = this.hash;
    if (!validatorsCache[hash])
        validatorsCache[hash] = {};
    const validatorsOfHash = validatorsCache[hash];
    if (!validatorsOfHash[schemaPath]) {
        const schemaPart = schemaPath === '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);
        if (!schemaPart) {
            throw newRxError('VD1', {
                schemaPath
            });
        }
        validatorsOfHash[schemaPath] = isMyJsonValid(schemaPart);
    }
    return validatorsOfHash[schemaPath];
}

/**
 * validates the given object against the schema
 * @param  schemaPath if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 */
const validate = function (
    obj: any,
    schemaPath: string = ''
): any {
    const useValidator = this._getValidator(schemaPath);
    const isValid = useValidator(obj);
    if (isValid) return obj;
    else {
        throw newRxError('VD2', {
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
     * @param prototype of RxSchema
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
