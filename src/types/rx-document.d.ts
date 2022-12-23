import {
    Observable
} from 'rxjs';

import {
    RxCollection,
} from './rx-collection';
import {
    RxAttachment,
    RxAttachmentCreator
} from './rx-attachment';
import { RxDocumentData, WithDeleted } from './rx-storage';
import { RxChangeEvent } from './rx-change-event';
import { DeepReadonly, MaybePromise, PlainJsonValue } from './util';
import { UpdateQuery } from './plugins/update';
import { CRDTEntry } from './plugins/crdt';

export type RxDocument<RxDocumentType = {}, OrmMethods = {}> = RxDocumentBase<RxDocumentType, OrmMethods> & RxDocumentType & OrmMethods;


/**
 * The public facing modify update function.
 * It only gets the document parts as input, that
 * are mutateable by the user.
 */
export type ModifyFunction<RxDocumentType> = (
    doc: WithDeleted<RxDocumentType>
) => MaybePromise<WithDeleted<RxDocumentType>> | MaybePromise<RxDocumentType>;

/**
 * Meta data that is attached to each document by RxDB.
 */
export type RxDocumentMeta = {
    /**
     * Last write time.
     * Unix epoch in milliseconds.
     */
    lwt: number;

    /**
     * Any other value can be attached to the _meta data.
     * Mostly done by plugins to mark documents.
     */
    [k: string]: PlainJsonValue;
};

export declare interface RxDocumentBase<RxDocType, OrmMethods = {}> {
    isInstanceOfRxDocument: true;
    collection: RxCollection<RxDocType, OrmMethods>;
    readonly deleted: boolean;

    readonly $: Observable<DeepReadonly<RxDocumentData<RxDocType>>>;
    readonly deleted$: Observable<boolean>;

    readonly primary: string;
    readonly allAttachments$: Observable<RxAttachment<RxDocType, OrmMethods>[]>;

    // internal things
    _data: RxDocumentData<RxDocType>;
    primaryPath: string;
    revision: string;
    $emit(cE: RxChangeEvent<RxDocType>): void;
    _saveData(newData: any, oldData: any): Promise<RxDocument<RxDocType, OrmMethods>>;
    // /internal things

    // Returns the latest state of the document
    getLatest(): RxDocument<RxDocType, OrmMethods>;


    get$(path: string): Observable<any>;
    get(objPath: string): DeepReadonly<any>;
    populate(objPath: string): Promise<RxDocument<RxDocType, OrmMethods> | any | null>;

    /**
     * mutate the document with a function
     */
    modify(mutationFunction: ModifyFunction<RxDocType>, context?: string): Promise<RxDocument<RxDocType, OrmMethods>>;
    incrementalModify(mutationFunction: ModifyFunction<RxDocType>, context?: string): Promise<RxDocument<RxDocType, OrmMethods>>;

    /**
     * patches the given properties
     */
    patch(patch: Partial<RxDocType>): Promise<RxDocument<RxDocType, OrmMethods>>;
    incrementalPatch(patch: Partial<RxDocType>): Promise<RxDocument<RxDocType, OrmMethods>>;

    update(updateObj: UpdateQuery<RxDocType>): Promise<RxDocument<RxDocType, OrmMethods>>;
    incrementalUpdate(updateObj: UpdateQuery<RxDocType>): Promise<RxDocument<RxDocType, OrmMethods>>;

    updateCRDT(updateObj: CRDTEntry<RxDocType> | CRDTEntry<RxDocType>[]): Promise<RxDocument<RxDocType, OrmMethods>>;

    remove(): Promise<RxDocument<RxDocType, OrmMethods>>;
    incrementalRemove(): Promise<RxDocument<RxDocType, OrmMethods>>;

    // only for temporary documents
    set(objPath: string, value: any): RxDocument<RxDocType, OrmMethods>;
    save(): Promise<boolean>;

    // attachments
    putAttachment(
        creator: RxAttachmentCreator
    ): Promise<RxAttachment<RxDocType, OrmMethods>>;
    getAttachment(id: string): RxAttachment<RxDocType, OrmMethods> | null;
    allAttachments(): RxAttachment<RxDocType, OrmMethods>[];

    toJSON(withRevAndAttachments: true): DeepReadonly<RxDocumentData<RxDocType>>;
    toJSON(withRevAndAttachments?: false): DeepReadonly<RxDocType>;

    toMutableJSON(withRevAndAttachments: true): RxDocumentData<RxDocType>;
    toMutableJSON(withRevAndAttachments?: false): RxDocType;

    destroy(): void;
}
