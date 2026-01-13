/// <reference path="../../node_modules/@types/mocha/index.d.ts" />

import {
    getRxStorageDexie
} from '../../plugins/storage-dexie/index.mjs';
import { getRxStorageRemoteWebsocket } from '../../plugins/storage-remote-websocket/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { getRxStorageDenoKV } from '../../plugins/storage-denokv/index.mjs';
import { getRxStorageLocalstorage, getLocalStorageMock } from '../../plugins/storage-localstorage/index.mjs';
import { getRxStorageSQLiteTrial, getSQLiteBasicsNodeNative } from '../../plugins/storage-sqlite/index.mjs';
import { CUSTOM_STORAGE } from './custom-storage.ts';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { randomNumber } from 'async-test-util';
import * as path from 'node:path';
import url from 'node:url';
import {
    RxTestStorage,
    ensureNotFalsy,
    randomDelayStorage
} from '../../plugins/core/index.mjs';

import {
    indexedDB as fakeIndexedDB,
    IDBKeyRange as fakeIDBKeyRange
} from 'fake-indexeddb';
import parallel from 'mocha.parallel';

import { createRequire } from 'node:module';
import {
    DEFAULT_STORAGE,
    ENV_VARIABLES,
    getConfig,
    isDeno,
    isFastMode,
    isNode,
    setConfig
} from '../../plugins/test-utils/index.mjs';

function nodeRequire(filePath: string) {
    const require = createRequire(import.meta.url);
    return require(filePath);
}

export function getRootPath() {
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const rootPath = path.join(__dirname, '../../');
    return rootPath;
}


export const describeParallel: typeof describe = ENV_VARIABLES.NODE_ENV === 'fast' ? parallel : describe;

const localStorageMock = getLocalStorageMock();

