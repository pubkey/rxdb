import config from './config.ts';

import {
    createRxDatabase,
    randomToken,
    ReplicationPullHandlerResult,
    RxReplicationWriteToMasterRow,
    WithDeleted,
    RxCollection,
} from '../../plugins/core/index.mjs';
import { map, Subject } from 'rxjs';
import { RxReplicationState } from '../../plugins/replication/index.mjs';

type CollectionCheckpoint = { Checkpoint: number; };

type Doc = {
    id: string;
    firstName: string;
    lastName: string;
    age: number;
};

describe('replication-checkpoints.test.js', () => {
    it('should correctly handle short primary key lengths', async function () {
        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 1,
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
        };

        const name = randomToken(10);

        // create a database
        const db = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true,
        });
        const { mycollection }: { mycollection: RxCollection<Doc>; } =
            await db.addCollections({
                mycollection: {
                    schema: mySchema,
                },
            });

        const syncSubj = new Subject<{
            docs: Array<WithDeleted<Doc>>;
            checkpoint: number;
        }>();

        const dummyPull = {
            batchSize: 10,
            handler(
                lastPulledCheckpoint: CollectionCheckpoint | undefined
            ): Promise<
                ReplicationPullHandlerResult<Doc, CollectionCheckpoint>
            > {
                // no new data
                return Promise.resolve({
                    documents: [],
                    checkpoint: lastPulledCheckpoint,
                });
            },
            stream$: syncSubj.asObservable().pipe(
                map((sync) => ({
                    documents: sync.docs,
                    checkpoint: { Checkpoint: sync.checkpoint },
                }))
            ),
        };

        let lastCheckpoint: number | null = null;
        const dummyPush = {
            batchSize: 10,
            handler(
                rows: RxReplicationWriteToMasterRow<Doc>[]
            ): Promise<WithDeleted<Doc>[]> {
                // simply send the write rows back as synced data
                lastCheckpoint = (lastCheckpoint ?? 0) + 1;
                syncSubj.next({
                    docs: rows.map((r) => ({
                        id: r.newDocumentState.id,
                        firstName: r.newDocumentState.firstName,
                        lastName: r.newDocumentState.lastName,
                        age: r.newDocumentState.age,
                        _deleted: r.newDocumentState._deleted,
                    })),
                    checkpoint: lastCheckpoint,
                });
                // no conflicts
                return Promise.resolve([]);
            },
        };

        const repl = new RxReplicationState<Doc, CollectionCheckpoint>(
            'repltest-' + db.name,
            mycollection,
            '_deleted',
            dummyPull,
            dummyPush,
            true,
            5000
        );
        repl.start();

        // insert a document
        await mycollection.insert({
            id: 'f',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56,
        });

        // The bug appears here, the following call will throw an error, the error comes from
        // https://github.com/pubkey/rxdb/blob/3ab3124eed2cf952c58ebb0b26955a3d3879cff2/src/replication-protocol/checkpoint.ts#L130
        // and the error is that the key `up|1` is too long, since the meta instance has a maximum
        // key length of 1 + 2 = 3.
        await repl.awaitInSync();

        // clean up afterwards
        db.close();
    });
});
