import deepEqual from 'deep-equal';
import MQuery from './mquery/mquery';

import {
    sortObject,
    stringifyFilter,
    clone
} from './util';
import QueryChangeDetector from './query-change-detector';
import RxError from './rx-error';
import {
    runPluginHooks
} from './hooks';

import {
    merge,
    BehaviorSubject
} from 'rxjs';
import {
    mergeMap,
    filter,
    map,
    first,
    tap
} from 'rxjs/operators';

let _queryCount = 0;
const newQueryID = function() {
    return ++_queryCount;
};

export class RxQuery {
    constructor(op, queryObj, collection) {
        this.op = op;
        this.collection = collection;
        this.id = newQueryID();
        if (!queryObj) queryObj = _getDefaultQuery(this.collection);
        this.mquery = new MQuery(queryObj);

        this._subs = [];

        // contains the results as plain json-data
        this._resultsData = null;

        // contains the results as RxDocument[]
        this._resultsDocs$ = new BehaviorSubject(null);

        this._queryChangeDetector = QueryChangeDetector.create(this);

        // stores the changeEvent-Number of the last handled change-event
        this._latestChangeEvent = -1;

        /**
         * counts how often the execution on the whole db was done
         * (used for tests and debugging)
         * @type {Number}
         */
        this._execOverDatabaseCount = 0;

        this._ensureEqualQueue = Promise.resolve();
    }

    toString() {
        if (!this.stringRep) {
            const stringObj = sortObject({
                op: this.op,
                options: this.mquery.options,
                _conditions: this.mquery._conditions,
                _path: this.mquery._path,
                _fields: this.mquery._fields
            }, true);

            this.stringRep = JSON.stringify(stringObj, stringifyFilter);
        }
        return this.stringRep;
    }

    // returns a clone of this RxQuery
    _clone() {
        const cloned = new RxQuery(this.op, _getDefaultQuery(this.collection), this.collection);
        cloned.mquery = this.mquery.clone();
        return cloned;
    }

    /**
     * set the new result-data as result-docs of the query
     * @param {{}[]} newResultData json-docs that were recieved from pouchdb
     * @return {RxDocument[]}
     */
    _setResultData(newResultData) {
        this._resultsData = newResultData;
        const docs = this.collection._createDocuments(this._resultsData);
        this._resultsDocs$.next(docs);
        return docs;
    }

    /**
     * executes the query on the database
     * @return {Promise<{}[]>} results-array with document-data
     */
    _execOverDatabase() {
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
                throw RxError.newRxError('QU1', {
                    op: this.op
                });
        }

