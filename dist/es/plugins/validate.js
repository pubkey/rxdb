/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import isMyJsonValid from 'is-my-json-valid';
import { newRxError } from '../rx-error';
import { requestIdleCallbackIfAvailable } from '../util';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var VALIDATOR_CACHE = new Map();
/**
 * returns the parsed validator from is-my-json-valid
 */

function _getValidator(rxSchema) {
  var hash = rxSchema.hash;

  if (!VALIDATOR_CACHE.has(hash)) {
    var validator = isMyJsonValid(rxSchema.jsonID);
    VALIDATOR_CACHE.set(hash, validator);
  }

  return VALIDATOR_CACHE.get(hash);
}
/**
 * validates the given object against the schema
 * @param  schemaPath if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 */


var validate = function validate(obj) {
  var useValidator = _getValidator(this);

  var isValid = useValidator(obj);
  if (isValid) return obj;else {
    throw newRxError('VD2', {
      errors: useValidator.errors,
      obj: obj,
      schema: this.jsonID
    });
  }
};

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
  // pre-generate the isMyJsonValid-validator from the schema
  requestIdleCallbackIfAvailable(function () {
    _getValidator(rxSchema);
  });
};

export var rxdb = true;
export var prototypes = {
  /**
   * set validate-function for the RxSchema.prototype
   * @param prototype of RxSchema
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
//# sourceMappingURL=validate.js.map