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


export class RxChangeEventDataBase {
    readonly op: RxChangeEventOperation;
    readonly t: number;
    readonly db: string;
    readonly it: string;
    readonly isLocal: boolean;
}

export declare class RxChangeEventBase {
    isIntern(): boolean;
    isSocket(): boolean;
    readonly hash: string;
}

// INSERT
export class RxChangeEventInsertData<RxDocumentType> extends RxChangeEventDataBase {
    readonly op: 'INSERT';
    readonly col: string;
    readonly doc: string;
    readonly v: RxEventValue<RxDocumentType>;
}

export declare class RxChangeEventInsert<RxDocumentType> extends RxChangeEventBase {
    readonly data: RxChangeEventInsertData<RxDocumentType>;
    toJSON(): RxChangeEventInsertData<RxDocumentType>;
}

// UPDATE
export class RxChangeEventUpdateData<RxDocumentType> extends RxChangeEventDataBase {
    readonly op: 'UPDATE';
    readonly col: string;
    readonly doc: string;
    readonly v: RxEventValue<RxDocumentType>;
}

export declare class RxChangeEventUpdate<RxDocumentType> extends RxChangeEventBase {
    readonly data: RxChangeEventUpdateData<RxDocumentType>;
    toJSON(): RxChangeEventUpdateData<RxDocumentType>;
}

// REMOVE
export class RxChangeEventRemoveData<RxDocumentType> extends RxChangeEventDataBase {
    readonly op: 'REMOVE';
    readonly col: string;
    readonly doc: string;
    readonly v: RxEventValue<RxDocumentType> | RemoveData;
}

export declare class RxChangeEventRemove<RxDocumentType> extends RxChangeEventBase {
    readonly data: RxChangeEventRemoveData<RxDocumentType>;
    toJSON(): RxChangeEventRemoveData<RxDocumentType>;
}

// COLLECTION
export class RxChangeEventCollectionData extends RxChangeEventDataBase {
    readonly op: 'RxDatabase.collection';
}

export declare class RxChangeEventCollection extends RxChangeEventBase {
    readonly data: RxChangeEventCollectionData;
    toJSON(): RxChangeEventCollectionData;
}
