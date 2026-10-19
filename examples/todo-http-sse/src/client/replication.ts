import { Subject } from 'rxjs';
import {
    replicateRxCollection,
    type RxReplicationState
} from 'rxdb/plugins/replication';
import type { RxReplicationPullStreamItem } from 'rxdb';
import type {
    PullResponse,
    PullStreamEvent,
    TodoCheckpoint,
    TodoDocType
} from '../shared/schema.ts';
import type { TodoCollection } from './database.ts';

/**
 * In the browser this is the global EventSource.
 * In Node.js the tests pass the implementation from the 'eventsource' package.
 */
export type EventSourceConstructor = typeof EventSource;

export type TodoReplication = RxReplicationState<TodoDocType, TodoCheckpoint>;

export function replicateTodos(
    collection: TodoCollection,
    serverUrl: string,
    EventSourceImpl: EventSourceConstructor = EventSource
): TodoReplication {
    const pullStream$ = new Subject<RxReplicationPullStreamItem<TodoDocType, TodoCheckpoint>>();
    let eventSource: EventSource | undefined;

    function connectPullStream() {
        eventSource = new EventSourceImpl(serverUrl + '/api/todos/pullStream');
        eventSource.onmessage = (event) => {
            const data: PullStreamEvent = JSON.parse(event.data);
            pullStream$.next({
                documents: data.documents,
                checkpoint: data.checkpoint
            });
        };
        /**
         * When the connection was lost, events might have been missed.
         * Emitting 'RESYNC' makes the replication switch into the checkpoint
         * iteration mode and pull everything that changed since the last checkpoint.
         * The EventSource reconnects on its own.
         */
        eventSource.onerror = () => pullStream$.next('RESYNC');
        eventSource.onopen = () => pullStream$.next('RESYNC');
    }

    const replicationState = replicateRxCollection<TodoDocType, TodoCheckpoint>({
        collection,
        replicationIdentifier: 'todos-http-sse-' + serverUrl,
        live: true,
        /**
         * Retry after 5 seconds when the server is not reachable.
         */
        retryTime: 5000,
        /**
         * Only the leading browser tab replicates.
         */
        waitForLeadership: true,
        pull: {
            batchSize: 50,
            async handler(checkpoint, batchSize) {
                const seq = checkpoint ? checkpoint.seq : 0;
                const response = await fetch(
                    serverUrl + '/api/todos/pull?seq=' + seq + '&batchSize=' + batchSize
                );
                if (!response.ok) {
                    throw new Error('pull failed with status ' + response.status);
                }
                const data: PullResponse = await response.json();
                return {
                    documents: data.documents,
                    checkpoint: data.checkpoint
                };
            },
            stream$: pullStream$.asObservable()
        },
        push: {
            batchSize: 50,
            async handler(rows) {
                const response = await fetch(serverUrl + '/api/todos/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rows)
                });
                if (!response.ok) {
                    throw new Error('push failed with status ' + response.status);
                }
                /**
                 * The server returns the real server state of each
                 * conflicting document. RxDB then calls the conflictHandler
                 * of the collection and pushes the resolved state again.
                 */
                return await response.json();
            }
        }
    });

    /**
     * The EventSource is opened when the replication starts
     * so that a tab which is not the leader keeps no open connection.
     */
    replicationState.startPromise.then(() => {
        if (!replicationState.isStopped()) {
            connectPullStream();
        }
    }).catch(() => { });
    replicationState.onCancel.push(() => {
        eventSource?.close();
        pullStream$.complete();
    });

    return replicationState;
}
