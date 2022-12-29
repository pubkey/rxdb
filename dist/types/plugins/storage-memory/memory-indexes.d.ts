import type { RxDocumentData, RxJsonSchema } from '../../types';
import type { MemoryStorageInternals } from './memory-types';
export declare function addIndexesToInternalsState<RxDocType>(state: MemoryStorageInternals<RxDocType>, schema: RxJsonSchema<RxDocumentData<RxDocType>>): void;
export declare function getMemoryIndexName(index: string[]): string;
