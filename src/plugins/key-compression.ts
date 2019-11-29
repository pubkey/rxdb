/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

import {
    numberToLetter,
    trimDots,
    clone
} from '../util';
import {
    RxSchema
} from '../rx-schema';

export class KeyCompressor {

    public _table?: { [k: string]: string };
    public _reverseTable?: { [k: string]: string };
    public _fullTable?: { [k: string]: string };
    constructor(
        public schema: RxSchema
    ) { }

    get table() {
        if (!this._table) {
            // create new table

            let lastKeyNumber = 0;
            const nextKey = () => {
                lastKeyNumber++;
                return numberToLetter(lastKeyNumber - 1);
            };
            this._table = {};
            const jsonSchema = this.schema.normalized;

            const propertiesToTable = (path: string, obj: any) => {
                Object.keys(obj).map(key => {
                    const propertyObj = obj[key];
                    const fullPath = (key === 'properties') ? path : trimDots(path + '.' + key);
                    if (
                        typeof propertyObj === 'object' && // do not add schema-attributes
                        !Array.isArray(propertyObj) && // do not use arrays
                        !(this._table as any)[fullPath] &&
                        fullPath !== '' &&
                        key.length > 3 && // do not compress short keys
                        !fullPath.startsWith('_') // _id/_rev etc should never be compressed
                    ) (this._table as any)[fullPath] = '|' + nextKey();

                    // primary-key is always compressed to _id
                    if (propertyObj.primary === true)
                        (this._table as any)[fullPath] = '_id';

                    if (typeof propertyObj === 'object' && !Array.isArray(propertyObj))
                        propertiesToTable(fullPath, propertyObj);
                });
            };
            propertiesToTable('', jsonSchema);
        }
        return this._table;
    }

    get reverseTable() {
        if (!this._reverseTable) {
            const table = this.table;
            this._reverseTable = {};
            Object.keys(table).forEach(key => {
                const value = table[key];
                const fieldName = key.split('.').pop();
                (this._reverseTable as any)[value] = fieldName;
            });
        }
        return this._reverseTable;
    }

    /**
     * compress the keys of an object via the compression-table
     */
    compress(obj: any): any {
        if (!this.schema.doKeyCompression()) return obj;
        return _compressObj(this, obj);
    }


    _decompressObj(obj: any): any {
        const reverseTable = this.reverseTable;

        // non-object
        if (typeof obj !== 'object' || obj === null) return obj;

        // array
        if (Array.isArray(obj))
            return obj.map(item => this._decompressObj(item));

        // object
        else {
            const ret: any = {};
            Object.keys(obj).forEach(key => {
                let replacedKey = key;
                if (
                    (
                        key.startsWith('|') ||
                        key.startsWith('_')
                    ) &&
                    reverseTable[key]
                ) replacedKey = reverseTable[key];

                ret[replacedKey] = this._decompressObj(obj[key]);
            });
            return ret;
        }
    }

    decompress(obj: any): any {
        if (!this.schema.doKeyCompression()) return obj;
        const returnObj = this._decompressObj(obj);
        return returnObj;
    }

    /**
     * get the full compressed-key-path of a object-path
     */
    transformKey(
        prePath: string,
        prePathCompressed: string,
        remainPathAr: string[]
    ): string {
        const table = this.table;
        prePath = trimDots(prePath);
        prePathCompressed = trimDots(prePathCompressed);
        const nextPath = remainPathAr.shift();

        const nextFullPath = trimDots(prePath + '.' + nextPath);
        if (table[nextFullPath])
            prePathCompressed += '.' + table[nextFullPath];
        else prePathCompressed += '.' + nextPath;

        if (remainPathAr.length > 0)
            return this.transformKey(nextFullPath, prePathCompressed, remainPathAr);
        else
            return trimDots(prePathCompressed);
    }


    /**
     * replace the keys of a query-obj with the compressed keys
     * @return compressed queryJSON
     */
    compressQuery(queryJSON: any): any {
        if (!this.schema.doKeyCompression()) return queryJSON;
        queryJSON = clone(queryJSON);

        // selector
        const selector: any = {};
        Object.keys(queryJSON.selector).forEach(key => {
            const value = queryJSON.selector[key];
            if (key.startsWith('$')) {
                // $or, $not etc have different structure
                const setObj = value.map((obj: any) => {
                    const newObj: any = {};
                    Object.keys(obj).forEach(k => {
                        const transKey = this.transformKey('', '', k.split('.'));
                        newObj[transKey] = obj[k];
                    });
                    return newObj;
                });
                selector[key] = setObj;
            } else {
                const transKey = this.transformKey('', '', key.split('.'));
                selector[transKey] = value;
            }
        });
        queryJSON.selector = selector;

        // sort
        if (queryJSON.sort) {
            queryJSON.sort = queryJSON.sort.map((sortObj: any) => {
                const key = Object.keys(sortObj)[0];
                const value = sortObj[key];
                const ret: any = {};
                ret[this.transformKey('', '', key.split('.'))] = value;
                return ret;
            });
        }

        return queryJSON;
    }
}

function _compressObj(
    keyCompressor: KeyCompressor,
    obj: any,
    path = ''
): any {
    const ret: any = {};
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) {
        return obj
            .map(o => _compressObj(keyCompressor, o, trimDots(path + '.item')));
    }
    Object.keys(obj).forEach(key => {
        const propertyObj = obj[key];
        const fullPath = trimDots(path + '.' + key);
        const replacedKey = keyCompressor.table[fullPath] ? keyCompressor.table[fullPath] : key;
        let nextObj = propertyObj;
        nextObj = _compressObj(keyCompressor, propertyObj, fullPath);
        ret[replacedKey] = nextObj;
    });
    return ret;
}

export function create(schema: RxSchema) {
    return new KeyCompressor(schema);
}


export const rxdb = true;
export const prototypes = {};
export const overwritable = {
    createKeyCompressor: create
};

export default {
    rxdb,
    prototypes,
    overwritable
};
