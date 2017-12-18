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
import objectPath from 'object-path';

let DEBUG = false;
let ENABLED = false;

class QueryChangeDetector {
    constructor(query) {
        this.query = query;
        this.primaryKey = this.query.collection.schema.primaryPath;
    }

    /**
     * @param {ChangeEvent[]} changeEvents
     * @return {boolean|Object[]} true if mustReExec, false if no change, array if calculated new results
     */
    runChangeDetection(changeEvents) {
        if (changeEvents.length === 0) return false;
        if (!ENABLED) return true;

        let resultsData = this.query._resultsData;
        let changed = false;

        const found = changeEvents.find(changeEvent => {
            const res = this.handleSingleChange(resultsData, changeEvent);
            if (Array.isArray(res)) {
                changed = true;
                resultsData = res;
                return false;
            } else if (res) return true;
        });
        if (found) return true;
        if (!changed) return false;
        else return resultsData;
    }

    _debugMessage(key, changeEventData = {}, title = 'optimized') {
        console.dir({
            name: 'QueryChangeDetector',
            title,
            query: this.query.toString(),
            key,
            changeEventData
        });
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
        const isFilled = !options.limit || (options.limit && resultsData.length >= options.limit);
        const limitAndFilled = options.limit && resultsData.length >= options.limit;

        if (DEBUG) {
            console.log('QueryChangeDetector.handleSingleChange()'); // TODO this should not be an error
            this._debugMessage('start', changeEvent.data.v, 'handleSingleChange()');
            console.log('changeEvent.data:');
            console.dir(changeEvent.data);
            console.log('wasDocInResults: ' + wasDocInResults);
            console.log('doesMatchNow: ' + doesMatchNow);
            console.log('isFilled: ' + isFilled);
        }


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
                const docBefore = resultsData.find(doc => doc[this.primaryKey] === docData[this.primaryKey]);
                _sortFieldChanged = this._sortFieldChanged(docBefore, docData);
            }
            return _sortFieldChanged;
        };

        if (changeEvent.data.op === 'REMOVE') {
            // R1 (never matched)
            if (!doesMatchNow) {
                DEBUG && this._debugMessage('R1', docData);
                return false;
            }

            // R2 sorted before got removed but results not filled
            if (options.skip && doesMatchNow && sortBefore() && !isFilled) {
                DEBUG && this._debugMessage('R2', docData);
                results.shift();
                return results;
            }

            // R3 (was in results and got removed)
            if (doesMatchNow && wasDocInResults && !isFilled) {
                DEBUG && this._debugMessage('R3', docData);
                results = results.filter(doc => doc[this.primaryKey] !== docData[this.primaryKey]);
                return results;
            }
            // R3.1 was in results and got removed, no limit, no skip
            if (doesMatchNow && wasDocInResults && !options.limit && !options.skip) {
                DEBUG && this._debugMessage('R3.1', docData);
                results = results.filter(doc => doc[this.primaryKey] !== docData[this.primaryKey]);
                return results;
            }


            // R4 matching but after results got removed
            if (doesMatchNow && options.limit && sortAfter()) {
                DEBUG && this._debugMessage('R4', docData);
                return false;
            }
        } else {
            // U1 doc not matched and also not matches now
            if (!options.skip && !options.limit && !wasDocInResults && !doesMatchNow) {
                DEBUG && this._debugMessage('U1', docData);
                return false;
            }

            // U2 still matching -> only resort
            if (!options.skip && !options.limit && wasDocInResults && doesMatchNow) {
                // DEBUG && this._debugMessage('U2', docData);

                // replace but make sure its the same position
                const wasDoc = results.find(doc => doc[this.primaryKey] === docData[this.primaryKey]);
                const i = results.indexOf(wasDoc);
                results[i] = docData;

                if (sortFieldChanged()) {
                    DEBUG && this._debugMessage('U2 - resort', docData);
                    return this._resortDocData(results);
                } else {
                    DEBUG && this._debugMessage('U2 - no-resort', docData);
                    return results;
                }
            }


            // U3 not matched, but matches now, no.skip, limit < length
            if (!options.skip && !limitAndFilled && !wasDocInResults && doesMatchNow) {
                DEBUG && this._debugMessage('U3', docData);
                results.push(docData);

                //    console.log('U3: preSort:');
                //    console.dir(results);

                const sorted = this._resortDocData(results);
                //        console.log('U3: postSort:');
                //            console.dir(sorted);
                return sorted;
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
        docData = this.query.collection.schema.swapPrimaryToId(docData);
        const inMemoryFields = Object.keys(this.query.toJSON().selector);
        const retDocs = filterInMemoryFields(
            [{
                doc: docData
            }], {
                selector: massageSelector(this.query.toJSON().selector)
            },
            inMemoryFields
        );
        const ret = retDocs.length === 1;
        return ret;
    }

    /**
     * check if the document exists in the results data
     * @param {object} docData
     * @param {object[]} resultData
     */
    _isDocInResultData(docData, resultData) {
        const primaryPath = this.query.collection.schema.primaryPath;
        const first = resultData.find(doc => doc[primaryPath] === docData[primaryPath]);
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
            if (beforeData !== afterData) {
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
        const swappedLeft = this.query.collection.schema.swapPrimaryToId(docDataLeft);
        const swappedRight = this.query.collection.schema.swapPrimaryToId(docDataRight);
        const rows = [
            swappedLeft,
            swappedRight
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
        return sortedRows[0].id === swappedLeft._id;
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


export function enableDebugging() {
    console.log('QueryChangeDetector.enableDebugging()');
    DEBUG = true;
};

export function enable(set = true) {
    console.log(`QueryChangeDetector.enableDebugging(${set})`);
    ENABLED = set;
}

/**
 * @param  {RxQuery} query
 * @return {QueryChangeDetector}
 */
export function create(query) {
    const ret = new QueryChangeDetector(query);
    return ret;
}

export default {
    create,
    enableDebugging,
    enable
};
