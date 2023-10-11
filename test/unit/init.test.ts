console.log('######## init.test.js ########');
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();
import '@babel/polyfill';
import config from './config.ts';
import {
    clearNodeFolder
} from 'broadcast-channel';

// set faker seed
import { faker } from '@faker-js/faker';
faker.seed(123);

// add dev-mode plugin
import { addRxPlugin } from '../../plugins/core/index.mjs';
import { RxDBDevModePlugin } from '../../plugins/dev-mode/index.mjs';
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



/**
 * MONKEYPATCH console.error on firefox
 * this is needed because core-js has its own non-caught-promise-behavior
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
    it('init storage', async () => {
        if (config.storage.init) {
            await config.storage.init();
        }
    });
    it('clear BroadcastChannel tmp folder', async () => {
        await clearNodeFolder();
    });
    it('start test servers', async () => {
        if (config.platform.name === 'node') {
            console.log('START TEST SERVERS');
            const { startTestServers } = await import('' + '../helper/test-servers.js' + '');
            startTestServers();
        }
    });
    it('must run in strict mode', () => {
        return; // TODO enable this and make it work
        /**
         * Ensure we run in strict-mode, otherwise some tests
         * will not run correctly
         * @link https://stackoverflow.com/a/10480227/3443137
         */
        const isStrict = (function () {
            // @ts-ignore
            return !(this as any);
        })();
        if (!isStrict) {
            throw new Error('Strict Mode not enabled');
        }

    });
});
