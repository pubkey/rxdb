/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

import {
    createLeaderElection,
    LeaderElector,
    BroadcastChannel
} from 'broadcast-channel';
import {
    getBroadcastChannelReference,
    removeBroadcastChannelReference
} from '../../rx-storage-multiinstance.ts';

import type {
    RxDatabase,
    RxPlugin
} from '../../types/index.d.ts';
import { PROMISE_RESOLVE_TRUE, getFromMapOrCreate } from '../utils/index.ts';

const LEADER_ELECTORS_OF_DB: WeakMap<RxDatabase, LeaderElector> = new WeakMap();
const LEADER_ELECTOR_BY_BROADCAST_CHANNEL: WeakMap<BroadcastChannel, LeaderElector> = new WeakMap();

export const OPEN_LEADER_ELECTORS: Set<LeaderElector> = new Set();


/**
 * Returns the leader elector of a broadcast channel.
 * Used to ensure we reuse the same elector for the channel each time.
 */
export function getLeaderElectorByBroadcastChannel(broadcastChannel: BroadcastChannel): LeaderElector {
    return getFromMapOrCreate(
        LEADER_ELECTOR_BY_BROADCAST_CHANNEL,
        broadcastChannel,
        () => createLeaderElection(broadcastChannel)
    );
}

/**
 * @overwrites RxDatabase().leaderElector for caching
 */
export function getForDatabase(this: RxDatabase): LeaderElector {
    const broadcastChannel = getBroadcastChannelReference(
        this.storage.name,
        this.token,
        this.name,
        this
    );

    const elector = getLeaderElectorByBroadcastChannel(broadcastChannel);

    /**
     * Give up the leadership and clean up
     * the reference on RxDatabase.close()
     */
    const oldClose = this.close.bind(this);
    let closePromise: Promise<boolean> | undefined;
    this.close = function () {
        if (!closePromise) {
            closePromise = (async () => {
                /**
                 * It is very important that we give up the leadership
                 * and remove the broadcast channel AFTER the database
                 * is closed. Otherwise an instance running in another
                 * browser tab can already become leader and start working
                 * on stuff (pipelines, replications) while the same work
                 * is still running on the half-closed database and its collections.
                 * die() is awaited so that the election is finished before
                 * the broadcast channel is closed.
                 */
                try {
                    return await oldClose();
                } finally {
                    await elector.die();
                    OPEN_LEADER_ELECTORS.delete(elector);
                    await removeBroadcastChannelReference(this.token, this);
                }
            })();
        }
        return closePromise;
    };

    LEADER_ELECTORS_OF_DB.set(
        this,
        elector
    );
    OPEN_LEADER_ELECTORS.add(elector);

    /**
     * Overwrite for caching
     */
    this.leaderElector = () => elector;

    return elector;
}

export function isLeader(this: RxDatabase): boolean {
    if (!this.multiInstance) {
        return true;
    }
    return this.leaderElector().isLeader;
}

export function waitForLeadership(this: RxDatabase): Promise<boolean> {
    if (!this.multiInstance) {
        return PROMISE_RESOLVE_TRUE;
    } else {
        return this.leaderElector()
            .awaitLeadership()
            .then(() => true);
    }
}

export const rxdb = true;
export const prototypes = {
    RxDatabase: (proto: any) => {
        proto.leaderElector = getForDatabase;
        proto.isLeader = isLeader;
        proto.waitForLeadership = waitForLeadership;
    }
};

export const RxDBLeaderElectionPlugin: RxPlugin = {
    name: 'leader-election',
    rxdb,
    prototypes,
    hooks: {}
};
