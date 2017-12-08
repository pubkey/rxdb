/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */
import Ajv from 'ajv';
import RxError from '../rx-error';
import * as util from '../util';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 * @type {Object<string, any>}
 */
const validatorsCache = {};


/**
 * returns the parsed validator from ajv
 * @param {string} [schemaPath=''] if given, the schema for the sub-path is used
 * @
 */
const _getValidator = function(schemaPath = '') {
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

        // const ajv = new Ajv({errorDataPath: 'property'});
        const ajv = new Ajv();
        validatorsOfHash[schemaPath] = ajv.compile(schemaPart);
    }
    return validatorsOfHash[schemaPath];
};

/**
 * Return ajv errors mapped to RxErrorItem format.
 * Method added for backwards compatibility with is-my-json-valid validator error messages
 * @param {Array} [errors = []] Ajv validation errors.
 * @returns {{field: string, message: string}[]} Mapped errors.
 */
const _parseToRxErrorItem = function(errors = []) {
    const getField = (error) => {
        let dataPath = error.dataPath;
        if (error.keyword === 'required') dataPath = '.' + error.params['missingProperty'];
        return `data${dataPath}`;
    };
    return errors.map(error => {
        return {
            field: getField(error),
            message: error.message
        };
    });
};

/**
 * validates the given object against the schema
 * @param  {any} obj
 * @param  {String} [schemaPath=''] if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 * @return {any} obj if validation successful
 */
const validate = function(obj, schemaPath = '') {
    const useValidator = this._getValidator(schemaPath);
    const isValid = useValidator(obj);
    if (isValid) return obj;
    else {
        throw RxError.newRxError('VD2', {
            errors: this._parseToRxErrorItem(useValidator.errors),
            schemaPath,
            obj,
            schema: this.jsonID
        });
    };
};

const runAfterSchemaCreated = rxSchema => {
    // pre-generate the isMyJsonValid-validator from the schema
    util.requestIdleCallbackIfAvailable(() => {
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
        proto._parseToRxErrorItem = _parseToRxErrorItem;
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
