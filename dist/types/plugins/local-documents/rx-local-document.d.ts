import type { LocalDocumentState, RxDocumentData, RxLocalDocument, RxLocalDocumentData } from '../../types';
export declare function createRxLocalDocument<DocData>(id: string, data: RxDocumentData<RxLocalDocumentData<DocData>>, parent: any, state: LocalDocumentState): RxLocalDocument<DocData>;
