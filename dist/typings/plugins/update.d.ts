import { RxDocument, RxQuery } from '../types';
export declare function update(this: RxDocument, updateObj: any): Promise<void>;
export declare function RxQueryUpdate(this: RxQuery, updateObj: any): Promise<any>;
export declare const rxdb = true;
export declare const prototypes: {
    RxDocument: (proto: any) => void;
    RxQuery: (proto: any) => void;
};
declare const _default: {
    rxdb: boolean;
    prototypes: {
        RxDocument: (proto: any) => void;
        RxQuery: (proto: any) => void;
    };
};
export default _default;
