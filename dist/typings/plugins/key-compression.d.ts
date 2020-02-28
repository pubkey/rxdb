/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { RxSchema } from '../rx-schema';
export declare class KeyCompressor {
    schema: RxSchema;
    _table?: {
        [k: string]: string;
    };
    _reverseTable?: {
        [k: string]: string;
    };
    _fullTable?: {
        [k: string]: string;
    };
    constructor(schema: RxSchema);
    get table(): {
        [k: string]: string;
    };
    get reverseTable(): {
        [k: string]: string;
    };
    /**
     * compress the keys of an object via the compression-table
     */
    compress(obj: any): any;
    _decompressObj(obj: any): any;
    decompress(obj: any): any;
    /**
     * get the full compressed-key-path of a object-path
     */
    transformKey(prePath: string, prePathCompressed: string, remainPathAr: string[]): string;
    /**
     * replace the keys of a query-obj with the compressed keys
     * @return compressed queryJSON
     */
    compressQuery(queryJSON: any): any;
}
export declare function create(schema: RxSchema): KeyCompressor;
export declare const rxdb = true;
export declare const prototypes: {};
export declare const overwritable: {
    createKeyCompressor: typeof create;
};
declare const _default: {
    rxdb: boolean;
    prototypes: {};
    overwritable: {
        createKeyCompressor: typeof create;
    };
};
export default _default;
