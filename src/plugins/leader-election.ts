/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

import {
    createLeaderElection,
    LeaderElector
} from 'broadcast-channel';

import type {
    RxDatabase,
    RxPlugin
} from '../types';
import {
    ensureNotFalsy,
    PROMISE_RESOLVE_TRUE
} from '../util';

const LEADER_ELECTORS_OF_DB: WeakMap<RxDatabase, LeaderElector> = new WeakMap();

export function getForDatabase(this: RxDatabase): LeaderElector {
    if (!LEADER_ELECTORS_OF_DB.has(this)) {
        const broadcastChannel = ensureNotFalsy(this.broadcastChannel);
        LEADER_ELECTORS_OF_DB.set(
            this,
            createLeaderElection(broadcastChannel)
        );
    }
    return LEADER_ELECTORS_OF_DB.get(this) as LeaderElector;
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
 * runs when the database gets destroyed
 */
export function onDestroy(db: RxDatabase) {
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
        preDestroyRxDatabase: onDestroy
    }
};
