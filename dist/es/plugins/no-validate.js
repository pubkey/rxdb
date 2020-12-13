/**
 * this plugin validates all documents
 * no mather if the schema matches or not
 * Do only use this if you are sure that the input into the database is valid
 */

/**
 * validates the given object against the schema
 */
var validate = function validate(obj) {
  return obj;
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
export var hooks = {};
export var RxDBNoValidatePlugin = {
  name: 'no-validate',
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks
};
//# sourceMappingURL=no-validate.js.map