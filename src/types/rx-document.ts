import { Observable } from 'rxjs';

import {
    RxCollection
} from './rx-collection';
import {
    RxAttachment,
    RxAttachmentCreator
} from './rx-attachment';

export type RxDocument<RxDocumentType = {}, OrmMethods = {}> = RxDocumentBase<RxDocumentType, OrmMethods> & RxDocumentType & OrmMethods;

export type RxDocumentTypeWithRev<RxDocumentType> = RxDocumentType & { _rev: string };

declare type AtomicUpdateFunction<RxDocumentType> = (doc: RxDocumentType) => RxDocumentType | Promise<RxDocumentType>;

export declare class RxDocumentBase<RxDocumentType, OrmMethods = {}> {
    readonly collection: RxCollection<RxDocumentType, OrmMethods>;
    readonly deleted: boolean;

    readonly $: Observable<any>;
    readonly deleted$: Observable<boolean>;

    readonly primary: string;
    get$(path: string): Observable<any>;
    get(objPath: string): any;
    populate(objPath: string): Promise<RxDocument<RxDocumentType, OrmMethods> | any | null>;

    // change data of document
    atomicUpdate(fun: AtomicUpdateFunction<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    atomicSet(objPath: string, value: any): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    update(updateObj: any): Promise<any>;
    remove(): Promise<boolean>;
    _handleChangeEvent(cE: any);

    // only for temporary documents
    set(objPath: string, value: any): RxDocument<RxDocumentType, OrmMethods>;
    save(): Promise<boolean>;

    // attachments
    putAttachment(creator: RxAttachmentCreator): Promise<RxAttachment<RxDocumentType, OrmMethods>>;
    getAttachment(id: string): RxAttachment<RxDocumentType, OrmMethods> | null;
    allAttachments(): RxAttachment<RxDocumentType, OrmMethods>[];
    readonly allAttachments$: Observable<RxAttachment<RxDocumentType, OrmMethods>[]>;

    toJSON(): RxDocumentTypeWithRev<RxDocumentType>;
    toJSON(withRevAndAttachments: false): RxDocumentType;

    destroy(): void;
}

export declare class RxLocalDocument<Parent> extends RxDocumentBase<{}> {
    readonly parent: Parent;
    isLocal(): true;
}
