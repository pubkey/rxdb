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
var validatorsCache = {};

/**
 * returns the parsed validator from ajv
 * @param {string} [schemaPath=''] if given, the schema for the sub-path is used
 * @
 */
var _getValidator = function _getValidator() {
    var schemaPath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    var hash = this.hash;
    if (!validatorsCache[hash]) validatorsCache[hash] = {};
    var validatorsOfHash = validatorsCache[hash];
    if (!validatorsOfHash[schemaPath]) {
        var schemaPart = schemaPath === '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);
        if (!schemaPart) {
            throw RxError.newRxError('VD1', {
                schemaPath: schemaPath
            });
        }

        // const ajv = new Ajv({errorDataPath: 'property'});
        var ajv = new Ajv();
        validatorsOfHash[schemaPath] = ajv.compile(schemaPart);
    }
    return validatorsOfHash[schemaPath];
};

/**
 * validates the given object against the schema
 * @param  {any} obj
 * @param  {String} [schemaPath=''] if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 * @return {any} obj if validation successful
 */
var validate = function validate(obj) {
    var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var useValidator = this._getValidator(schemaPath);
    var isValid = useValidator(obj);
    if (isValid) return obj;else {
        throw RxError.newRxError('VD2', {
            errors: useValidator.errors,
            schemaPath: schemaPath,
            obj: obj,
            schema: this.jsonID
        });
    };
};

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
    // pre-generate validator-function from the schema
    util.requestIdleCallbackIfAvailable(function () {
        return rxSchema._getValidator();
    });
};

export var rxdb = true;
export var prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param {[type]} prototype of RxSchema
     */
    RxSchema: function RxSchema(proto) {
        proto._getValidator = _getValidator;
        proto.validate = validate;
    }
};
export var hooks = {
    createRxSchema: runAfterSchemaCreated
};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    hooks: hooks
};