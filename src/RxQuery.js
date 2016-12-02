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
        this.subject$;
        this.collectionSub$;

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
        Object.keys(mquery_proto).map(attrName => {
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
            Object.keys(params).map(k => this.mquery.where(k).gt(null));

            this.mquery.sort(params);
            return this;
        };


    }

    // observe the result of this query
    get $() {
        if (this.subject$) return this.subject$.asObservable();

        this.subject$ = new util.Rx.BehaviorSubject(null);
        this.refresh$(); // get init value
        this.collectionSub$ = this.collection.$
            .filter(c => this.subject$.observers.length > 0) // TODO replace with subject$.hasObservers() https://github.com/Reactive-Extensions/RxJS/issues/1364
            .filter(cEvent => ['RxCollection.insert', 'RxDocument.save'].includes(cEvent.data.op))
            .subscribe(cEvent => this.refresh$()); // TODO unsubscribe on destroy
        return this.$;
    }


    /**
     * regrap the result from the database
     * and save it to this.result
     */
    async refresh$() {
        if (this.refresh$_running) return;
        this.refresh$_running = true;

        const queryJSON = this.toJSON();
        const docs = await this.collection.pouch.find(queryJSON);
        const ret = RxDocument.createAr(this.collection, docs.docs, queryJSON);
        this.subject$.next(ret);

        this.refresh$_running = false;
    }


    toJSON() {
        const json = {
            selector: this.mquery._conditions
        };

        let options = this.mquery._optionsForExec();

        // select fields
        if (this.mquery._fields) {
            const fields = this.mquery._fieldsForExec();
            let useFields = Object.keys(fields)
                .filter(fieldName => fields[fieldName] == 1);

            useFields.push('_id');
            useFields.push('_rev');
            useFields = useFields.filter((elem, pos, arr) => arr.indexOf(elem) == pos); // unique
            json.fields = useFields;
        }

        // sort
        if (options.sort) {
            const sortArray = [];
            Object.keys(options.sort).map(fieldName => {
                const dirInt = options.sort[fieldName];
                let dir = 'asc';
                if (dirInt == -1) dir = 'desc';
                const pushMe = {};

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

}

export function create(queryObj = defaultQuery, collection) {
    if (Array.isArray(queryObj)) // TODO should typecheck be done here ?
        throw new TypeError('query cannot be an array');

    return new RxQuery(queryObj, collection);
}
