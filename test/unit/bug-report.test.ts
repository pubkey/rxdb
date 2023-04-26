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

import {
    createRxDatabase,
    randomCouchString
} from '../../';
import { collection, doc, getDoc, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { replicateFirestore } from '../../plugins/replication-firestore';

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
                    maxLength: 100
                },
                firstName: {
                    type: 'string'
                },
                lastName: {
                    type: 'string'
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            }
        };

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomCouchString(10);

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
            mycollection: {
                schema: mySchema
            }
        });

        const projectId = 'add me';

        // Setup Firebase
        const firebaseConfig = {
            apiKey: 'add me',
            authDomain: 'add me',
            projectId: projectId,
            storageBucket: 'add me',
            messagingSenderId: 'add me',
            appId: 'add me'
          };

          const firebaseApp = initializeApp(firebaseConfig);
          const auth = getAuth();
          await signInAnonymously(auth);
          const firestoreDatabase = getFirestore(firebaseApp);

        // Setup Replication
        const firestoreUsersCollection = collection(firestoreDatabase, 'mycollection');

        const replicationState = replicateFirestore({
            collection: db.collections.mycollection,
            firestore: {
              projectId: projectId,
              database: firestoreDatabase,
              collection: firestoreUsersCollection,
            },
            pull: {},
            push: {},
            live: true,
          });

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });
        await replicationState.awaitInitialReplication();

        await collections.mycollection.incrementalUpsert({
            passportId: 'foobar',
            age: 60
        });
        await collections.mycollection.incrementalUpsert({
            passportId: 'foobar',
            age: 30
        });

        // get the document
        const myDocument = await collections.mycollection.findOne({selector: { passportId: 'foobar'}}).exec();

        /*
         * check that the local value is correct
         */
        assert.strictEqual(myDocument.age, 30);

        /*
         * check that the value on firebase is correct
         */
        const docRef = doc(firestoreDatabase, 'mycollection', 'foobar');
        const docSnap = await getDoc(docRef);

        assert.strictEqual(docSnap.data().age, 30);

        // clean up afterwards
        db.destroy();

    });
});
