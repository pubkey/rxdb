import {
    overwritable
} from '../plugins/core/index.mjs';
import * as assert from 'assert';
import {
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
        /**
         * The SQLite trial storage has a 300-document cap per collection,
         * so we reduce the bulk insert count to stay within the limit.
         */
        const isSQLiteTrial = config.storage.name === 'sqlite-trial';
        await runPerformanceTests(
            perfStorage.storage,
            perfStorage.description,
            {
                runs,
                collectionsAmount: 10,
                ...(isSQLiteTrial ? { docsAmount: 120, serialDocsAmount: 10 } : {})
            }
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

