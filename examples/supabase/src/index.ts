
import {

    createRxDatabase,
    addRxPlugin,
    RxCollection,
    RxDocument,
    lastOfArray,
    RxReplicationPullStreamItem,
    createRevision,
    RxReplicationWriteToMasterRow
} from 'rxdb';

import {
    RxDBDevModePlugin
} from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin); // TODO only add this in dev mode

import {
    getRxStorageDexie
} from 'rxdb/plugins/dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import {
    replicateRxCollection
} from 'rxdb/plugins/replication';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);


import { createClient } from '@supabase/supabase-js';
import { heroSchema, RxHeroDocumentType } from './hero.schema';
import { Subject } from 'rxjs';

const SUPABASE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const SUPABASE_URL = 'http://localhost:8000';

export type RxHeroDocument = RxDocument<RxHeroDocumentType, {}>;
export type RxHeroCollection = RxCollection<RxHeroDocumentType, {}, {}>;
export type RxHeroesCollections = {
    heroes: RxHeroCollection;
};
export type CheckpointType = {
    name: string;
    updatedAt: number;
};

const insertButton = document.querySelector('#insert-button');
const heroesList = document.querySelector('#heroes-list');
// const leaderIcon = document.querySelector('#leader-icon');
// const storageField = document.querySelector('#storage-key');
// const databaseNameField = document.querySelector('#database-name');


async function run() {
    console.log('run()');


    heroesList.innerHTML = 'Create database..';
    const database = await createRxDatabase<RxHeroesCollections>({
        name: 'supabase-example-db',
        storage: wrappedValidateAjvStorage({
            storage: getRxStorageDexie()
        }),
        multiInstance: true
    });
    heroesList.innerHTML = 'Create collection..';
    await database.addCollections({
        heroes: {
            schema: heroSchema
        }
    });

    heroesList.innerHTML = 'Subscribe to query..';
    database.heroes
        .find({
            sort: [{ name: 'asc' }]
        }).$
        .subscribe(heroes => {
            console.log('emitted heroes:');
            console.dir(heroes.map(d => d.toJSON()));
            let html = '';
            heroes.forEach(hero => {
                html += `
                    <li class="hero-item">
                        <div class="color-box" style="background:${hero.color}"></div>
                        <div class="name">${hero.name} (updatedAt: ${hero.updatedAt})</div>
                        <div class="delete-icon" onclick="window.deleteHero('${hero.primary}')">DELETE</div>
                    </li>
                `;
            });
            heroesList.innerHTML = html;
        });



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
            async handler(rows: RxReplicationWriteToMasterRow<RxHeroDocumentType>[]) {
                if (rows.length !== 1) {
                    throw new Error('too many push documents');
                }
                const row = rows[0];
                const doc = row.newDocumentState;

                // insert
                if (!row.assumedMasterState) {
                    const { data, error } = await supabase
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

    // set up click handlers
    (window as any).deleteHero = async (name: string) => {
        console.log('delete doc ' + name);
        const doc = await database.heroes.findOne(name).exec();
        if (doc) {
            console.log('got doc, remove it');
            try {
                await doc.remove();
            } catch (err) {
                console.error('could not remove doc');
                console.dir(err);
            }
        }
    };
    (insertButton as any).onclick = async function () {
        const name = (document.querySelector('input[name="name"]') as any).value;
        const color = (document.querySelector('input[name="color"]') as any).value;
        const obj = {
            name: name,
            color: color,
            updatedAt: new Date().getTime(),
            replicationRevision: '1'
        };
        obj.replicationRevision = createRevision(
            database.hashFunction,
            obj as any
        );
        console.log('inserting hero:');
        console.dir(obj);

        await database.heroes.insert(obj);
        (document.querySelector('input[name="name"]') as any).value = '';
        (document.querySelector('input[name="color"]') as any).value = '';
    };
}
run();
