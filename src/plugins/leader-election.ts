/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

import {
    createLeaderElection,
    LeaderElector as BroadcastChannelLeaderElector
} from 'broadcast-channel';

import {
    RxDatabase,
    RxPlugin
} from '../types';

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

export function create(database: RxDatabase) {
    const elector = new LeaderElector(database);
    return elector;
}

export const rxdb = true;
export const prototypes = {};
export const overwritable = {
    createLeaderElector: create
};

const plugin: RxPlugin = {
    rxdb,
    prototypes,
    overwritable
};

export default plugin;
