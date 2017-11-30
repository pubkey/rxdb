import deepEqual from 'deep-equal';
import MQuery from './mquery/mquery';

import * as util from './util';
import QueryChangeDetector from './query-change-detector';
import RxError from './rx-error';
import {
    runPluginHooks
} from './hooks';

import {
    merge
} from 'rxjs/observable/merge';
import {
    BehaviorSubject
} from 'rxjs/BehaviorSubject';
import {
    mergeMap
} from 'rxjs/operators/mergeMap';
import {
    filter
} from 'rxjs/operators/filter';
import {
    map
} from 'rxjs/operators/map';
import {
    first
} from 'rxjs/operators/first';


let _queryCount = 0;
const newQueryID = function() {
    return ++_queryCount;
};


export class RxQuery {
    constructor(op, queryObj, collection) {
        this.op = op;
        this.collection = collection;
        this.id = newQueryID();

        if (!queryObj) queryObj = this._defaultQuery();

        this.mquery = new MQuery(queryObj);

        this._queryChangeDetector = QueryChangeDetector.create(this);
        this._resultsData = null;
        this._results$ = new BehaviorSubject(null);
        this._latestChangeEvent = -1;
        this._runningPromise = Promise.resolve(true);

        /**
         * if this is true, the results-state is not equal to the database
         * which means that the query must run against the database again
         * @type {Boolean}
         */
        this._mustReExec = true;

        /**
         * counts how often the execution on the whole db was done
         * (used for tests and debugging)
         * @type {Number}
         */
        this._execOverDatabaseCount = 0;
    }

    _defaultQuery() {
        return {
            [this.collection.schema.primaryPath]: {}
        };
    }

    // returns a clone of this RxQuery
    _clone() {
        const cloned = new RxQuery(this.op, this._defaultQuery(), this.collection);
        cloned.mquery = this.mquery.clone();
        return cloned;
    }

    /**
     * run this query through the QueryCache
     * @return {RxQuery} can be this or another query with the equal state
     */
    _tunnelQueryCache() {
        return this.collection._queryCache.getByQuery(this);
    }

    toString() {
        if (!this.stringRep) {
            const stringObj = util.sortObject({
                op: this.op,
                options: this.mquery.options,
                _conditions: this.mquery._conditions,
                _path: this.mquery._path,
                _fields: this.mquery._fields
            }, true);

            this.stringRep = JSON.stringify(stringObj, util.stringifyFilter);
        }
        return this.stringRep;
    }


    /**
     * ensures that the results of this query is equal to the results which a query over the database would give
     * @return {Promise<boolean>} true if results have changed
     */
    async _ensureEqual() {
        // console.log('ensureEqual: ' + this._latestChangeEvent + ' - ' + this.collection._changeEventBuffer.counter);
        // do nothing if nothing happend between the last exec-run and now
        if (this._latestChangeEvent >= this.collection._changeEventBuffer.counter)
            return false;

        let ret = false;

        // make sure it does not run in parallel
        await this._runningPromise;

        // console.log('_ensureEqual(' + this.toString() + ') '+ this._mustReExec);

        let resolve;
        this._runningPromise = new Promise(res => {
            resolve = res;
        });

        if (!this._mustReExec) {
            const missedChangeEvents = this.collection._changeEventBuffer.getFrom(this._latestChangeEvent + 1);
            if (missedChangeEvents === null) {
                // out of bounds -> reExec
                this._mustReExec = true;
            } else {
                // console.dir(missedChangeEvents);
                this._latestChangeEvent = this.collection._changeEventBuffer.counter;
                const runChangeEvents = this.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);
                const changeResult = this._queryChangeDetector.runChangeDetection(runChangeEvents);
                if (!Array.isArray(changeResult) && changeResult) this._mustReExec = true;
                if (Array.isArray(changeResult) && !deepEqual(changeResult, this._resultsData)) {
                    ret = true;
                    await this._setResultData(changeResult);
                }
            }
        }

        if (this._mustReExec) {
            // counter can change while _execOverDatabase() is running
            const latestAfter = this.collection._changeEventBuffer.counter;

            const newResultData = await this._execOverDatabase();
            this._latestChangeEvent = latestAfter;
            if (!deepEqual(newResultData, this._resultsData)) {
                ret = true;
                await this._setResultData(newResultData);
            }
        }

        // console.log('_ensureEqual DONE (' + this.toString() + ')');

