"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rxdb = exports.prototypes = exports.hooks = exports.RxDBNoValidatePlugin = void 0;

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

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  /**
   * set validate-function for the RxSchema.prototype
   */
  RxSchema: function RxSchema(proto) {
    proto.validate = validate;
  }
};
exports.prototypes = prototypes;
var hooks = {};
exports.hooks = hooks;
var RxDBNoValidatePlugin = {
  name: 'no-validate',
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks
};
exports.RxDBNoValidatePlugin = RxDBNoValidatePlugin;
//# sourceMappingURL=no-validate.js.map