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
import {
    RxSchema
} from '../rx-schema';
import type { RxPlugin } from '../types';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
const VALIDATOR_CACHE: Map<string, any> = new Map();


/**
 * returns the parsed validator from is-my-json-valid
 */
function _getValidator(
    rxSchema: RxSchema
) {
    const hash = rxSchema.hash;
    if (!VALIDATOR_CACHE.has(hash)) {
        const validator = isMyJsonValid(rxSchema.jsonSchema as any);
        VALIDATOR_CACHE.set(hash, validator);
    }
    return VALIDATOR_CACHE.get(hash);
}

/**
 * validates the given object against the schema
 * @param  schemaPath if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 */
const validate = function (
    this: RxSchema,
    obj: any
): any {
    const useValidator = _getValidator(this);
    const isValid = useValidator(obj);
    if (isValid) return obj;
    else {
        throw newRxError('VD2', {
            errors: useValidator.errors,
            obj,
            schema: this.jsonSchema
        });
    }
};

const runAfterSchemaCreated = (rxSchema: RxSchema) => {
    // pre-generate the isMyJsonValid-validator from the schema
    requestIdleCallbackIfAvailable(() => {
        _getValidator(rxSchema);
    });
};

export const rxdb = true;
export const prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param prototype of RxSchema
     */
    RxSchema: (proto: any) => {
        proto._getValidator = _getValidator;
        proto.validate = validate;
    }
};
export const hooks = {
    createRxSchema: runAfterSchemaCreated
};

export const RxDBValidatePlugin: RxPlugin = {
    name: 'validate',
    rxdb,
    prototypes,
    hooks
};
