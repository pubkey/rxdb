
import type {
    PouchDBInstance,
    PouchSettings,
    RxJsonSchema,
    RxStorageInstanceCreationParams,
    RxStorage,
    RxKeyObjectStorageInstanceCreationParams, MaybeReadonly
} from '../../types';

import {
    flatClone,
    adapterObject, isMaybeReadonlyArray
} from '../../util';
import {
    isLevelDown,
    PouchDB
} from './pouch-db';
import { newRxError } from '../../rx-error';

import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import { RxStorageKeyObjectInstancePouch } from './rx-storage-key-object-instance-pouch';
import {
    PouchStorageInternals
} from './pouchdb-helper';
import { RxStoragePouchStatics } from './pouch-statics';
export class RxStoragePouch implements RxStorage<PouchStorageInternals, PouchSettings> {
    public name: string = 'pouchdb';
    public statics = RxStoragePouchStatics;

    constructor(
        public adapter: any,
        public pouchSettings: PouchSettings = {}
    ) {
        checkPouchAdapter(adapter);
    }

    private async createPouch(
        location: string,
        options: PouchSettings
    ): Promise<PouchDBInstance> {
        const pouchDbParameters = {
            location: location,
            adapter: adapterObject(this.adapter),
            settings: options
        };
        const pouchDBOptions = Object.assign(
            {},
            pouchDbParameters.adapter,
            this.pouchSettings,
            pouchDbParameters.settings
        );
        const pouch = new PouchDB(
            pouchDbParameters.location,
            pouchDBOptions
        ) as PouchDBInstance;

        /**
         * In the past we found some errors where the PouchDB is not directly useable
         * so we we had to call .info() first to ensure it can be used.
         * I commented this out for now to get faster database/collection creation.
         * We might have to add this again if something fails.
         */
        // await pouch.info();

        return pouch;
    }

    public async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, PouchSettings>
    ): Promise<RxStorageInstancePouch<RxDocType>> {
        const pouchLocation = getPouchLocation(
            params.databaseName,
            params.collectionName,
            params.schema.version
        );
        const pouch = await this.createPouch(
            pouchLocation,
            params.options
        );
        await createIndexesOnPouch(pouch, params.schema);
        return new RxStorageInstancePouch(
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                pouch
            },
            params.options
        );
    }

    public async createKeyObjectStorageInstance(
        params: RxKeyObjectStorageInstanceCreationParams<PouchSettings>
    ): Promise<RxStorageKeyObjectInstancePouch> {
        const useOptions = flatClone(params.options);
        // no compaction because this only stores local documents
        useOptions.auto_compaction = false;
        useOptions.revs_limit = 1;

        /**
         * TODO shouldnt we use a different location
         * for the local storage? Or at least make sure we
         * reuse the same pouchdb instance?
         */
        const pouchLocation = getPouchLocation(
            params.databaseName,
            params.collectionName,
            0
        );
        const pouch = await this.createPouch(
            pouchLocation,
            params.options
        );

        return new RxStorageKeyObjectInstancePouch(
            params.databaseName,
            params.collectionName,
            {
                pouch
            },
            params.options
        );
    }
}

/**
 * Checks if all is ok with the given adapter,
 * else throws an error.
 */
export function checkPouchAdapter(adapter: string | any) {
    if (typeof adapter === 'string') {
        // TODO make a function hasAdapter()
        if (!(PouchDB as any).adapters || !(PouchDB as any).adapters[adapter]) {
            throw newRxError('DB9', {
                adapter
            });
        }
    } else {
        isLevelDown(adapter);
        if (!(PouchDB as any).adapters || !(PouchDB as any).adapters.leveldb) {
            throw newRxError('DB10', {
                adapter
            });
        }
    }
}

/**
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */
export async function createIndexesOnPouch(
    pouch: PouchDBInstance,
    schema: RxJsonSchema<any>
): Promise<void> {
    if (!schema.indexes) {
        return;
    }

    const primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    const before = await pouch.getIndexes();
    const existingIndexes: Set<string> = new Set(
        before.indexes.map(idx => idx.name)
    );

    await Promise.all(
        schema.indexes.map(async (indexMaybeArray) => {
            let indexArray: MaybeReadonly<string[]> = isMaybeReadonlyArray(indexMaybeArray) ? indexMaybeArray : [indexMaybeArray];

            /**
             * replace primary key with _id
             * because that is the enforced primary key on pouchdb.
             */
            indexArray = indexArray.map(key => {
                if (key === primaryKey) {
                    return '_id';
                } else {
                    return key;
                }
            });

            const indexName = 'idx-rxdb-index-' + indexArray.join(',');
            if (existingIndexes.has(indexName)) {
                // index already exists
                return;
            }
            /**
             * TODO we might have even better performance by doing a bulkDocs
             * on index creation
             */
            return pouch.createIndex({
                name: indexName,
                ddoc: indexName,
                index: {
                    fields: indexArray
                }
            });
        })
    );
}

/**
 * returns the pouchdb-database-name
 */
export function getPouchLocation(
    dbName: string,
    collectionName: string,
    schemaVersion: number
): string {
    const prefix = dbName + '-rxdb-' + schemaVersion + '-';
    if (!collectionName.includes('/')) {
        return prefix + collectionName;
    } else {
        // if collectionName is a path, we have to prefix the last part only
        const split = collectionName.split('/');
        const last = split.pop();

        let ret = split.join('/');
        ret += '/' + prefix + last;
        return ret;
    }
}

export function getRxStoragePouch(
    adapter: any,
    pouchSettings?: PouchSettings
): RxStoragePouch {
    if (!adapter) {
        throw new Error('adapter missing');
    }
    const storage = new RxStoragePouch(adapter, pouchSettings);
    return storage;
}
