/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import {
    detect
} from 'detect-browser';
import {
    enforceOptions as broadcastChannelEnforceOptions
} from 'broadcast-channel';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import events from 'node:events';

import parallel from 'mocha.parallel';



import { getRxStorageLoki } from '../../plugins/storage-lokijs/index.mjs';
import {
    getRxStorageDexie
} from '../../plugins/storage-dexie/index.mjs';
import { getRxStorageRemoteWebsocket } from '../../plugins/storage-remote-websocket/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { CUSTOM_STORAGE } from './custom-storage.ts';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { isPromise } from 'async-test-util';

import {
    wrappedKeyEncryptionCryptoJsStorage
} from '../../plugins/encryption-crypto-js/index.mjs';
import {
    ensureNotFalsy,
    randomCouchString,
    RxStorage,
    RxStorageDefaultStatics,
    RxTestStorage
} from '../../plugins/core/index.mjs';

import {
    indexedDB as fakeIndexedDB,
    IDBKeyRange as fakeIDBKeyRange
} from 'fake-indexeddb';
import LokiFsStructuredAdapter from 'lokijs/src/loki-fs-structured-adapter.js';
import LokiIncrementalIndexedDBAdapter from 'lokijs/src/incremental-indexeddb-adapter.js';


async function nodeRequire(filePath: string) {
    const { createRequire } = await import('node:module' + '');
    const require = createRequire(import.meta.url);
    return require(filePath);
}


declare const Deno: any;
const isDeno = typeof window !== 'undefined' && 'Deno' in window;
const isBun = typeof process !== 'undefined' && process.versions.bun;

function getEnvVariables() {
    if (isDeno) {
        const ret: any = {};
        [
            'DEFAULT_STORAGE',
            'NODE_ENV'
        ].forEach(k => {
            ret[k] = Deno.env.get(k);
        });
        return ret;
    }

    return isBun || ensureNotFalsy(detect()).name === 'node' ? process.env : (window as any).__karma__.config.env;
}
export const ENV_VARIABLES = getEnvVariables();


function isFastMode(): boolean {
    try {
        return ENV_VARIABLES.NODE_ENV === 'fast';
    } catch (err) {
        return false;
    }
}


/**
 * Overwrite the console for easier debugging
 */
const oldConsoleLog = console.log.bind(console);
const oldConsoleDir = console.dir.bind(console);
function newLog(this: typeof console, value: any) {
    if (isPromise(value)) {
        oldConsoleDir(value);
        throw new Error('cannot log Promise(), you should await it first');
    }
    if (typeof value === 'string' || typeof value === 'number') {
        oldConsoleLog(value);
        return;
    }
    try {
        JSON.stringify(value);
        oldConsoleLog(JSON.stringify(value, null, 4));
    } catch (err) {
        oldConsoleDir(value);
    }
}
console.log = newLog.bind(console);
console.dir = newLog.bind(console);


let useParallel = describe;
try {
    if (ENV_VARIABLES.NODE_ENV === 'fast') {
        useParallel = parallel;
        broadcastChannelEnforceOptions({
            type: 'simulate'
        });
    }
} catch (err) { }


const config: {
    isDeno: boolean;
    isBun: boolean;
    platform: any;
    parallel: typeof useParallel;
    rootPath: string;
    isFastMode: () => boolean;
    storage: RxTestStorage;
    isNotOneOfTheseStorages: (names: string[]) => boolean;
} = {
    isDeno,
    isBun,
    platform: Object.assign({}, detect(), {
        isNode: () => ensureNotFalsy(detect()).name === 'node'
    }),
    parallel: useParallel,
    rootPath: '',
    isFastMode,
    storage: undefined as any,
    isNotOneOfTheseStorages(storageNames: string[]) {
        const isName = this.storage.name;
        if (storageNames.includes(isName)) {
            return false;
        } else {
            return true;
        }
    }
};

const DEFAULT_STORAGE = ENV_VARIABLES.DEFAULT_STORAGE as string;
console.log('DEFAULT_STORAGE: ' + DEFAULT_STORAGE);


