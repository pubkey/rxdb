/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

import LeaderElection from 'broadcast-channel/leader-election';

class LeaderElector {
    constructor(database) {
        this.destroyed = false;
        this.database = database;
        this.isLeader = false;
        this.isDead = false;
        this.elector = LeaderElection.create(database.broadcastChannel);
    }

    die() {
        return this.elector.die();
    }

    /**
     * @return {Promise} promise which resolve when the instance becomes leader
     */
    waitForLeadership() {
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

export function create(database) {
    const elector = new LeaderElector(database);
    return elector;
}

export const rxdb = true;
export const prototypes = {};
export const overwritable = {
    createLeaderElector: create
};

export default {
    rxdb,
    prototypes,
    overwritable
};
