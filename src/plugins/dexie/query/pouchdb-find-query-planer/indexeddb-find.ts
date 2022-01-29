/**
 * Copied from
 * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-adapter-indexeddb/src/find.js
 */

/*
function idbError(callback: Function) {
    return function (evt: any) {
        let message = 'unknown_error';
        if (evt.target && evt.target.error) {
            message = evt.target.error.name || evt.target.error.message;
        }
        callback(new Error('Dexie.js IDB error: ' + message));
    };
}

function rawIndexFields(ddoc: any, viewName: string) {
    // fields are an array of either the string name of the field, or a key value
    const fields = ddoc.views[viewName].options &&
        ddoc.views[viewName].options.def &&
        ddoc.views[viewName].options.def.fields || [];

    // Either ['foo'] or [{'foo': 'desc'}]
    return fields.map(function (field: any) {
        if (typeof field === 'string') {
            return field;
        } else {
            return Object.keys(field)[0];
        }
    });
}
*/

/*
function naturalIndexName(fields: string[]) {
    return '_find_idx/' + fields.join('/');
}
*/

//const DOC_STORE = 'docs';
const IDB_NULL = Number.MIN_SAFE_INTEGER;
const IDB_FALSE = Number.MIN_SAFE_INTEGER + 1;
const IDB_TRUE = Number.MIN_SAFE_INTEGER + 2;

// Adapted from
// https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-find/src/adapters/local/find/query-planner.js#L20-L24
// This could change / improve in the future?
const COUCH_COLLATE_LO = null;
const COUCH_COLLATE_HI = '\uffff'; // actually used as {"\uffff": {}}

// Adapted from: https://www.w3.org/TR/IndexedDB/#compare-two-keys
// Importantly, *there is no upper bound possible* in idb. The ideal data
// structure an infintely deep array:
//   var IDB_COLLATE_HI = []; IDB_COLLATE_HI.push(IDB_COLLATE_HI)
// But IDBKeyRange is not a fan of shenanigans, so I've just gone with 12 layers
// because it looks nice and surely that's enough!
const IDB_COLLATE_LO = Number.NEGATIVE_INFINITY;
const IDB_COLLATE_HI = [[[[[[[[[[[[]]]]]]]]]]]];
// const IDB_COLLATE_HI = DBCore

//
// TODO: this should be made offical somewhere and used by AllDocs / get /
// changes etc as well.
//
/*
function externaliseRecord(idbDoc: any) {
    const doc = idbDoc.revs[idbDoc.rev].data;
    doc._id = idbDoc.id;
    doc._rev = idbDoc.rev;
    if (idbDoc.deleted) {
        doc._deleted = true;
    }

    return doc;
}
*/

/**
 * Generates a keyrange based on the opts passed to query
 *
 * The first key is always 0, as that's how we're filtering out deleted entries.
 */
export function generateKeyRange(
    opts: any,
    IDBKeyRange: any,
    low: any = IDB_COLLATE_LO,
    height: any = IDB_COLLATE_HI
) {
    function defined(obj: any, k: string) {
        return obj[k] !== void 0;
    }

    // Converts a valid CouchDB key into a valid IndexedDB one
    function convert(key: any, exact?: any) {



        /**
         * Overwritten.
         * In dexie.js we store deleted documents at another
         * table.
         * So we do not have to filter for deleted ones.
         */
        const filterDeleted = [key];

        const ret = filterDeleted.map(function (k) {
            // null, true and false are not indexable by indexeddb. When we write
            // these values we convert them to these constants, and so when we
            // query for them we need to convert the query also.
            if (k === null && exact) {
                // for non-exact queries we treat null as a collate property
                // see `if (!exact)` block below
                return IDB_NULL;
            } else if ((k as any) === true) {
                return IDB_TRUE;
            } else if ((k as any) === false) {
                return IDB_FALSE;
            }

            if (!exact) {
                // We get passed CouchDB's collate low and high values, so for non-exact
                // ranged queries we're going to convert them to our IDB equivalents
                if (k === COUCH_COLLATE_LO) {
                    return low;
                } else if (Object.prototype.hasOwnProperty.call(k, COUCH_COLLATE_HI)) {
                    return height;
                }
            }

            return k;
        });

        /**
         * Because we do not have to index over the deleted field,
         * we sometimes have only one key.
         */
        if (ret.length === 1) {
            return ret[0];
        } else {
            return ret;
        }
    }

    // CouchDB and so PouchdB defaults to true. We need to make this explicit as
    // we invert these later for IndexedDB.
    if (!defined(opts, 'inclusive_end')) {
        opts.inclusive_end = true;
    }
    if (!defined(opts, 'inclusive_start')) {
        opts.inclusive_start = true;
    }

    if (opts.descending) {
        // Flip before generating. We'll check descending again later when performing
        // an index request
        const realEndkey = opts.startkey,
            realInclusiveEnd = opts.inclusive_start;

        opts.startkey = opts.endkey;
        opts.endkey = realEndkey;
        opts.inclusive_start = opts.inclusive_end;
        opts.inclusive_end = realInclusiveEnd;
    }

    try {
        if (defined(opts, 'key')) {
            return IDBKeyRange.only(convert(opts.key, true));
        }

        if (defined(opts, 'startkey') && !defined(opts, 'endkey')) {
            return IDBKeyRange.lowerBound(convert(opts.startkey), !opts.inclusive_start);
        }

        if (!defined(opts, 'startkey') && defined(opts, 'endkey')) {
            return IDBKeyRange.upperBound(convert(opts.endkey), !opts.inclusive_end);
        }

        if (defined(opts, 'startkey') && defined(opts, 'endkey')) {
            return IDBKeyRange.bound(
                convert(opts.startkey), convert(opts.endkey),
                !opts.inclusive_start, !opts.inclusive_end
            );
        }

        return IDBKeyRange.only([0]);
    } catch (err) {
        console.dir(IDBKeyRange);
        console.error('Could not generate keyRange', err, opts);
        throw Error('Could not generate key range with ' + JSON.stringify(opts));
    }
}

