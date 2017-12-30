import { Observable } from 'rxjs';

import {
    RxCollection
} from './rx-collection';
import {
    RxDatabase
} from './rx-database';
import {
    RxAttachment,
    RxAttachmentCreator
} from './rx-attachment';

export type RxDocument<RxDocumentType> = RxDocumentBase<RxDocumentType> & RxDocumentType;


export declare class RxDocumentBase<RxDocumentType> {
    readonly collection: RxCollection<RxDocumentType>;
    readonly deleted: boolean;

    readonly $: Observable<any>;
    readonly deleted$: Observable<boolean>;
    readonly synced$: Observable<boolean>;
    resync(): void;

    readonly primary: string;
    get$(path: string): Observable<any>;
    get(objPath: string): any;
    set(objPath: string, value: any): RxDocument<RxDocumentType>;
    save(): Promise<boolean>;
    remove(): Promise<boolean>;
    populate(objPath: string): Promise<RxDocument<RxDocumentType> | any>;
    update(updateObj: any): Promise<any>;
    atomicUpdate(fun: Function): Promise<RxDocument<RxDocumentType>>;

    putAttachment(creator: RxAttachmentCreator): Promise<RxAttachment<RxDocumentType>>;
    getAttachment(id: string): Promise<RxAttachment<RxDocumentType>>;
    allAttachments(): Promise<RxAttachment<RxDocumentType>[]>;
    readonly allAttachments$: Observable<RxAttachment<RxDocumentType>[]>;

    toJSON(): RxDocumentType;
    destroy(): void;
}

export declare class RxLocalDocument<Parent> extends RxDocumentBase<{}> {
    readonly parent: Parent;
    isLocal(): true;
}
