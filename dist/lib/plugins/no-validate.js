"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
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

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param {[type]} prototype of RxSchema
     */
    RxSchema: function RxSchema(proto) {
        proto.validate = validate;
    }
};
var hooks = exports.hooks = {};

exports["default"] = {
    rxdb: rxdb,
    prototypes: prototypes,
    hooks: hooks
};
