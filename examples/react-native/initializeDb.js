import {
    addRxPlugin,
    createRxDatabase,
    createBlob,
    getBlobSize,
    blobToBase64String
} from 'rxdb';
import fetch from 'cross-fetch';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema'
import { RxDBUpdatePlugin } from 'rxdb/plugins/update'
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder'
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb'
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';

addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBAttachmentsPlugin);

/**
 * @link https://discord.com/channels/969553741705539624/1341392686267109458/1343639513850843217
 */
import * as Crypto from 'expo-crypto';
if (typeof global.crypto.subtle === 'undefined') {
    global.crypto.subtle = {
        digest: Crypto.digest,
    };
}



import schema from './src/Schema';

import {
    STORAGE_SQLITE,
    STORAGE_MEMORY
} from './storage';

const syncURL = 'http://admin:mysecret1@localhost:5984'; // Replace with your couchdb instance
const dbName = 'heroesreactdatabase2';
export const HeroesCollectionName = 'heroes';

const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.DEBUG_PROD === 'true';

async function initialize(withReplication, storage = STORAGE_SQLITE) {
    if (isDevelopment) {
        await addRxPlugin(RxDBDevModePlugin);
    }

    let db;
    try {
        console.log('Initializing database...');
        db = await createRxDatabase({
            name: dbName,
            storage,
            multiInstance: false,
            ignoreDuplicate: true,
        });
        console.log('Database initialized!');
    } catch (err) {
        console.log('ERROR CREATING DATABASE', err);
    }

    try {
        console.log('Adding hero collection...');
        await db.addCollections({
            [HeroesCollectionName]: {
                schema: schema,
            },
        });
        console.log('Collection added!');
    } catch (err) {
        console.log('ERROR CREATING COLLECTION', err);
    }

    // add a document for testing purposes
    const doc = await db[HeroesCollectionName].upsert({ name: 'Alice', color: 'green' });

    // // make sure attachments work
    // console.log('attachment test 1');
    // const attachmentData = createBlob('meowmeow', 'text/plain');
    // console.log('attachment test 2');
    // // const dataSize = getBlobSize(attachmentData.data);
    // console.log('attachment test 2.1');
    // const dataString = await blobToBase64String(attachmentData.data);
    // console.log('attachment test 2.2');
    // const digest = await db.hashFunction(dataString);
    // console.log('attachment test 2.3');
    // const attachment = await doc.putAttachment(
    //     {
    //         id: 'cat.txt',     // (string) name of the attachment
    //         data: attachmentData,   // (string|Blob) data of the attachment
    //         type: 'text/plain'    // (string) type of the attachment-data like 'image/jpeg'
    //     }
    // );
    // console.log('attachment test 3');
    // const getAttachment = await doc.getAttachment('meowmeow');
    // console.log('attachment test 4');
    // const getAttachmentData = await getAttachment.getData();
    // console.log('attachment test 5');


    if (withReplication) {
        try {
            console.log('Start sync...');
            const replicationState = replicateCouchDB({
                collection: db[HeroesCollectionName],
                url: `${syncURL}/${HeroesCollectionName}/`,
                fetch: fetch,
                pull: {},
                push: {}
            });

            console.dir(replicationState);

            replicationState.active$.subscribe((v) => {
                console.log('Replication active$:', v)
            })
            replicationState.canceled$.subscribe((v) => {
                console.log('Replication canceled$:', v)
            })
            replicationState.error$.subscribe(async error => {
                console.error('Replication error$:', error)
            })
        } catch (err) {
            console.log('Error initialize sync', err);
        }
    }

    return db;
};

export default initialize;