export function getStorage(storageKey: string): RxTestStorage {
    if (storageKey === CUSTOM_STORAGE.name || storageKey === 'custom') {
        return CUSTOM_STORAGE;
    }

    switch (storageKey) {
        case 'memory':
            return {
                name: storageKey,
                getStorage: () => wrappedValidateAjvStorage({ storage: getRxStorageMemory() }),
                getPerformanceStorage() {
                    return {
                        description: 'memory',
                        storage: getRxStorageMemory()
                    };
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasAttachments: true,
                hasReplication: true
            };
            break;
        /**
         * We run the tests once with random delays
         * on reads and writes. Used to easier detect flaky tests.
         */
        case 'memory-random-delay':

            const delayFn = () => randomNumber(10, 50);
            // const delayFn = () => 150;

            return {
                name: storageKey,
                getStorage: () => wrappedValidateAjvStorage({
                    storage: randomDelayStorage({
                        storage: getRxStorageMemory({
                        }),
                        delayTimeBefore: delayFn,
                        delayTimeAfter: delayFn
                    })
                }),
                getPerformanceStorage() {
                    return {
                        description: 'memory-random-delay',
                        storage: randomDelayStorage({
                            storage: getRxStorageMemory({
                            }),
                            delayTimeBefore: delayFn,
                            delayTimeAfter: delayFn
                        })
                    };
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasAttachments: false,
                hasReplication: true
            };
            break;

        case 'localstorage':
            return {
                name: storageKey,
                getStorage: () => {
                    if (
                        isNode ||
                        isDeno ||
                        isFastMode()
                    ) {
                        return wrappedValidateAjvStorage({
                            storage: getRxStorageLocalstorage({
                                localStorage: localStorageMock
                            })
                        });
                    } else {
                        return wrappedValidateAjvStorage({ storage: getRxStorageLocalstorage() });
                    }
                },
                getPerformanceStorage() {
                    return {
                        description: 'localstorage',
                        storage: getRxStorageLocalstorage()
                    };
                },
                hasPersistence: true,
                hasMultiInstance: isNode ? false : true,
                hasAttachments: true,
                hasReplication: true
            };
            break;

        case 'dexie':
            return {
                name: storageKey,
                getStorage: () => {
                    if (
                        isNode ||
                        isDeno ||
                        isFastMode()
                    ) {
                        return wrappedValidateAjvStorage({
                            storage: getRxStorageDexie({
                                indexedDB: fakeIndexedDB,
                                IDBKeyRange: fakeIDBKeyRange
                            })
                        });
                    } else {
                        return wrappedValidateAjvStorage({ storage: getRxStorageDexie({}) });
                    }
                },
                getPerformanceStorage() {
                    if (isNode) {
                        return {
                            storage: getRxStorageDexie({
                                indexedDB,
                                IDBKeyRange
                            }),
                            description: 'dexie+fake-indexeddb'
                        };
                    } else {
                        return {
                            storage: getRxStorageDexie({}),
                            description: 'dexie+native-indexeddb'
                        };
                    }
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasAttachments: true,
                hasReplication: true
            };
            break;
        case 'foundationdb':
            const foundationDBAPIVersion = 720;


            let getStorageFnFoundation: any;
            return {
                async init() {
                    // use a dynamic import so it does not break browser bundling
                    const { getRxStorageFoundationDB } = await nodeRequire('../../plugins/storage-foundationdb/index.cjs');
                    getStorageFnFoundation = getRxStorageFoundationDB;
                },
                name: storageKey,
                getStorage: () => {
                    return wrappedValidateAjvStorage({
                        storage: getStorageFnFoundation({
                            apiVersion: foundationDBAPIVersion
                        })
                    });
                },
                getPerformanceStorage() {
                    return {
                        description: 'foundationdb-native',
                        storage: getStorageFnFoundation({
                            apiVersion: foundationDBAPIVersion
                        })
                    };
                },
                hasPersistence: true,
                hasMultiInstance: false,
                hasAttachments: true,
                hasReplication: true
            };
            break;
        case 'mongodb':

            // use a dynamic import so it does not break browser bundling

            const mongoConnectionString = 'mongodb://localhost:27017';
            let getStorageFnMongo: any;
            return {
                async init() {
                    const { getRxStorageMongoDB } = await nodeRequire('../../plugins/storage-mongodb/index.cjs');
                    getStorageFnMongo = getRxStorageMongoDB;
                },
                name: storageKey,
                getStorage: () => {
                    return wrappedValidateAjvStorage({
                        storage: getStorageFnMongo({
                            connection: mongoConnectionString
                        })
                    });
                },
                getPerformanceStorage() {
                    return {
                        description: 'mongodb-native',
                        storage: getStorageFnMongo({
                            connection: mongoConnectionString
                        })
                    };
                },
                hasPersistence: true,
                hasMultiInstance: false,
                hasAttachments: false,
                hasReplication: true
            };
            break;
        case 'remote':
            return {
                name: storageKey,
                getStorage: () => {
                    return wrappedValidateAjvStorage({
                        storage: getRxStorageRemoteWebsocket({
                            url: 'ws://localhost:18007',
                            mode: 'storage'
                        })
                    });
                },
                getPerformanceStorage() {
                    return {
                        storage: getRxStorageRemoteWebsocket({
                            url: 'ws://localhost:18007',
                            mode: 'storage'
                        }),
                        description: 'remote+dexie+fake-indexeddb'
                    };
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasAttachments: true,
                hasReplication: true
            };
            break;
        case 'denokv':
            return {
                name: storageKey,
                getStorage: () => wrappedValidateAjvStorage({ storage: getRxStorageDenoKV() as any }),
                getPerformanceStorage() {
                    return {
                        description: 'denokv',
                        storage: getRxStorageDenoKV()
                    };
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasAttachments: false,
                hasReplication: true
            };
            break;

        case 'sqlite-trial':
            let initDone = false;
            let sqliteStorage: any;
            let sqliteBasics;
            return {
                name: storageKey,
                async init() {
                    if (initDone) {
                        return;
                    }
                    initDone = true;
                    const nativeSqlitePromise = await import('node:sqlite').then(module => module.DatabaseSync);
                    sqliteBasics = getSQLiteBasicsNodeNative(nativeSqlitePromise);
                    sqliteStorage = getRxStorageSQLiteTrial({
                        sqliteBasics: ensureNotFalsy(sqliteBasics),
                        databaseNamePrefix: './test_tmp/'
                    });
                },
                getStorage() {
                    return wrappedValidateAjvStorage({
                        storage: ensureNotFalsy(sqliteStorage)
                    });
                },
                getPerformanceStorage() {
                    return {
                        description: 'sqlite-native',
                        storage: wrappedValidateAjvStorage({
                            storage: ensureNotFalsy(sqliteStorage)
                        })
                    };
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasAttachments: false,
                hasReplication: true
            };
            break;
            break;
        default:
            throw new Error('no DEFAULT_STORAGE set');
    }
}


const config = (() => {
    setConfig({
        storage: getStorage(DEFAULT_STORAGE) as any
    });
    console.log('# use RxStorage: ' + getConfig().storage.name);
    return getConfig();
})();
export default config;
