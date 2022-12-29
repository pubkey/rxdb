/**
 * this plugin adds the leader-election-capabilities to rxdb
 */
import { LeaderElector, BroadcastChannel } from 'broadcast-channel';
import type { RxDatabase, RxPlugin } from '../../types';
/**
 * Returns the leader elector of a broadcast channel.
 * Used to ensure we reuse the same elector for the channel each time.
 */
export declare function getLeaderElectorByBroadcastChannel(broadcastChannel: BroadcastChannel): LeaderElector;
/**
 * @overwrites RxDatabase().leaderElector for caching
 */
export declare function getForDatabase(this: RxDatabase): LeaderElector;
export declare function isLeader(this: RxDatabase): boolean;
export declare function waitForLeadership(this: RxDatabase): Promise<boolean>;
/**
 * runs when the database gets destroyed
 */
export declare function onDestroy(db: RxDatabase): void;
export declare const rxdb = true;
export declare const prototypes: {
    RxDatabase: (proto: any) => void;
};
export declare const RxDBLeaderElectionPlugin: RxPlugin;
