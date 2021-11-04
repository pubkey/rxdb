/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
const {
    detect
} = require('detect-browser');
import BroadcastChannel from 'broadcast-channel';
import * as path from 'path';
import parallel from 'mocha.parallel';

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

const config = {
    platform: detect(),
    parallel: useParallel,
    rootPath: '',
    isFastMode
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
