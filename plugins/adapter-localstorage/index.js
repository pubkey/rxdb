import CoreLevelPouch from 'pouchdb-adapter-leveldb-core';
import {
    jsExtend as extend
} from 'pouchdb-utils';
import localstoragedown from './localstorage-down/lib/index.js';


function LocalStoragePouch(opts, callback) {
    const _opts = extend({
        db: localstoragedown
    }, opts);
    CoreLevelPouch.call(this, _opts, callback);
}

// overrides for normal LevelDB behavior on Node
LocalStoragePouch.valid = function() {
    return typeof localStorage !== 'undefined';
};
LocalStoragePouch.use_prefix = true;

export default function(PouchDB) {
    PouchDB.adapter('localstorage', LocalStoragePouch, true);
}
