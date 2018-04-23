export type RxChangeEventOperation =
    'INSERT' | // document created
    'UPDATE' | // document changed
    'REMOVE' | // document removed
    'RxDatabase.collection'; // collection created

export interface RxChangeEventData<T = {}> {
    readonly col?: string;
    readonly db: string;
    readonly doc?: string;
    readonly isLocal?: boolean;
    readonly it: string;
    readonly op: RxChangeEventOperation;
    readonly t: number;
    readonly v?: T;
}

export declare class RxChangeEvent<T = {}> {
    data: RxChangeEventData<T>;
    toJSON(): RxChangeEventData<T>;

    isIntern(): boolean;
    isSocket(): boolean;
    hash: string;
}
