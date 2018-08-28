"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.hooks = exports.prototypes = exports.rxdb = void 0;

/**
 * this plugin validates all documents
 * no mather if the schema matches or not
 * Do only use this if you are sure that the input into the database is valid
 */

/**
 * validates the given object against the schema
 * @param  {any} obj
 * @return {any} obj
 */
var validate = function validate(obj) {
  return obj;
};

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  /**
   * set validate-function for the RxSchema.prototype
   * @param {[type]} prototype of RxSchema
   */
  RxSchema: function RxSchema(proto) {
    proto.validate = validate;
  }
};
exports.prototypes = prototypes;
var hooks = {};
exports.hooks = hooks;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks
};
exports["default"] = _default;
