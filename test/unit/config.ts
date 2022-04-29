/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
const {
    detect
} = require('detect-browser');
import {
    enforceOptions as broadcastChannelEnforceOptions
} from 'broadcast-channel';
import * as path from 'path';
import parallel from 'mocha.parallel';
import { getRxStoragePouch, addPouchPlugin } from '../../plugins/pouchdb';
import { getRxStorageLoki, RxStorageLokiStatics } from '../../plugins/lokijs';
import { getRxStorageDexie } from '../../plugins/dexie';
import { getRxStorageWorker } from '../../plugins/worker';
import { getRxStorageMemory } from '../../plugins/memory';
import { RxTestStorage } from './types';
import { CUSTOM_STORAGE } from './custom-storage';

function isFastMode(): boolean {
    try {
        return process.env.NODE_ENV === 'fast';
    } catch (err) {
        return false;
    }
}

let useParallel = describe;
try {
    if (process.env.NODE_ENV === 'fast') {
        useParallel = parallel;
        broadcastChannelEnforceOptions({
            type: 'simulate'
        });
    }
} catch (err) { }








const ENV_VARIABLES = detect().name === 'node' ? process.env : (window as any).__karma__.config.env;

console.log('ENV_VARIABLES:');
console.log(JSON.stringify(ENV_VARIABLES, null, 4));


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
    if (storageKey === CUSTOM_STORAGE.name) {
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
                hasMultiInstance: false,
                hasCouchDBReplication: false,
                hasAttachments: false,
                hasRegexSupport: true
            };
            break;
        case 'lokijs':
            config.storage = {
                name: 'lokijs',
                getStorage: () => getRxStorageLoki(),
                hasMultiInstance: true,
                hasCouchDBReplication: false,
                hasAttachments: false,
                hasRegexSupport: true
            };
            break;
        case 'lokijs-worker':
            const lokiWorkerPath = require('path').join(
                '../../../../dist/lib/plugins/worker/workers/',
                'lokijs-memory.worker.js'
            );
            console.log('lokiWorkerPath: ' + lokiWorkerPath);
            config.storage = {
                name: 'lokijs-worker',
                getStorage: () => getRxStorageWorker(
                    {
                        statics: RxStorageLokiStatics,
                        workerInput: lokiWorkerPath
                    }
                ),
                hasMultiInstance: true,
                hasCouchDBReplication: false,
                hasAttachments: false,
                hasRegexSupport: true
            };
            break;
        case 'dexie':
            const indexedDB = require('fake-indexeddb');
            const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
            config.storage = {
                name: 'dexie',
                getStorage: () => getRxStorageDexie({
                    indexedDB,
                    IDBKeyRange
                }),
                hasMultiInstance: true,
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
