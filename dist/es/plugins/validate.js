/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import isMyJsonValid from 'is-my-json-valid';
import RxError from '../rx-error';
import * as util from '../util';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 * @type {Object<string, any>}
 */
var validatorsCache = {};

/**
 * returns the parsed validator from is-my-json-valid
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
        validatorsOfHash[schemaPath] = isMyJsonValid(schemaPart);
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
    // pre-generate the isMyJsonValid-validator from the schema
    util.requestIdleCallbackIfAvailable(function () {
        rxSchema._getValidator();
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