export type RxChangeEventOperation =
    'INSERT' | // document created
    'UPDATE' | // document changed
    'REMOVE' | // document removed
    'RxDatabase.collection'; // collection created

export type RemoveData = {
    _id: string,
    _rev: string,
    _deleted: true
};

export type RxEventValueWithRevAndId = {
    _id: string;
    _rev: string;
};
export type RxEventValue<RxDocumentType> = RxDocumentType & RxEventValueWithRevAndId;


export interface RxChangeEventDataBase {
    readonly op: RxChangeEventOperation;
    readonly t: number;
    readonly db: string;
    readonly it: string;
    readonly isLocal: boolean;
}

export declare interface RxChangeEventBase {
    readonly hash: string;
    isIntern(): boolean;
    isSocket(): boolean;
}

// INSERT
export interface RxChangeEventInsertData<RxDocumentType> extends RxChangeEventDataBase {
    readonly op: 'INSERT';
    readonly col: string;
    readonly doc: string;
    readonly v: RxEventValue<RxDocumentType>;
}

export declare interface RxChangeEventInsert<RxDocumentType> extends RxChangeEventBase {
    readonly data: RxChangeEventInsertData<RxDocumentType>;
    toJSON(): RxChangeEventInsertData<RxDocumentType>;
}

// UPDATE
export interface RxChangeEventUpdateData<RxDocumentType> extends RxChangeEventDataBase {
    readonly op: 'UPDATE';
    readonly col: string;
    readonly doc: string;
    readonly v: RxEventValue<RxDocumentType>;
}

export declare interface RxChangeEventUpdate<RxDocumentType> extends RxChangeEventBase {
    readonly data: RxChangeEventUpdateData<RxDocumentType>;
    toJSON(): RxChangeEventUpdateData<RxDocumentType>;
}

// REMOVE
export interface RxChangeEventRemoveData<RxDocumentType> extends RxChangeEventDataBase {
    readonly op: 'REMOVE';
    readonly col: string;
    readonly doc: string;
    readonly v: RxEventValue<RxDocumentType> | RemoveData;
}

export declare interface RxChangeEventRemove<RxDocumentType> extends RxChangeEventBase {
    readonly data: RxChangeEventRemoveData<RxDocumentType>;
    toJSON(): RxChangeEventRemoveData<RxDocumentType>;
}

// COLLECTION
export interface RxChangeEventCollectionData extends RxChangeEventDataBase {
    readonly op: 'RxDatabase.collection';
}

export declare interface RxChangeEventCollection extends RxChangeEventBase {
    readonly data: RxChangeEventCollectionData;
    toJSON(): RxChangeEventCollectionData;
}
