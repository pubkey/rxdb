import type {
    WithAttachments
} from '../couchdb.d.ts';
import type { RxCollection } from '../rx-collection.d.ts';
import type { MaybePromise } from '../util.d.ts';

export type MigrationStrategy<DocData = any> = (
    oldDocumentData: WithAttachments<DocData>,
    collection: RxCollection
) => MaybePromise<WithAttachments<DocData> | null>;

export type MigrationStrategies = {
    [toVersion: number]: MigrationStrategy<any>;
};
