console.log('######## init.test.js ########');
require('source-map-support').install();
import '@babel/polyfill';
import config from './config';
import {
    clearNodeFolder
} from 'broadcast-channel';

// set faker seed
import { faker } from '@faker-js/faker';
faker.seed(123);

// add dev-mode plugin
import { addRxPlugin } from '../../';
import { RxDBDevModePlugin } from '../../plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);

config.platform.isNode = function () {
    return config.platform.name === 'node';
};

console.log('###### PLATFORM: ######');
if (typeof window !== 'undefined') {
    console.log('USER-AGENT: ' + window.navigator.userAgent);
}
console.log('PLATFORM-NAME: ' + config.platform.name);
console.log('PLATFORM-VERSION: ' + config.platform.version);
console.log('STORAGE: ' + config.storage.name);

if (config.platform.name !== 'node') {
    console.dir = (d: any) => {
        console.log(JSON.stringify(d));
    };
} else {
    /**
     * exit with non-zero on unhandledRejection
     */
    process.on('unhandledRejection', async function (error, p) {
        console.log('init.test.js: unhandledRejection');

        // use log and error because some CI terminals do not show errors.
        try {
            console.dir(await p);
        } catch (err) {
            console.log((error as any).stack);
            console.dir(error);
            console.log('------- COULD NOT AWAIT p');
            process.exit(5);
        }
        console.dir((error as any).stack);
        console.error(error);
        console.dir(error);
        console.log('------- END OF unhandledRejection debug logs');
        process.exit(5);
    });

    // log version
    console.log('node -v :: ');
    console.dir(process.versions.node);
}


if (config.platform.name === 'node') {
    const { startTestServers } = require('../helper/test-servers' + '');
    startTestServers();
}

/**
 * MONKEYPATCH console.error on firefox
 * this is needed because core-js has its own non-catched-promise-behavior
 * and spams the console with useless error-logs.
 */
if (config.platform.name === 'firefox') {
    const consoleErrorBefore = console.error.bind(console);
    console.error = function (msg: string) {
        if (msg !== 'Unhandled promise rejection')
            consoleErrorBefore(msg);
    };
}

describe('init.test.js', () => {
    it('clear BroadcastChannel tmp folder', async () => {
        await clearNodeFolder();
    });
});
