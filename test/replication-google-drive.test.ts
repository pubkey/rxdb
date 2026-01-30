
import assert from 'assert';
import {
    ensureNotFalsy
} from '../plugins/core/index.mjs';
import {
    RxGoogleDriveReplicationState,
    startTransaction,
    commitTransaction
} from '../plugins/replication-google-drive/index.mjs';
import {
    startServer
} from 'google-drive-mock';
import getPort from 'get-port';

describe('replication-google-drive.test.ts', function () {
    let server: any;
    let serverUrl: string;
    let port: number;

    before(async () => {
        port = await getPort();
        server = startServer(port);
        serverUrl = 'http://localhost:' + port;
    });

    after(async () => {
        server.close();
    });

    describe('transaction', () => {
        let options: any;
        beforeEach(() => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'test-folder-' + Math.random() // Ensure unique folder for each test if mock persists (though here we restart server or use fresh options)
            };
        });

        it('should start and commit a transaction', async () => {
            const txn = await startTransaction(options);
            assert.ok(txn);
            assert.ok(txn.fileId);
            assert.ok(txn.etag);

            await commitTransaction(options, txn);

            // Should be able to start another one
            const txn2 = await startTransaction(options);
            assert.ok(txn2);
            await commitTransaction(options, txn2);
        });

        it('should not start transaction if already running', async () => {
            const txn1 = await startTransaction(options);
            assert.ok(txn1);

            const txn2 = await startTransaction(options);
            assert.strictEqual(txn2, null); // Should be locked

            await commitTransaction(options, txn1);

            // Now it should work
            const txn3 = await startTransaction(options);
            assert.ok(txn3);
            await commitTransaction(options, txn3);
        });

        it('should throw if folderPath is missing or root', async () => {
            const invalidOptions1 = { ...options };
            delete invalidOptions1.folderPath;

            await assert.rejects(async () => {
                await startTransaction(invalidOptions1);
            }, /folderPath required/);

            const invalidOptions2 = { ...options, folderPath: '/' };
            await assert.rejects(async () => {
                await startTransaction(invalidOptions2);
            }, /folderPath must not be the root folder/);

            const invalidOptions3 = { ...options, folderPath: 'root' };
            await assert.rejects(async () => {
                await startTransaction(invalidOptions3);
            }, /folderPath must not be the root folder/);
        });
    });
});
