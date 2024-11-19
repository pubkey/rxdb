import * as path from 'node:path';
import * as fs from 'node:fs';

import assert from 'assert';
import { waitUntil } from 'async-test-util';
import config, { getRootPath } from './config.ts';

import {
    addRxPlugin, createBlob
} from '../../plugins/core/index.mjs';
import {
    schemaObjects,
    isNode,
    createAttachments
} from '../../plugins/test-utils/index.mjs';
import {
    backupSingleDocument,
    clearFolder,
    RxBackupState,
    getMeta
} from '../../plugins/backup/index.mjs';
import { BackupMetaFileContent, RxBackupWriteEvent } from '../../plugins/core/index.mjs';

describe('backup.test.ts', () => {

    if (!isNode) {
        // backup to filesystem only works on node.js not in browsers
        return;
    }

    const backupRootPath = path.join(
        getRootPath(),
        'test_tmp',
        '_backups'
    );
    clearFolder(backupRootPath);
    let lastBackupDirIndex = 0;
    const getBackupDir = () => {
        lastBackupDirIndex = lastBackupDirIndex + 1;
        return path.join(backupRootPath, lastBackupDirIndex + '');
    };

    describe('init', () => {
        it('add plugin', async () => {
            const { RxDBBackupPlugin } = await import('../../plugins/backup/index.mjs');
            addRxPlugin(RxDBBackupPlugin);
        });
    });
    describe('.backupSingleDocument()', () => {
        it('should backup a single document', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const collection = await createAttachments(1);
            const firstDoc = await collection.findOne().exec(true);
            await firstDoc.putAttachment({
                id: 'cat.txt',
                data: createBlob('lol', 'text/plain'),
                type: 'text/plain'
            });

            const directory = getBackupDir();

            await backupSingleDocument(
                firstDoc.getLatest(),
                {
                    directory,
                    attachments: true,
                    live: false
                }
            );

            assert.ok(fs.existsSync(path.join(directory, firstDoc.primary)));
            assert.ok(fs.existsSync(path.join(directory, firstDoc.primary, 'attachments', 'cat.txt')));
            assert.ok(
                fs.existsSync(
                    path.join(directory, firstDoc.primary, 'document.json')
                )
            );

            collection.database.close();
        });
    });
    describe('RxDatabase.backup() live=false', () => {
        it('should backup all docs with attachments', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const collection = await createAttachments(1);
            const firstDoc = await collection.findOne().exec(true);
            await firstDoc.putAttachment({
                id: 'cat.txt',
                data: createBlob('lol', 'text/plain'),
                type: 'text/plain'
            });
            const directory = getBackupDir();
            const options = {
                live: false,
                directory,
                attachments: true
            };

            const backupState = collection.database.backup(options);
            await backupState.awaitInitialBackup();

            assert.ok(fs.existsSync(path.join(directory, firstDoc.primary)));
            assert.ok(fs.existsSync(path.join(directory, firstDoc.primary, 'attachments', 'cat.txt')));
            assert.ok(
                fs.existsSync(
                    path.join(directory, firstDoc.primary, 'document.json')
                )
            );

            const meta: BackupMetaFileContent = await getMeta(options);
            assert.ok(meta.collectionStates.human.checkpoint);

            collection.database.close();
        });
        it('should emit write events', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const collection = await createAttachments(1);
            const directory = getBackupDir();
            const options = {
                live: false,
                directory,
                attachments: true
            };
            const emitted: RxBackupWriteEvent[] = [];
            const backupState: RxBackupState = collection.database.backup(options);
            const sub = backupState.writeEvents$.subscribe(ev => emitted.push(ev));
            await backupState.awaitInitialBackup();

            await waitUntil(() => emitted.length > 0);
            assert.strictEqual(emitted[0].deleted, false);

            collection.database.close();
            sub.unsubscribe();
        });
    });
    describe('RxDatabase.backup() live=true', () => {
        it('should backup ongoing writes', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const collection = await createAttachments(1);
            const firstDoc = await collection.findOne().exec(true);
            await firstDoc.putAttachment({
                id: 'cat.txt',
                data: createBlob('lol', 'text/plain'),
                type: 'text/plain'
            });
            const directory = getBackupDir();
            const backupState = collection.database.backup({
                live: true,
                directory,
                attachments: true
            });
            await backupState.awaitInitialBackup();

            const doc2 = await collection.insert(schemaObjects.humanData());

            await waitUntil(() => {
                return fs.existsSync(path.join(directory, doc2.primary));
            });
            await waitUntil(() => {
                return fs.existsSync(
                    path.join(directory, doc2.primary, 'document.json')
                );
            });

            await collection.database.close();
            // backupState should be stopped
            assert.strictEqual(backupState.isStopped, true);
        });
    });
});
