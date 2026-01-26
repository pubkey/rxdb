/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct position in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browser' so it runs in the browser
 */
import assert from 'assert';
import config from './config.ts';

import {createRxDatabase, randomToken, addRxPlugin} from '../../plugins/core/index.mjs';
import {isNode} from '../../plugins/test-utils/index.mjs';
import {RxDBPipelinePlugin} from '../../plugins/pipeline/index.mjs';

interface Creatable {
    created_at: number;
}

interface Updatable extends Creatable {
    updated_at: number;
}

function preInsert<T extends Updatable>(doc: T) {
    const now = Math.floor(Date.now() / 1000);
    if (!doc.created_at) doc.created_at = now;
    if (!doc.updated_at) doc.updated_at = now;
    return doc;
}

function preSave<T extends Updatable>(doc: T) {
    doc.updated_at = Math.floor(Date.now() / 1000);
    return doc;
}

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async function () {
        addRxPlugin(RxDBPipelinePlugin);

        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and adapt the if statement.
         */
        if (
            !isNode // runs only in node
            // isNode // runs only in the browser
        ) {
            // return;
        }

        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const fileSchema = {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 24,
                },
                type: {
                    type: 'string',
                },
                name: {
                    type: 'string',
                },
                folderId: {
                    type: 'string',
                    ref: 'folders',
                    maxLength: 24,
                },
                folderPath: {
                    type: 'array',
                    ref: 'folders',
                    items: {
                        type: 'string',
                        maxLength: 24,
                    },
                },
                created_at: {
                    type: 'integer',
                },
                updated_at: {
                    type: 'integer',
                },
            },
            required: ['id', 'type', 'name', 'folderPath', 'created_at', 'updated_at'],
            attachments: {},
        } as const;
        const folderSchema = {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 24,
                },
                name: {
                    type: 'string',
                },
                parentFolder: {
                    type: 'string',
                    maxLength: 24,
                    ref: 'folders',
                },
                path: {
                    type: 'array',
                    ref: 'folders',
                    items: {
                        type: 'string',
                        maxLength: 24,
                    },
                },
                fileCount: {
                    type: 'number',
                },
                created_at: {
                    type: 'integer',
                },
                updated_at: {
                    type: 'integer',
                },
            },
            required: ['id', 'name', 'path', 'fileCount', 'created_at', 'updated_at'],
            attachments: {},
        } as const;

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomToken(10);

        // create a database
        const db = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });

        // create a collection
        const collections = await db.addCollections({
            files: {
                schema: fileSchema,
            },
            folders: {
                schema: folderSchema,
            },
        });

        collections.files.preInsert(preInsert, false);
        collections.files.preSave(preSave, false);
        collections.folders.preInsert(preInsert, false);
        collections.folders.preSave(preSave, false);

        const filePathSyncPipeline = await collections.files.addPipeline({
            identifier: 'file-path-sync',
            destination: collections.files,
            async handler(docs) {
                try {
                    console.log('sycning file paths');
                    const parentFolders = Array.from(
                        new Set(
                            docs
                                .map((fileDoc) => fileDoc.folderId)
                                .filter((folderId): folderId is string => Boolean(folderId)),
                        ),
                    );
                    const folderPathMap = new Map(
                        await collections.folders
                            .find({selector: {id: {$in: parentFolders}}})
                            .exec()
                            .then((folderDocs) =>
                                folderDocs.map((doc) => [doc.id, doc.path.concat([doc.id])] as const),
                            ),
                    );
                    console.log('got folder paths for files', folderPathMap);

                    await Promise.all(
                        docs
                            .filter((doc) => {
                                if (!doc.folderId) return doc.folderPath.length !== 0;

                                const docFolderPaths = folderPathMap.get(doc.folderId) ?? [];
                                return doc.folderPath.some(
                                    (folderId, index) => folderId !== docFolderPaths[index],
                                );
                            })
                            .map((doc) =>
                                doc.incrementalPatch({
                                    folderPath: doc.folderId
                                        ? (folderPathMap.get(doc.folderId) ?? [])
                                        : [],
                                }),
                            ),
                    );
                    console.log('updated file paths');
                } catch (e) {
                    console.error('Error while trying to sync file paths', e);
                }
            },
        });

        // This code cuases both pipelines to hang
        await collections.files.addPipeline({
            identifier: 'file-changed-file-count',
            destination: collections.folders,
            async handler(docs) {
                console.log('waiting on file paths sync');
                // Make sure our file paths are in sync before we do anything
                await filePathSyncPipeline.awaitIdle();

                const foldersToUpdate = new Set(docs.flatMap((doc) => doc.getLatest().folderPath));
                console.log('updating folders with new file count', foldersToUpdate);
                await Promise.all(
                    Array.from(foldersToUpdate).map(async (folderId) => {
                        const fileCount = await collections.files
                            .count({
                                selector: {
                                    folderPath: {$elemMatch: {$eq: folderId}},
                                },
                            })
                            .exec();

                        await collections.folders
                            .findOne({selector: {id: folderId}})
                            .incrementalPatch({fileCount});
                    }),
                );
                console.log('file paths updated');
            },
        });

        // insert a document
        const rootFolder = await collections.folders.insert({
            id: '696e92a203bdc7b552a6e0af',
            name,
            parentFolder: undefined,
            path: [],
            fileCount: 0,
            created_at: 0,
            updated_at: 0,
        });

        const subFolder = await collections.folders.insert({
            id: '696e92a803bdc7b552a6e0b0',
            name,
            parentFolder: rootFolder.id,
            path: [rootFolder.id],
            fileCount: 0,
            created_at: 0,
            updated_at: 0,
        });

        await collections.files.insert({
            id: '696e92ae03bdc7b552a6e0b1',
            name: 'myfile.pdf',
            type: 'application/pdf',
            folderId: subFolder.id,
            folderPath: [],
            created_at: 0,
            updated_at: 0,
        });

        assert.strictEqual(rootFolder.getLatest().fileCount, 1);
        assert.strictEqual(subFolder.getLatest().fileCount, 1);

        db.close();
    });
});
