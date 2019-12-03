/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using z-schema as jsonschema-validator
 * @link https://github.com/zaggino/z-schema
 */
import ZSchema from 'z-schema';
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
 * returns the parsed validator from z-schema
 * @param schemaPath if given, the schema for the sub-path is used
 * @
 */
function _getValidator(
    rxSchema: RxSchema
) {
    const hash = rxSchema.hash;
    if (!VALIDATOR_CACHE.has(hash)) {
        const validator = new (ZSchema as any)();
        const validatorFun = (obj: any) => {
            validator.validate(obj, rxSchema.jsonID);
            return validator;
        };
        VALIDATOR_CACHE.set(hash, validatorFun);
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
    const validator = _getValidator(this);
    const useValidator = validator(obj);
    const errors: ZSchema.SchemaErrorDetail[] = useValidator.getLastErrors();
    if (!errors) return obj;
    else {
        const formattedZSchemaErrors = (errors as any).map(({
            title,
            description,
            message
        }: any) => ({
            title,
            description,
            message
        }));
        throw newRxError('VD2', {
            errors: formattedZSchemaErrors,
            obj,
            schema: this.jsonID
        });
    }
};

const runAfterSchemaCreated = (rxSchema: RxSchema) => {
    // pre-generate the validator-z-schema from the schema
    requestIdleCallbackIfAvailable(() => _getValidator.bind(rxSchema, rxSchema));
};

export const rxdb = true;
export const prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     */
    RxSchema: (proto: any) => {
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
