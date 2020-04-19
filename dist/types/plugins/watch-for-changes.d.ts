import type { RxPlugin, RxCollection } from '../types';
/**
 * listens to changes of the internal pouchdb
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 */
export declare function watchForChanges(this: RxCollection): void;
export declare const rxdb = true;
export declare const prototypes: {
    RxCollection: (proto: any) => void;
};
export declare const RxDBWatchForChangesPlugin: RxPlugin;
