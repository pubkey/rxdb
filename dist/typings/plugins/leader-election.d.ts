/**
 * this plugin adds the leader-election-capabilities to rxdb
 */
import { LeaderElector as BroadcastChannelLeaderElector } from 'broadcast-channel';
import { RxDatabase, RxPlugin } from '../types';
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
export declare function create(database: RxDatabase): LeaderElector;
export declare const rxdb = true;
export declare const prototypes: {};
export declare const overwritable: {
    createLeaderElector: typeof create;
};
declare const plugin: RxPlugin;
export default plugin;
