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

    /**
     * Clean up the reference on RxDatabase.close()
     */
    const oldClose = this.close.bind(this);
    this.close = async function () {
        /**
         * It is very important that we remove the
         * potential leader elected broadcast channel
         * AFTER the database is closed. Otherwise an
         * instance running in another browser tab can
         * already start working on stuff and interfering
         * with a half-closed database and its collections.
         */
        const ret = await oldClose();
        removeBroadcastChannelReference(this.token, this);
        return ret;
    };


    let elector = getLeaderElectorByBroadcastChannel(broadcastChannel);
    if (!elector) {
        elector = getLeaderElectorByBroadcastChannel(broadcastChannel);
        LEADER_ELECTORS_OF_DB.set(
            this,
            elector
        );
    }

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

/**
 * runs when the database gets closed
 */
export function onClose(db: RxDatabase) {
    const has = LEADER_ELECTORS_OF_DB.get(db);
    if (has) {
        has.die();
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
    hooks: {
        preCloseRxDatabase: {
            after: onClose
        }
    }
};
