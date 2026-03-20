import {
    overwritable
} from '../plugins/core/index.mjs';
import * as assert from 'assert';
import {
    ENV_VARIABLES,
    getEncryptedStorage,
    isFastMode,
    isDeno,
    runPerformanceTests
} from '../plugins/test-utils/index.mjs';
import config from './unit/config.ts';
declare const Deno: any;

/**
 * Runs some performance tests.
 * Mostly used to compare the performance of the different RxStorage implementations.
 * Run via 'npm run test:performance:memory:node' and change 'memory' for other storage names.
 */
describe('performance.test.ts', () => {
    it('init storage', async () => {
        if (config.storage.init) {
            await config.storage.init();
        }
    });
    it('should not have enabled dev-mode which would affect the performance', () => {
        assert.strictEqual(
            overwritable.isDevMode(),
            false
        );
    });
    it('run the performance test', async function () {
        this.timeout(500 * 1000);
        const runs = isFastMode() ? 1 : 40;
        const perfStorage = config.storage.getPerformanceStorage();
        const password = ENV_VARIABLES.STORAGE_PASSWORD ? ENV_VARIABLES.STORAGE_PASSWORD : undefined;
        const storage = password ? getEncryptedStorage(perfStorage.storage) : perfStorage.storage;
        const description = password ? perfStorage.description + '-encrypted' : perfStorage.description;
        await runPerformanceTests(
            storage,
            description,
            { runs, password }
        );
    });
    /**
     * Some runtimes do not automatically exit for whatever reason.
     */
    it('exit the process', () => {
        if (isDeno) {
            Deno.exit(0);
        }
    });
});

