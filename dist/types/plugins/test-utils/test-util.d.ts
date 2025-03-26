import type { Func } from 'mocha';
import type { RxCollection } from '../../types';
import type { RxReplicationState } from '../replication/index.ts';
export declare function testMultipleTimes(times: number, title: string, test: Func): void;
export declare function ensureCollectionsHaveEqualState<RxDocType>(c1: RxCollection<RxDocType>, c2: RxCollection<RxDocType>, logContext?: string): Promise<void>;
export declare function ensureReplicationHasNoErrors(replicationState: RxReplicationState<any, any>): void;
