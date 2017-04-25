/**
 * if a query is observed and a changeEvent comes in,
 * the QueryChangeDetector tries to execute the changeEvent-delta on the exisiting query-results
 * or tells the query it should re-exec on the database if previous not possible.
 *
 * This works equal to meteors oplog-observe-driver
 * @link https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md
 */

import {
    filterInMemoryFields,
    massageSelector
} from 'pouchdb-selector-core';
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
     * TODO is this needed?
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

        let results = resultsData.slice(0); // copy to stay immutable
        const options = this.query.toJSON();
        const docData = changeEvent.data.v;
        const wasDocInResults = this.isDocInResultData(docData, resultsData);
        const doesMatchNow = this.doesDocMatchQuery(docData);
        const isFilled = !options.limit || resultsData.length >= options.limit;
        const removeIt = wasDocInResults && !doesMatchNow;


        if (changeEvent.data.op == 'REMOVE') {

            // R1 (never matched)
            if (!doesMatchNow)
                return false;

            // R3 (was in results and got removed)
            if (doesMatchNow && wasDocInResults && !isFilled) {
                results = results.filter(doc => doc[this.primaryKey] != docData[this.primaryKey]);
                return results;
            }

            if (options.skip) {
                const sortBefore = this._isSortedBefore(docData, results[0]);
                const sortAfter = this._isSortedBefore(results[results.length - 1], docData);

                // R2
                if (doesMatchNow && sortBefore && !isFilled) {
                    results.shift();
                    return results;
                }

                // R4 TODO test
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
     * TODO this can be done better when PR is merged:
     * @link https://github.com/pouchdb/pouchdb/pull/6422
     * @param {object} docData
     * @return {boolean}
     */
    doesDocMatchQuery(docData) {
        const inMemoryFields = Object.keys(this.query.toJSON().selector);
        const retDocs = filterInMemoryFields(
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
     * TODO this can be done better when PR is merged:
     * @link https://github.com/pouchdb/pouchdb/pull/6422
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

        // TODO use createFieldSorter
        const sortedRows = filterInMemoryFields(
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
