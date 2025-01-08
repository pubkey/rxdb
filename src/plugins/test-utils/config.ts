/// <reference path="../../../node_modules/@types/mocha/index.d.ts" />
import {
    ensureNotFalsy,
    isPromise,
    randomToken
} from '../utils/index.ts';
import {
    enforceOptions as broadcastChannelEnforceOptions
} from 'broadcast-channel';
import events from 'node:events';
import * as path from 'node:path';
import url from 'node:url';
import type { RxStorage, RxTestStorage } from '../../types';
import { wrappedKeyEncryptionCryptoJsStorage } from '../encryption-crypto-js/index.ts';

export type TestConfig = {
    storage: RxTestStorage;
};

export const isDeno = typeof Deno !== 'undefined' || (typeof window !== 'undefined' && 'Deno' in window);
export const isBun = typeof process !== 'undefined' && !!process.versions.bun;
export const isNode = !isDeno && !isBun && typeof window === 'undefined';

let config: TestConfig;

export function setConfig(newConfig: TestConfig) {
    config = newConfig;
}

let initDone = false;
export function getConfig() {
    if (!initDone) {
        initTestEnvironment();
        initDone = true;
    }
    return ensureNotFalsy(config, 'testConfig not set')
}


declare const Deno: any;
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

    return isBun || isNode ? process.env : (window as any).__karma__.config.env;
}
export const ENV_VARIABLES = getEnvVariables();
export const DEFAULT_STORAGE = ENV_VARIABLES.DEFAULT_STORAGE as string;

export function isFastMode(): boolean {
    try {
        return ENV_VARIABLES.NODE_ENV === 'fast';
    } catch (err) {
        return false;
    }
}

export function initTestEnvironment() {
    if (ENV_VARIABLES.NODE_ENV === 'fast') {
        broadcastChannelEnforceOptions({
            type: 'simulate'
        });
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

    console.log('DEFAULT_STORAGE: ' + DEFAULT_STORAGE);

    if (isNode) {
        process.setMaxListeners(100);

        events.EventEmitter.defaultMaxListeners = 100;

        /**
         * Add a global function to process, so we can debug timings
         */
        (process as any).startTime = performance.now();
        (process as any).logTime = (msg: string = '') => {
            const diff = performance.now() - (process as any).startTime;
            console.log('process logTime(' + msg + ') ' + diff + 'ms');
        };
    }
}

export function getEncryptedStorage(baseStorage = getConfig().storage.getStorage()): RxStorage<any, any> {
    const ret = config.storage.hasEncryption ?
        baseStorage :
        wrappedKeyEncryptionCryptoJsStorage({
            storage: baseStorage
        });
    return ret;
}

export function isNotOneOfTheseStorages(storageNames: string[]) {
    const isName = getConfig().storage.name;
    if (storageNames.includes(isName)) {
        return false;
    } else {
        return true;
    }
}


export function getPassword(): Promise<string> {
    if (getConfig().storage.hasEncryption) {
        return ensureNotFalsy(getConfig().storage.hasEncryption)();
    } else {
        return Promise.resolve('test-password-' + randomToken(10));
    }
}
