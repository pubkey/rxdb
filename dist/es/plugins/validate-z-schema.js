/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using z-schema as jsonschema-validator
 * @link https://github.com/zaggino/z-schema
 */
import ZSchema from 'z-schema';
import { newRxError } from '../rx-error';
import { requestIdleCallbackIfAvailable } from '../util';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var validatorsCache = {};
/**
 * returns the parsed validator from z-schema
 * @param schemaPath if given, the schema for the sub-path is used
 * @
 */

function _getValidator(rxSchema) {
  var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var hash = rxSchema.hash;
  if (!validatorsCache[hash]) validatorsCache[hash] = {};
  var validatorsOfHash = validatorsCache[hash];

  if (!validatorsOfHash[schemaPath]) {
    var schemaPart = schemaPath === '' ? rxSchema.jsonID : rxSchema.getSchemaByObjectPath(schemaPath);

    if (!schemaPart) {
      throw newRxError('VD1', {
        schemaPath: schemaPath
      });
    }

    var validator = new ZSchema();

    validatorsOfHash[schemaPath] = function (obj) {
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


var validate = function validate(obj) {
  var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  var validator = _getValidator(this, schemaPath);

  var useValidator = validator(obj);
  var errors = useValidator.getLastErrors();
  if (!errors) return obj;else {
    var formattedZSchemaErrors = errors.map(function (_ref) {
      var title = _ref.title,
          description = _ref.description,
          message = _ref.message;
      return {
        title: title,
        description: description,
        message: message
      };
    });
    throw newRxError('VD2', {
      errors: formattedZSchemaErrors,
      schemaPath: schemaPath,
      obj: obj,
      schema: this.jsonID
    });
  }
};

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
  // pre-generate the validator-z-schema from the schema
  requestIdleCallbackIfAvailable(function () {
    return _getValidator.bind(rxSchema, rxSchema);
  });
};

export var rxdb = true;
export var prototypes = {
  /**
   * set validate-function for the RxSchema.prototype
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
//# sourceMappingURL=validate-z-schema.js.map