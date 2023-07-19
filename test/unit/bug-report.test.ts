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
import {wait} from 'async-test-util';
import {replicateRxCollection} from '../../plugins/replication';
import { RxCollection, randomCouchString } from '../../';
import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';

type TestDocType = schemaObjects.HumanWithTimestampDocumentType;

describe('bug-report.test.js', () => {
    const REPLICATION_IDENTIFIER_TEST = 'replication-ident-tests';
    async function getTestCollections(docsAmount: { local: number; remote: number; }): Promise<{
        localCollection: RxCollection<TestDocType, {}, {}, {}>;
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>;
    }> {
        const localCollection = await humansCollection.createHumanWithTimestamp(docsAmount.local, randomCouchString(10), false);
        const remoteCollection = await humansCollection.createHumanWithTimestamp(docsAmount.remote, randomCouchString(10), false);
        return {
            localCollection,
            remoteCollection
        };
    }

    it('should emit false from active$ when replication is failed', async () => {
        const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
        const replicationState = replicateRxCollection({
            collection: localCollection,
            replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
            live: true,
            pull: {
                handler: async () => {
                    await wait(0);
                    throw new Error('must throw on pull');
                }
            },
            push: {
                handler: async () => {
                    await wait(0);
                    throw new Error('must throw on push');
                }
            },
        });

        const values: boolean[] = [];
        replicationState.active$.subscribe((active) => {
            values.push(active);
        });

        // waiting for one second instead of awaitInitialReplication
        // because it will never resolve when replication is failed
        await wait(1000);
        assert.strictEqual(
            values.length > 0,
            true
        );
        assert.strictEqual(
            values[0],
            false,
        );
        assert.strictEqual(
            values[values.length - 1],
            false
        );

        localCollection.database.destroy();
        remoteCollection.database.destroy();
    });
});
