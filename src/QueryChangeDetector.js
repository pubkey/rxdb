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
    collate
} from 'pouchdb-collate';

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
     * @param {ChangeEvent[]} changeEvents
     * @return {boolean|Object[]} true if mustReExec, false if no change, array if calculated new results
     */
    runChangeDetection(changeEvents) {
        if (changeEvents.length == 0) return false;
        if (!this.changeDetectionSupported()) return true;

        const options = this.query.toJSON();
        let resultsData = this.query._resultsData;
        let changed = false;

        for (let i = 0; i < changeEvents.length; i++) {
            const changeEvent = changeEvents[i];
            const res = this.handleSingleChange(resultsData, changeEvent);
            if (Array.isArray(res)) {
                changed = true;
                resultsData = res;
            } else if (res) return true;
        }
        if (!changed) return false;
        else return resultsData;
    }

    /**
     * handle a single ChangeEvent and try to calculate the new results
     * @param {Object[]} resultsData of previous results
     * @param {ChangeEvent} changeEvent
     * @return {boolean|Object[]} true if mustReExec, false if no change, array if calculated new results
     */
    handleSingleChange(resultsData, changeEvent) {
        let results = resultsData.splice(0); // copy to stay immutable
        const options = this.query.toJSON();
        const docData = changeEvent.data.v;
        const wasDocInResults = this.isDocInResultData(docData, resultsData);
        const doesMatchNow = this.doesDocMatchQuery(docData);
        const isFilled = resultsData.length >= options.limit;
        const removeIt = wasDocInResults && !doesMatchNow;

        // TODO write tests for this
        if (changeEvent.data.op == 'REMOVE') {
            if (options.skip) {
                const sortBefore = this._isSortedBefore(docData, results[0]);
                const sortAfter = this._isSortedBefore(results[results.length - 1], docData);

                // R1
                if (!doesMatchNow)
                    return false;

                // R2
                if (doesMatchNow && sortBefore && !isFilled) {
                    results.shift();
                    return results;
                }

                // R3
                if (doesMatchNow && wasDocInResults && !isFilled) {
                    results = results.filter(doc => doc[this.primaryKey] != docData[this.primaryKey]);
                    return results;
                }

                // R4
                if (doesMatchNow && sortAfter)
                    return false;

            }
        } else {

            /**
             * doc does still not match
             */
            if (!options.skip && !options.limit && !wasDocInResults && !doesMatchNow)
                return false;


        }

        // if no optimisation-algo matches, return mustReExec:true
        return true;
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
     * checks if the newDocLeft would be placed before docDataRight
     * when the query would be reExecuted
     * @param  {Object} docDataNew
     * @param  {Object} docDataIs
     * @return {boolean} true if before, false if after
     */
    _isSortedBefore(docDataLeft, docDataRight) {
        const options = this.query.toJSON();
        const inMemoryFields = Object.keys(this.query.toJSON().selector);
        const swapedLeft = this.query.collection.schema.swapPrimaryToId(docDataLeft);
        const swapedRight = this.query.collection.schema.swapPrimaryToId(docDataRight);
        const rows = [
            swapedLeft,
            swapedRight
        ].map(doc => ({
            id: doc._id,
            doc
        }));
        const sortedRows = inMemoryFilter(
            rows, {
                selector: massageSelector(this.query.toJSON().selector),
                sort: options.sort
            },
            inMemoryFields
        );
        return sortedRows[0].id == swapedLeft._id;
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