export function setDefaultStorage(storageKey: string) {
    if (storageKey === CUSTOM_STORAGE.name || storageKey === 'custom') {
        config.storage = CUSTOM_STORAGE;
        return;
    }

    switch (storageKey) {
        case 'memory':
            config.storage = {
                name: storageKey,
                getStorage: () => getRxStorageMemory(),
                getPerformanceStorage() {
                    return {
                        description: 'memory',
                        storage: getRxStorageMemory()
                    };
                },
                hasPersistence: true,
                hasMultiInstance: false,
                hasAttachments: true
            };
            break;
        /**
         * We run the tests once together
         * with a validation plugin
         * to ensure we do not accidentally use non-valid data
         * in the tests.
         */
        case 'memory-validation':
            config.storage = {
                name: storageKey,
                getStorage: () => getRxStorageMemory(),
                getPerformanceStorage() {
                    return {
                        description: 'memory',
                        storage: wrappedValidateAjvStorage({
                            storage: getRxStorageMemory()
                        })
                    };
                },
                hasPersistence: false,
                hasMultiInstance: false,
                hasAttachments: true
            };
            break;
        case 'lokijs':
            config.storage = {
                name: storageKey,
                getStorage: () => getRxStorageLoki(),
                getPerformanceStorage() {
                    if (config.platform.name === 'node') {
                        // Node.js
                        return {
                            storage: getRxStorageLoki({
                                adapter: new LokiFsStructuredAdapter()
                            }),
                            description: 'loki+fs-structured-adapter'
                        };
                    } else {
                        // browser
                        return {
                            storage: getRxStorageLoki({
                                adapter: new LokiIncrementalIndexedDBAdapter()
                            }),
                            description: 'loki+incremental-indexeddb'
                        };
                    }
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasAttachments: false
            };
            break;
        case 'dexie':
            config.storage = {
                name: storageKey,
                getStorage: () => {
                    if (
                        config.platform.name === 'node' ||
                        isDeno ||
                        config.isFastMode()
                    ) {
                        return getRxStorageDexie({
                            indexedDB: fakeIndexedDB,
                            IDBKeyRange: fakeIDBKeyRange
                        });
                    } else {
                        return getRxStorageDexie({});
                    }
                },
                getPerformanceStorage() {
                    if (config.platform.name === 'node') {
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
                hasAttachments: false
            };
            break;
        case 'foundationdb':
            const foundationDBAPIVersion = 630;


            let getStorageFnFoundation;
            config.storage = {
                async init() {
                    // use a dynamic import so it does not break browser bundling
                    const { getRxStorageFoundationDB } = await nodeRequire('../../plugins/storage-foundationdb/index.cjs');
                    getStorageFnFoundation = getRxStorageFoundationDB;
                },
                name: storageKey,
                getStorage: () => {
                    return getStorageFnFoundation({
                        apiVersion: foundationDBAPIVersion
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
                hasAttachments: true
            };
            break;
        case 'mongodb':

            // use a dynamic import so it does not break browser bundling

            const mongoConnectionString = 'mongodb://localhost:27017';
            let getStorageFnMongo;
            config.storage = {
                async init() {
                    const { getRxStorageMongoDB } = await nodeRequire('../../plugins/storage-mongodb/index.cjs');
                    getStorageFnMongo = getRxStorageMongoDB;
                },
                name: storageKey,
                getStorage: () => {
                    return getStorageFnMongo({
                        connection: mongoConnectionString
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
                hasAttachments: false
            };
            break;
        case 'remote':
            config.storage = {
                name: storageKey,
                getStorage: () => {
                    return getRxStorageRemoteWebsocket({
                        statics: RxStorageDefaultStatics,
                        url: 'ws://localhost:18007',
                        mode: 'storage'
                    });
                },
                getPerformanceStorage() {
                    return {
                        storage: getRxStorageRemoteWebsocket({
                            statics: RxStorageDefaultStatics,
                            url: 'ws://localhost:18007',
                            mode: 'storage'
                        }),
                        description: 'remote+dexie+fake-indexeddb'
                    };
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasAttachments: true
            };
            break;
        default:
            throw new Error('no DEFAULT_STORAGE set');
    }
}

setDefaultStorage(DEFAULT_STORAGE);
console.log('# use RxStorage: ' + config.storage.name);

export function getEncryptedStorage(baseStorage = config.storage.getStorage()): RxStorage<any, any> {
    const ret = config.storage.hasEncryption ?
        baseStorage :
        wrappedKeyEncryptionCryptoJsStorage({
            storage: baseStorage
        });
    return ret;
}

export function getPassword(): Promise<string> {
    if (config.storage.hasEncryption) {
        return config.storage.hasEncryption();
    } else {
        return Promise.resolve('test-password-' + randomCouchString(10));
    }
}


if (config.platform.name === 'node') {
    process.setMaxListeners(100);

    events.EventEmitter.defaultMaxListeners = 100;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    config.rootPath = path.join(__dirname, '../../');
    console.log('rootPath: ' + config.rootPath);

    /**
     * Add a global function to process, so we can debug timings
     */
    (process as any).startTime = performance.now();
    (process as any).logTime = (msg: string = '') => {
        const diff = performance.now() - (process as any).startTime;
        console.log('process logTime(' + msg + ') ' + diff + 'ms');
    };
}

export default config;
