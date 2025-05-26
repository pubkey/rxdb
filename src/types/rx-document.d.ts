import {
    Observable
} from 'rxjs';

import type {
    RxCollection,
} from './rx-collection.d.ts';
import type {
    RxAttachment,
    RxAttachmentCreator,
    RxAttachmentCreatorBase64
} from './rx-attachment.d.ts';
import type { RxDocumentData, WithDeleted } from './rx-storage.d.ts';
import type { RxChangeEvent } from './rx-change-event.d.ts';
import type { DeepReadonly, MaybePromise, PlainJsonValue } from './util.d.ts';
import type { UpdateQuery } from './plugins/update.d.ts';
import type { CRDTEntry } from './plugins/crdt.d.ts';



export type RxDocument<RxDocumentType = {}, OrmMethods = {}, Reactivity = unknown> = RxDocumentBase<
    RxDocumentType,
    OrmMethods,
    Reactivity
> & RxDocumentType & OrmMethods & ExtendObservables<RxDocumentType> & ExtendReactivity<RxDocumentType, Reactivity>;


/**
 * Extend the base properties by the property$ fields
 * so it knows that RxDocument.age also has RxDocument.age$ which is
 * an observable.
 * TODO how to do this for the nested fields?
 */
type ExtendObservables<RxDocumentType> = {
    [P in keyof RxDocumentType as `${string & P}$`]: Observable<RxDocumentType[P]>;
};

type ExtendReactivity<RxDocumentType, Reactivity> = {
    [P in keyof RxDocumentType as `${string & P}$$`]: Reactivity;
};

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

export declare interface RxDocumentBase<RxDocType, OrmMethods = {}, Reactivity = unknown> {
    isInstanceOfRxDocument: true;
    collection: RxCollection<RxDocType, OrmMethods, Reactivity>;
    readonly deleted: boolean;

    readonly $: Observable<RxDocument<RxDocType, OrmMethods, Reactivity>>;
    readonly $$: Reactivity;
    readonly deleted$: Observable<boolean>;
    readonly deleted$$: Reactivity;

    readonly primary: string;
    readonly allAttachments$: Observable<RxAttachment<RxDocType, OrmMethods, Reactivity>[]>;

    // internal things
    _data: RxDocumentData<RxDocType>;
    primaryPath: string;
    revision: string;
    /**
     * Used to de-duplicate the enriched property objects
     * of the document.
     */
    _propertyCache: Map<string, any>;
    $emit(cE: RxChangeEvent<RxDocType>): void;
    _saveData(newData: any, oldData: any): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;
    // /internal things

    // Returns the latest state of the document
    getLatest(): RxDocument<RxDocType, OrmMethods, Reactivity>;


    get$(path: string): Observable<any>;
    get$$(path: string): Reactivity;
    get(objPath: string): DeepReadonly<any>;
    populate(objPath: string): Promise<RxDocument<RxDocType, OrmMethods, Reactivity> | any | null>;

    /**
     * mutate the document with a function
     */
    modify(mutationFunction: ModifyFunction<RxDocType>, context?: string): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;
    incrementalModify(mutationFunction: ModifyFunction<RxDocType>, context?: string): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;

    /**
     * patches the given properties
     */
    patch(patch: Partial<RxDocType>): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;
    incrementalPatch(patch: Partial<RxDocType>): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;

    update(updateObj: UpdateQuery<RxDocType>): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;
    incrementalUpdate(updateObj: UpdateQuery<RxDocType>): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;

    updateCRDT(updateObj: CRDTEntry<RxDocType> | CRDTEntry<RxDocType>[]): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;

    remove(): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;
    incrementalRemove(): Promise<RxDocument<RxDocType, OrmMethods, Reactivity>>;

    // only for temporary documents
    set(objPath: string, value: any): RxDocument<RxDocType, OrmMethods, Reactivity>;
    save(): Promise<boolean>;

    // attachments
    putAttachment(
        creator: RxAttachmentCreator
    ): Promise<RxAttachment<RxDocType, OrmMethods, Reactivity>>;
    putAttachmentBase64(
        creator: RxAttachmentCreatorBase64
    ): Promise<RxAttachment<RxDocType, OrmMethods, Reactivity>>;
    getAttachment(id: string): RxAttachment<RxDocType, OrmMethods, Reactivity> | null;
    allAttachments(): RxAttachment<RxDocType, OrmMethods, Reactivity>[];

    toJSON(withRevAndAttachments: true): DeepReadonly<RxDocumentData<RxDocType>>;
    toJSON(withRevAndAttachments?: false): DeepReadonly<RxDocType>;

    toMutableJSON(withRevAndAttachments: true): RxDocumentData<RxDocType>;
    toMutableJSON(withRevAndAttachments?: false): RxDocType;

    close(): void;
}