        resolve(true);
        return ret;
    }

    _setResultData(newResultData) {
        this._resultsData = newResultData;
        return this
            .collection
            ._createDocuments(this._resultsData)
            .then(newResults => this._results$.next(newResults));
    }

    /**
     * executes the query on the database
     * @return {Promise<{}[]>} results-array with document-data
     */
    _execOverDatabase() {
        //        console.log('query(' + this.id + ')._execOverDatabase(' + this._execOverDatabaseCount + '):' + this.toString());
        this._execOverDatabaseCount = this._execOverDatabaseCount + 1;

        let docsPromise;
        switch (this.op) {
            case 'find':
                docsPromise = this.collection._pouchFind(this);
                break;
            case 'findOne':
                docsPromise = this.collection._pouchFind(this, 1);
                break;
            default:
                throw new Error(`RxQuery.exec(): op (${this.op}) not known`);
        }

        return docsPromise
            .then(docsData => {
                this._mustReExec = false;
                return docsData;
            });
    }

    get $() {
        if (!this._$) {
            const res$ = this._results$
                .pipe(
                    mergeMap(results => {
                        return this
                            ._ensureEqual()
                            .then(hasChanged => {
                                if (hasChanged) return 'WAITFORNEXTEMIT';
                                else return results;
                            });
                    }),
                    filter(results => results !== 'WAITFORNEXTEMIT')
                )
                .asObservable();

            const changeEvents$ = this.collection.$
                .pipe(
                    filter(cEvent => ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op)),
                    mergeMap(async () => this._ensureEqual()),
                    filter(() => false)
                );
            this._$ =
                merge(
                    res$,
                    changeEvents$
                )
                .pipe(
                    filter(x => x !== null),
                    map(results => {
                        if (this.op !== 'findOne') return results;
                        else if (results.length === 0) return null;
                        else return results[0];
                    })
                );
        }
        return this._$;
    }

    toJSON() {
        if (this._toJSON) return this._toJSON;

        const primPath = this.collection.schema.primaryPath;

        const json = {
            selector: this.mquery._conditions
        };

        const options = this.mquery._optionsForExec();

        // sort
        if (options.sort) {
            const sortArray = [];
            Object.keys(options.sort).map(fieldName => {
                const dirInt = options.sort[fieldName];
                let dir = 'asc';
                if (dirInt === -1) dir = 'desc';
                const pushMe = {};
                // TODO run primary-swap somewhere else
                if (fieldName === primPath)
                    fieldName = '_id';

                pushMe[fieldName] = dir;
                sortArray.push(pushMe);
            });
            json.sort = sortArray;
        } else {
            // sort by primaryKey as default
            // (always use _id because there is no primary-swap on json.sort)
            json.sort = [{
                _id: 'asc'
            }];
        }

        if (options.limit) {
            if (typeof options.limit !== 'number') throw new TypeError('limit() must get a number');
            json.limit = options.limit;
        }

        if (options.skip) {
            if (typeof options.skip !== 'number') throw new TypeError('skip() must get a number');
            json.skip = options.skip;
        }

        // add not-query to _id to prevend the grabbing of '_design..' docs
        // this is not the best solution because it prevents the usage of a 'language'-field
        if (!json.selector.language) json.selector.language = {};
        json.selector.language.$ne = 'query';

        // strip empty selectors
        Object.entries(json.selector)
            .filter(entry => typeof entry[1] === 'object')
            .filter(entry => entry[1] !== null)
            .filter(entry => !Array.isArray(entry[1]))
            .filter(entry => Object.keys(entry[1]).length === 0)
            .forEach(entry => delete json.selector[entry[0]]);

        // primary swap
        if (
            primPath !== '_id' &&
            json.selector[primPath]
        ) {
            // selector
            json.selector._id = json.selector[primPath];
            delete json.selector[primPath];
        }

        this._toJSON = json;
        return this._toJSON;
    };

    /**
     * get the key-compression version of this query
     * @return {{selector: {}, sort: []}} compressedQuery
     */
    keyCompress() {
        if (!this.collection.schema.doKeyCompression())
            return this.toJSON();
        else {
            if (!this._keyCompress) {
                this._keyCompress = this
                    .collection
                    ._keyCompressor
                    .compressQuery(this.toJSON());
            }
            return this._keyCompress;
        }
    }

    /**
     * deletes all found documents
     * @return {Promise(RxDocument|RxDocument[])} promise with deleted documents
     */
    remove() {
        let ret;
        return this
            .exec()
            .then(docs => {
                ret = docs;
                if (Array.isArray(docs)) return Promise.all(docs.map(doc => doc.remove()));
                else return docs.remove();
            })
            .then(() => ret);
    }

    /**
     * updates all found documents
     * @overwritten by plugin (optinal)
     * @param  {object} updateObj
     * @return {Promise(RxDocument|RxDocument[])} promise with updated documents
     */
    update() {
        throw RxError.pluginMissing('update');
    }

    /**
     * execute the query
     * @return {Promise<RxDocument|RxDocument[]>} found documents
     */
    async exec() {
        return this.$
            .pipe(
                first()
            )
            .toPromise();
    }

    /**
     * regex cannot run on primary _id
     * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
     */
    regex(params) {
        const clonedThis = this._clone();

        if (this.mquery._path === this.collection.schema.primaryPath)
            throw new Error(`You cannot use .regex() on the primary field '${this.mquery._path}'`);

        clonedThis.mquery.regex(params);
        return clonedThis._tunnelQueryCache();
    };

    /**
     * make sure it searches index because of pouchdb-find bug
     * @link https://github.com/nolanlawson/pouchdb-find/issues/204
     */
    sort(params) {
        const throwNotInSchema = (key) => {
            throw new Error(`RxQuery.sort(${key}) does not work because ${key} is not defined in the schema`);
        };
        const clonedThis = this._clone();

        // workarround because sort wont work on unused keys
        if (typeof params !== 'object') {
            const checkParam = params.charAt(0) === '-' ? params.substring(1) : params;
            if (!clonedThis.mquery._conditions[checkParam]) {
                const schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(checkParam);
                if (!schemaObj) throwNotInSchema(checkParam);

                if (schemaObj.type === 'integer')
                    // TODO change back to -Infinity when issue resolved
                    // @link https://github.com/pouchdb/pouchdb/issues/6454
                    clonedThis.mquery.where(checkParam).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0
                else clonedThis.mquery.where(checkParam).gt(null);
            }
        } else {
            Object.keys(params)
                .filter(k => !clonedThis.mquery._conditions[k] || !clonedThis.mquery._conditions[k].$gt)
                .forEach(k => {
                    const schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(k);
                    if (!schemaObj) throwNotInSchema(k);

                    if (schemaObj.type === 'integer')
                        // TODO change back to -Infinity when issue resolved
                        // @link https://github.com/pouchdb/pouchdb/issues/6454
                        clonedThis.mquery.where(k).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0

                    else clonedThis.mquery.where(k).gt(null);
                });
        }
        clonedThis.mquery.sort(params);
        return clonedThis._tunnelQueryCache();
    };

    limit(amount) {
        if (this.op === 'findOne')
            throw new Error('.limit() cannot be called on .findOne()');
        else {
            const clonedThis = this._clone();
            clonedThis.mquery.limit(amount);
            return clonedThis._tunnelQueryCache();
        }
    }
}