        return docsPromise;
    }

    /**
     * Returns an observable that emits the results
     * This should behave like an rxjs-BehaviorSubject which means:
     * - Emit the current result-set on subscribe
     * - Emit the new result-set when an RxChangeEvent comes in
     * - Do not emit anything before the first result-set was created (no null)
     * @return {BehaviorSubject<RxDocument[]>}
     */
    get $() {
        if (!this._$) {
            /**
             * We use _resultsDocs$ to emit new results
             * This also ensure that there is a reemit on subscribe
             */
            const results$ = this._resultsDocs$
                .pipe(
                    mergeMap(docs => {
                        return _ensureEqual(this)
                            .then(hasChanged => {
                                if (hasChanged) return false; // wait for next emit
                                else return docs;
                            });
                    }),
                    filter(docs => !!docs), // not if previous returned false
                    map(docs => {
                        // findOne()-queries emit document or null
                        if (this.op === 'findOne') {
                            const doc = docs.length === 0 ? null : docs[0];
                            return doc;
                        } else return docs; // find()-queries emit RxDocument[]
                    }),
                    map(docs => {
                        // copy the array so it wont matter if the user modifies it
                        const ret = Array.isArray(docs) ? docs.slice() : docs;
                        return ret;
                    })
                ).asObservable();


            /**
             * subscribe to the changeEvent-stream so it detects changed if it has subscribers
             */
            const changeEvents$ = this.collection.docChanges$
                .pipe(
                    tap(() => _ensureEqual(this)),
                    filter(() => false)
                );

            this._$ =
                merge(
                    results$,
                    changeEvents$
                );
        }
        return this._$;
    }

    /**
     * Execute the query
     * To have an easier implementations,
     * just subscribe and use the first result
     * @return {Promise<RxDocument|RxDocument[]>} found documents
     */
    async exec() {
        /**
         * run _ensureEqual() here,
         * this will make sure that errors in the query which throw inside of pouchdb,
         * will be thrown at this execution context
         */
        return _ensureEqual(this)
            .then(() => this.$
                .pipe(
                    first()
                ).toPromise());
    }

    toJSON() {
        if (this._toJSON) return this._toJSON;

        const primPath = this.collection.schema.primaryPath;

        const json = {
            selector: this.mquery._conditions
        };

        const options = clone(this.mquery.options);

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
        }

        if (options.limit) {
            if (typeof options.limit !== 'number') {
                throw RxError.newRxTypeError('QU2', {
                    limit: options.limit
                });
            }
            json.limit = options.limit;
        }

        if (options.skip) {
            if (typeof options.skip !== 'number') {
                throw RxError.newRxTypeError('QU3', {
                    skip: options.skip
                });
            }
            json.skip = options.skip;
        }

        // strip empty selectors
        Object
            .entries(json.selector)
            .filter(([, v]) => typeof v === 'object')
            .filter(([, v]) => v !== null)
            .filter(([, v]) => !Array.isArray(v))
            .filter(([, v]) => Object.keys(v).length === 0)
            .forEach(([k]) => delete json.selector[k]);

        // primary swap
        if (
            primPath !== '_id' &&
            json.selector[primPath]
        ) {
            // selector
            json.selector._id = json.selector[primPath];
            delete json.selector[primPath];
        }

        // if no selector is used, pouchdb has a bug, so we add a default-selector
        if (Object.keys(json.selector).length === 0) {
            json.selector = {
                _id: {}
            };
        }

        this._toJSON = json;
        return this._toJSON;
    }

    /**
     * get the key-compression version of this query
     * @return {{selector: {}, sort: []}} compressedQuery
     */
    keyCompress() {
        if (!this.collection.schema.doKeyCompression()) {
            return this.toJSON();
        } else {
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
     * regex cannot run on primary _id
     * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
     */
    regex(params) {
        const clonedThis = this._clone();

        if (this.mquery._path === this.collection.schema.primaryPath) {
            throw RxError.newRxError('QU4', {
                path: this.mquery._path
            });
        }
        clonedThis.mquery.regex(params);

        return _tunnelQueryCache(clonedThis);
    }

    /**
     * make sure it searches index because of pouchdb-find bug
     * @link https://github.com/nolanlawson/pouchdb-find/issues/204
     */
    sort(params) {
        const clonedThis = this._clone();

        // workarround because sort wont work on unused keys
        if (typeof params !== 'object') {
            const checkParam = params.charAt(0) === '-' ? params.substring(1) : params;
            if (!clonedThis.mquery._conditions[checkParam])
                _sortAddToIndex(checkParam, clonedThis);
        } else {
            Object.keys(params)
                .filter(k => !clonedThis.mquery._conditions[k] || !clonedThis.mquery._conditions[k].$gt)
                .forEach(k => _sortAddToIndex(k, clonedThis));
        }
        clonedThis.mquery.sort(params);
        return _tunnelQueryCache(clonedThis);
    }

    limit(amount) {
        if (this.op === 'findOne')
            throw RxError.newRxError('QU6');
        else {
            const clonedThis = this._clone();
            clonedThis.mquery.limit(amount);
            return _tunnelQueryCache(clonedThis);
        }
    }
}

function _getDefaultQuery(collection) {
    return {
        [collection.schema.primaryPath]: {}
    };
}

/**
 * run this query through the QueryCache
 * @return {RxQuery} can be this or another query with the equal state
 */
function _tunnelQueryCache(rxQuery) {
    return rxQuery.collection._queryCache.getByQuery(rxQuery);
}

/**
 * tunnel the proto-functions of mquery to RxQuery
 * @param  {any} rxQueryProto    [description]
 * @param  {string[]} mQueryProtoKeys [description]
 * @return {void}                 [description]
 */
function protoMerge(rxQueryProto, mQueryProtoKeys) {
    mQueryProtoKeys
        .filter(attrName => !attrName.startsWith('_'))
        .filter(attrName => !rxQueryProto[attrName])
        .forEach(attrName => {
            rxQueryProto[attrName] = function(p1) {
                const clonedThis = this._clone();
                clonedThis.mquery[attrName](p1);
                return _tunnelQueryCache(clonedThis);
            };
        });
}

let protoMerged = false;
export function create(op, queryObj, collection) {
    // checks
    if (queryObj && typeof queryObj !== 'object') {
        throw RxError.newRxTypeError('QU7', {
            queryObj
        });
    }
    if (Array.isArray(queryObj)) {
        throw RxError.newRxTypeError('QU8', {
            queryObj
        });
    }


    let ret = new RxQuery(op, queryObj, collection);
    // ensure when created with same params, only one is created
    ret = _tunnelQueryCache(ret);

    if (!protoMerged) {
        protoMerged = true;
        protoMerge(Object.getPrototypeOf(ret), Object.getOwnPropertyNames(ret.mquery.__proto__));
    }

    runPluginHooks('createRxQuery', ret);
    return ret;
}

/**
 * throws an error that says that the key is not in the schema
 */
function _throwNotInSchema(key) {
    throw RxError.newRxError('QU5', {
        key
    });
}

/**
 * adds the field of 'sort' to the search-index
 * @link https://github.com/nolanlawson/pouchdb-find/issues/204
 */
function _sortAddToIndex(checkParam, clonedThis) {
    const schemaObj = clonedThis.collection.schema.getSchemaByObjectPath(checkParam);
    if (!schemaObj) _throwNotInSchema(checkParam);


    switch (schemaObj.type) {
        case 'integer':
            // TODO change back to -Infinity when issue resolved
            // @link https://github.com/pouchdb/pouchdb/issues/6454
            clonedThis.mquery.where(checkParam).gt(-9999999999999999999999999999); // -Infinity does not work since pouchdb 6.2.0
            break;
        case 'string':
            /**
             * strings need an empty string, see
             * @link https://github.com/pubkey/rxdb/issues/585
             */
            clonedThis.mquery.where(checkParam).gt('');
            break;
        default:
            clonedThis.mquery.where(checkParam).gt(null);
            break;
    }
}

/**
 * check if the current results-state is in sync with the database
 * @return {Boolean} false if not which means it should re-execute
 */
function _isResultsInSync(rxQuery) {
    if (rxQuery._latestChangeEvent >= rxQuery.collection._changeEventBuffer.counter)
        return true;
    else return false;
}


/**
 * wraps __ensureEqual()
 * to ensure it does not run in parallel
 */
function _ensureEqual(rxQuery) {
    rxQuery._ensureEqualQueue = rxQuery._ensureEqualQueue
        .then(() => new Promise(res => setTimeout(res, 0)))
        .then(() => __ensureEqual(rxQuery))
        .then(ret => {
            return new Promise(res => setTimeout(res, 0))
                .then(() => ret);
        });
    return rxQuery._ensureEqualQueue;
}

/**
 * ensures that the results of this query is equal to the results which a query over the database would give
 * @return {Promise<boolean>|boolean} true if results have changed
 */
function __ensureEqual(rxQuery) {
    if (rxQuery.collection.database.destroyed) return false; // db is closed
    if (_isResultsInSync(rxQuery)) return false; // nothing happend

    let ret = false;
    let mustReExec = false; // if this becomes true, a whole execution over the database is made
    if (rxQuery._latestChangeEvent === -1) mustReExec = true; // have not executed yet -> must run

    /**
     * try to use the queryChangeDetector to calculate the new results
     */
    if (!mustReExec) {
        const missedChangeEvents = rxQuery.collection._changeEventBuffer.getFrom(rxQuery._latestChangeEvent + 1);
        if (missedChangeEvents === null) {
            // changeEventBuffer is of bounds -> we must re-execute over the database
            mustReExec = true;
        } else {
            rxQuery._latestChangeEvent = rxQuery.collection._changeEventBuffer.counter;
            const runChangeEvents = rxQuery.collection._changeEventBuffer.reduceByLastOfDoc(missedChangeEvents);
            const changeResult = rxQuery._queryChangeDetector.runChangeDetection(runChangeEvents);

            if (!Array.isArray(changeResult) && changeResult) {
                // could not calculate the new results, execute must be done
                mustReExec = true;
            }
            if (Array.isArray(changeResult) && !deepEqual(changeResult, rxQuery._resultsData)) {
                // we got the new results, we do not have to re-execute, mustReExec stays false
                ret = true; // true because results changed
                rxQuery._setResultData(changeResult);
            }
        }
    }

    // oh no we have to re-execute the whole query over the database
    if (mustReExec) {
        // counter can change while _execOverDatabase() is running so we save it here
        const latestAfter = rxQuery.collection._changeEventBuffer.counter;

        return rxQuery._execOverDatabase()
            .then(newResultData => {
                rxQuery._latestChangeEvent = latestAfter;
                if (!deepEqual(newResultData, rxQuery._resultsData)) {
                    ret = true; // true because results changed
                    rxQuery._setResultData(newResultData);
                }
                return ret;
            });
    }
    return ret; // true if results have changed
}



export function isInstanceOf(obj) {
    return obj instanceof RxQuery;
}

export default {
    create,
    RxQuery,
    isInstanceOf
};