/*
function getIndexHandle(pdb: any, fields: any[], reject: Function) {
    const indexName = naturalIndexName(fields);

    return new Promise(function (resolve) {
        pdb._openTransactionSafely([DOC_STORE], 'readonly', function (err: Error, txn: any) {
            if (err) {
                return idbError(reject)(err);
            }

            txn.onabort = idbError(reject);
            txn.ontimeout = idbError(reject);

            const existingIndexNames = Array.from(txn.objectStore(DOC_STORE).indexNames);

            if (existingIndexNames.indexOf(indexName) === -1) {
                // The index is missing, force a db restart and try again
                pdb._freshen()
                    .then(function () { return getIndexHandle(pdb, fields, reject); })
                    .then(resolve);
            } else {
                resolve(txn.objectStore(DOC_STORE).index(indexName));
            }
        });
    });
}
*/

// In theory we should return something like the doc example below, but find
// only needs rows: [{doc: {...}}], so I think we can just not bother for now
// {
//   "offset" : 0,
//   "rows": [{
//     "id": "doc3",
//     "key": "Lisa Says",
//     "value": null,
//     "doc": {
//       "_id": "doc3",
//       "_rev": "1-z",
//       "title": "Lisa Says"
//     }
//   }],
//   "total_rows" : 4
// }
/*
function query(this: any, idb: any, signature: any, opts: any) {
    // At this stage, in the current implementation, find has already gone through
    // and determined if the index already exists from PouchDB's perspective (eg
    // there is a design doc for it).
    //
    // If we find that the index doesn't exist this means we have to close and
    // re-open the DB to correct indexes before proceeding, at which point the
    // index should exist.

    const pdb = this as any;

    // Assumption, there will be only one /, between the design document name
    // and the view name.
    const parts = signature.split('/');

    return new Promise(function (resolve, reject) {
        pdb.get('_design/' + parts[0]).then(function (ddoc: any) {
            const fields = rawIndexFields(ddoc, parts[1]);
            if (!fields) {
                throw new Error('ddoc ' + ddoc._id + ' with view ' + parts[1] +
                    ' does not have map.options.def.fields defined.');
            }

            let skip = opts.skip;
            let limit = Number.isInteger(opts.limit) && opts.limit;

            return getIndexHandle(pdb, fields, reject)
                .then(function (indexHandle: any) {
                    const keyRange = generateKeyRange(opts, {});
                    const req = indexHandle.openCursor(keyRange, opts.descending ? 'prev' : 'next');

                    const rows: any[] = [];
                    req.onerror = idbError(reject);
                    req.onsuccess = function (e: any) {
                        const cursor = e.target.result;

                        if (!cursor || limit === 0) {
                            return resolve({
                                rows: rows
                            });
                        }

                        if (skip) {
                            cursor.advance(skip);
                            skip = false;
                            return;
                        }

                        if (limit) {
                            limit = limit - 1;
                        }

                        rows.push({ doc: externaliseRecord(cursor.value) });
                        cursor.continue();
                    };
                });
        })
            .catch(reject);
    });
}
*/
