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
const validate = function(obj) {
    return obj;
};

export const rxdb = true;
export const prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     * @param {[type]} prototype of RxSchema
     */
    RxSchema: (proto) => {
        proto.validate = validate;
    }
};
export const hooks = {};

export default {
    rxdb,
    prototypes,
    hooks
};
