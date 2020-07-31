import { RxSchema } from '../rx-schema';
import type { RxPlugin } from '../types';
/**
 * returns the parsed validator from ajv
 */
export declare function _getValidator(rxSchema: RxSchema): any;
export declare const rxdb = true;
export declare const prototypes: {
    /**
     * set validate-function for the RxSchema.prototype
     */
    RxSchema: (proto: any) => void;
};
export declare const hooks: {
    createRxSchema: (rxSchema: RxSchema) => void;
};
export declare const RxDBAjvValidatePlugin: RxPlugin;
