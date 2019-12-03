/**
 * this plugin validates all documents
 * no mather if the schema matches or not
 * Do only use this if you are sure that the input into the database is valid
 */


/**
 * validates the given object against the schema
 */
const validate = function (obj: any): any {
    return obj;
};

export const rxdb = true;
export const prototypes = {
    /**
     * set validate-function for the RxSchema.prototype
     */
    RxSchema: (proto: any) => {
        proto.validate = validate;
    }
};
export const hooks = {};

export default {
    rxdb,
    prototypes,
    hooks
};
