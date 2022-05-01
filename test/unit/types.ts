import type { RxStorage } from '../../';

/**
 * To test a storage, we need these
 * configuration values.
 */
export type RxTestStorage = {
    // TODO remove name here, it can be read out already via getStorage().name
    readonly name: string;
    readonly getStorage: () => RxStorage<any, any>;
    /**
     * Returns a storage that is used in performance tests.
     * For example in a browser it should return the storage with an IndexedDB based adapter,
     * while in node.js it must use the filesystem.
     */
    readonly getPerformanceStorage: () => {
        storage: RxStorage<any, any>;
        /**
         * A description that describes the storage and setting.
         * For example 'pouchdb-idb'.
         */
        description: string;
    };
    readonly hasMultiInstance: boolean;
    readonly hasCouchDBReplication: boolean;
    readonly hasAttachments: boolean;
    // true if the storage supports $regex queries, false if not.
    readonly hasRegexSupport: boolean;
}
