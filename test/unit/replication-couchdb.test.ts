import assert from 'assert';
import config from './config.ts';
import {
    schemaObjects,
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import {
    replicateCouchDB
} from '../../plugins/replication-couchdb/index.mjs';
import {
    randomToken
} from '../../plugins/core/index.mjs';
import { firstValueFrom } from 'rxjs';

/**
 * These tests run against a custom fetch method
 * that answers like a CouchDB server,
 * so that they do not need a running CouchDB instance.
 * The tests that run against a real CouchDB server
 * are in test/replication-couchdb.test.ts
 */
describe('replication-couchdb.test.ts', () => {
    if (!config.storage.hasReplication) {
        return;
    }

    type CouchChange = {
        id: string;
        seq: number;
        changes: { rev: string; }[];
        deleted?: boolean;
        doc: Record<string, unknown>;
    };

    /**
     * Returns a fetch method that serves the given rows
     * on the _changes endpoint like CouchDB does.
     */
    function getChangesFetch(getChanges: () => CouchChange[]): typeof fetch {
        return (input) => {
            const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
            const sinceParam = url.searchParams.get('since');
            const since = sinceParam === 'now' ? Infinity : Number(sinceParam);
            const limit = Number(url.searchParams.get('limit'));
            const results = getChanges()
                .filter(change => change.seq > since)
                .slice(0, limit);
            const lastSeq = results.length > 0 ? results[results.length - 1].seq : (since === Infinity ? 0 : since);
            return Promise.resolve(new Response(
                JSON.stringify({ results, last_seq: lastSeq, pending: 0 }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            ));
        };
    }

    describe('pull', () => {
        it('should delete the local document when CouchDB sends a tombstone without the document body', async () => {
            const collection = await humansCollection.create(0);
            const human = schemaObjects.humanData('tombstone-doc');
            const neverPulledId = 'never-pulled-doc';
            let changes: CouchChange[] = [{
                id: human.passportId,
                seq: 1,
                changes: [{ rev: '1-a' }],
                doc: {
                    _id: human.passportId,
                    _rev: '1-a',
                    firstName: human.firstName,
                    lastName: human.lastName,
                    age: human.age
                }
            }];
            const url = 'http://localhost/' + randomToken(10) + '/';
            const replicationIdentifier = randomToken(10);
            async function syncOnce() {
                const replicationState = replicateCouchDB({
                    replicationIdentifier,
                    collection,
                    url,
                    fetch: getChangesFetch(() => changes),
                    live: false,
                    pull: {}
                });
                const error = await Promise.race([
                    replicationState.awaitInitialReplication().then(() => undefined),
                    firstValueFrom(replicationState.error$, { defaultValue: undefined })
                ]);
                await replicationState.cancel();
                if (error) {
                    throw error;
                }
            }

            await syncOnce();
            const docAfterFirstSync = await collection.findOne(human.passportId).exec(true);
            assert.strictEqual(docAfterFirstSync.firstName, human.firstName);

            /**
             * A document that is deleted with a DELETE request
             * is returned by the _changes endpoint with only
             * the _id, _rev and _deleted fields.
             * @link https://docs.couchdb.org/en/stable/api/document/common.html#delete--db-docid
             */
            changes = [
                {
                    id: human.passportId,
                    seq: 2,
                    changes: [{ rev: '2-b' }],
                    deleted: true,
                    doc: {
                        _id: human.passportId,
                        _rev: '2-b',
                        _deleted: true
                    }
                },
                {
                    id: neverPulledId,
                    seq: 3,
                    changes: [{ rev: '2-c' }],
                    deleted: true,
                    doc: {
                        _id: neverPulledId,
                        _rev: '2-c',
                        _deleted: true
                    }
                }
            ];
            await syncOnce();

            const docsAfterDelete = await collection.find().exec();
            assert.deepStrictEqual(docsAfterDelete.map(doc => doc.primary), []);

            await collection.database.close();
        });
    });
});
