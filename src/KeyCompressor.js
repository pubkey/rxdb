import {
    default as objectPath
} from 'object-path';

import * as util from './util';

class KeyCompressor {

    constructor(schema) {
        this.schema = schema;
        this._table;
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
                    ) this._table[fullPath] = nextKey();

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

    /**
     * comress the keys of an object via the compression-table
     * @param {Object} obj
     * @param {Object} compressed obj
     */
    compress(obj) {
        const table = this.table;
        console.log(',,,,....');
        console.log('table:');
        console.dir(table);
        console.log('input obj:');
        console.dir(obj);
        const compressObj = (path, obj) => {
            console.log('____________compressObj()______________');
            console.log('path: ' + path);
            console.log('obj:');
            console.dir(obj);
            const ret = {};
            Object.keys(obj).forEach(key => {
                console.log('-----keys(obj).forEach()------');
                console.log('key: ' + key);

                const propertyObj = obj[key];
                console.log('propObj:');
                console.dir(propertyObj);

                const fullPath = util.trimDots(path + '.' + key);
                console.log('fullPath: ' + fullPath);

                const replacedKey = this.table[fullPath] ? '|' + this.table[fullPath] : key;
                console.log('replacedKey: ' + replacedKey);

                let nextObj = propertyObj;
                if (typeof nextObj === 'object')
                    nextObj = compressObj(fullPath, propertyObj);
                // TODO if Array.isArray(nextObj)

                console.log('nextObj:');
                console.dir(nextObj);

                ret[replacedKey] = nextObj;
            });

            console.log('ret:');
            console.dir(ret);
            return ret;
        };

        const compressed = compressObj('', obj);
        console.log(':::::::::::::::::::');
        console.log('compressed:');
        console.dir(compressed);

        return compressed;
    }

    decompress(obj) {

    }

}


export function create(schema) {
    return new KeyCompressor(schema);
}
