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
import PouchDBPlugin from 'pouchdb-adapter-idb';

import config from './config';

import {
    addRxPlugin,
    createRxDatabase,
    randomCouchString,
    blobBufferUtil
} from '../../';
import { RxDBAttachmentsPlugin } from '../../plugins/attachments';
import { wrappedKeyEncryptionStorage } from '../../plugins/encryption';
import { addPouchPlugin, getRxStoragePouch } from '../../plugins/pouchdb';
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import { RxDBUpdatePlugin } from '../../plugins/update';
import { wait } from 'async-test-util';

addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBAttachmentsPlugin);
addPouchPlugin(PouchDBPlugin);

const attName = 'red_dot_1px_image';
const redDotBase64 =
    'data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAAAQAAAAEAAAABABgAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAJBztAA==';

const convertBase64ToBlob = (base64Image: string) => {
    const parts = base64Image.split(';base64,');
    const imageType = parts[0].split(':')[1];
    return blobBufferUtil.createBlobBufferFromBase64(
        parts[1],
        imageType
    );
    const decodedData = atob(parts[1]);
    const uInt8Array = new Uint8Array(decodedData.length);
    for (let i = 0; i < decodedData.length; ++i) {
        uInt8Array[i] = decodedData.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: imageType });
};

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {


        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100,
                },
                firstName: {
                    type: 'string',
                },
                lastName: {
                    type: 'string',
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150,
                },
            },
            attachments: {
                encrypted: false,
            },
        };

        // generate a random database-name
        const name = randomCouchString(10);

        // create an encrypted storage
        const encryptedPoachStorage = wrappedKeyEncryptionStorage({
            storage: config.storage.getStorage(),
        });

        // create a database
        const db = await createRxDatabase({
            name,
            storage: encryptedPoachStorage,
            password: 'password',
            eventReduce: false,
            multiInstance: true,
            ignoreDuplicate: true,
            pouchSettings: {
                auto_compaction: false,
                revs_limit: 5,
            },
        });

        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema,
            },
        });

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56,
        });

        // find the document in the other tab
        const myDocument = await db.mycollection
            .findOne()
            .where('firstName')
            .eq('Bob')
            .exec();

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.strictEqual(myDocument.age, 56);

        // generate blob for attachment
        const blob = await convertBase64ToBlob(redDotBase64);

        console.log('----');
        console.log(myDocument.toJSON(true));



        // put blob as attachment in storage
        const attachment = await myDocument.putAttachment({
            id: attName,
            data: blob,
            type: 'image/bmp',
        });
        console.log(
            `myDocument.putAttachment with digest: "${attachment?.digest}" will not match digest in the IndexedDB (Debug - Application - IndexedDB - attach-store) causing error later`
        );

        await wait(1000);
        const fromStorage = await myDocument.collection.storageInstance.findDocumentsById(['foobar'], false);
        console.dir(fromStorage);

        console.log('----2');
        console.log(myDocument.toJSON(true));


        // trying update document later and getting Error "A pre-existing attachment stub wasn't found" because digest mismatch
        await myDocument.update({
            $set: {
                age: 60,
            },
        });

        assert.strictEqual(myDocument.age, 60);

        // clean up afterwards
        db.destroy();
    });
});
