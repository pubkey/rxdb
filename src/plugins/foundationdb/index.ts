import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import type {
    RxStorageInstanceCreationParams
} from '../../types';
import { RxStorageDexieStatics } from '../dexie/dexie-statics';
import type {
    RxStorageFoundationDB,
    RxStorageFoundationDBInstanceCreationOptions,
    RxStorageFoundationDBSettings
} from './foundationdb-types';

import {
    createFoundationDBStorageInstance,
    RxStorageInstanceFoundationDB
} from './rx-storage-instance-foundationdb';


let versionSet: undefined | number;

export function getRxStorageFoundationDB(
    settings: RxStorageFoundationDBSettings
): RxStorageFoundationDB {
    if (versionSet && versionSet !== settings.apiVersion) {
        throw new Error('foundationdb already initialized with api version ' + versionSet);
    } else if (!versionSet) {
        versionSet = settings.apiVersion;
        const { setAPIVersion } = require('foundationdb');
        setAPIVersion(settings.apiVersion);
    }


    const storage: RxStorageFoundationDB = {
        name: 'foundationdb',
        statics: RxStorageDexieStatics,
        createStorageInstance<RxDocType>(
            params: RxStorageInstanceCreationParams<RxDocType, RxStorageFoundationDBInstanceCreationOptions>
        ): Promise<RxStorageInstanceFoundationDB<RxDocType>> {
            ensureRxStorageInstanceParamsAreCorrect(params);
            const useSettings = Object.assign(
                {},
                settings,
                params.options
            );
            if (!useSettings.batchSize) {
                useSettings.batchSize = 50;
            }
            return createFoundationDBStorageInstance(this, params, useSettings);
        }
    };

    return storage;
}


export * from './foundationdb-types';
export * from './foundationdb-helpers';
