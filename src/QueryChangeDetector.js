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
import {
    default as objectPath
} from 'object-path';

const DEBUG = true;

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
        const wasDocInResults = this._isDocInResultData(docData, resultsData);
        const doesMatchNow = this.doesDocMatchQuery(docData);
        const isFilled = !options.limit || resultsData.length >= options.limit;
        const removeIt = wasDocInResults && !doesMatchNow;


        let _sortAfter = null;
        const sortAfter = () => {
            if (_sortAfter === null)
                _sortAfter = this._isSortedBefore(results[results.length - 1], docData);
            return _sortAfter;
        };

        let _sortBefore = null;
        const sortBefore = () => {
            if (_sortBefore === null)
                _sortBefore = this._isSortedBefore(docData, results[0]);
            return _sortBefore;
        };

        let _sortFieldChanged = null;
        const sortFieldChanged = () => {
            if (_sortFieldChanged === null) {
                const docBefore = results.find(doc => doc[this.primaryKey] != docData[this.primaryKey]);
                _sortFieldChanged = this._sortFieldChanged(docBefore, docData);
            }
            return _sortFieldChanged;
        };

        if (changeEvent.data.op == 'REMOVE') {

            // R1 (never matched)
            if (!doesMatchNow) {
                DEBUG && console.log('QCD: R1');
                return false;
            }

            // R2 sorted before got removed but results not filled
            if (options.skip && doesMatchNow && sortBefore() && !isFilled) {
                DEBUG && console.log('QCD: R2');
                results.shift();
                return results;
            }

            // R3 (was in results and got removed)
            if (doesMatchNow && wasDocInResults && !isFilled) {
                DEBUG && console.log('QCD: R3');
                results = results.filter(doc => doc[this.primaryKey] != docData[this.primaryKey]);
                return results;
            }

            // R4 matching but after results got removed
            if (doesMatchNow && options.limit && sortAfter()) {
                DEBUG && console.log('QCD: R4');
                return false;
            }

        } else {

            // U1 doc not matched and also not matches now
            if (!options.skip && !options.limit && !wasDocInResults && !doesMatchNow) {
                DEBUG && console.log('QCD: U1');
                return false;
            }

            // U2 still matching -> only resort
            if (!options.skip && !options.limit && wasDocInResults && doesMatchNow) {
                DEBUG && console.log('QCD: U2');

                results = results.filter(doc => doc[this.primaryKey] != docData[this.primaryKey]);
                results.push(docData);

                if (sortFieldChanged()) {
                    DEBUG && console.log('QCD: U2 resort');
                    return this._resortDocData(results);
                } else {
                    DEBUG && console.log('QCD: U2 no-resort');
                    return results;
                }
            }

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
    _isDocInResultData(docData, resultData) {
        const primaryPath = this.query.collection.schema.primaryPath;
        const first = resultData.find(doc => doc[primaryPath] == docData[primaryPath]);
        return !!first;
    }


    /**
     * checks if the sort-relevant fields have changed
     * @param  {object} docDataBefore
     * @param  {object} docDataAfter
     * @return {boolean}
     */
    _sortFieldChanged(docDataBefore, docDataAfter) {
        const options = this.query.toJSON();
        const sortFields = options.sort.map(sortObj => Object.keys(sortObj).pop());

        let changed = false;
        sortFields.find(field => {
            const beforeData = objectPath.get(docDataBefore, field);
            const afterData = objectPath.get(docDataAfter, field);
            if (beforeData != afterData) {
                changed = true;
                return true;
            } else return false;
        });
        return changed;
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

    /**
     * reruns the sort on the given resultsData
     * @param  {object[]} resultsData
     * @return {object[]}
     */
    _resortDocData(resultsData) {
        const rows = resultsData.map(doc => {
            return {
                doc: this.query.collection.schema.swapPrimaryToId(doc)
            };
        });
        const options = this.query.toJSON();
        const inMemoryFields = Object.keys(this.query.toJSON().selector);

        // TODO use createFieldSorter
        const sortedRows = filterInMemoryFields(
            rows, {
                selector: massageSelector(this.query.toJSON().selector),
                sort: options.sort
            },
            inMemoryFields
        );
        const sortedDocs = sortedRows
            .map(row => row.doc)
            .map(doc => this.query.collection.schema.swapIdToPrimary(doc));
        return sortedDocs;
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
