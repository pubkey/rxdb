import type {
    RxCollection
} from './types';
import {
    generateId
} from './util';
import {
    newRxError
} from './rx-error';
import { runPluginHooks } from './hooks';

/**
 * wrappers for Pouch put/get to handle keycompression etc
 */
export function _handleToPouch(
    col: RxCollection | any,
    data: any
) {
    data = (col._crypter as any).encrypt(data);

    const hookParams = {
        collection: col,
        doc: data
    };
    runPluginHooks('preWriteToStorageInstance', hookParams);
    return hookParams.doc;
}

export function _handleFromPouch(
    col: RxCollection | any,
    data: any,
    noDecrypt = false
) {

    const hookParams = {
        collection: col,
        doc: data
    };
    runPluginHooks('postReadFromInstance', hookParams);

    if (noDecrypt) {
        return hookParams.doc;
    }

    return (col._crypter as any).decrypt(hookParams.doc);
}

/**
 * fills in the _id and the
 * default data.
 * This also clones the data
 */
export function fillObjectDataBeforeInsert(
    collection: RxCollection | any,
    data: any
): any {
    const useJson = collection.schema.fillObjectWithDefaults(data);
    if (useJson._id && collection.schema.primaryPath !== '_id') {
        throw newRxError('COL2', {
            data: data
        });
    }

    // fill _id
    if (
        collection.schema.primaryPath === '_id' &&
        !useJson._id
    ) {
        useJson._id = generateId();
    }

    return useJson;
}
