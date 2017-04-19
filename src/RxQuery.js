/**
 * this is the query-builder
 * it basically uses mquery with a few overwrites
 */

import {
    default as MQuery
} from './mquery/mquery';
import * as util from './util';
import * as RxDocument from './RxDocument';

const defaultQuery = {
    _id: {}
};


class RxQuery {
    constructor(queryObj = defaultQuery, collection, op) {
        this.op = op;
        this.collection = collection;

        this.defaultQuery = false;

        // force _id
        if (!queryObj._id)
            queryObj._id = {};

        this.mquery = new MQuery(queryObj);
    }

    // returns a clone of this RxQuery
    _clone() {
        const cloned = new RxQuery(defaultQuery, this.collection);
        cloned.mquery = this.mquery.clone();
        return cloned;
    }

    toString() {
        return JSON.stringify(this.mquery);
    }

    // observe the result of this query
    get $() {
        if (!this._subject) {
            this._subject = new util.Rx.BehaviorSubject(null);
            this._obsRunning = false;
            const collection$ = this.collection.$
                .filter(cEvent => ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op))
                .startWith(1)
                .filter(x => !this._obsRunning)
                .do(x => this._obsRunning = true)
                .mergeMap(async(cEvent) => {
                    const overwriteLimit = this.op === 'findOne' ? 1 : null;
                    const docs = await this.collection._pouchFind(this, overwriteLimit);
                    return docs;
                })
                .do(x => this._obsRunning = false)
                .distinctUntilChanged((prev, now) => {
                    return util.fastUnsecureHash(prev) == util.fastUnsecureHash(now);
                })
                .map(docs => this.collection._createDocuments(docs))
                .do(docs => this._subject.next(docs))
                .map(x => '');

            this._observable$ = util.Rx.Observable.merge(
                    this._subject,
                    collection$
                )
                .filter(x => (typeof x != 'string' || x != ''))
                .map(x => {
                    if (x === null) return null;
                    switch (this.op) {
                        case 'find':
                            return x;
                            break;
                        case 'findOne':
                            if (x.length === 0) return null;
                            return x[0];
                            break;
                    }
                });
        }
        return this._observable$;
    }


    toJSON() {
        const json = {
            selector: this.mquery._conditions
        };

        let options = this.mquery._optionsForExec();

        // sort
        if (options.sort) {
            const sortArray = [];
            Object.keys(options.sort).map(fieldName => {
                const dirInt = options.sort[fieldName];
                let dir = 'asc';
                if (dirInt == -1) dir = 'desc';
                const pushMe = {};
                // TODO run primary-swap somewhere else
                if (fieldName == this.collection.schema.primaryPath)
                    fieldName = '_id';

                pushMe[fieldName] = dir;
                sortArray.push(pushMe);
            });
            json.sort = sortArray;
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


        // primary swap
        if (
            this.collection.schema.primaryPath &&
            json.selector[this.collection.schema.primaryPath]
        ) {
            const primPath = this.collection.schema.primaryPath;

            // selector
            json.selector._id = json.selector[primPath];
            if(primPath !== '_id') delete json.selector[primPath]; 
        }

        return json;
    };

    /**
     * get the key-compression version of this query
     * @return {{selector: {}, sort: []}} compressedQuery
     */
    keyCompress() {
        return this
            .collection
            ._keyCompressor
            .compressQuery(this.toJSON());
    }

    /**
     * deletes all found documents
     * @return {Promise(RxDocument|RxDocument[])} promise with deleted documents
     */
    async remove() {
        const docs = await this.exec();
        if (Array.isArray(docs)) {
            await Promise.all(
                docs.map(doc => doc.remove())
            );
        } else {
            // via findOne()
            await docs.remove();
        }
        return docs;
    }

    /**
     * make sure it searches index because of pouchdb-find bug
     * @link https://github.com/nolanlawson/pouchdb-find/issues/204
     */
    sort(params) {
        // workarround because sort wont work on unused keys
        if (typeof params !== 'object') {
            const checkParam = params.charAt(0) == '-' ? params.substring(1) : params;
            if (!this.mquery._conditions[checkParam])
                this.mquery.where(checkParam).gt(null);
        } else {
            Object.keys(params)
                .filter(k => !this.mquery._conditions[k] || !this.mquery._conditions[k].$gt)
                .forEach(k => {
                    const schemaObj = this.collection.schema.getSchemaByObjectPath(k);
                    if (schemaObj.type == 'integer')
                        this.mquery.where(k).gt(-Infinity);
                    else this.mquery.where(k).gt(null);
                });
        }
        this.mquery.sort(params);
        return this;
    };

    /**
     * regex cannot run on primary _id
     * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
     */
    regex(params) {
        if (this.mquery._path == this.collection.schema.primaryPath)
            throw new Error(`You cannot use .regex() on the primary field '${this.mquery._path}'`);

        this.mquery.regex(params);
        return this;
    };

}


// tunnel the proto-functions of mquery to RxQuery
const protoMerge = function(rxQueryProto, mQueryProto) {
    Object.keys(mQueryProto)
        .filter(attrName => !attrName.startsWith('_'))
        .filter(attrName => !rxQueryProto[attrName])
        .forEach(attrName => {
            rxQueryProto[attrName] = function(p1) {
                this.mquery[attrName](p1);
                return this;
            };
        });
};

let protoMerged = false;
export function create(queryObj = defaultQuery, collection, op = 'find') {
    if (typeof queryObj !== 'object')
        throw new TypeError('query must be an object');
    if (Array.isArray(queryObj))
        throw new TypeError('query cannot be an array');

    const ret = new RxQuery(queryObj, collection, op);

    if (!protoMerged) {
        protoMerged = true;
        protoMerge(Object.getPrototypeOf(ret), Object.getPrototypeOf(ret.mquery));
    }

    return ret;
}
