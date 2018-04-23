export type RxChangeEventOperation = 'INSERT' | 'UPDATE' | 'REMOVE'

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
}
