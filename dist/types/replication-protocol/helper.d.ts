import type { RxDocumentData, WithDeleted } from '../types';
export declare function docStateToWriteDoc<RxDocType>(databaseInstanceToken: string, docState: WithDeleted<RxDocType>, previous?: RxDocumentData<RxDocType>): RxDocumentData<RxDocType>;
export declare function writeDocToDocState<RxDocType>(writeDoc: RxDocumentData<RxDocType>): WithDeleted<RxDocType>;
