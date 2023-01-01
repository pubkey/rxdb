import * as path from 'path';
import * as fs from 'fs';

import assert from 'assert';
import { waitUntil } from 'async-test-util';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import {
    addRxPlugin,
    blobBufferUtil
} from '../../';
import { createAttachments } from '../helper/humans-collection';
import {
    backupSingleDocument,
    clearFolder,
    RxBackupState,
    getMeta
} from '../../plugins/backup';
import { BackupMetaFileContent, RxBackupWriteEvent } from '../../src/types';

describe('backup.test.ts', () => {

    if (!config.platform.isNode()) {
        // backup to filesystem only works on node.js not in browsers
        return;
    }

    const { RxDBBackupPlugin } = require('../../plugins/backup');
    addRxPlugin(RxDBBackupPlugin);

    const backupRootPath = path.join(
        config.rootPath,
        'test_tmp',
        '_backups'
    );
    clearFolder(backupRootPath);
    let lastBackupDirIndex = 0;
    const getBackupDir = () => {
        lastBackupDirIndex = lastBackupDirIndex + 1;
        return path.join(backupRootPath, lastBackupDirIndex + '');
    };

    describe('.backupSingleDocument()', () => {
        it('should backup a single document', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const collection = await createAttachments(1);
            const firstDoc = await collection.findOne().exec(true);
            await firstDoc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('lol', 'text/plain'),
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
                require(
                    path.join(directory, firstDoc.primary, 'document.json')
                )
            );

            collection.database.destroy();
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
                data: blobBufferUtil.createBlobBuffer('lol', 'text/plain'),
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
                require(
                    path.join(directory, firstDoc.primary, 'document.json')
                )
            );

            const meta: BackupMetaFileContent = await getMeta(options);
            assert.ok(meta.collectionStates.human.checkpoint);

            collection.database.destroy();
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

            collection.database.destroy();
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
                data: blobBufferUtil.createBlobBuffer('lol', 'text/plain'),
                type: 'text/plain'
            });
            const directory = getBackupDir();
            const backupState = collection.database.backup({
                live: true,
                directory,
                attachments: true
            });
            await backupState.awaitInitialBackup();

            const doc2 = await collection.insert(schemaObjects.human());

            await waitUntil(() => {
                return fs.existsSync(path.join(directory, doc2.primary));
            });
            await waitUntil(() => {
                return fs.existsSync(
                    path.join(directory, doc2.primary, 'document.json')
                );
            });

            await collection.database.destroy();
            // backupState should be stopped
            assert.strictEqual(backupState.isStopped, true);
        });
    });
});
