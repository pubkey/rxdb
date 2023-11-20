import type { RxDocumentData, RxJsonSchema } from '../../types/index.d.ts';
import type { MemoryStorageInternals } from './memory-types.ts';
export declare function addIndexesToInternalsState<RxDocType>(state: MemoryStorageInternals<RxDocType>, schema: RxJsonSchema<RxDocumentData<RxDocType>>): void;
export declare function getMemoryIndexName(index: string[]): string;
