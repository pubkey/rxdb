/**
 * this plugin validates all documents
 * no mather if the schema matches or not
 * Do only use this if you are sure that the input into the database is valid
 */
export declare const rxdb = true;
export declare const prototypes: {
    /**
     * set validate-function for the RxSchema.prototype
     */
    RxSchema: (proto: any) => void;
};
export declare const hooks: {};
declare const _default: {
    rxdb: boolean;
    prototypes: {
        /**
         * set validate-function for the RxSchema.prototype
         */
        RxSchema: (proto: any) => void;
    };
    hooks: {};
};
export default _default;
