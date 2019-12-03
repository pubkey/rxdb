/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */
import Ajv from 'ajv';
import {
    newRxError
} from '../rx-error';
import {
    requestIdleCallbackIfAvailable
} from '../util';
import {
    RxSchema
} from '../rx-schema';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
const VALIDATOR_CACHE: Map<string, any> = new Map();


/**
 * returns the parsed validator from ajv
 */
export function _getValidator(
    rxSchema: RxSchema
): any {
    const hash = rxSchema.hash;
    if (!VALIDATOR_CACHE.has(hash)) {
        const ajv = new Ajv(); // TODO should we reuse this instance?
        const validator = ajv.compile(rxSchema.jsonID);
        VALIDATOR_CACHE.set(hash, validator);
    }
    return VALIDATOR_CACHE.get(hash);
}

/**
 * validates the given object against the schema
 */
function validate(
    this: RxSchema,
    obj: any
) {
    const useValidator = _getValidator(this);
    const isValid = useValidator(obj);
    if (isValid) return obj;
    else {
        throw newRxError('VD2', {
            errors: useValidator.errors,
            obj,
            schema: this.jsonID
        });
    }
}

const runAfterSchemaCreated = (rxSchema: RxSchema) => {
    // pre-generate validator-function from the schema
    requestIdleCallbackIfAvailable(() => _getValidator(rxSchema));
};

export const rxdb = true;
export const prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     */
    RxSchema: (proto: any) => {
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
