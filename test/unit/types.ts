import type { RxStorage } from '../../';

/**
 * To test a storage, we need these
 * configuration values.
 */
export type RxTestStorage = {
    // TODO remove name here, it can be read out already via getStorage().name
    readonly name: string;
    readonly getStorage: () => RxStorage<any, any>;
    readonly hasCouchDBReplication: boolean;
    readonly hasAttachments: boolean;
    // true if the storage supports $regex queries, false if not.
    readonly hasRegexSupport: boolean;
}
