import {
    Observable,
    BehaviorSubject
} from 'rxjs';

import {
    RxCollection,
} from './rx-collection';
import {
    RxChangeEvent
} from '../rx-change-event';
import {
    RxAttachment,
    RxAttachmentCreator
} from './rx-attachment';
import { WithPouchMeta } from './pouch';

export type RxDocument<RxDocumentType = {}, OrmMethods = {}> = RxDocumentBase<RxDocumentType, OrmMethods> & RxDocumentType & OrmMethods;

export type RxDocumentTypeWithRev<RxDocumentType> = RxDocumentType & { _rev: string };

declare type AtomicUpdateFunction<RxDocumentType> = (doc: RxDocumentType) => RxDocumentType | Promise<RxDocumentType>;

export declare interface RxDocumentBase<RxDocumentType, OrmMethods = {}> {
    isInstanceOfRxDocument: true;
    collection: RxCollection<RxDocumentType, OrmMethods>;
    readonly deleted: boolean;

    readonly $: Observable<any>;
    readonly deleted$: Observable<boolean>;

    readonly primary: string;
    readonly allAttachments$: Observable<RxAttachment<RxDocumentType, OrmMethods>[]>;

    // internal things
    _isTemporary: boolean;
    _dataSync$: BehaviorSubject<RxDocumentType>;
    _data: WithPouchMeta<RxDocumentType>;
    _deleted$: BehaviorSubject<boolean>;
    primaryPath: string;
    revision: string;
    _atomicQueue: Promise<any>;
    $emit(cE: RxChangeEvent): void;
    _saveData(newData: any, oldData: any): Promise<void>;
    // /internal things

    get$(path: string): Observable<any>;
    get(objPath: string): any;
    populate(objPath: string): Promise<RxDocument<RxDocumentType, OrmMethods> | any | null>;

    /**
     * mutate the document with a function
     */
    atomicUpdate(mutationFunction: AtomicUpdateFunction<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    /**
     * patches the given properties
     */
    atomicPatch(patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;

    /**
     * @deprecated use atomicPatch or atomicUpdate instead
     * because it is better works with typescript
     */
    atomicSet(objPath: string, value: any): Promise<RxDocument<RxDocumentType, OrmMethods>>;



    update(updateObj: any): Promise<any>;
    remove(): Promise<boolean>;
    _handleChangeEvent(cE: any): void;

    // only for temporary documents
    set(objPath: string, value: any): RxDocument<RxDocumentType, OrmMethods>;
    save(): Promise<boolean>;

    // attachments
    putAttachment(
        creator: RxAttachmentCreator,
        /**
         * If set to true and data is equal,
         * operation will be skipped.
         * This prevents us from upgrading the revision
         * and causing events in the change stream.
         */
        skipIfSame?: boolean
    ): Promise<RxAttachment<RxDocumentType, OrmMethods>>;
    getAttachment(id: string): RxAttachment<RxDocumentType, OrmMethods> | null;
    allAttachments(): RxAttachment<RxDocumentType, OrmMethods>[];

    toJSON(): RxDocumentType;
    toJSON(withRevAndAttachments: true): RxDocumentTypeWithRev<RxDocumentType>;
    toJSON(withRevAndAttachments: false): RxDocumentType;

    destroy(): void;
}

declare type LocalDocWithType<LocalDocType> = RxDocumentBase<LocalDocType> & LocalDocType;

export declare type RxLocalDocument<Parent, LocalDocType = any> = RxDocumentBase<LocalDocType> & LocalDocType & {
    readonly parent: Parent;
    isLocal(): true;
}
