import type { RxDocument, RxQuery, RxPlugin, UpdateQuery } from '../../types/index.d.ts';
export declare function incrementalUpdate<RxDocType>(this: RxDocument<RxDocType>, updateObj: UpdateQuery<RxDocType>): Promise<RxDocument<RxDocType>>;
export declare function update<RxDocType>(this: RxDocument<RxDocType>, updateObj: UpdateQuery<RxDocType>): Promise<RxDocument<RxDocType>>;
export declare function RxQueryUpdate(this: RxQuery, updateObj: UpdateQuery<any>): Promise<any>;
export declare const RxDBUpdatePlugin: RxPlugin;
