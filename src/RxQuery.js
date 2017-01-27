/**
 * this is the query-builder
 * it basically uses mquery with a few overwrites
 */

import {
    default as mquery
} from './mquery/mquery';
import * as util from './util';
import * as RxDocument from './RxDocument';

const defaultQuery = {
    _id: {}
};


class RxQuery {
    constructor(queryObj, collection) {
        this.collection = collection;

        this.defaultQuery = false;
        if (!queryObj ||
            (
                Object.keys(queryObj).length === 0 &&
                !Array.isArray(queryObj)
            )
        ) {
            queryObj = defaultQuery;
            this.defaultQuery = true;
        }

        this.mquery = mquery(queryObj);

        // merge mquery-prototype functions to this
        const mquery_proto = Object.getPrototypeOf(this.mquery);
        Object.keys(mquery_proto).forEach(attrName => {

            if (['select'].includes(attrName)) return;

            // only param1 is tunneled here on purpose so no callback-call can be done
            this[attrName] = param1 => {
                this.mquery[attrName](param1);
                return this;
            };
        });


        // overwrites

        /**
         * make sure it searches index because of pouchdb-find bug
         * @link https://github.com/nolanlawson/pouchdb-find/issues/204
         */
        this.sort = params => {

            // workarround because sort wont work on unused keys
            if (typeof params !== 'object')
                this.mquery.where(params).gt(null);
            else
                Object.keys(params).map(k => this.mquery.where(k).gt(null));

            this.mquery.sort(params);
            return this;
        };

        /**
         * regex cannot run on primary _id
         * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
         */
        this.regex = params => {
            if (this.mquery._path == this.collection.schema.primaryPath)
                throw new Error(`You cannot use .regex() on the primary field '${this.mquery._path}'`);

            this.mquery.regex(params);
            return this;
        };


    }

    // observe the result of this query
    get $() {
        if (!this._subject) {
            this._subject = new util.Rx.BehaviorSubject(null);
            this._obsRunning = false;
            const collection$ = this.collection.$
                .filter(cEvent => ['RxCollection.insert', 'RxDocument.save'].includes(cEvent.data.op))
                .startWith(1)
                .filter(x => !this._obsRunning)
                .do(x => this._obsRunning = true)
                .mergeMap(async(cEvent) => {
                    const docs = await this.collection._pouchFind(this);
                    return docs;
                })
                .do(x => this._obsRunning = false)
                .distinctUntilChanged((prev, now) => {
                    return util.fastUnsecureHash(prev) == util.fastUnsecureHash(now);
                })
                .map(docs => RxDocument.createAr(this.collection, docs, this.toJSON()))
                .do(docs => this._subject.next(docs))
                .map(x => '');

            this._observable$ = util.Rx.Observable.merge(
                    this._subject,
                    collection$
                )
                .filter(x => (typeof x != 'string' || x != ''));
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
            delete json.selector[primPath];
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
            .keyCompressor
            .compressQuery(this.toJSON());
    }

}

export function create(queryObj = defaultQuery, collection) {
    if (Array.isArray(queryObj)) // TODO should typecheck be done here ?
        throw new TypeError('query cannot be an array');

    return new RxQuery(queryObj, collection);
}
