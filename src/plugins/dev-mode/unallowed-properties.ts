import type { RxCollectionCreator } from '../../types';
import { newRxError } from '../../rx-error';
import { rxDatabaseProperties } from './entity-properties';


/**
 * if the name of a collection
 * clashes with a property of RxDatabase,
 * we get problems so this function prohibits this
 */
export function ensureCollectionNameValid(
    args: RxCollectionCreator
) {
    if (rxDatabaseProperties().includes(args.name)) {
        throw newRxError('DB5', {
            name: args.name
        });
    }
}
