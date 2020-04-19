/**
 * this plugin adds the leader-election-capabilities to rxdb
 */
import { LeaderElector as BroadcastChannelLeaderElector } from 'broadcast-channel';
import type { RxDatabase, RxPlugin } from '../types';
export declare class LeaderElector {
    database: RxDatabase;
    destroyed: boolean;
    isLeader: boolean;
    isDead: boolean;
    elector: BroadcastChannelLeaderElector;
    constructor(database: RxDatabase);
    die(): Promise<void>;
    waitForLeadership(): Promise<boolean>;
    destroy(): Promise<void> | undefined;
}
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
