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

export var rxdb = true;
export var prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param {[type]} prototype of RxSchema
     */
    RxSchema: function RxSchema(proto) {
        proto.validate = validate;
    }
};
export var hooks = {};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    hooks: hooks
};