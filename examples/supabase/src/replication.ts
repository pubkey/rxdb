import { createClient } from '@supabase/supabase-js';
import { lastOfArray, RxDatabase, RxReplicationPullStreamItem, RxReplicationWriteToMasterRow } from 'rxdb';
import { Subject } from 'rxjs';
import { CheckpointType, RxHeroDocument, RxHeroesCollections } from './types';
import {
    replicateRxCollection
} from 'rxdb/plugins/replication';
import { RxHeroDocumentType } from './hero.schema';

const SUPABASE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const SUPABASE_URL = 'http://localhost:8000';

export async function startReplication(database: RxDatabase<RxHeroesCollections>) {
    const supabase = createClient(
        SUPABASE_URL,
        SUPABASE_TOKEN,
        {
        }
    );

    console.dir(supabase);

    const { data, error } = await supabase.from('heroes').select()
    console.dir(data);
    console.dir(error);

    const pullStream$ = new Subject<RxReplicationPullStreamItem<RxHeroDocument, CheckpointType>>();
    supabase
        .from('heroes')
        .on('*', (payload) => {
            console.log('Change received!', payload);
            const doc = payload.new;
            pullStream$.next({
                checkpoint: {
                    name: doc.name,
                    updatedAt: doc.updatedAt
                },
                documents: [doc]
            });
        })
        .subscribe((status: string) => {
            console.log('STATUS changed');
            console.dir(status);
            if (status === 'SUBSCRIBED') {
                pullStream$.next('RESYNC');
            }
        });



    const replicationState = await replicateRxCollection<RxHeroDocumentType, CheckpointType>({
        collection: database.heroes,
        replicationIdentifier: 'supabase-replication-to-' + SUPABASE_URL,
        deletedField: 'deleted',
        pull: {
            async handler(lastCheckpoint, batchSize) {
                const minTimestamp = lastCheckpoint ? lastCheckpoint.updatedAt : 0;
                console.log('minTimestamp: ' + minTimestamp);

                // const all = await supabase.from('heroes');
                // console.log('all:');
                // console.dir(all.data);



                const { data, error } = await supabase.from('heroes')
                    .select()
                    .gt('updatedAt', minTimestamp) // TODO also compare checkpoint.id
                    .order('updatedAt', { ascending: true })
                    .limit(batchSize);
                if (error) {
                    throw error;
                }
                const docs = data;
                console.log('pull data:');
                console.dir(docs);

                return {
                    documents: docs,
                    checkpoint: docs.length === 0 ? lastCheckpoint : {
                        name: lastOfArray(docs).name,
                        updatedAt: lastOfArray(docs).updatedAt
                    }
                };
            },
            batchSize: 10,
            stream$: pullStream$.asObservable()
        },
        push: {
            batchSize: 1,
            /**
             * TODO all these ifs and elses could be a
             * supabase rpc() call instead.
             */
            async handler(rows: RxReplicationWriteToMasterRow<RxHeroDocumentType>[]) {
                if (rows.length !== 1) {
                    throw new Error('too many push documents');
                }
                const row = rows[0];
                const doc = row.newDocumentState;

                // insert
                if (!row.assumedMasterState) {
                    const { error } = await supabase
                        .from('heroes')
                        .insert([doc]);
                    if (error) {
                        // we have an insert conflict
                        const conflictDocRes = await supabase.from('heroes')
                            .select()
                            .eq('name', doc.name)
                            .limit(1);
                        return [conflictDocRes.data[0]];
                    } else {
                        return [];
                    }
                }
                // update
                const { data, error } = await supabase
                    .from('heroes')
                    .update(doc)
                    .match({
                        name: doc.name,
                        replicationRevision: doc.replicationRevision
                    });
                if (error) {
                    throw error;
                }
                console.log('update response:');
                console.dir(data);
                if (data.length === 0) {
                    // we have an updated conflict
                    const conflictDocRes = await supabase.from('heroes')
                        .select()
                        .eq('name', doc.name)
                        .limit(1);
                    return [conflictDocRes.data[0]];
                }
                return [];
            }
        }
    });
    replicationState.error$.subscribe(err => {
        console.error('replicationState.error$:');
        console.dir(err);
    });

    return replicationState;
}
