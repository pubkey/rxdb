import { Observable } from 'rxjs';

import {
    RxCollection
} from './rx-collection';
import {
    RxAttachment
} from './rx-attachment';

export type RxDocument<RxDocumentType> = RxDocumentBase<RxDocumentType> & RxDocumentType;


export declare class RxDocumentBase<RxDocumentType> {
    collection: RxCollection<RxDocumentType>;
    deleted: boolean;

    $: Observable<any>;
    deleted$: Observable<boolean>;
    synced$: Observable<boolean>;
    resync(): void;

    primary: string;
    get$(path: string): Observable<any>;
    get(objPath: string): any;
    set(objPath: string, value: any): RxDocument<RxDocumentType>;
    save(): Promise<boolean>;
    remove(): Promise<boolean>;
    populate(objPath: string): Promise<RxDocument<RxDocumentType> | any>;
    update(updateObj: any): Promise<any>;
    atomicUpdate(fun: Function): Promise<RxDocument<RxDocumentType>>;

    putAttachment(id: string, data: string, type?: string): Promise<RxAttachment<RxDocumentType>>;
    getAttachment(id: string): Promise<RxAttachment<RxDocumentType>>;
    allAttachments(): Promise<RxAttachment<RxDocumentType>[]>;
    allAttachments$: Observable<RxAttachment<RxDocumentType>[]>;

    toJSON(): RxDocumentType;
    destroy(): void;
}
