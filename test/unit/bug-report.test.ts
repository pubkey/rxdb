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
import config from './config';

import PouchDBPlugin from 'pouchdb-adapter-idb';

import { addRxPlugin, createRxDatabase, randomCouchString } from '../../';
import { RxDBAttachmentsPlugin } from '../../plugins/attachments';
import { wrappedKeyEncryptionStorage } from '../../plugins/encryption';
import { addPouchPlugin, getRxStoragePouch } from '../../plugins/pouchdb';
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import { RxDBUpdatePlugin } from '../../plugins/update';

addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBAttachmentsPlugin);
addPouchPlugin(PouchDBPlugin);

const attName = 'chrome_icon';
const chromeIconBase64 =
    'data:image/png;base64,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';

const convertBase64ToBlob = (base64Image: string) => {
    const parts = base64Image.split(';base64,');
    const imageType = parts[0].split(':')[1];
    const decodedData = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(decodedData.length);
    for (let i = 0; i < decodedData.length; ++i) {
        uInt8Array[i] = decodedData.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: imageType });
};

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and adapt the if statement.
         */
        if (
            !config.platform.isNode() // runs only in node
            // config.platform.isNode() // runs only in the browser
        ) {
            // return;
        }

        if (!config.storage.hasMultiInstance) {
            return;
        }

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
            storage: getRxStoragePouch('idb'),
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
        const blob = convertBase64ToBlob(chromeIconBase64);

        // put blob as attachment in storage
        const attachment = await myDocument.putAttachment({
            id: attName,
            data: blob,
            type: blob.type,
        });
        console.log(
            `myDocument.putAttachment with digest: "${attachment?.digest}" will not match digest in the IndexedDB (Debug - Application - IndexedDB - attach-store) causing error later`
        );

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
