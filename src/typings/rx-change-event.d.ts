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

export interface RxChangeEventData<T = {}> {
    readonly col?: string;
    readonly db: string;
    readonly doc?: string;
    readonly isLocal?: boolean;
    readonly it: string;
    readonly op: RxChangeEventOperation;
    readonly t: number;
    readonly v?: T | RemoveData;
}

export declare class RxChangeEvent<T = {}> {
    data: RxChangeEventData<T>;
    toJSON(): RxChangeEventData<T>;

    isIntern(): boolean;
    isSocket(): boolean;
    hash: string;
}
