/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
const {
    detect
} = require('detect-browser');
import BroadcastChannel from 'broadcast-channel';
import * as path from 'path';
import parallel from 'mocha.parallel';
import { RxStorage } from '../../src/types';
import { getRxStoragePouch, addPouchPlugin } from '../../plugins/pouchdb';
import { getRxStorageLoki } from '../../plugins/lokijs';

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
        BroadcastChannel.enforceOptions({
            type: 'simulate'
        });
    }
} catch (err) {

}


let storage: {
    readonly name: string;
    readonly getStorage: () => RxStorage<any, any>;
    readonly hasCouchDBReplication: boolean;
    readonly hasAttachments: boolean;
};

let DEFAULT_STORAGE: string | undefined;
if (detect().name === 'node') {
    DEFAULT_STORAGE = process.env.DEFAULT_STORAGE;
} else {
    /**
     * Enforce pouchdb in browser tests.
     * TODO also run lokijs storage there.
     */
    DEFAULT_STORAGE = 'pouchdb';
}

console.log('DEFAULT_STORAGE: ' + DEFAULT_STORAGE);
switch (DEFAULT_STORAGE) {
    case 'pouchdb':
        storage = {
            name: 'pouchdb',
            getStorage: () => {
                addPouchPlugin(require('pouchdb-adapter-memory'));
                return getRxStoragePouch('memory');
            },
            hasCouchDBReplication: true,
            hasAttachments: true
        };
        break;
    case 'lokijs':
        storage = {
            name: 'lokijs',
            getStorage: () => getRxStorageLoki(),
            hasCouchDBReplication: false,
            hasAttachments: false
        };
        break;
    default:
        throw new Error('no DEFAULT_STORAGE set');
}

const config = {
    platform: detect(),
    parallel: useParallel,
    rootPath: '',
    isFastMode,
    storage
};

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
