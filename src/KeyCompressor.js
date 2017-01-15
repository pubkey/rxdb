import {
    default as objectPath
} from 'object-path';

import * as util from './util';

class KeyCompressor {

    constructor(schema) {
        this.schema = schema;
        this._table;
        this._reverseTable;
        this._lastChar = 'a';
    }

    get table() {
        if (!this._table) {
            // create new table

            let lastKeyNumber = 0;
            const nextKey = () => {
                lastKeyNumber++;
                return util.numberToLetter(lastKeyNumber - 1);
            };
            this._table = {};
            const jsonSchema = this.schema.normalized;

            const propertiesToTable = (path, obj) => {
                Object.keys(obj).map(key => {
                    const propertyObj = obj[key];
                    const fullPath = (key == 'properties') ? path : util.trimDots(path + '.' + key);
                    if (
                        typeof propertyObj === 'object' && // do not add schema-attributes
                        !Array.isArray(propertyObj) && // do not use arrays
                        !this._table[fullPath] &&
                        fullPath != '' &&
                        key.length > 3 && // do not compress short keys
                        !fullPath.startsWith('_') // _id etc should never be compressed
                    ) this._table[fullPath] = '|' + nextKey();

                    // primary-key is always compressed to _id
                    if (propertyObj.primary == true)
                        this._table[fullPath] = '_id';

                    if (typeof propertyObj == 'object' && !Array.isArray(propertyObj))
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
                this._reverseTable[value] = fieldName;
            });
        }
        return this._reverseTable;
    }

    /**
     * comress the keys of an object via the compression-table
     * @param {Object} obj
     * @param {Object} compressed obj
     */
    compress(obj) {
        const table = this.table;
        const compressObj = (path, obj) => {
            const ret = {};
            Object.keys(obj).forEach(key => {
                const propertyObj = obj[key];
                const fullPath = util.trimDots(path + '.' + key);
                const replacedKey = this.table[fullPath] ? this.table[fullPath] : key;
                let nextObj = propertyObj;
                if (Array.isArray(nextObj)) {
                    nextObj = nextObj
                        .map(o => compressObj(fullPath + '.item', o));
                } else if (typeof nextObj === 'object')
                    nextObj = compressObj(fullPath, propertyObj);
                ret[replacedKey] = nextObj;
            });
            return ret;
        };
        return compressObj('', obj);
    }

    decompress(obj) {
        const table = this.table;
        const reverseTable = this.reverseTable;
        const decompressObj = obj => {
            // non-object
            if (typeof obj !== 'object') return obj;

            // array
            if (Array.isArray(obj))
                return obj.map(item => decompressObj(item));

            // object
            else {
                const ret = {};

                Object.keys(obj).forEach(key => {
                    const replacedKey = key.startsWith('|') || key.startsWith('_') ? reverseTable[key] : key;
                    ret[replacedKey] = decompressObj(obj[key]);
                });
                return ret;
            }
        };
        return decompressObj(obj);
    }
}

export function create(schema) {
    return new KeyCompressor(schema);
}
