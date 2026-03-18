import {
    overwritable
} from '../plugins/core/index.mjs';
import * as assert from 'assert';
import {
    isFastMode,
    isDeno,
    runCryptoPerformanceTests
} from '../plugins/test-utils/index.mjs';
import { wrappedKeyEncryptionCryptoJsStorage } from '../plugins/encryption-crypto-js/index.mjs';
import { getRxStorageMemory } from '../plugins/storage-memory/index.mjs';
declare const Deno: any;

const TEST_PASSWORD = 'randomStringForTesting12345';

/**
 * Performance tests for the crypto-js encryption plugin.
 * Measures the overhead of encryption/decryption on top of memory storage.
 * Run via 'npm run test:performance:crypto:memory:node'.
 */
describe('performance-crypto.test.ts', () => {
    it('should not have enabled dev-mode which would affect the performance', () => {
        assert.strictEqual(
            overwritable.isDevMode(),
            false
        );
    });
    it('run the crypto performance test', async function () {
        this.timeout(500 * 1000);
        const runs = isFastMode() ? 1 : 40;
        const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
            storage: getRxStorageMemory()
        });
        await runCryptoPerformanceTests(
            encryptedStorage,
            'memory-encrypted',
            TEST_PASSWORD,
            { runs }
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
