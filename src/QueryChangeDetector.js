/**
 * if a query is observed and a changeEvent comes in,
 * the QueryChangeDetector tries to execute the changeEvent-delta on the exisiting query-results
 * or tells the query it should re-exec on the database if previous not possible.
 *
 * This works equal to meteors oplog-observe-driver
 * @link https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md
 */

import {
    default as inMemoryFilter
} from 'pouchdb-find/lib/adapters/local/find/in-memory-filter.js';
import {
    massageSelector
} from 'pouchdb-find/lib/adapters/local/utils.js';
import {
    default as clone
} from 'clone';

class QueryChangeDetector {

    constructor(query) {
        this.query = query;
        this.primaryKey = this.query.collection.schema.primaryPath;
    }


    /**
     * the query-change-detection does not work is the is a 'hidden state'
     * in the database, therefore the new result-set cannot be calculated without
     * querying the database
     * @return {boolean}
     */
    changeDetectionSupported() {
        const options = this.query.toJSON();

        if (this.query.disableQueryChangeDetection)
            return false;

        return true;
    }

    /**
     * @param {Object[]} resultsData of previous results
     * @param {ChangeEvent[]} changeEvents
     * @return {boolean|Object[]} true if mustReExec, false if no change, array if calculated new results
     */
    runChangeDetection(resultsData, changeEvents) {
        if (changeEvents.length == 0) return false;
        if (!this.changeDetectionSupported()) return true;

        const options = this.query.toJSON();
        const previousResults = this.query._resultsData;
        let results = clone(this.query._resultsData);
        let ret = false;

        for (let i = 0; i < changeEvents.length; i++) {
            const changeEvent = changeEvents[i];
            const docData = changeEvent.data.v;
            const wasDocInResults = this.isDocInResultData(docData, previousResults);
            const doesMatchNow = this.doesDocMatchQuery(docData);
            const isFilled = results.length >= options.limit;
            const removeIt = wasDocInResults && !doesMatchNow;

            /**
             * doc does still not match
             * -> if newDoc sorts inside of
             */
            //            if (!wasDocInResults && !doesMatchNow) continue;


            // TODO write tests for this
            if (changeEvent.data.op == 'REMOVE') {
                if (options.skip) {
                    const sortBefore = this._isSortedBefore(docData, results[0]);
                    const sortAfter = this._isSortedBefore(results[results.length - 1], docData);
                    if (!doesMatchNow)
                        continue;

                    if (doesMatchNow && sortBefore && !isFilled) {
                        results.shift();
                        continue;
                    }
                    if (doesMatchNow && wasDocInResults && !isFilled) {
                        results = results.filter(doc => doc[this.primaryKey] != docData[this.primaryKey]);
                        continue;
                    }
                    if (doesMatchNow && sortAfter)
                        continue;

                }
            }


            return true;
        }


    }

    /**
     * check if the document matches the query
     * @param {object} docData
     * @return {boolean}
     */
    doesDocMatchQuery(docData) {
        const inMemoryFields = Object.keys(this.query.toJSON().selector);
        const retDocs = inMemoryFilter(
            [{
                doc: docData
            }], {
                selector: massageSelector(this.query.toJSON().selector)
            },
            inMemoryFields
        );
        return retDocs.length == 1;
    }

    /**
     * check if the document exists in the results data
     * @param {object} docData
     * @param {object[]} resultData
     */
    isDocInResultData(docData, resultData) {
        const primaryPath = this.query.collection.schema.primaryPath;
        const first = resultData.find(doc => doc[primaryPath] == docData[primaryPath]);
        return !!first;
    }

    /**
     * checks if the newDocData would be placed before of after the isDocData
     * when the query would be reExecuted
     * @param  {Object} docDataNew
     * @param  {Object} docDataIs
     * @return {boolean} true if before, false if after
     */
    _isSortedBefore(docDataNew, docDataIs) {

    }

    _addMatching(docData, resultData) {

    }

    _removeNonMatching(docData, resultData) {

    }



}


/**
 * @param  {RxQuery} query
 * @return {QueryChangeDetector}
 */
export function create(query) {
    const ret = new QueryChangeDetector(query);
    return ret;
}
