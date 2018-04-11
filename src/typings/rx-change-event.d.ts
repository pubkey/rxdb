import { RxDocument } from 'rxdb/src/typings/rx-document';

export interface RxChangeEventData {
  readonly col?: string;
  readonly db: string;
  readonly doc?: RxDocument<object>;
  readonly isLocal?: boolean;
  readonly it: string;
  readonly op: 'INSERT' | 'UPDATE' | 'REMOVE';
  readonly t: number;
  readonly v?: object;
}

export declare class RxChangeEvent {
    data: RxChangeEventData;
    toJSON(): RxChangeEventData;
}
