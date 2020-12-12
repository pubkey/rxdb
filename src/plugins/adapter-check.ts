/**
 * this plugin adds the checkAdapter-function to rxdb
 * you can use it to check if the given adapter is working in the current environmet
 */
import {
    PouchDB
} from '../pouch-db';
import {
    generateId,
    adapterObject
} from '../util';
import type {
    PouchDBInstance, RxPlugin
} from '../types';

/**
 * The same pouchdb-location is used on each run
 * To ensure when this is run multiple times,
 * there will not be many created databases
 */
export const POUCHDB_LOCATION = 'rxdb-adapter-check';

export function checkAdapter(adapter: any): Promise<any> {
    // id of the document which is stored and removed to ensure everything works
    const _id = POUCHDB_LOCATION + '-' + generateId();

    let pouch: PouchDBInstance;
    try {
        pouch = new (PouchDB as any)(
            POUCHDB_LOCATION,
            adapterObject(adapter), {
                auto_compaction: true,
                revs_limit: 1
            }
        );
    } catch (err) {
        return Promise.resolve(false);
    }

    let recoveredDoc: any;
    return pouch.info() // ensure that we wait until db is useable
        // ensure write works
        .then(() => pouch.put({
            _id,
            value: {
                ok: true,
                time: new Date().getTime()
            }
        }))
        // ensure read works
        .then(() => pouch.get(_id))
        .then(doc => recoveredDoc = doc)
        // ensure remove works
        .then(() => pouch.remove(recoveredDoc))
        .then(() => true)
        .then(() => {
            if (recoveredDoc && recoveredDoc.value && recoveredDoc.value.ok)
                return true;
            else
                return false;
        })
        .catch(() => false);

    /**
     * NOTICE:
     * Do not remove the pouchdb-instance after the test
     * The problem is that when this function is call in parallel,
     * for example when you restore the tabs from a browser-session and open
     * the same website multiple times at the same time,
     * calling destroy would possibly crash the other call
     */
}

export const rxdb = true;
export const prototypes = {};
export const overwritable = {
    checkAdapter
};

export const RxDBAdapterCheckPlugin: RxPlugin = {
    name: 'adapter-check',
    rxdb,
    prototypes,
    overwritable
};
