import type {
    RxDocumentData
} from '../../types';
import type {
    FoundationDBTransaction
} from './foundationdb-types';



export function getFoundationDBIndexName(index: string[]): string {
    return index.join('|');
}
