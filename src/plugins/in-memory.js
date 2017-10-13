/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields
 */

import RxCollection from '../rx-collection';

const collectionCacheMap = new WeakMap();
const collectionPromiseCacheMap = new WeakMap();

export class InMemoryRxCollection extends RxCollection.RxCollection {
    constructor() {
        super();
    }

    async prepare() {

    }
};

/**
 * called in the proto of RxCollection
 * @return {Promise<RxCollection>}
 */
export async function spawnInMemory() {
    if (collectionCacheMap.has(this)) {
        // already exists for this collection -> wait until synced
        await collectionPromiseCacheMap.get(this);
        return collectionCacheMap.get(this);
    }

    const col = new InMemoryRxCollection(
        this.database,
        this.name + '_in-memory',
        this.schema, {}, // pouch settings
        {},
        this._methods
    );
    const preparePromise = col.prepare();
    collectionCacheMap.set(this, col);
    collectionPromiseCacheMap.set(this, preparePromise);

    await preparePromise;

    return col;
};


export const rxdb = true;
export const prototypes = {
    RxCollection: proto => {
        proto.inMemory = spawnInMemory;
    }
};
export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable,
    spawnInMemory
};
