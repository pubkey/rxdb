'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.enableDebugging = enableDebugging;
exports.enable = enable;
exports.create = create;

var _pouchdbSelectorCore = require('pouchdb-selector-core');

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * if a query is observed and a changeEvent comes in,
 * the QueryChangeDetector tries to execute the changeEvent-delta on the exisiting query-results
 * or tells the query it should re-exec on the database if previous not possible.
 *
 * This works equal to meteors oplog-observe-driver
 * @link https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md
 */

var DEBUG = false;
var ENABLED = false;

var QueryChangeDetector = function () {
    function QueryChangeDetector(query) {
        (0, _classCallCheck3['default'])(this, QueryChangeDetector);

        this.query = query;
        this.primaryKey = this.query.collection.schema.primaryPath;
    }

    /**
     * @param {ChangeEvent[]} changeEvents
     * @return {boolean|Object[]} true if mustReExec, false if no change, array if calculated new results
     */


    (0, _createClass3['default'])(QueryChangeDetector, [{
        key: 'runChangeDetection',
        value: function runChangeDetection(changeEvents) {
            var _this = this;

            if (changeEvents.length === 0) return false;
            if (!ENABLED) return true;

            var resultsData = this.query._resultsData;
            var changed = false;

            var found = changeEvents.find(function (changeEvent) {
                var res = _this.handleSingleChange(resultsData, changeEvent);
                if (Array.isArray(res)) {
                    changed = true;
                    resultsData = res;
                    return false;
                } else if (res) return true;
            });
            if (found) return true;
            if (!changed) return false;else return resultsData;
        }
    }, {
        key: '_debugMessage',
        value: function _debugMessage(key) {
            var changeEventData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var title = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'optimized';

            console.dir({
                name: 'QueryChangeDetector',
                title: title,
                query: this.query.toString(),
                key: key,
                changeEventData: changeEventData
            });
        }

        /**
         * handle a single ChangeEvent and try to calculate the new results
         * @param {Object[]} resultsData of previous results
         * @param {ChangeEvent} changeEvent
         * @return {boolean|Object[]} true if mustReExec, false if no change, array if calculated new results
         */

    }, {
        key: 'handleSingleChange',
        value: function handleSingleChange(resultsData, changeEvent) {
            var _this2 = this;

            var results = resultsData.slice(0); // copy to stay immutable
            var options = this.query.toJSON();
            var docData = changeEvent.data.v;
            var wasDocInResults = this._isDocInResultData(docData, resultsData);
            var doesMatchNow = this.doesDocMatchQuery(docData);
            var isFilled = !options.limit || options.limit && resultsData.length >= options.limit;
            var limitAndFilled = options.limit && resultsData.length >= options.limit;

            if (DEBUG) {
                console.log('QueryChangeDetector.handleSingleChange()'); // TODO this should not be an error
                this._debugMessage('start', changeEvent.data.v, 'handleSingleChange()');
                console.log('changeEvent.data:');
                console.dir(changeEvent.data);
                console.log('wasDocInResults: ' + wasDocInResults);
                console.log('doesMatchNow: ' + doesMatchNow);
                console.log('isFilled: ' + isFilled);
            }

            var _sortAfter = null;
            var sortAfter = function sortAfter() {
                if (_sortAfter === null) _sortAfter = _this2._isSortedBefore(results[results.length - 1], docData);
                return _sortAfter;
            };

            var _sortBefore = null;
            var sortBefore = function sortBefore() {
                if (_sortBefore === null) _sortBefore = _this2._isSortedBefore(docData, results[0]);
                return _sortBefore;
            };

            var _sortFieldChanged = null;
            var sortFieldChanged = function sortFieldChanged() {
                if (_sortFieldChanged === null) {
                    var docBefore = resultsData.find(function (doc) {
                        return doc[_this2.primaryKey] === docData[_this2.primaryKey];
                    });
                    _sortFieldChanged = _this2._sortFieldChanged(docBefore, docData);
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
                    results = results.filter(function (doc) {
                        return doc[_this2.primaryKey] !== docData[_this2.primaryKey];
                    });
                    return results;
                }
                // R3.1 was in results and got removed, no limit, no skip
                if (doesMatchNow && wasDocInResults && !options.limit && !options.skip) {
                    DEBUG && this._debugMessage('R3.1', docData);
                    results = results.filter(function (doc) {
                        return doc[_this2.primaryKey] !== docData[_this2.primaryKey];
                    });
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
                    var wasDoc = results.find(function (doc) {
                        return doc[_this2.primaryKey] === docData[_this2.primaryKey];
                    });
                    var i = results.indexOf(wasDoc);
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

                    var sorted = this._resortDocData(results);
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

    }, {
        key: 'doesDocMatchQuery',
        value: function doesDocMatchQuery(docData) {
            docData = this.query.collection.schema.swapPrimaryToId(docData);
            var inMemoryFields = Object.keys(this.query.toJSON().selector);
            var retDocs = (0, _pouchdbSelectorCore.filterInMemoryFields)([{
                doc: docData
            }], {
                selector: (0, _pouchdbSelectorCore.massageSelector)(this.query.toJSON().selector)
            }, inMemoryFields);
            var ret = retDocs.length === 1;
            return ret;
        }

        /**
         * check if the document exists in the results data
         * @param {object} docData
         * @param {object[]} resultData
         */

    }, {
        key: '_isDocInResultData',
        value: function _isDocInResultData(docData, resultData) {
            var primaryPath = this.query.collection.schema.primaryPath;
            var first = resultData.find(function (doc) {
                return doc[primaryPath] === docData[primaryPath];
            });
            return !!first;
        }

        /**
         * checks if the sort-relevant fields have changed
         * @param  {object} docDataBefore
         * @param  {object} docDataAfter
         * @return {boolean}
         */

    }, {
        key: '_sortFieldChanged',
        value: function _sortFieldChanged(docDataBefore, docDataAfter) {
            var options = this.query.toJSON();
            var sortFields = options.sort.map(function (sortObj) {
                return Object.keys(sortObj).pop();
            });

            var changed = false;
            sortFields.find(function (field) {
                var beforeData = _objectPath2['default'].get(docDataBefore, field);
                var afterData = _objectPath2['default'].get(docDataAfter, field);
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

    }, {
        key: '_isSortedBefore',
        value: function _isSortedBefore(docDataLeft, docDataRight) {
            var options = this.query.toJSON();
            var inMemoryFields = Object.keys(this.query.toJSON().selector);
            var swappedLeft = this.query.collection.schema.swapPrimaryToId(docDataLeft);
            var swappedRight = this.query.collection.schema.swapPrimaryToId(docDataRight);
            var rows = [swappedLeft, swappedRight].map(function (doc) {
                return {
                    id: doc._id,
                    doc: doc
                };
            });

            // TODO use createFieldSorter
            var sortedRows = (0, _pouchdbSelectorCore.filterInMemoryFields)(rows, {
                selector: (0, _pouchdbSelectorCore.massageSelector)(this.query.toJSON().selector),
                sort: options.sort
            }, inMemoryFields);
            return sortedRows[0].id === swappedLeft._id;
        }

        /**
         * reruns the sort on the given resultsData
         * @param  {object[]} resultsData
         * @return {object[]}
         */

    }, {
        key: '_resortDocData',
        value: function _resortDocData(resultsData) {
            var _this3 = this;

            var rows = resultsData.map(function (doc) {
                return {
                    doc: _this3.query.collection.schema.swapPrimaryToId(doc)
                };
            });
            var options = this.query.toJSON();
            var inMemoryFields = Object.keys(this.query.toJSON().selector);

            // TODO use createFieldSorter
            var sortedRows = (0, _pouchdbSelectorCore.filterInMemoryFields)(rows, {
                selector: (0, _pouchdbSelectorCore.massageSelector)(this.query.toJSON().selector),
                sort: options.sort
            }, inMemoryFields);
            var sortedDocs = sortedRows.map(function (row) {
                return row.doc;
            }).map(function (doc) {
                return _this3.query.collection.schema.swapIdToPrimary(doc);
            });
            return sortedDocs;
        }
    }]);
    return QueryChangeDetector;
}();

function enableDebugging() {
    console.log('QueryChangeDetector.enableDebugging()');
    DEBUG = true;
};

function enable() {
    var set = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

    console.log('QueryChangeDetector.enableDebugging(' + set + ')');
    ENABLED = set;
}

/**
 * @param  {RxQuery} query
 * @return {QueryChangeDetector}
 */
function create(query) {
    var ret = new QueryChangeDetector(query);
    return ret;
}

exports['default'] = {
    create: create,
    enableDebugging: enableDebugging,
    enable: enable
};
