import type { HashFunction, RxDocumentData, WithDeleted } from '../types';
export declare function docStateToWriteDoc<RxDocType>(hashFunction: HashFunction, docState: WithDeleted<RxDocType>, previous?: RxDocumentData<RxDocType>): RxDocumentData<RxDocType>;
export declare function writeDocToDocState<RxDocType>(writeDoc: RxDocumentData<RxDocType>): WithDeleted<RxDocType>;
