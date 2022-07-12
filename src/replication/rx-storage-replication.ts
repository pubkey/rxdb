/**
 * Replicates two RxStorageInstances
 * with each other.
 * 
 * Compared to the 'normal' replication plugins,
 * this one is made for internal use where:
 * - No permission handling is needed.
 * - It is made so that the write amount on the master is less but might increase on the child.
 * - It does not have to be easy to implement a compatible backend.
 *   Here we use another RxStorageImplementation as replication goal
 *   so it has to exactly behave like the RxStorage interface defines.
 * 
 * This is made to be used internally by plugins
 * to get a really fast replication performance.
 * 
 * The replication works like git, where the fork contains all new writes
 * and must be merged with the master before it can push it's new state to the master.
 */

import {
    BehaviorSubject,
    combineLatest,
    filter,
    firstValueFrom,
    map
} from 'rxjs';
import {
    getPrimaryFieldOfPrimaryKey
} from '../rx-schema-helper';
import type {
    EventBulk,
    RxDocumentData,
    RxReplicationHandler,
    RxStorageInstance,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState
} from '../types';
import {
    ensureNotFalsy,
    lastOfArray,
    PROMISE_RESOLVE_VOID
} from '../util';
import {
    getCheckpointKey
} from './checkpoint';
import { startReplicationDownstream } from './downstream';
import { startReplicationUpstream } from './upstream';


export function replicateRxStorageInstance<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): RxStorageInstanceReplicationState<RxDocType> {
    const state: RxStorageInstanceReplicationState<RxDocType> = {
        primaryPath: getPrimaryFieldOfPrimaryKey(input.forkInstance.schema.primaryKey),
        input,
        checkpointKey: getCheckpointKey(input),
        canceled: new BehaviorSubject<boolean>(false),
        firstSyncDone: {
            down: new BehaviorSubject<boolean>(false),
            up: new BehaviorSubject<boolean>(false)
        },
        lastCheckpoint: {},
        streamQueue: {
            down: PROMISE_RESOLVE_VOID,
            up: PROMISE_RESOLVE_VOID
        }
    };

    startReplicationDownstream(state);
    startReplicationUpstream(state);
    return state;
}

export async function awaitRxStorageReplicationFirstInSync(
    state: RxStorageInstanceReplicationState<any>
) {
    return firstValueFrom(
        combineLatest([
            state.firstSyncDone.down.pipe(
                filter(v => !!v)
            ),
            state.firstSyncDone.up.pipe(
                filter(v => !!v)
            )
        ])
    );
}

export async function awaitRxStorageReplicationIdle(
    state: RxStorageInstanceReplicationState<any>
) {
    await awaitRxStorageReplicationFirstInSync(state);
    while (true) {
        const { down, up } = state.streamQueue;
        await Promise.all([
            up,
            down
        ]);
        /**
         * If the Promises have not been reasigned
         * after awaiting them, we know that the replication
         * is in idle state at this point in time.
         */
        if (
            down === state.streamQueue.down &&
            up === state.streamQueue.up
        ) {
            return;
        }
    }
}


export function rxStorageInstanceToReplicationHandler<RxDocType, MasterCheckpointType>(
    instance: RxStorageInstance<RxDocType, any, any, MasterCheckpointType>,
): RxReplicationHandler<RxDocumentData<RxDocType>, MasterCheckpointType> {
    return {
        masterChangeStream$: instance.changeStream().pipe(
            map(eventBulk => {
                const ret: EventBulk<RxDocumentData<RxDocType>, MasterCheckpointType> = {
                    id: eventBulk.id,
                    checkpoint: eventBulk.checkpoint,
                    events: eventBulk.events.map(event => {
                        if (event.change.doc) {
                            return event.change.doc as any;
                        } else {
                            return event.change.previous as any;
                        }
                    })
                };
                return ret;
            })
        ),
        masterChangesSince(
            checkpoint,
            bulkSize
        ) {
            return instance.getChangedDocumentsSince(
                bulkSize,
                checkpoint
            ).then(result => {
                return {
                    checkpoint: result.length > 0 ? lastOfArray(result).checkpoint : checkpoint,
                    documentsData: result.map(r => r.document)
                }
            })
        },
        async masterWrite(
            rows
        ) {
            const result = await instance.bulkWrite(
                rows.map(r => ({
                    previous: r.assumedMasterState,
                    document: r.newDocumentState
                }))
            );

            const conflicts: RxDocumentData<RxDocType>[] = [];
            Object
                .values(result.error)
                .forEach(err => {
                    if (err.status !== 409) {
                        throw new Error('non conflict error');
                    } else {
                        conflicts.push(ensureNotFalsy(err.documentInDb));
                    }
                });
            return conflicts;
        }
    };
}
