import { RxDatabase } from 'rxdb/plugins/core';
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';
import { EnvironmentParams } from '../../environments/environment';

/**
 * We start the replication in this separate file so
 * that we can swap out the replication by just swapping out
 * this file.
 */
export async function startSync(
    db: RxDatabase,
    environment: EnvironmentParams
) {
    console.log('DatabaseService: sync');
    await Promise.all(
        Object.values(db.collections).map(async (col) => {
            try {
                // create the CouchDB database
                await fetch(
                    environment.rxdbSyncUrl + col.name + '/',
                    {
                        method: 'PUT'
                    }
                );
            } catch (err) { }
        })
    );
    /**
     * For server side rendering,
     * we just run a one-time replication to ensure the client has the same data as the server.
     */
    if (environment.isServerSideRendering) {
        console.log('DatabaseService: await initial replication to ensure SSR has all data');
        const firstReplication = await replicateCouchDB({
            replicationIdentifier: 'couch-server-side-sync',
            collection: db.hero,
            url: environment.rxdbSyncUrl + db.hero.name + '/',
            live: false,
            pull: {},
            push: {}
        });
        await firstReplication.awaitInitialReplication();
    }

    /**
     * we start a live replication which also sync the ongoing changes
     */
    console.log('DatabaseService: start ongoing replication');
    const ongoingReplication = replicateCouchDB({
        replicationIdentifier: 'couch-client-side-sync',
        collection: db.hero,
        url: environment.rxdbSyncUrl + db.hero.name + '/',
        live: true,
        pull: {},
        push: {}
    });
    ongoingReplication.error$.subscribe(err => {
        console.log('Got replication error:');
        console.dir(err);
        console.error(err);
    });
}
