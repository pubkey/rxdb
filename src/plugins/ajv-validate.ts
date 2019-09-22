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

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
const validatorsCache = {};


/**
 * returns the parsed validator from ajv
 * @
 */
export function _getValidator(rxSchema, schemaPath: string = '') {
    const hash = rxSchema.hash;
    if (!validatorsCache[hash])
        validatorsCache[hash] = {};
    const validatorsOfHash = validatorsCache[hash];
    if (!validatorsOfHash[schemaPath]) {
        const schemaPart = schemaPath === '' ? rxSchema.jsonID : rxSchema.getSchemaByObjectPath(schemaPath);
        if (!schemaPart) {
            throw newRxError('VD1', {
                schemaPath
            });
        }

        // const ajv = new Ajv({errorDataPath: 'property'});
        const ajv = new Ajv();
        validatorsOfHash[schemaPath] = ajv.compile(schemaPart);
    }
    return validatorsOfHash[schemaPath];
}

/**
 * validates the given object against the schema
 */
function validate(obj, schemaPath: string = '') {
    const useValidator = _getValidator(this, schemaPath);
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
}

const runAfterSchemaCreated = rxSchema => {
    // pre-generate validator-function from the schema
    requestIdleCallbackIfAvailable(() => _getValidator(rxSchema));
};

export const rxdb = true;
export const prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     */
    RxSchema: (proto) => {
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
