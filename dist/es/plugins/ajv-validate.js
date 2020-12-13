/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */
import Ajv from 'ajv';
import { newRxError } from '../rx-error';
import { requestIdleCallbackIfAvailable } from '../util';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var VALIDATOR_CACHE = new Map();
var ajv = new Ajv();
/**
 * returns the parsed validator from ajv
 */

export function _getValidator(rxSchema) {
  var hash = rxSchema.hash;

  if (!VALIDATOR_CACHE.has(hash)) {
    var validator = ajv.compile(rxSchema.jsonSchema);
    VALIDATOR_CACHE.set(hash, validator);
  }

  return VALIDATOR_CACHE.get(hash);
}
/**
 * validates the given object against the schema
 */

function validate(obj) {
  var useValidator = _getValidator(this);

  var isValid = useValidator(obj);
  if (isValid) return obj;else {
    throw newRxError('VD2', {
      errors: useValidator.errors,
      obj: obj,
      schema: this.jsonSchema
    });
  }
}

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
  // pre-generate validator-function from the schema
  requestIdleCallbackIfAvailable(function () {
    return _getValidator(rxSchema);
  });
};

export var rxdb = true;
export var prototypes = {
  /**
   * set validate-function for the RxSchema.prototype
   */
  RxSchema: function RxSchema(proto) {
    proto.validate = validate;
  }
};
export var hooks = {
  createRxSchema: runAfterSchemaCreated
};
export var RxDBAjvValidatePlugin = {
  name: 'ajv-validate',
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks
};
//# sourceMappingURL=ajv-validate.js.map