/**
 * tunnel the proto-functions of mquery to RxQuery
 * @param  {any} rxQueryProto    [description]
 * @param  {string[]} mQueryProtoKeys [description]
 * @return {void}                 [description]
 */
const protoMerge = function(rxQueryProto, mQueryProtoKeys) {
    mQueryProtoKeys
        .filter(attrName => !attrName.startsWith('_'))
        .filter(attrName => !rxQueryProto[attrName])
        .forEach(attrName => {
            rxQueryProto[attrName] = function(p1) {
                const clonedThis = this._clone();
                clonedThis.mquery[attrName](p1);
                return clonedThis._tunnelQueryCache();
            };
        });
};

let protoMerged = false;
export function create(op, queryObj, collection) {
    // checks
    if (queryObj && typeof queryObj !== 'object')
        throw new TypeError('query must be an object');
    if (Array.isArray(queryObj))
        throw new TypeError('query cannot be an array');


    let ret = new RxQuery(op, queryObj, collection);
    // ensure when created with same params, only one is created
    ret = ret._tunnelQueryCache();

    if (!protoMerged) {
        protoMerged = true;
        protoMerge(Object.getPrototypeOf(ret), Object.getOwnPropertyNames(ret.mquery.__proto__));
    }

    runPluginHooks('createRxQuery', ret);
    return ret;
}

export function isInstanceOf(obj) {
    return obj instanceof RxQuery;
}

export default {
    create,
    RxQuery,
    isInstanceOf
};
