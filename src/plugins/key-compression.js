/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

import clone from 'clone';
import * as util from '../util';


class KeyCompressor {
    /**
     * @param {RxSchema} schema
     */
    constructor(schema) {
        this.schema = schema;
        this._table;
        this._reverseTable;
        this._fullTable;
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
                    const fullPath = (key === 'properties') ? path : util.trimDots(path + '.' + key);
                    if (
                        typeof propertyObj === 'object' && // do not add schema-attributes
                        !Array.isArray(propertyObj) && // do not use arrays
                        !this._table[fullPath] &&
                        fullPath !== '' &&
                        key.length > 3 && // do not compress short keys
                        !fullPath.startsWith('_') // _id/_rev etc should never be compressed
                    ) this._table[fullPath] = '|' + nextKey();

                    // primary-key is always compressed to _id
                    if (propertyObj.primary === true)
                        this._table[fullPath] = '_id';

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
                this._reverseTable[value] = fieldName;
            });
        }
        return this._reverseTable;
    }

    _compressObj(obj, path = '') {
        const ret = {};
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) {
            return obj
                .map(o => this._compressObj(o, util.trimDots(path + '.item')));
        }
        Object.keys(obj).forEach(key => {
            const propertyObj = obj[key];
            const fullPath = util.trimDots(path + '.' + key);
            const replacedKey = this.table[fullPath] ? this.table[fullPath] : key;
            let nextObj = propertyObj;
            nextObj = this._compressObj(propertyObj, fullPath);
            ret[replacedKey] = nextObj;
        });
        return ret;
    }


    /**
     * compress the keys of an object via the compression-table
     * @param {Object} obj
     * @param {Object} compressed obj
     */
    compress(obj) {
        if (!this.schema.doKeyCompression()) return clone(obj);
        return this._compressObj(obj);
    }


    _decompressObj(obj) {
        const reverseTable = this.reverseTable;

        // non-object
        if (typeof obj !== 'object' || obj === null) return obj;

        // array
        if (Array.isArray(obj))
            return obj.map(item => this._decompressObj(item));

        // object
        else {
            const ret = {};
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
    };

    decompress(obj) {
        if (!this.schema.doKeyCompression()) return clone(obj);
        const returnObj = this._decompressObj(obj);
        return returnObj;
    }

    /**
     * get the full compressed-key-path of a object-path
     * @param {string} prePath | 'mainSkill'
     * @param {string} prePathCompressed | '|a'
     * @param {string[]} remainPathAr | ['attack', 'count']
     * @return {string} compressedPath | '|a.|b.|c'
     */
    _transformKey(prePath, prePathCompressed, remainPathAr) {
        const table = this.table;
        prePath = util.trimDots(prePath);
        prePathCompressed = util.trimDots(prePathCompressed);
        const nextPath = remainPathAr.shift();

        const nextFullPath = util.trimDots(prePath + '.' + nextPath);
        if (table[nextFullPath])
            prePathCompressed += '.' + table[nextFullPath];
        else prePathCompressed += '.' + nextPath;

        if (remainPathAr.length > 0)
            return this._transformKey(nextFullPath, prePathCompressed, remainPathAr);
        else
            return util.trimDots(prePathCompressed);
    }


    /**
     * replace the keys of a query-obj with the compressed keys
     * @param {{selector: {}}} queryJSON
     * @return {{selector: {}}} compressed queryJSON
     */
    compressQuery(queryJSON) {
        queryJSON = clone(queryJSON);
        if (!this.schema.doKeyCompression()) return queryJSON;

        // selector
        const selector = {};
        Object.keys(queryJSON.selector).forEach(key => {
            const value = queryJSON.selector[key];
            if (key.startsWith('$')) {
                // $or, $not etc have different structure
                const setObj = value.map(obj => {
                    const newObj = {};
                    Object.keys(obj).forEach(k => {
                        const transKey = this._transformKey('', '', k.split('.'));
                        newObj[transKey] = obj[k];
                    });
                    return newObj;
                });
                selector[key] = setObj;
            } else {
                const transKey = this._transformKey('', '', key.split('.'));
                selector[transKey] = value;
            }
        });
        queryJSON.selector = selector;

        // sort
        if (queryJSON.sort) {
            queryJSON.sort = queryJSON.sort.map(sortObj => {
                const key = Object.keys(sortObj)[0];
                const value = sortObj[key];
                const ret = {};
                ret[this._transformKey('', '', key.split('.'))] = value;
                return ret;
            });
        }

        return queryJSON;
    }
}

export function create(schema) {
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
