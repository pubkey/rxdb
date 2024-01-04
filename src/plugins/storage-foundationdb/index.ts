import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper.ts';
import type {
    RxStorageInstanceCreationParams
} from '../../types/index.d.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';
import type {
    RxStorageFoundationDB,
    RxStorageFoundationDBInstanceCreationOptions,
    RxStorageFoundationDBSettings
} from './foundationdb-types.ts';

import {
    createFoundationDBStorageInstance,
    RxStorageInstanceFoundationDB
} from './rx-storage-instance-foundationdb.ts';


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
        rxdbVersion: RXDB_VERSION,

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


export * from './foundationdb-types.ts';
export * from './foundationdb-helpers.ts';
