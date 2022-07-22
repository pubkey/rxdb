/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
const {
    detect
} = require('detect-browser');
import {
    enforceOptions as broadcastChannelEnforceOptions
} from 'broadcast-channel';
import * as path from 'path';
import parallel from 'mocha.parallel';
import type { RxTestStorage } from '../../';
import { getRxStoragePouch, addPouchPlugin } from '../../plugins/pouchdb';
import { getRxStorageLoki } from '../../plugins/lokijs';
import { getRxStorageDexie, RxStorageDexieStatics } from '../../plugins/dexie';
import { getRxStorageWorker } from '../../plugins/worker';
import { getRxStorageMemory } from '../../plugins/memory';
import { CUSTOM_STORAGE } from './custom-storage';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv';

const ENV_VARIABLES = detect().name === 'node' ? process.env : (window as any).__karma__.config.env;


function isFastMode(): boolean {
    try {
        return ENV_VARIABLES.NODE_ENV === 'fast';
    } catch (err) {
        return false;
    }
}

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
    platform: any;
    parallel: typeof useParallel;
    rootPath: string;
    isFastMode: () => boolean;
    storage: RxTestStorage;
} = {
    platform: detect(),
    parallel: useParallel,
    rootPath: '',
    isFastMode,
    storage: {} as any
};

const DEFAULT_STORAGE = ENV_VARIABLES.DEFAULT_STORAGE as string;
console.log('DEFAULT_STORAGE: ' + DEFAULT_STORAGE);

export function setDefaultStorage(storageKey: string) {
    if (storageKey === CUSTOM_STORAGE.name || storageKey === 'custom') {
        config.storage = CUSTOM_STORAGE;
        return;
    }

    switch (storageKey) {
        case 'pouchdb':
            config.storage = {
                name: 'pouchdb',
                getStorage: () => {
                    addPouchPlugin(require('pouchdb-adapter-memory'));
                    return getRxStoragePouch('memory');
                },
                getPerformanceStorage() {
                    if (config.platform.name === 'node') {
                        // Node.js
                        addPouchPlugin(require('pouchdb-adapter-leveldb'));
                        return {
                            storage: getRxStoragePouch('leveldb'),
                            description: 'pouchdb+leveldb'
                        };
                    } else {
                        // browser
                        addPouchPlugin(require('pouchdb-adapter-idb'));
                        return {
                            storage: getRxStoragePouch('idb'),
                            description: 'pouchdb+idb'
                        };
                    }
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasCouchDBReplication: true,
                hasAttachments: true,
                hasRegexSupport: true
            };
            break;
        case 'memory':
            config.storage = {
                name: 'memory',
                getStorage: () => getRxStorageMemory(),
                getPerformanceStorage() {
                    return {
                        description: 'memory',
                        storage: getRxStorageMemory()
                    }
                },
                hasPersistence: false,
                hasMultiInstance: false,
                hasCouchDBReplication: false,
                hasAttachments: true,
                hasRegexSupport: true
            };
            break;
        /**
         * We run the tests once together
         * with a validation plugin
         * to ensure we do not accidentially use non-valid data
         * in the tests.
         */
        case 'memory-validation':
            config.storage = {
                name: 'memory-validation',
                getStorage: () => getRxStorageMemory(),
                getPerformanceStorage() {
                    return {
                        description: 'memory',
                        storage: wrappedValidateAjvStorage({
                            storage: getRxStorageMemory()
                        })
                    }
                },
                hasPersistence: false,
                hasMultiInstance: false,
                hasCouchDBReplication: false,
                hasAttachments: true,
                hasRegexSupport: true
            };
            break;
        case 'lokijs':
            config.storage = {
                name: 'lokijs',
                getStorage: () => getRxStorageLoki(),
                getPerformanceStorage() {
                    if (config.platform.name === 'node') {
                        // Node.js
                        const LokiFsStructuredAdapter = require('lokijs/src/loki-fs-structured-adapter.js');
                        return {
                            storage: getRxStorageLoki({
                                adapter: new LokiFsStructuredAdapter()
                            }),
                            description: 'loki+fs-structured-adapter'
                        };
                    } else {
                        // browser
                        const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');
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
                hasCouchDBReplication: false,
                hasAttachments: false,
                hasRegexSupport: true
            };
            break;
        case 'dexie':
            config.storage = {
                name: 'dexie',
                getStorage: () => {
                    if (config.platform.name === 'node' || config.isFastMode()) {
                        const indexedDB = require('fake-indexeddb');
                        const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
                        return getRxStorageDexie({
                            indexedDB,
                            IDBKeyRange
                        });
                    } else {
                        return getRxStorageDexie({});
                    }
                },
                getPerformanceStorage() {
                    if (config.platform.name === 'node') {
                        const indexedDB = require('fake-indexeddb');
                        const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
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
                        }
                    }
                },
                hasPersistence: true,
                hasMultiInstance: true,
                hasCouchDBReplication: false,
                hasAttachments: false,
                hasRegexSupport: true
            };
            break;
        case 'dexie-worker':
            const dexieMemoryWorkerPath = require('path').join(
                '../../../../dist/lib/plugins/worker/workers/',
                'dexie-memory.worker.js'
            );
            console.log('dexieMemoryWorkerPath: ' + dexieMemoryWorkerPath);
            config.storage = {
                name: 'dexie-worker',
                getStorage: () => getRxStorageWorker(
                    {
                        statics: RxStorageDexieStatics,
                        workerInput: dexieMemoryWorkerPath
                    }
                ),
                getPerformanceStorage() {
                    return {
                        storage: getRxStorageWorker(
                            {
                                statics: RxStorageDexieStatics,
                                workerInput: dexieMemoryWorkerPath
                            }
                        ),
                        description: 'dexie-worker-memory'
                    };
                },
                hasPersistence: false,
                hasMultiInstance: false,
                hasCouchDBReplication: false,
                hasAttachments: false,
                hasRegexSupport: true
            };
            break;
        default:
            throw new Error('no DEFAULT_STORAGE set');
    }
}

setDefaultStorage(DEFAULT_STORAGE);
console.log('# use RxStorage: ' + config.storage.name);

if (config.platform.name === 'node') {
    process.setMaxListeners(100);
    require('events').EventEmitter.defaultMaxListeners = 100;
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
