/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

import {
    createLeaderElection,
    LeaderElector as BroadcastChannelLeaderElector
} from 'broadcast-channel';

import type {
    RxDatabase,
    RxPlugin
} from '../types';

const LEADER_ELECTORS_OF_DB: WeakMap<RxDatabase, LeaderElector> = new WeakMap();

export class LeaderElector {
    public destroyed: boolean = false;
    public isLeader: boolean = false;
    public isDead: boolean = false;
    public elector: BroadcastChannelLeaderElector;
    constructor(
        public database: RxDatabase
    ) {
        this.elector = createLeaderElection(database.broadcastChannel as any);
    }

    die() {
        return this.elector.die();
    }

    waitForLeadership(): Promise<boolean> {
        return this.elector.awaitLeadership().then(() => {
            this.isLeader = true;
            return true;
        });
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.isDead = true;
        return this.die();
    }
}

export function getForDatabase(this: RxDatabase): LeaderElector {
    if (!LEADER_ELECTORS_OF_DB.has(this)) {
        LEADER_ELECTORS_OF_DB.set(
            this,
            new LeaderElector(this)
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
        return Promise.resolve(true);
    } else {
        return this.leaderElector().waitForLeadership();
    }
}

/**
 * runs when the database gets destroyed
 */
export function onDestroy(db: RxDatabase) {
    const has = LEADER_ELECTORS_OF_DB.get(db);
    if (has) {
        has.destroy();
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
