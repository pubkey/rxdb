import { RxSchema } from '../rx-schema';
import type { RxPlugin } from '../types';
export declare const rxdb = true;
export declare const prototypes: {
    /**
     * set validate-function for the RxSchema.prototype
     * @param prototype of RxSchema
     */
    RxSchema: (proto: any) => void;
};
export declare const hooks: {
    createRxSchema: (rxSchema: RxSchema) => void;
};
export declare const RxDBValidatePlugin: RxPlugin;
