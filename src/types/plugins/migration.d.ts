import {
    WithAttachments
} from '../couchdb';
import { RxCollection } from '../rx-collection';
import { MaybePromise } from '../util';

export type MigrationStrategy<DocData = any> = (
    oldDocumentData: WithAttachments<DocData>,
    collection: RxCollection
) => MaybePromise<WithAttachments<DocData> | null>;

export type MigrationStrategies = {
    [toVersion: number]: MigrationStrategy<any>;
};
