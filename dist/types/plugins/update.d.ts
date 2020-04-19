import type { RxDocument, RxQuery, RxPlugin } from '../types';
export declare function update(this: RxDocument, updateObj: any): Promise<void>;
export declare function RxQueryUpdate(this: RxQuery, updateObj: any): Promise<any>;
export declare const rxdb = true;
export declare const prototypes: {
    RxDocument: (proto: any) => void;
    RxQuery: (proto: any) => void;
};
export declare const RxDBUpdatePlugin: RxPlugin;
