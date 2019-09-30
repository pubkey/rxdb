import { Observable, BehaviorSubject } from 'rxjs';
import { RxCollection } from './rx-collection';
import { RxChangeEvent } from '../rx-change-event';
import { RxAttachment, RxAttachmentCreator } from './rx-attachment';
export declare type RxDocument<RxDocumentType = {}, OrmMethods = {}> = RxDocumentBase<RxDocumentType, OrmMethods> & RxDocumentType & OrmMethods;
export declare type RxDocumentTypeWithRev<RxDocumentType> = RxDocumentType & {
    _rev: string;
};
declare type AtomicUpdateFunction<RxDocumentType> = (doc: RxDocumentType) => RxDocumentType | Promise<RxDocumentType>;
export declare interface RxDocumentBase<RxDocumentType, OrmMethods = {}> {
    isInstanceOfRxDocument: true;
    collection: RxCollection<RxDocumentType, OrmMethods>;
    readonly deleted: boolean;
    readonly $: Observable<any>;
    readonly deleted$: Observable<boolean>;
    readonly primary: string;
    readonly allAttachments$: Observable<RxAttachment<RxDocumentType, OrmMethods>[]>;
    _isTemporary: boolean;
    _dataSync$: BehaviorSubject<RxDocumentType>;
    _data: any;
    _deleted$: BehaviorSubject<boolean>;
    primaryPath: string;
    revision: string;
    _atomicQueue: Promise<any>;
    $emit(cE: RxChangeEvent): void;
    _saveData(newData: any, oldData: any): Promise<void>;
    get$(path: string): Observable<any>;
    get(objPath: string): any;
    populate(objPath: string): Promise<RxDocument<RxDocumentType, OrmMethods> | any | null>;
    atomicUpdate(fun: AtomicUpdateFunction<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    atomicSet(objPath: string, value: any): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    update(updateObj: any): Promise<any>;
    remove(): Promise<boolean>;
    _handleChangeEvent(cE: any): void;
    set(objPath: string, value: any): RxDocument<RxDocumentType, OrmMethods>;
    save(): Promise<boolean>;
    putAttachment(creator: RxAttachmentCreator): Promise<RxAttachment<RxDocumentType, OrmMethods>>;
    getAttachment(id: string): RxAttachment<RxDocumentType, OrmMethods> | null;
    allAttachments(): RxAttachment<RxDocumentType, OrmMethods>[];
    toJSON(): RxDocumentTypeWithRev<RxDocumentType>;
    toJSON(withRevAndAttachments: false): RxDocumentType;
    destroy(): void;
}
export declare interface RxLocalDocument<Parent> extends RxDocumentBase<{}> {
    readonly parent: Parent;
    isLocal(): true;
}
export {};
