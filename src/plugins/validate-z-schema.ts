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

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
const validatorsCache: { [k: string]: any } = {};


/**
 * returns the parsed validator from z-schema
 * @param schemaPath if given, the schema for the sub-path is used
 * @
 */
function _getValidator(rxSchema, schemaPath: string = '') {
    const hash = rxSchema.hash;
    if (!validatorsCache[hash]) validatorsCache[hash] = {};
    const validatorsOfHash = validatorsCache[hash];

    if (!validatorsOfHash[schemaPath]) {
        const schemaPart = schemaPath === '' ? rxSchema.jsonID : rxSchema.getSchemaByObjectPath(schemaPath);

        if (!schemaPart) {
            throw newRxError('VD1', {
                schemaPath: schemaPath
            });
        }

        const validator = new (ZSchema as any)();
        validatorsOfHash[schemaPath] = (obj) => {
            validator.validate(obj, schemaPart);
            return validator;
        };
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
    const validator = _getValidator(this, schemaPath);
    const useValidator = validator(obj);
    const errors: ZSchema.SchemaErrorDetail[] = useValidator.getLastErrors();
    if (!errors) return obj;
    else {
        const formattedZSchemaErrors = (errors as any).map(({ title, description, message }) => ({
            title,
            description,
            message
        }));
        throw newRxError('VD2', {
            errors: formattedZSchemaErrors,
            schemaPath,
            obj,
            schema: this.jsonID
        });
    }
};

const runAfterSchemaCreated = rxSchema => {
    // pre-generate the validator-z-schema from the schema
    requestIdleCallbackIfAvailable(() => _getValidator.bind(rxSchema, rxSchema));
};

export const rxdb = true;
export const prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
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
